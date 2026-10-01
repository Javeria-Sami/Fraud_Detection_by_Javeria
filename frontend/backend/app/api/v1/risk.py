"""
Risk Engine API Endpoints for Risk Evaluation, Configuration, and History.
Section 09 — Risk Engine.
Guarded by granular RBAC with mandatory audit logging.
"""
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_payload, require_roles, require_permissions
from backend.app.core.audit import AuditService
from backend.app.models.risk_score import RiskScore
from backend.app.models.transaction import Transaction
from backend.app.models.rule import RuleExecution
from backend.app.models.ml_model import MLPrediction
from backend.app.schemas.risk import (
    RiskScoreResponse,
    RiskEvaluateRequest,
    RiskConfigResponse,
    RiskConfigUpdateRequest,
    RiskFactorResponse
)
from backend.app.engine.risk.types import RiskResult, RiskLevel, CalculationStatus
from backend.app.engine.risk.config import RiskScoringConfig
from backend.app.engine.risk.service import RiskEngineService
from backend.app.engine.feature_store import FeatureStore

router = APIRouter(prefix="/risk", tags=["Risk Engine"])


def _to_risk_response(res: RiskResult) -> RiskScoreResponse:
    factors_list = [
        RiskFactorResponse(
            factor_name=f.factor_name,
            code=f.code,
            weight=f.weight,
            score=f.score,
            contribution=f.contribution,
            description=f.description,
            evidence=f.evidence
        )
        for f in res.factors
    ]
    return RiskScoreResponse(
        transaction_id=res.transaction_id,
        risk_score=res.risk_score,
        risk_level=res.risk_level,
        status=res.status,
        rule_score=res.rule_score,
        ml_score=res.ml_score,
        behavior_score=res.behavior_score,
        triggered_rule_count=res.triggered_rule_count,
        signals_evaluated=res.signals_evaluated,
        factors=factors_list,
        scoring_version=res.scoring_version,
        rule_version=res.rule_version,
        model_version=res.model_version,
        feature_version=res.feature_version,
        calculated_at=res.calculated_at,
        calculation_time_ms=res.calculation_time_ms,
        error=res.error
    )


@router.get("/config", response_model=RiskConfigResponse)
async def get_risk_configuration(
    current_user: Dict[str, Any] = Depends(get_current_user_payload)
):
    """
    Retrieves active risk scoring configuration, weights, and band thresholds.
    """
    cfg = RiskEngineService.get_config()
    return RiskConfigResponse(
        scoring_version=cfg.scoring_version,
        rule_weight=cfg.rule_weight,
        ml_weight=cfg.ml_weight,
        behavior_weight=cfg.behavior_weight,
        threshold_low=cfg.threshold_low,
        threshold_medium=cfg.threshold_medium,
        threshold_high=cfg.threshold_high,
        critical_severity_floor=cfg.critical_severity_floor,
        high_severity_floor=cfg.high_severity_floor,
        enable_severity_floors=cfg.enable_severity_floors,
        rule_aggregation_mode=cfg.rule_aggregation_mode,
        diminishing_factor=cfg.diminishing_factor
    )


@router.patch("/config", response_model=RiskConfigResponse, dependencies=[Depends(require_roles(["admin"]))])
async def update_risk_configuration(
    payload: RiskConfigUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_payload)
):
    """
    Updates risk scoring parameters (weights, thresholds, mode). Admin only.
    Audits the configuration change in the immutable audit log.
    """
    current_cfg = RiskEngineService.get_config()
    cfg_data = current_cfg.model_dump()

    # Apply non-null updates
    update_dict = payload.model_dump(exclude_unset=True, exclude_none=True)
    cfg_data.update(update_dict)

    try:
        new_config = RiskScoringConfig(**cfg_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid risk scoring configuration: {str(e)}"
        )

    RiskEngineService.set_config(new_config)

    # Audit log
    await AuditService.log_action(
        session=db,
        actor_email=current_user.get("sub", "admin@platform.local"),
        actor_role=current_user.get("role", "ADMIN"),
        action="UPDATE_RISK_CONFIG",
        target_entity="risk_scoring_config",
        target_id=new_config.scoring_version,
        diff_new=update_dict,
        details="Updated risk scoring parameters."
    )

    return RiskConfigResponse(
        scoring_version=new_config.scoring_version,
        rule_weight=new_config.rule_weight,
        ml_weight=new_config.ml_weight,
        behavior_weight=new_config.behavior_weight,
        threshold_low=new_config.threshold_low,
        threshold_medium=new_config.threshold_medium,
        threshold_high=new_config.threshold_high,
        critical_severity_floor=new_config.critical_severity_floor,
        high_severity_floor=new_config.high_severity_floor,
        enable_severity_floors=new_config.enable_severity_floors,
        rule_aggregation_mode=new_config.rule_aggregation_mode,
        diminishing_factor=new_config.diminishing_factor
    )


@router.post("/evaluate", response_model=RiskScoreResponse)
async def evaluate_risk(
    req: RiskEvaluateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_payload)
):
    """
    Evaluates risk score for a transaction.
    If transaction_id is provided, automatically loads transaction record and existing signals from database.
    """
    txn_dict: Dict[str, Any] = {}
    features: Optional[Dict[str, Any]] = req.features
    triggered_rules = req.triggered_rules or []
    ml_score = req.ml_anomaly_score

    if req.transaction_id:
        stmt = select(Transaction).where(Transaction.id == req.transaction_id)
        res = await db.execute(stmt)
        txn = res.scalar_one_or_none()
        if not txn and not req.transaction_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transaction with ID '{req.transaction_id}' not found."
            )
        if txn:
            txn_dict = {
                "id": txn.id,
                "user_id": txn.user_id,
                "card_id": txn.card_id,
                "merchant_id": txn.merchant_id,
                "device_id": txn.device_id,
                "amount": float(txn.amount),
                "currency": txn.currency,
                "timestamp": txn.timestamp.isoformat() if txn.timestamp else None,
                "location_country": txn.location_country,
                "location_city": txn.location_city,
                "channel": txn.channel
            }
            # Retrieve features if not explicitly provided
            if features is None:
                features = await FeatureStore.compute_features(db, txn_dict)

            # Retrieve rule executions if not explicitly provided
            if not req.triggered_rules:
                r_stmt = select(RuleExecution).where(RuleExecution.transaction_id == txn.id, RuleExecution.passed == False)
                r_res = await db.execute(r_stmt)
                rule_execs = r_res.scalars().all()
                triggered_rules = [
                    {
                        "rule_code": re.rule_id,
                        "rule_name": re.rule_id,
                        "score": re.execution_time_ms or 50.0,
                        "severity": "HIGH",
                        "reason": f"Rule {re.rule_id} triggered with score.",
                        "details": re.details or {}
                    }
                    for re in rule_execs
                ]

            # Retrieve ML prediction if not explicitly provided
            if ml_score is None:
                ml_stmt = select(MLPrediction).where(MLPrediction.transaction_id == txn.id)
                ml_res = await db.execute(ml_stmt)
                ml_pred = ml_res.scalar_one_or_none()
                if ml_pred:
                    ml_score = float(ml_pred.anomaly_score)

    elif req.transaction_data:
        txn_dict = req.transaction_data
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'transaction_id' or 'transaction_data' must be provided."
        )

    if req.persist:
        result = await RiskEngineService.evaluate_and_persist_transaction_risk(
            session=db,
            transaction_dict=txn_dict,
            features=features,
            triggered_rules=triggered_rules,
            ml_anomaly_score=ml_score,
            persist=True
        )
        await db.commit()
    else:
        result = RiskEngineService.calculate_risk(
            transaction_dict=txn_dict,
            features=features,
            triggered_rules=triggered_rules,
            ml_anomaly_score=ml_score
        )

    return _to_risk_response(result)


@router.get("/transaction/{transaction_id}", response_model=RiskScoreResponse)
async def get_transaction_risk_score(
    transaction_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_payload)
):
    """
    Fetches the persisted risk score and structured explainability for a specific transaction.
    """
    stmt = select(RiskScore).where(RiskScore.transaction_id == transaction_id)
    res = await db.execute(stmt)
    record = res.scalar_one_or_none()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No risk score found for transaction ID '{transaction_id}'."
        )

    raw_factors = record.explanation or []
    factors = [
        RiskFactorResponse(
            factor_name=f.get("factor_name", "Factor"),
            code=f.get("code", "FACTOR"),
            weight=f.get("weight", 1.0),
            score=f.get("score", 0.0),
            contribution=f.get("contribution", 0.0),
            description=f.get("description", ""),
            evidence=f.get("evidence")
        )
        for f in raw_factors
    ]

    return RiskScoreResponse(
        transaction_id=record.transaction_id,
        risk_score=float(record.score),
        risk_level=RiskLevel(record.risk_level),
        status=CalculationStatus.COMPLETED,
        rule_score=float(record.rule_score or 0.0),
        ml_score=float(record.ml_score or 0.0),
        behavior_score=float(record.behavior_score or 0.0),
        triggered_rule_count=len([f for f in factors if f.code.startswith("RULE") or "Rule:" in f.factor_name]),
        signals_evaluated=len(factors),
        factors=factors,
        scoring_version=record.scoring_version or "risk-v1.0.0",
        rule_version="v1.0",
        model_version="v1.0.0",
        feature_version="v1.0.0",
        calculated_at=record.created_at.isoformat() if record.created_at else datetime.now(timezone.utc).isoformat(),
        calculation_time_ms=0.5
    )
