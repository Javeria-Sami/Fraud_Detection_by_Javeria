"""
Transaction Ingestion, Retrieval, Listing, and Idempotency API Endpoints.
Section 05 — Production-Oriented Transaction Ingestion Pipeline.
"""
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Header, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, asc, func, and_, or_
from sqlalchemy.exc import IntegrityError

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, require_permissions, require_roles
from backend.app.models.user import User
from backend.app.models.merchant import Merchant
from backend.app.models.device import Device
from backend.app.models.transaction import Transaction, TransactionStatus, FeatureSnapshot
from backend.app.models.risk_score import RiskScore
from backend.app.models.rule import RuleExecution, FraudRule
from backend.app.models.ml_model import MLPrediction, MLModelRegistry
from backend.app.models.alert import Alert
from backend.app.models.risk_profile import UserRiskProfile
from backend.app.schemas.transaction import (
    TransactionCreate,
    TransactionResponse,
    TransactionListResponse,
    TransactionInvestigationDetail,
    TransactionRiskDetail,
    TransactionRuleSignal,
    TransactionMLAnalysis,
    TransactionAlertSummary
)
from backend.app.schemas.rule import (
    TransactionRulesEvaluateResponse,
    RuleEvaluationDetailResponse
)
from backend.app.engine.pipeline import IngestionPipeline
from backend.app.engine.feature_store import FeatureStore
from backend.app.engine.rules.service import FraudRuleEngineService

router = APIRouter(prefix="/transactions", tags=["Transactions"])

# Allowlisted sorting columns for SQL injection protection
ALLOWED_SORT_FIELDS = {
    "timestamp": Transaction.timestamp,
    "transaction_timestamp": Transaction.transaction_timestamp,
    "created_at": Transaction.created_at,
    "amount": Transaction.amount,
    "status": Transaction.status,
    "risk_score": Transaction.risk_score
}

def _to_transaction_response(t: Transaction) -> TransactionResponse:
    return TransactionResponse(
        id=t.id,
        transaction_id=t.transaction_id or t.id,
        user_id=t.user_id,
        user_name=t.user_name,
        merchant_id=t.merchant_id,
        merchant_name=t.merchant_name or "Unknown Merchant",
        merchant_category=t.merchant_category or "general",
        payment_method=t.payment_method or "CREDIT_CARD",
        transaction_type=t.transaction_type or "PURCHASE",
        amount=float(t.amount),
        currency=t.currency or "USD",
        device_id=t.device_id or "DEV-UNKNOWN",
        ip_address=t.ip_address,
        city=t.city,
        country=t.country,
        latitude=t.latitude,
        longitude=t.longitude,
        failed_attempts=int(t.failed_attempts or 0),
        source=t.source or "API",
        risk_score=float(t.risk_score or 0.0),
        risk_level=t.risk_level or "LOW",
        ml_anomaly_score=float(t.ml_anomaly_score or 0.0),
        rules_triggered=t.rules_triggered or [],
        risk_factors=t.risk_factors or [],
        status=t.status or "PENDING",
        timestamp=t.timestamp.isoformat() if t.timestamp else (t.transaction_timestamp.isoformat() if t.transaction_timestamp else ""),
        created_at=t.created_at.isoformat() if t.created_at else ""
    )

@router.post(
    "",
    response_model=TransactionResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest a new transaction or idempotently return existing record"
)
async def ingest_transaction(
    payload: TransactionCreate,
    response: Response,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permissions(["transaction.create"]))
):
    """
    Ingests and processes a financial transaction.
    - Authenticates caller and enforces RBAC (`transaction.create`).
    - Validates payload structure, types, currency, and coordinate bounds.
    - Normalizes strings, casing, and UTC timestamps.
    - Verifies entity references (User, Merchant, Device).
    - Enforces idempotency and duplicate detection.
    - Persists atomically in the database.
    """
    data = payload.model_dump()
    txn_id = data.get("transaction_id") or idempotency_key or f"TXN-{uuid.uuid4().hex[:10].upper()}"
    data["transaction_id"] = txn_id

    # 1. Entity Reference Validation
    # Validate User
    user_id = data["user_id"]
    user_stmt = select(User).where(or_(User.id == user_id, User.username == user_id))
    user_res = await db.execute(user_stmt)
    user_obj = user_res.scalar_one_or_none()
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Referenced user '{user_id}' does not exist."
        )
    if not user_obj.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Referenced user '{user_id}' is deactivated."
        )
    if not data.get("user_name") and user_obj.full_name:
        data["user_name"] = user_obj.full_name

    # Validate Merchant if merchant_id is provided
    merchant_id = data.get("merchant_id")
    if merchant_id:
        m_stmt = select(Merchant).where(or_(Merchant.id == merchant_id, Merchant.merchant_code == merchant_id))
        m_res = await db.execute(m_stmt)
        m_obj = m_res.scalar_one_or_none()
        if not m_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Referenced merchant '{merchant_id}' does not exist."
            )
        if not m_obj.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Referenced merchant '{merchant_id}' is inactive."
            )
        data["merchant_name"] = m_obj.name
        data["merchant_category"] = m_obj.category

    # Validate Device if device_id is provided
    device_id = data.get("device_id")
    if device_id:
        d_stmt = select(Device).where(or_(Device.id == device_id, Device.device_identifier == device_id))
        d_res = await db.execute(d_stmt)
        d_obj = d_res.scalar_one_or_none()
        if d_obj:
            data["device_id"] = d_obj.id

    # 2. Idempotency Check
    existing_stmt = select(Transaction).where(or_(Transaction.id == txn_id, Transaction.transaction_id == txn_id))
    existing_res = await db.execute(existing_stmt)
    existing_txn = existing_res.scalar_one_or_none()

    if existing_txn:
        # Check if identical payload or conflicting payload
        is_same_user = existing_txn.user_id == user_id
        is_same_amount = abs(float(existing_txn.amount) - float(data["amount"])) < 0.001
        
        if is_same_user and is_same_amount:
            # Idempotent replay: return existing record with 200 OK
            response.headers["X-Idempotent-Replay"] = "true"
            return _to_transaction_response(existing_txn)
        else:
            # Conflicting payload reusing existing transaction_id
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Transaction ID '{txn_id}' already exists with conflicting details."
            )

    # 3. Process Transaction Ingestion Pipeline
    try:
        txn, alert = await IngestionPipeline.process_transaction(db, data)
        return _to_transaction_response(txn)
    except IntegrityError:
        await db.rollback()
        # Handle concurrent race condition
        existing_res = await db.execute(existing_stmt)
        existing_txn = existing_res.scalar_one_or_none()
        if existing_txn:
            response.headers["X-Idempotent-Replay"] = "true"
            return _to_transaction_response(existing_txn)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Transaction conflict during ingestion for ID '{txn_id}'."
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transaction ingestion error: {str(e)}"
        )

@router.get(
    "/{txn_id}",
    response_model=TransactionResponse,
    summary="Get single transaction detail by ID"
)
async def get_transaction(
    txn_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permissions(["transaction.read"]))
):
    """Retrieves a single transaction by ID or transaction_id with RBAC authorization."""
    stmt = select(Transaction).where(or_(Transaction.id == txn_id, Transaction.transaction_id == txn_id))
    result = await db.execute(stmt)
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Transaction '{txn_id}' not found.")
    return _to_transaction_response(txn)

@router.get(
    "/{txn_id}/investigate",
    response_model=TransactionInvestigationDetail,
    summary="Get comprehensive transaction investigation intelligence and signal breakdown"
)
async def get_transaction_investigation_detail(
    txn_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permissions(["transaction.read"]))
):
    """
    Retrieves deep investigation intelligence for a transaction:
    - Base transaction metadata & amounts
    - Calibrated composite risk scoring & explainability factors
    - Deterministic rule execution signals & evidence
    - ML Isolation Forest anomaly scores & indicators
    - Feature store snapshots at evaluation time
    - Related security alert incident references
    - Customer spending baseline context
    """
    stmt = select(Transaction).where(or_(Transaction.id == txn_id, Transaction.transaction_id == txn_id))
    result = await db.execute(stmt)
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Transaction '{txn_id}' not found.")

    # 1. Fetch Risk Score record
    risk_stmt = select(RiskScore).where(RiskScore.transaction_id == txn.id)
    risk_res = await db.execute(risk_stmt)
    risk_obj = risk_res.scalar_one_or_none()
    risk_detail = None
    if risk_obj:
        risk_detail = TransactionRiskDetail(
            score=float(risk_obj.score),
            risk_level=risk_obj.risk_level or txn.risk_level or "LOW",
            rule_score=float(risk_obj.rule_score or 0.0),
            ml_score=float(risk_obj.ml_score or 0.0),
            behavior_score=float(risk_obj.behavior_score or 0.0),
            explanation=risk_obj.explanation or txn.risk_factors or [],
            scoring_version=risk_obj.scoring_version or "v1.0",
            created_at=risk_obj.created_at.isoformat() if risk_obj.created_at else None
        )
    elif txn.risk_score is not None:
        risk_detail = TransactionRiskDetail(
            score=float(txn.risk_score),
            risk_level=txn.risk_level or "LOW",
            rule_score=0.0,
            ml_score=float(txn.ml_anomaly_score or 0.0) * 100.0,
            behavior_score=0.0,
            explanation=txn.risk_factors or [],
            scoring_version="v1.0",
            created_at=txn.created_at.isoformat() if txn.created_at else None
        )

    # 2. Fetch Rule Executions
    rules_stmt = (
        select(RuleExecution, FraudRule)
        .outerjoin(FraudRule, RuleExecution.rule_id == FraudRule.id)
        .where(RuleExecution.transaction_id == txn.id)
        .order_by(desc(RuleExecution.triggered), desc(RuleExecution.score))
    )
    rules_res = await db.execute(rules_stmt)
    rule_signals = []
    for r_exec, r_rule in rules_res.all():
        rule_signals.append(
            TransactionRuleSignal(
                rule_id=r_exec.rule_id,
                rule_name=r_rule.name if r_rule else r_exec.rule_id,
                category=r_rule.category if r_rule else "GENERAL",
                severity=r_rule.severity if r_rule else "MEDIUM",
                score=float(r_exec.score or 0.0),
                triggered=bool(r_exec.triggered),
                reason=r_exec.reason,
                evidence=r_exec.execution_detail if hasattr(r_exec, 'execution_detail') else None,
                version=r_rule.version if r_rule else "v1.0"
            )
        )

    # Fallback to cached rules_triggered on transaction if no executions table rows
    if not rule_signals and txn.rules_triggered:
        for rt in txn.rules_triggered:
            rule_signals.append(
                TransactionRuleSignal(
                    rule_id=rt.get("rule_id", "RULE-UNKNOWN"),
                    rule_name=rt.get("rule_name", rt.get("rule_id", "Rule Signal")),
                    category=rt.get("category", "AMOUNT"),
                    severity=rt.get("severity", "HIGH"),
                    score=float(rt.get("points", rt.get("score", 0.0))),
                    triggered=True,
                    reason=rt.get("details", {}).get("explanation", rt.get("reason", "Rule threshold exceeded")),
                    evidence=rt.get("details", {}).get("evidence"),
                    version=rt.get("version", "v1.0")
                )
            )

    # 3. Fetch ML Prediction
    ml_stmt = (
        select(MLPrediction, MLModelRegistry)
        .outerjoin(MLModelRegistry, MLPrediction.model_version_id == MLModelRegistry.id)
        .where(MLPrediction.transaction_id == txn.id)
    )
    ml_res = await db.execute(ml_stmt)
    ml_row = ml_res.first()
    ml_analysis = None
    if ml_row:
        ml_pred, ml_mod = ml_row
        indicators = []
        if float(ml_pred.anomaly_score) >= 0.65:
            indicators.append("Elevated multivariate feature deviation detected")
        if txn.failed_attempts and txn.failed_attempts > 0:
            indicators.append(f"{txn.failed_attempts} prior authentication attempt(s)")
        if txn.amount > 1000:
            indicators.append("High financial settlement magnitude")

        ml_analysis = TransactionMLAnalysis(
            model_name=ml_mod.model_name if ml_mod else "Isolation Forest",
            model_version=ml_mod.version if ml_mod else "v1.0.0",
            algorithm=ml_mod.algorithm if ml_mod else "Isolation Forest",
            anomaly_score=float(ml_pred.anomaly_score),
            prediction=ml_pred.prediction or ("ANOMALOUS" if ml_pred.anomaly_score >= 0.65 else "NORMAL"),
            confidence=float(ml_pred.confidence or 0.95),
            inference_time_ms=float(ml_pred.inference_time_ms or 0.0),
            contextual_indicators=indicators,
            created_at=ml_pred.created_at.isoformat() if ml_pred.created_at else None
        )
    elif txn.ml_anomaly_score is not None:
        indicators = []
        if float(txn.ml_anomaly_score) >= 0.65:
            indicators.append("Elevated isolation forest feature vector score")
        ml_analysis = TransactionMLAnalysis(
            model_name="Isolation Forest",
            model_version="v1.0.0",
            algorithm="Isolation Forest",
            anomaly_score=float(txn.ml_anomaly_score),
            prediction="ANOMALOUS" if txn.ml_anomaly_score >= 0.65 else "NORMAL",
            confidence=0.95,
            inference_time_ms=1.2,
            contextual_indicators=indicators,
            created_at=txn.created_at.isoformat() if txn.created_at else None
        )

    # 4. Fetch Feature Snapshot
    features_dict = {}
    feature_version = "v1.0.0"
    snap_stmt = select(FeatureSnapshot).where(FeatureSnapshot.transaction_id == txn.id)
    snap_res = await db.execute(snap_stmt)
    snapshot = snap_res.scalar_one_or_none()
    if snapshot and snapshot.features:
        features_dict = snapshot.features
        feature_version = features_dict.get("feature_version", "v1.0.0")
    else:
        txn_dict = {
            "id": txn.id,
            "transaction_id": txn.transaction_id,
            "user_id": txn.user_id,
            "merchant_id": txn.merchant_id,
            "merchant_name": txn.merchant_name,
            "merchant_category": txn.merchant_category,
            "amount": float(txn.amount),
            "currency": txn.currency,
            "payment_method": txn.payment_method,
            "device_id": txn.device_id,
            "city": txn.city,
            "country": txn.country,
            "latitude": txn.latitude,
            "longitude": txn.longitude,
            "failed_attempts": txn.failed_attempts,
            "transaction_timestamp": txn.transaction_timestamp
        }
        features_dict = await FeatureStore.extract_features(
            session=db,
            txn_dict=txn_dict,
            reference_time=txn.transaction_timestamp
        )
        feature_version = features_dict.get("feature_version", "v1.0.0")

    # 5. Fetch Related Alerts
    alerts_stmt = select(Alert).where(Alert.transaction_id == txn.id).order_by(desc(Alert.created_at))
    alerts_res = await db.execute(alerts_stmt)
    alerts_list = [
        TransactionAlertSummary(
            id=a.id,
            title=a.title or a.alert_reason or "Fraud Alert",
            severity=a.severity,
            status=a.status,
            alert_reason=a.alert_reason,
            created_at=a.created_at.isoformat() if a.created_at else None
        )
        for a in alerts_res.scalars().all()
    ]

    # 6. Fetch User Context
    user_context = None
    if txn.user_id:
        u_stmt = select(UserRiskProfile).where(UserRiskProfile.user_id == txn.user_id)
        u_res = await db.execute(u_stmt)
        u_profile = u_res.scalar_one_or_none()
        if u_profile:
            user_context = {
                "user_id": u_profile.user_id,
                "user_name": u_profile.user_name,
                "baseline_spending": float(u_profile.baseline_spending or 100.0),
                "total_transactions": int(u_profile.total_transactions_count or 0),
                "fraud_incident_count": int(u_profile.fraud_incident_count or 0),
                "active_risk_level": u_profile.active_risk_level or "LOW"
            }

    return TransactionInvestigationDetail(
        transaction=_to_transaction_response(txn),
        risk=risk_detail,
        rules=rule_signals,
        ml_prediction=ml_analysis,
        features=features_dict,
        feature_version=feature_version,
        alerts=alerts_list,
        user_context=user_context
    )

@router.get(
    "",
    response_model=List[TransactionResponse],
    summary="List transactions with bounded pagination, allowlisted sorting, and rich filtering"
)
async def list_transactions(
    response: Response,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page (max 100)"),
    limit: Optional[int] = Query(None, ge=1, le=100, description="Legacy limit alias"),
    offset: Optional[int] = Query(None, ge=0, description="Legacy offset alias"),
    sort: str = Query("timestamp", description="Sort field allowlist: timestamp, amount, created_at, status, risk_score"),
    order: str = Query("desc", pattern="^(asc|desc|ASC|DESC)$", description="Sort order: asc or desc"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    merchant_id: Optional[str] = Query(None, description="Filter by merchant ID"),
    merchant: Optional[str] = Query(None, alias="merchant_name", description="Filter by merchant name (partial match)"),
    device_id: Optional[str] = Query(None, description="Filter by device ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by transaction status"),
    risk_level: Optional[str] = Query(None, description="Filter by risk tier (LOW, MEDIUM, HIGH, CRITICAL)"),
    min_risk_score: Optional[float] = Query(None, ge=0.0, le=100.0, description="Minimum risk score (0-100)"),
    max_risk_score: Optional[float] = Query(None, ge=0.0, le=100.0, description="Maximum risk score (0-100)"),
    source: Optional[str] = Query(None, description="Filter by source (API, SIMULATOR, IMPORT, INTERNAL)"),
    currency: Optional[str] = Query(None, description="Filter by currency (e.g. USD)"),
    transaction_type: Optional[str] = Query(None, description="Filter by transaction type (PURCHASE, TRANSFER, etc.)"),
    payment_method: Optional[str] = Query(None, description="Filter by payment method (CREDIT_CARD, etc.)"),
    min_amount: Optional[float] = Query(None, ge=0, description="Minimum transaction amount"),
    max_amount: Optional[float] = Query(None, ge=0, description="Maximum transaction amount"),
    start_date: Optional[str] = Query(None, description="Start timestamp or date (ISO or YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End timestamp or date (ISO or YYYY-MM-DD)"),
    search: Optional[str] = Query(None, description="Search term across ID, user, merchant, city"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permissions(["transaction.read"]))
):
    """
    Lists transactions with safe pagination, allowlisted sorting, and rich multidimensional filtering.
    Attaches pagination metadata headers (X-Total-Count, X-Page, X-Page-Size, X-Total-Pages).
    """
    conditions = []

    # 1. Date Range Validation & Filtering
    start_dt = None
    end_dt = None
    if start_date:
        try:
            clean_start = start_date.strip().replace("Z", "+00:00")
            if len(clean_start) == 10:
                start_dt = datetime.fromisoformat(clean_start + "T00:00:00+00:00")
            else:
                start_dt = datetime.fromisoformat(clean_start)
                if start_dt.tzinfo is None:
                    start_dt = start_dt.replace(tzinfo=timezone.utc)
            conditions.append(Transaction.timestamp >= start_dt)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid start_date format '{start_date}'. Expected ISO format (e.g. 2026-09-01T00:00:00Z or 2026-09-01)."
            )

    if end_date:
        try:
            clean_end = end_date.strip().replace("Z", "+00:00")
            if len(clean_end) == 10:
                end_dt = datetime.fromisoformat(clean_end + "T23:59:59.999999+00:00")
            else:
                end_dt = datetime.fromisoformat(clean_end)
                if end_dt.tzinfo is None:
                    end_dt = end_dt.replace(tzinfo=timezone.utc)
            conditions.append(Transaction.timestamp <= end_dt)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid end_date format '{end_date}'. Expected ISO format (e.g. 2026-09-20T23:59:59Z or 2026-09-20)."
            )

    if start_dt and end_dt:
        if start_dt > end_dt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="start_date cannot be chronologically after end_date."
            )
        # Limit interactive date range to 90 days max
        if (end_dt - start_dt).days > 90:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Interactive date range cannot exceed 90 days. Please narrow your query window."
            )

    # 2. Entity & Attribute Filters
    if user_id:
        conditions.append(Transaction.user_id == user_id.strip())
    if merchant_id:
        conditions.append(Transaction.merchant_id == merchant_id.strip())
    if merchant:
        conditions.append(Transaction.merchant_name.ilike(f"%{merchant.strip()}%"))
    if device_id:
        conditions.append(Transaction.device_id == device_id.strip())
    if status_filter:
        conditions.append(Transaction.status == status_filter.strip().upper())
    if risk_level:
        conditions.append(Transaction.risk_level == risk_level.strip().upper())
    if min_risk_score is not None:
        conditions.append(Transaction.risk_score >= min_risk_score)
    if max_risk_score is not None:
        conditions.append(Transaction.risk_score <= max_risk_score)
    if source:
        conditions.append(Transaction.source == source.strip().upper())
    if currency:
        conditions.append(Transaction.currency == currency.strip().upper())
    if transaction_type:
        conditions.append(Transaction.transaction_type == transaction_type.strip().upper())
    if payment_method:
        conditions.append(Transaction.payment_method == payment_method.strip().upper())
    if min_amount is not None:
        conditions.append(Transaction.amount >= min_amount)
    if max_amount is not None:
        conditions.append(Transaction.amount <= max_amount)
    if search:
        s = f"%{search.strip()}%"
        conditions.append(
            or_(
                Transaction.id.ilike(s),
                Transaction.transaction_id.ilike(s),
                Transaction.user_id.ilike(s),
                Transaction.merchant_name.ilike(s),
                Transaction.city.ilike(s),
                Transaction.device_id.ilike(s)
            )
        )

    # Base query
    base_query = select(Transaction)
    count_query = select(func.count(Transaction.id))

    if conditions:
        base_query = base_query.where(and_(*conditions))
        count_query = count_query.where(and_(*conditions))

    # Total record count
    total_count_res = await db.execute(count_query)
    total_count = total_count_res.scalar_one() or 0

    # Determine pagination
    actual_page_size = min(limit if limit is not None else page_size, 100)
    actual_offset = offset if offset is not None else ((page - 1) * actual_page_size)
    actual_page = (actual_offset // actual_page_size) + 1 if actual_page_size > 0 else 1
    total_pages = max(1, (total_count + actual_page_size - 1) // actual_page_size) if actual_page_size > 0 else 1

    # Safe allowlisted sorting
    sort_column = ALLOWED_SORT_FIELDS.get(sort.lower(), Transaction.timestamp)
    order_func = asc if order.lower() == "asc" else desc
    base_query = base_query.order_by(order_func(sort_column))

    # Apply pagination bounds
    paginated_query = base_query.offset(actual_offset).limit(actual_page_size)
    result = await db.execute(paginated_query)
    txns = result.scalars().all()

    # Set pagination response headers
    response.headers["X-Total-Count"] = str(total_count)
    response.headers["X-Page"] = str(actual_page)
    response.headers["X-Page-Size"] = str(actual_page_size)
    response.headers["X-Total-Pages"] = str(total_pages)

    return [_to_transaction_response(t) for t in txns]


@router.get(
    "/{txn_id}/features",
    summary="Get feature snapshot for a specific transaction"
)
async def get_transaction_features(
    txn_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permissions(["transaction.read"]))
):
    """
    Retrieves the engineered feature snapshot for a transaction.
    If snapshot does not exist, computes features on demand using the historical context available at transaction time.
    """
    # 1. Check existing FeatureSnapshot
    snap_stmt = select(FeatureSnapshot).where(FeatureSnapshot.transaction_id == txn_id)
    snap_res = await db.execute(snap_stmt)
    snapshot = snap_res.scalar_one_or_none()

    if snapshot:
        features_data = snapshot.features or {}
        return {
            "transaction_id": txn_id,
            "feature_version": features_data.get("feature_version", "v1.0.0"),
            "features": features_data,
            "created_at": snapshot.created_at.isoformat() if snapshot.created_at else ""
        }

    # 2. If not stored yet, look up transaction and compute on demand
    txn_stmt = select(Transaction).where(or_(Transaction.id == txn_id, Transaction.transaction_id == txn_id))
    txn_res = await db.execute(txn_stmt)
    txn = txn_res.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Transaction '{txn_id}' not found.")

    txn_dict = {
        "id": txn.id,
        "transaction_id": txn.transaction_id,
        "user_id": txn.user_id,
        "user_name": txn.user_name,
        "merchant_name": txn.merchant_name,
        "merchant_category": txn.merchant_category,
        "amount": float(txn.amount),
        "currency": txn.currency,
        "payment_method": txn.payment_method,
        "device_id": txn.device_id,
        "city": txn.city,
        "country": txn.country,
        "latitude": txn.latitude,
        "longitude": txn.longitude,
        "failed_attempts": txn.failed_attempts,
        "transaction_timestamp": txn.transaction_timestamp
    }

    features = await FeatureStore.extract_features(
        session=db,
        txn_dict=txn_dict,
        reference_time=txn.transaction_timestamp
    )

    return {
        "transaction_id": txn.id,
        "feature_version": features.get("feature_version", "v1.0.0"),
        "features": features,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

@router.post(
    "/{txn_id}/recompute-features",
    summary="Recompute feature snapshot for an existing transaction"
)
async def recompute_transaction_features(
    txn_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permissions(["transaction.create"]))
):
    """
    Recomputes and persists the feature snapshot for an existing transaction strictly using
    the historical context prior to that transaction's timestamp.
    """
    txn_stmt = select(Transaction).where(or_(Transaction.id == txn_id, Transaction.transaction_id == txn_id))
    txn_res = await db.execute(txn_stmt)
    txn = txn_res.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Transaction '{txn_id}' not found.")

    txn_dict = {
        "id": txn.id,
        "transaction_id": txn.transaction_id,
        "user_id": txn.user_id,
        "user_name": txn.user_name,
        "merchant_name": txn.merchant_name,
        "merchant_category": txn.merchant_category,
        "amount": float(txn.amount),
        "currency": txn.currency,
        "payment_method": txn.payment_method,
        "device_id": txn.device_id,
        "city": txn.city,
        "country": txn.country,
        "latitude": txn.latitude,
        "longitude": txn.longitude,
        "failed_attempts": txn.failed_attempts,
        "transaction_timestamp": txn.transaction_timestamp
    }

    features = await FeatureStore.extract_features(
        session=db,
        txn_dict=txn_dict,
        reference_time=txn.transaction_timestamp
    )

    # Upsert FeatureSnapshot
    snap_stmt = select(FeatureSnapshot).where(FeatureSnapshot.transaction_id == txn.id)
    snap_res = await db.execute(snap_stmt)
    snapshot = snap_res.scalar_one_or_none()

    if snapshot:
        snapshot.features = features
    else:
        snapshot = FeatureSnapshot(
            id=str(uuid.uuid4()),
            transaction_id=txn.id,
            features=features,
            created_at=datetime.now(timezone.utc)
        )
        db.add(snapshot)

    await db.commit()
    await db.refresh(snapshot)

    return {
        "message": f"Successfully recomputed features for transaction {txn.id}",
        "transaction_id": txn.id,
        "feature_version": features.get("feature_version", "v1.0.0"),
        "features": features
    }


@router.post(
    "/{txn_id}/evaluate-rules",
    response_model=TransactionRulesEvaluateResponse,
    summary="Evaluate rule engine against transaction features without computing final ML/risk score"
)
async def evaluate_transaction_rules(
    txn_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permissions(["transaction.read", "rule.read"]))
):
    """
    Evaluates all active fraud detection rules against a transaction's feature snapshot.
    Persists RuleExecution records and returns structured deterministic signals with explanations and evidence.
    Does NOT calculate final risk score or generate alerts.
    """
    stmt = select(Transaction).where(or_(Transaction.id == txn_id, Transaction.transaction_id == txn_id))
    res = await db.execute(stmt)
    txn = res.scalar_one_or_none()
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction '{txn_id}' not found."
        )

    # Check for existing feature snapshot
    snap_stmt = select(FeatureSnapshot).where(FeatureSnapshot.transaction_id == txn.id)
    snap_res = await db.execute(snap_stmt)
    snapshot = snap_res.scalar_one_or_none()

    if snapshot and snapshot.features:
        features = snapshot.features
    else:
        txn_dict = {
            "id": txn.id,
            "transaction_id": txn.transaction_id,
            "user_id": txn.user_id,
            "merchant_id": txn.merchant_id,
            "merchant_name": txn.merchant_name,
            "merchant_category": txn.merchant_category,
            "amount": float(txn.amount),
            "currency": txn.currency,
            "payment_method": txn.payment_method,
            "device_id": txn.device_id,
            "city": txn.city,
            "country": txn.country,
            "latitude": txn.latitude,
            "longitude": txn.longitude,
            "failed_attempts": txn.failed_attempts,
            "transaction_timestamp": txn.transaction_timestamp
        }
        features = await FeatureStore.extract_features(
            session=db,
            txn_dict=txn_dict,
            reference_time=txn.transaction_timestamp
        )

    txn_dict = {
        "id": txn.id,
        "transaction_id": txn.transaction_id,
        "user_id": txn.user_id,
        "merchant_id": txn.merchant_id,
        "merchant_name": txn.merchant_name,
        "merchant_category": txn.merchant_category,
        "amount": float(txn.amount),
        "currency": txn.currency,
        "payment_method": txn.payment_method,
        "device_id": txn.device_id,
        "city": txn.city,
        "country": txn.country,
        "latitude": txn.latitude,
        "longitude": txn.longitude,
        "failed_attempts": txn.failed_attempts,
        "transaction_timestamp": txn.transaction_timestamp
    }

    eval_result = await FraudRuleEngineService.evaluate_transaction_rules(
        session=db,
        transaction_dict=txn_dict,
        features=features,
        persist_executions=True
    )
    await db.commit()

    def _convert_item(item):
        return RuleEvaluationDetailResponse(
            rule_code=item.rule_code,
            rule_id=item.rule_id,
            rule_version=item.rule_version,
            rule_version_id=item.rule_version_id,
            name=item.name,
            category=item.category,
            severity=item.severity.value if hasattr(item.severity, "value") else str(item.severity),
            triggered=item.triggered,
            score=item.score,
            weight=item.weight,
            reason=item.reason,
            evidence=item.evidence.model_dump() if item.evidence else None,
            matched_features=item.matched_features,
            execution_time_ms=item.execution_time_ms,
            error=item.error
        )

    return TransactionRulesEvaluateResponse(
        transaction_id=eval_result.transaction_id,
        total_score=eval_result.total_score,
        triggered_count=eval_result.triggered_count,
        total_evaluated_count=eval_result.total_evaluated_count,
        triggered_rules=[_convert_item(r) for r in eval_result.triggered_rules],
        all_rules=[_convert_item(r) for r in eval_result.all_rules],
        execution_duration_ms=eval_result.execution_duration_ms
    )

