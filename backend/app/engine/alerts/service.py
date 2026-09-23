"""
Alert Engine Execution, Deduplication, and Persistence Service.
Section 10 — Alert Engine.
"""
import uuid
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from backend.app.models.alert import Alert, AlertSeverity, AlertStatus
from backend.app.models.transaction import Transaction
from backend.app.models.risk_score import RiskScore
from backend.app.core.audit import AuditService
from backend.app.engine.risk.types import RiskResult, RiskLevel
from backend.app.engine.alerts.types import AlertDecision, AlertType, AlertSeverity as EngineSeverity, AlertPriority
from backend.app.engine.alerts.config import AlertEngineConfig, default_alert_config
from backend.app.engine.alerts.condition_evaluator import AlertConditionEvaluator
from backend.app.engine.alerts.lifecycle import AlertLifecycleManager

logger = logging.getLogger("alert_engine_service")


class AlertEngineService:
    """
    Central service for evaluating operational alert conditions, deduplication, and persistence.
    """
    _config: AlertEngineConfig = default_alert_config

    @classmethod
    def get_config(cls) -> AlertEngineConfig:
        return cls._config

    @classmethod
    def set_config(cls, new_config: AlertEngineConfig):
        cls._config = new_config
        logger.info("Updated Alert Engine configuration: version=%s", new_config.alert_config_version)

    @classmethod
    def evaluate_decision(
        cls,
        risk_result: RiskResult,
        transaction_dict: Dict[str, Any],
        config: Optional[AlertEngineConfig] = None
    ) -> AlertDecision:
        """Pure alert condition evaluation."""
        cfg = config or cls._config
        return AlertConditionEvaluator.evaluate(
            risk_result=risk_result,
            transaction_dict=transaction_dict,
            config=cfg
        )

    @classmethod
    async def process_and_persist_alert(
        cls,
        session: AsyncSession,
        risk_result: RiskResult,
        transaction_dict: Dict[str, Any],
        config: Optional[AlertEngineConfig] = None
    ) -> Optional[Alert]:
        """
        Evaluates alert conditions, enforces deduplication and cooldowns, and persists the alert record.
        """
        cfg = config or cls._config
        decision = cls.evaluate_decision(risk_result, transaction_dict, cfg)

        if not decision.should_create_alert:
            return None

        txn_id = risk_result.transaction_id or transaction_dict.get("id") or transaction_dict.get("transaction_id", "UNKNOWN_TXN")
        user_id = transaction_dict.get("user_id")

        # 1. Deduplication / Idempotency Check: Same transaction must not create multiple alerts
        existing_txn_alert_stmt = select(Alert).where(Alert.transaction_id == txn_id)
        existing_res = await session.execute(existing_txn_alert_stmt)
        existing_alert = existing_res.scalar_one_or_none()

        if existing_alert:
            logger.info("Alert for transaction %s already exists (id=%s). Skipping duplicate.", txn_id, existing_alert.id)
            return existing_alert

        # 2. Cooldown Check: User-level alert storm suppression
        now_utc = datetime.now(timezone.utc)
        if cfg.enable_cooldown and user_id:
            is_critical = decision.severity == EngineSeverity.CRITICAL
            
            # Critical alerts bypass standard user cooldown if override enabled
            if not (is_critical and cfg.enable_critical_cooldown_override):
                cooldown_threshold = now_utc - timedelta(seconds=cfg.cooldown_seconds)
                recent_stmt = select(Alert).where(
                    and_(
                        Alert.user_id == user_id,
                        Alert.status.in_(["NEW", "OPEN", "ACKNOWLEDGED", "INVESTIGATING", "IN_PROGRESS"]),
                        Alert.created_at >= cooldown_threshold
                    )
                ).limit(1)
                recent_res = await session.execute(recent_stmt)
                recent_user_alert = recent_res.scalar_one_or_none()

                if recent_user_alert:
                    logger.info(
                        "Alert suppressed by cooldown for user %s (existing alert %s within %ss)",
                        user_id, recent_user_alert.id, cfg.cooldown_seconds
                    )
                    return None

        # 3. Create and Persist New Alert Record
        alert_id = f"ALT-{uuid.uuid4().hex[:8].upper()}"
        
        # Link risk_score record if available
        risk_score_stmt = select(RiskScore).where(RiskScore.transaction_id == txn_id)
        risk_score_res = await session.execute(risk_score_stmt)
        risk_score_rec = risk_score_res.scalar_one_or_none()

        new_alert = Alert(
            id=alert_id,
            alert_id=alert_id,
            transaction_id=txn_id,
            user_id=user_id,
            risk_score_id=risk_score_rec.id if risk_score_rec else None,
            title=decision.title,
            description=decision.description,
            severity=decision.severity.value,
            status="NEW",
            risk_score=risk_result.risk_score,
            alert_reason=decision.reason,
            triggered_rules=[f.model_dump() for f in risk_result.factors],
            model_version=risk_result.model_version or "v1.0.0",
            created_at=now_utc
        )

        session.add(new_alert)
        await session.flush()
        logger.info("Created alert %s for transaction %s (Severity: %s, Score: %.1f)", alert_id, txn_id, decision.severity.value, risk_result.risk_score)

        return new_alert

    @classmethod
    async def update_alert_status(
        cls,
        session: AsyncSession,
        alert: Alert,
        new_status: str,
        actor_email: str,
        actor_role: str,
        assigned_to: Optional[str] = None,
        case_id: Optional[str] = None,
        note: Optional[str] = None
    ) -> Alert:
        """
        Validates lifecycle transition and updates alert status and timestamps.
        """
        validated_status = AlertLifecycleManager.validate_transition(alert.status, new_status)
        old_status = alert.status
        now_utc = datetime.now(timezone.utc)

        alert.status = validated_status
        if assigned_to is not None:
            alert.assigned_to = assigned_to
        if case_id is not None:
            alert.case_id = case_id

        # Update lifecycle timestamps
        if validated_status == "ACKNOWLEDGED" and not alert.acknowledged_at:
            alert.acknowledged_at = now_utc
        elif validated_status == "RESOLVED" and not alert.resolved_at:
            alert.resolved_at = now_utc
        elif validated_status in ("CLOSED", "DISMISSED") and not alert.closed_at:
            alert.closed_at = now_utc

        alert.updated_at = now_utc

        # Audit log
        await AuditService.log_action(
            session=session,
            actor_email=actor_email,
            actor_role=actor_role,
            action="ALERT_STATUS_UPDATE",
            target_entity="Alert",
            target_id=alert.id,
            diff_old={"status": old_status},
            diff_new={"status": validated_status, "assigned_to": alert.assigned_to, "case_id": alert.case_id},
            details=note or f"Alert status transitioned from {old_status} to {validated_status}."
        )

        return alert
