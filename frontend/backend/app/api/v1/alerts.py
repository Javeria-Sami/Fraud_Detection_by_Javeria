"""
Alert Management, Evaluation, Triage, and Investigation API Endpoints.
Section 10 & 14 — Alert Engine & Alert Center.
Guarded by granular RBAC with lifecycle state transition validation, optimistic concurrency, and audit logging.
"""
import uuid
import math
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, asc, and_, or_, func

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_payload, require_roles
from backend.app.core.audit import AuditService
from backend.app.models.alert import Alert
from backend.app.models.transaction import Transaction
from backend.app.models.risk_score import RiskScore
from backend.app.models.rule import RuleExecution, FraudRule
from backend.app.models.ml_model import MLPrediction, MLModelRegistry
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.alert import (
    AlertResponse,
    AlertPaginatedResponse,
    AlertStatsResponse,
    AlertInvestigationDetail,
    AlertUpdate,
    AlertActionRequest,
    AlertAssignRequest,
    AlertEvaluateRequest,
    AlertDecisionResponse,
    AlertConfigResponse,
    AlertConfigUpdateRequest
)
from backend.app.engine.risk.types import RiskResult, RiskLevel, RiskExplanationFactor
from backend.app.engine.alerts.types import AlertDecision, AlertSeverity, AlertStatus
from backend.app.engine.alerts.config import AlertEngineConfig
from backend.app.engine.alerts.lifecycle import AlertLifecycleManager, InvalidAlertStateTransitionError
from backend.app.engine.alerts.service import AlertEngineService
from backend.app.engine.events.publisher import EventPublisher

router = APIRouter(prefix="/alerts", tags=["Alerts"])

# Allowlisted fields for safe ordering
SORT_FIELDS = {
    "created_at": Alert.created_at,
    "risk_score": Alert.risk_score,
    "severity": Alert.severity,
    "status": Alert.status,
    "updated_at": Alert.updated_at,
}

MAX_DATE_RANGE_DAYS = 90


def _to_alert_response(a: Alert) -> AlertResponse:
    return AlertResponse(
        id=a.id,
        transaction_id=a.transaction_id,
        user_id=a.user_id,
        severity=a.severity,
        risk_score=float(a.risk_score or 0.0),
        alert_reason=a.alert_reason,
        title=a.title or "Fraud Alert",
        description=a.description,
        triggered_rules=a.triggered_rules or [],
        model_version=a.model_version or "v1.0.0",
        status=a.status,
        assigned_to=a.assigned_to,
        case_id=a.case_id,
        acknowledged_at=a.acknowledged_at.isoformat() if a.acknowledged_at else None,
        resolved_at=a.resolved_at.isoformat() if a.resolved_at else None,
        closed_at=a.closed_at.isoformat() if a.closed_at else None,
        created_at=a.created_at.isoformat() if a.created_at else None,
        updated_at=a.updated_at.isoformat() if a.updated_at else None
    )


def _build_alert_filter_conditions(
    severity: Optional[str] = None,
    status_filter: Optional[str] = None,
    user_id: Optional[str] = None,
    transaction_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    is_unassigned: Optional[bool] = None,
    min_risk_score: Optional[float] = None,
    max_risk_score: Optional[float] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None
) -> List[Any]:
    conditions = []

    if severity:
        conditions.append(Alert.severity == severity.upper().strip())
    if status_filter:
        s_val = status_filter.upper().strip()
        if s_val == "OPEN":
            conditions.append(Alert.status.in_(["NEW", "OPEN"]))
        elif s_val == "INVESTIGATING" or s_val == "IN_PROGRESS":
            conditions.append(Alert.status.in_(["INVESTIGATING", "IN_PROGRESS"]))
        else:
            conditions.append(Alert.status == s_val)
    if user_id:
        conditions.append(Alert.user_id == user_id.strip())
    if transaction_id:
        conditions.append(Alert.transaction_id == transaction_id.strip())
    if is_unassigned is True:
        conditions.append(Alert.assigned_to.is_(None))
    elif assigned_to:
        conditions.append(Alert.assigned_to == assigned_to.strip())

    if min_risk_score is not None:
        conditions.append(Alert.risk_score >= min_risk_score)
    if max_risk_score is not None:
        conditions.append(Alert.risk_score <= max_risk_score)

    if start_date:
        try:
            parsed_start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid start_date format. Use ISO 8601 (e.g., YYYY-MM-DDTHH:MM:SSZ)."
            )
        conditions.append(Alert.created_at >= parsed_start)

    if end_date:
        try:
            parsed_end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid end_date format. Use ISO 8601 (e.g., YYYY-MM-DDTHH:MM:SSZ)."
            )
        conditions.append(Alert.created_at <= parsed_end)

    if start_date and end_date:
        parsed_start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        parsed_end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        if parsed_start > parsed_end:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="start_date cannot be greater than end_date."
            )
        if (parsed_end - parsed_start).days > MAX_DATE_RANGE_DAYS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Query date range exceeds maximum allowed interactive span of {MAX_DATE_RANGE_DAYS} days."
            )

    if search:
        search_term = f"%{search.strip()}%"
        conditions.append(
            or_(
                Alert.id.ilike(search_term),
                Alert.alert_id.ilike(search_term),
                Alert.transaction_id.ilike(search_term),
                Alert.user_id.ilike(search_term),
                Alert.title.ilike(search_term),
                Alert.alert_reason.ilike(search_term),
                Alert.assigned_to.ilike(search_term)
            )
        )

    return conditions


@router.get("/config", response_model=AlertConfigResponse)
async def get_alert_configuration(
    current_user: Dict[str, Any] = Depends(get_current_user_payload)
):
    """
    Retrieves active Alert Engine configuration, thresholds, priority mappings, and cooldown parameters.
    """
    cfg = AlertEngineService.get_config()
    return AlertConfigResponse(
        alert_config_version=cfg.alert_config_version,
        high_risk_threshold=cfg.high_risk_threshold,
        critical_risk_threshold=cfg.critical_risk_threshold,
        ml_anomaly_threshold=cfg.ml_anomaly_threshold,
        cooldown_seconds=cfg.cooldown_seconds,
        enable_cooldown=cfg.enable_cooldown,
        enable_critical_cooldown_override=cfg.enable_critical_cooldown_override,
        enabled_alert_types=cfg.enabled_alert_types,
        severity_priority_map=cfg.severity_priority_map
    )


@router.patch("/config", response_model=AlertConfigResponse, dependencies=[Depends(require_roles(["admin"]))])
async def update_alert_configuration(
    payload: AlertConfigUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_payload)
):
    """
    Updates Alert Engine parameters (thresholds, cooldowns, mappings). Admin only.
    Audits the configuration change in the immutable audit log.
    """
    current_cfg = AlertEngineService.get_config()
    cfg_data = current_cfg.model_dump()

    update_dict = payload.model_dump(exclude_unset=True, exclude_none=True)
    cfg_data.update(update_dict)

    try:
        new_config = AlertEngineConfig(**cfg_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid alert configuration: {str(e)}"
        )

    AlertEngineService.set_config(new_config)

    # Audit log
    await AuditService.log_action(
        session=db,
        actor_email=current_user.get("sub", "admin@platform.local"),
        actor_role=current_user.get("role", "ADMIN"),
        action="UPDATE_ALERT_CONFIG",
        target_entity="alert_config",
        target_id=new_config.alert_config_version,
        diff_new=update_dict,
        details="Updated Alert Engine thresholds and parameters."
    )

    return AlertConfigResponse(
        alert_config_version=new_config.alert_config_version,
        high_risk_threshold=new_config.high_risk_threshold,
        critical_risk_threshold=new_config.critical_risk_threshold,
        ml_anomaly_threshold=new_config.ml_anomaly_threshold,
        cooldown_seconds=new_config.cooldown_seconds,
        enable_cooldown=new_config.enable_cooldown,
        enable_critical_cooldown_override=new_config.enable_critical_cooldown_override,
        enabled_alert_types=new_config.enabled_alert_types,
        severity_priority_map=new_config.severity_priority_map
    )


@router.get("/stats", response_model=AlertStatsResponse)
async def get_alert_stats(
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_payload)
):
    """
    Retrieves operational KPI metrics for the Alert Center top summary cards.
    """
    now_utc = datetime.now(timezone.utc)
    start_of_today = datetime(now_utc.year, now_utc.month, now_utc.day, tzinfo=timezone.utc)

    # Aggregated metric queries
    total_q = select(func.count(Alert.id))
    total_res = await db.execute(total_q)
    total_alerts = total_res.scalar_one() or 0

    open_q = select(func.count(Alert.id)).where(Alert.status.in_(["NEW", "OPEN", "ACKNOWLEDGED", "INVESTIGATING", "IN_PROGRESS"]))
    open_res = await db.execute(open_q)
    open_alerts = open_res.scalar_one() or 0

    crit_q = select(func.count(Alert.id)).where(
        and_(
            Alert.severity == "CRITICAL",
            Alert.status.in_(["NEW", "OPEN", "ACKNOWLEDGED", "INVESTIGATING", "IN_PROGRESS"])
        )
    )
    crit_res = await db.execute(crit_q)
    critical_alerts = crit_res.scalar_one() or 0

    high_pri_q = select(func.count(Alert.id)).where(
        and_(
            Alert.severity.in_(["CRITICAL", "HIGH"]),
            Alert.status.in_(["NEW", "OPEN", "ACKNOWLEDGED", "INVESTIGATING", "IN_PROGRESS"])
        )
    )
    high_pri_res = await db.execute(high_pri_q)
    high_priority_alerts = high_pri_res.scalar_one() or 0

    unassigned_q = select(func.count(Alert.id)).where(
        and_(
            Alert.assigned_to.is_(None),
            Alert.status.in_(["NEW", "OPEN", "ACKNOWLEDGED", "INVESTIGATING", "IN_PROGRESS"])
        )
    )
    unassigned_res = await db.execute(unassigned_q)
    unassigned_alerts = unassigned_res.scalar_one() or 0

    escalated_q = select(func.count(Alert.id)).where(Alert.status == "ESCALATED")
    escalated_res = await db.execute(escalated_q)
    escalated_alerts = escalated_res.scalar_one() or 0

    resolved_today_q = select(func.count(Alert.id)).where(
        and_(
            Alert.status == "RESOLVED",
            Alert.resolved_at >= start_of_today
        )
    )
    resolved_today_res = await db.execute(resolved_today_q)
    resolved_today = resolved_today_res.scalar_one() or 0

    return AlertStatsResponse(
        total_alerts=total_alerts,
        open_alerts=open_alerts,
        critical_alerts=critical_alerts,
        high_priority_alerts=high_priority_alerts,
        unassigned_alerts=unassigned_alerts,
        escalated_alerts=escalated_alerts,
        resolved_today=resolved_today
    )


@router.get("/paginated", response_model=AlertPaginatedResponse)
async def list_alerts_paginated(
    severity: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    user_id: Optional[str] = None,
    transaction_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    is_unassigned: Optional[bool] = None,
    min_risk_score: Optional[float] = Query(None, ge=0.0, le=100.0),
    max_risk_score: Optional[float] = Query(None, ge=0.0, le=100.0),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("created_at", description="Field to sort by"),
    order: str = Query("desc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Paginated alert listing with rich multi-field filters, indexed sorting, and total count envelope.
    """
    conditions = _build_alert_filter_conditions(
        severity=severity,
        status_filter=status_filter,
        user_id=user_id,
        transaction_id=transaction_id,
        assigned_to=assigned_to,
        is_unassigned=is_unassigned,
        min_risk_score=min_risk_score,
        max_risk_score=max_risk_score,
        start_date=start_date,
        end_date=end_date,
        search=search
    )

    # 1. Total count query
    count_query = select(func.count(Alert.id))
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total_res = await db.execute(count_query)
    total = total_res.scalar_one() or 0

    # 2. Paginated items query
    query = select(Alert)
    if conditions:
        query = query.where(and_(*conditions))

    sort_column = SORT_FIELDS.get(sort_by, Alert.created_at)
    if order.lower() == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    alerts = result.scalars().all()
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return AlertPaginatedResponse(
        items=[_to_alert_response(a) for a in alerts],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("", response_model=List[AlertResponse])
async def list_alerts(
    response: Response,
    severity: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    user_id: Optional[str] = None,
    transaction_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    is_unassigned: Optional[bool] = None,
    min_risk_score: Optional[float] = Query(None, ge=0.0, le=100.0),
    max_risk_score: Optional[float] = Query(None, ge=0.0, le=100.0),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("created_at", description="Field to sort by"),
    order: str = Query("desc", description="Sort order: asc or desc"),
    page: Optional[int] = Query(None, ge=1),
    page_size: Optional[int] = Query(None, ge=1, le=100),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Lists operational alerts with robust filtering, pagination headers, and allowlisted sorting.
    """
    conditions = _build_alert_filter_conditions(
        severity=severity,
        status_filter=status_filter,
        user_id=user_id,
        transaction_id=transaction_id,
        assigned_to=assigned_to,
        is_unassigned=is_unassigned,
        min_risk_score=min_risk_score,
        max_risk_score=max_risk_score,
        start_date=start_date,
        end_date=end_date,
        search=search
    )

    # Total Count
    count_query = select(func.count(Alert.id))
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total_res = await db.execute(count_query)
    total = total_res.scalar_one() or 0

    query = select(Alert)
    if conditions:
        query = query.where(and_(*conditions))

    # Safe allowlisted sorting
    sort_column = SORT_FIELDS.get(sort_by, Alert.created_at)
    if order.lower() == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    if page is not None and page_size is not None:
        effective_offset = (page - 1) * page_size
        effective_limit = page_size
        total_pages = math.ceil(total / page_size) if total > 0 else 1
    else:
        effective_offset = offset
        effective_limit = limit
        total_pages = math.ceil(total / limit) if total > 0 else 1

    query = query.offset(effective_offset).limit(effective_limit)
    result = await db.execute(query)
    alerts = result.scalars().all()

    # Expose pagination headers
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(page or ((offset // limit) + 1))
    response.headers["X-Page-Size"] = str(effective_limit)
    response.headers["X-Total-Pages"] = str(total_pages)

    return [_to_alert_response(a) for a in alerts]


@router.post("/evaluate", response_model=AlertDecisionResponse)
async def evaluate_alert_decision(
    req: AlertEvaluateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_payload)
):
    """
    Evaluates alert conditions for a given risk score and signal set on-demand.
    Optionally persists the generated alert when persist=True.
    """
    factors = [
        RiskExplanationFactor(
            factor_name=f"Rule: {r.get('rule_name', r.get('rule_code', 'RULE'))}",
            code=r.get("rule_code", "RULE"),
            weight=1.0,
            score=float(r.get("score") or r.get("points", 50.0)),
            contribution=float(r.get("score") or r.get("points", 50.0)),
            description=r.get("reason") or r.get("details", {}).get("explanation", f"Rule triggered."),
            evidence=r.get("details", {}).get("evidence") or r.get("evidence")
        )
        for r in req.triggered_rules
    ]

    risk_res = RiskResult(
        transaction_id=req.transaction_id or "TX-MANUAL-EVAL",
        risk_score=req.risk_score,
        risk_level=RiskLevel(req.risk_level) if req.risk_level in RiskLevel.__members__ else RiskLevel.LOW,
        rule_score=req.risk_score if req.triggered_rules else 0.0,
        ml_score=float(req.ml_anomaly_score * 100.0) if req.ml_anomaly_score is not None else 0.0,
        behavior_score=0.0,
        factors=factors
    )

    txn_dict = {
        "id": req.transaction_id or "TX-MANUAL-EVAL",
        "transaction_id": req.transaction_id or "TX-MANUAL-EVAL",
        "user_id": req.user_id
    }

    decision = AlertEngineService.evaluate_decision(risk_res, txn_dict)
    created_alert_id = None

    if req.persist and decision.should_create_alert:
        created_alert = await AlertEngineService.process_and_persist_alert(
            session=db,
            risk_result=risk_res,
            transaction_dict=txn_dict
        )
        if created_alert:
            created_alert_id = created_alert.id
            await db.commit()
            await EventPublisher.publish_alert_created(created_alert)

    return AlertDecisionResponse(
        should_create_alert=decision.should_create_alert,
        alert_type=decision.alert_type.value if decision.alert_type else None,
        severity=decision.severity.value,
        priority=decision.priority.value,
        title=decision.title,
        description=decision.description,
        reason=decision.reason,
        evidence=decision.evidence,
        deduplication_key=decision.deduplication_key,
        suppressed_by_cooldown=decision.suppressed_by_cooldown,
        configuration_version=decision.configuration_version,
        created_alert_id=created_alert_id
    )


@router.get("/{alert_id}/investigate", response_model=AlertInvestigationDetail)
async def investigate_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Comprehensive investigation endpoint returning joined transaction telemetry,
    risk scores, rule executions & evidence, ML anomaly predictions, and lifecycle audit history.
    """
    stmt = select(Alert).where(or_(Alert.id == alert_id, Alert.alert_id == alert_id))
    res = await db.execute(stmt)
    alert = res.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert with ID '{alert_id}' not found.")

    # 1. Fetch Related Transaction
    txn_data = None
    if alert.transaction_id:
        t_stmt = select(Transaction).where(Transaction.id == alert.transaction_id)
        t_res = await db.execute(t_stmt)
        txn = t_res.scalar_one_or_none()
        if txn:
            card_pan = getattr(txn, "card_number_encrypted", None) or ""
            masked_pan = f"•••• {card_pan[-4:]}" if len(card_pan) >= 4 else "•••• 4821"
            txn_data = {
                "id": txn.id,
                "transaction_id": txn.transaction_id or txn.id,
                "user_id": txn.user_id,
                "user_name": txn.user_name,
                "amount": float(txn.amount),
                "currency": txn.currency or "USD",
                "payment_method": txn.payment_method,
                "masked_card_number": masked_pan,
                "merchant_name": txn.merchant_name,
                "merchant_category": txn.merchant_category,
                "device_id": txn.device_id,
                "city": txn.city,
                "country": txn.country,
                "latitude": float(txn.latitude) if txn.latitude else None,
                "longitude": float(txn.longitude) if txn.longitude else None,
                "status": txn.status,
                "transaction_timestamp": txn.transaction_timestamp.isoformat() if txn.transaction_timestamp else None,
                "created_at": txn.created_at.isoformat() if txn.created_at else None
            }

    # 2. Fetch Risk Context
    risk_data = None
    r_stmt = select(RiskScore).where(RiskScore.transaction_id == alert.transaction_id).order_by(desc(RiskScore.created_at))
    r_res = await db.execute(r_stmt)
    r_score = r_res.scalar_one_or_none()
    if r_score:
        risk_data = {
            "risk_score": float(r_score.score),
            "risk_level": r_score.risk_level,
            "rule_score": float(r_score.rule_score or 0.0),
            "ml_score": float(r_score.ml_score or 0.0),
            "behavior_score": float(r_score.behavior_score or 0.0),
            "explanation": r_score.explanation or [],
            "scoring_version": r_score.scoring_version or "v1.0",
            "calculated_at": r_score.created_at.isoformat() if r_score.created_at else None
        }
    elif alert.risk_score is not None:
        risk_data = {
            "risk_score": float(alert.risk_score),
            "risk_level": alert.severity,
            "rule_score": float(alert.risk_score),
            "ml_score": 0.0,
            "behavior_score": 0.0,
            "explanation": [alert.alert_reason] if alert.alert_reason else [],
            "scoring_version": alert.model_version or "v1.0",
            "calculated_at": alert.created_at.isoformat() if alert.created_at else None
        }

    # 3. Fetch Rule Signals
    rule_signals = []
    rules_stmt = (
        select(RuleExecution, FraudRule)
        .outerjoin(FraudRule, RuleExecution.rule_id == FraudRule.id)
        .where(RuleExecution.transaction_id == alert.transaction_id)
        .order_by(desc(RuleExecution.triggered), desc(RuleExecution.score))
    )
    rules_res = await db.execute(rules_stmt)
    for r_exec, r_rule in rules_res.all():
        rule_signals.append({
            "rule_id": r_exec.rule_id,
            "rule_name": r_rule.name if r_rule else r_exec.rule_id,
            "category": r_rule.category if r_rule else "GENERAL",
            "severity": r_rule.severity if r_rule else "MEDIUM",
            "score": float(r_exec.score or 0.0),
            "triggered": bool(r_exec.triggered),
            "reason": r_exec.reason,
            "evidence": r_exec.execution_detail if hasattr(r_exec, 'execution_detail') else None,
            "version": r_rule.version if r_rule else "v1.0"
        })

    if not rule_signals and alert.triggered_rules:
        for tr in alert.triggered_rules:
            if isinstance(tr, dict):
                rule_signals.append({
                    "rule_id": tr.get("code", tr.get("rule_id", "RULE-SIGNAL")),
                    "rule_name": tr.get("factor_name", tr.get("rule_name", "Rule Signal")),
                    "category": tr.get("category", "FRAUD_CHECK"),
                    "severity": tr.get("severity", alert.severity),
                    "score": float(tr.get("score", tr.get("contribution", 0.0))),
                    "triggered": True,
                    "reason": tr.get("description", tr.get("reason", alert.alert_reason)),
                    "evidence": tr.get("evidence"),
                    "version": "v1.0"
                })

    # 4. Fetch ML Prediction
    ml_analysis = None
    ml_stmt = (
        select(MLPrediction, MLModelRegistry)
        .outerjoin(MLModelRegistry, MLPrediction.model_version_id == MLModelRegistry.id)
        .where(MLPrediction.transaction_id == alert.transaction_id)
    )
    ml_res = await db.execute(ml_stmt)
    ml_row = ml_res.first()
    if ml_row:
        ml_pred, ml_mod = ml_row
        ml_analysis = {
            "model_name": ml_mod.model_name if ml_mod else "Isolation Forest",
            "model_version": ml_mod.version if ml_mod else "v1.0.0",
            "algorithm": ml_mod.algorithm if ml_mod else "Isolation Forest",
            "anomaly_score": float(ml_pred.anomaly_score),
            "is_anomaly": bool(ml_pred.is_anomaly),
            "threshold": float(ml_pred.threshold) if ml_pred.threshold else 0.65,
            "inference_time_ms": float(ml_pred.inference_duration_ms or 1.2),
            "contextual_indicators": ["Feature distribution anomaly detected across user history."] if ml_pred.is_anomaly else [],
            "prediction_timestamp": ml_pred.created_at.isoformat() if ml_pred.created_at else None
        }

    # 5. Fetch Lifecycle History from Audit Logs
    audit_stmt = select(AuditLog).where(
        and_(
            AuditLog.target_entity == "Alert",
            AuditLog.target_id == alert.id
        )
    ).order_by(desc(AuditLog.timestamp))
    audit_res = await db.execute(audit_stmt)
    lifecycle_history = [
        {
            "id": log.id,
            "actor_email": log.actor_email,
            "actor_role": log.actor_role,
            "action": log.action,
            "diff_old": log.diff_old,
            "diff_new": log.diff_new,
            "details": log.details,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None
        }
        for log in audit_res.scalars().all()
    ]

    return AlertInvestigationDetail(
        alert=_to_alert_response(alert),
        transaction=txn_data,
        risk=risk_data,
        rules=rule_signals,
        ml_prediction=ml_analysis,
        lifecycle_history=lifecycle_history
    )


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Fetches detailed metadata, evidence, and lifecycle state for a specific alert.
    """
    stmt = select(Alert).where(or_(Alert.id == alert_id, Alert.alert_id == alert_id))
    res = await db.execute(stmt)
    alert = res.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert with ID '{alert_id}' not found.")

    return _to_alert_response(alert)


@router.patch("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: str,
    update_data: AlertUpdate,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Updates alert lifecycle status with state-machine transition validation,
    optimistic concurrency checking, audit logging, and WebSocket event broadcast.
    """
    stmt = select(Alert).where(or_(Alert.id == alert_id, Alert.alert_id == alert_id))
    res = await db.execute(stmt)
    alert = res.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert with ID '{alert_id}' not found.")

    # Concurrency check
    if update_data.expected_status and alert.status != update_data.expected_status:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This alert was updated by another user (current status is '{alert.status}'). Refresh to view latest state."
        )

    old_status = alert.status

    if update_data.status:
        try:
            alert = await AlertEngineService.update_alert_status(
                session=db,
                alert=alert,
                new_status=update_data.status,
                actor_email=user_payload.get("sub", user_payload.get("email", "analyst@platform.local")),
                actor_role=user_payload.get("role", "ANALYST"),
                assigned_to=update_data.assigned_to,
                case_id=update_data.case_id,
                note=update_data.note
            )
        except InvalidAlertStateTransitionError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    else:
        if update_data.assigned_to is not None:
            alert.assigned_to = update_data.assigned_to
        if update_data.case_id is not None:
            alert.case_id = update_data.case_id
        alert.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(alert)

    # Broadcast real-time update
    await EventPublisher.publish_alert_updated(
        alert_id=alert.id,
        diff={
            "status": alert.status,
            "assigned_to": alert.assigned_to,
            "case_id": alert.case_id,
            "updated_at": alert.updated_at.isoformat() if alert.updated_at else None
        },
        severity=alert.severity
    )

    return _to_alert_response(alert)


@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: str,
    payload: Optional[AlertActionRequest] = None,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Transitions alert status to ACKNOWLEDGED, setting acknowledged_at timestamp.
    """
    stmt = select(Alert).where(or_(Alert.id == alert_id, Alert.alert_id == alert_id))
    res = await db.execute(stmt)
    alert = res.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert with ID '{alert_id}' not found.")

    if payload and payload.expected_status and alert.status != payload.expected_status:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This alert was updated by another user (current status is '{alert.status}'). Refresh to view latest state."
        )

    try:
        alert = await AlertEngineService.update_alert_status(
            session=db,
            alert=alert,
            new_status="ACKNOWLEDGED",
            actor_email=user_payload.get("sub", user_payload.get("email", "analyst@platform.local")),
            actor_role=user_payload.get("role", "ANALYST"),
            assigned_to=alert.assigned_to or user_payload.get("sub"),
            note=payload.note if payload else "Alert acknowledged by analyst."
        )
    except InvalidAlertStateTransitionError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    await db.commit()
    await db.refresh(alert)

    await EventPublisher.publish_alert_updated(
        alert_id=alert.id,
        diff={
            "status": alert.status,
            "assigned_to": alert.assigned_to,
            "acknowledged_at": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
            "updated_at": alert.updated_at.isoformat() if alert.updated_at else None
        },
        severity=alert.severity
    )

    return _to_alert_response(alert)


@router.post("/{alert_id}/investigate", response_model=AlertResponse)
async def start_investigating_alert(
    alert_id: str,
    payload: Optional[AlertActionRequest] = None,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Transitions alert status to INVESTIGATING / IN_PROGRESS.
    """
    stmt = select(Alert).where(or_(Alert.id == alert_id, Alert.alert_id == alert_id))
    res = await db.execute(stmt)
    alert = res.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert with ID '{alert_id}' not found.")

    if payload and payload.expected_status and alert.status != payload.expected_status:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This alert was updated by another user (current status is '{alert.status}'). Refresh to view latest state."
        )

    try:
        alert = await AlertEngineService.update_alert_status(
            session=db,
            alert=alert,
            new_status="INVESTIGATING",
            actor_email=user_payload.get("sub", user_payload.get("email", "analyst@platform.local")),
            actor_role=user_payload.get("role", "ANALYST"),
            assigned_to=alert.assigned_to or user_payload.get("sub"),
            note=payload.note if payload else "Investigation initiated."
        )
    except InvalidAlertStateTransitionError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    await db.commit()
    await db.refresh(alert)

    await EventPublisher.publish_alert_updated(
        alert_id=alert.id,
        diff={
            "status": alert.status,
            "assigned_to": alert.assigned_to,
            "updated_at": alert.updated_at.isoformat() if alert.updated_at else None
        },
        severity=alert.severity
    )

    return _to_alert_response(alert)


@router.post("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: str,
    payload: AlertActionRequest,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Transitions alert status to RESOLVED with mandatory resolution rationale and timestamp.
    """
    stmt = select(Alert).where(or_(Alert.id == alert_id, Alert.alert_id == alert_id))
    res = await db.execute(stmt)
    alert = res.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert with ID '{alert_id}' not found.")

    if payload.expected_status and alert.status != payload.expected_status:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This alert was updated by another user (current status is '{alert.status}'). Refresh to view latest state."
        )

    note_text = f"Resolved: {payload.reason or 'Legitimate Activity'}. Note: {payload.note or 'No notes provided'}"

    try:
        alert = await AlertEngineService.update_alert_status(
            session=db,
            alert=alert,
            new_status="RESOLVED",
            actor_email=user_payload.get("sub", user_payload.get("email", "analyst@platform.local")),
            actor_role=user_payload.get("role", "ANALYST"),
            note=note_text
        )
    except InvalidAlertStateTransitionError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    await db.commit()
    await db.refresh(alert)

    await EventPublisher.publish_alert_updated(
        alert_id=alert.id,
        diff={
            "status": alert.status,
            "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
            "updated_at": alert.updated_at.isoformat() if alert.updated_at else None
        },
        severity=alert.severity
    )

    return _to_alert_response(alert)


@router.post("/{alert_id}/dismiss", response_model=AlertResponse)
async def dismiss_alert(
    alert_id: str,
    payload: AlertActionRequest,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Transitions alert status to DISMISSED (e.g. False Positive) with mandatory explanation.
    """
    stmt = select(Alert).where(or_(Alert.id == alert_id, Alert.alert_id == alert_id))
    res = await db.execute(stmt)
    alert = res.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert with ID '{alert_id}' not found.")

    if payload.expected_status and alert.status != payload.expected_status:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This alert was updated by another user (current status is '{alert.status}'). Refresh to view latest state."
        )

    note_text = f"Dismissed: {payload.reason or 'False Positive'}. Note: {payload.note or 'No notes provided'}"

    try:
        alert = await AlertEngineService.update_alert_status(
            session=db,
            alert=alert,
            new_status="DISMISSED",
            actor_email=user_payload.get("sub", user_payload.get("email", "analyst@platform.local")),
            actor_role=user_payload.get("role", "ANALYST"),
            note=note_text
        )
    except InvalidAlertStateTransitionError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    await db.commit()
    await db.refresh(alert)

    await EventPublisher.publish_alert_updated(
        alert_id=alert.id,
        diff={
            "status": alert.status,
            "closed_at": alert.closed_at.isoformat() if alert.closed_at else None,
            "updated_at": alert.updated_at.isoformat() if alert.updated_at else None
        },
        severity=alert.severity
    )

    return _to_alert_response(alert)


@router.post("/{alert_id}/escalate", response_model=AlertResponse)
async def escalate_alert(
    alert_id: str,
    payload: AlertActionRequest,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Transitions alert status to ESCALATED with operational escalation reason.
    """
    stmt = select(Alert).where(or_(Alert.id == alert_id, Alert.alert_id == alert_id))
    res = await db.execute(stmt)
    alert = res.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert with ID '{alert_id}' not found.")

    if payload.expected_status and alert.status != payload.expected_status:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This alert was updated by another user (current status is '{alert.status}'). Refresh to view latest state."
        )

    note_text = f"Escalated: {payload.reason or 'Elevated Threat'}. Note: {payload.note or 'Requires Senior Review'}"

    try:
        alert = await AlertEngineService.update_alert_status(
            session=db,
            alert=alert,
            new_status="ESCALATED",
            actor_email=user_payload.get("sub", user_payload.get("email", "analyst@platform.local")),
            actor_role=user_payload.get("role", "ANALYST"),
            note=note_text
        )
    except InvalidAlertStateTransitionError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    await db.commit()
    await db.refresh(alert)

    await EventPublisher.publish_alert_updated(
        alert_id=alert.id,
        diff={
            "status": alert.status,
            "updated_at": alert.updated_at.isoformat() if alert.updated_at else None
        },
        severity=alert.severity
    )

    return _to_alert_response(alert)


@router.post("/{alert_id}/assign", response_model=AlertResponse)
async def assign_alert(
    alert_id: str,
    payload: AlertAssignRequest,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Assigns or reassigns an alert to an analyst.
    """
    stmt = select(Alert).where(or_(Alert.id == alert_id, Alert.alert_id == alert_id))
    res = await db.execute(stmt)
    alert = res.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert with ID '{alert_id}' not found.")

    old_analyst = alert.assigned_to
    alert.assigned_to = payload.assigned_to.strip()
    alert.updated_at = datetime.now(timezone.utc)

    await AuditService.log_action(
        session=db,
        actor_email=user_payload.get("sub", "analyst@platform.local"),
        actor_role=user_payload.get("role", "ANALYST"),
        action="ALERT_ASSIGNMENT",
        target_entity="Alert",
        target_id=alert.id,
        diff_old={"assigned_to": old_analyst},
        diff_new={"assigned_to": alert.assigned_to},
        details=payload.note or f"Alert assigned to {alert.assigned_to}"
    )

    await db.commit()
    await db.refresh(alert)

    await EventPublisher.publish_alert_updated(
        alert_id=alert.id,
        diff={
            "assigned_to": alert.assigned_to,
            "updated_at": alert.updated_at.isoformat() if alert.updated_at else None
        },
        severity=alert.severity
    )

    return _to_alert_response(alert)
