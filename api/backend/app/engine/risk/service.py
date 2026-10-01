"""
Risk Engine Execution and Persistence Service.
Section 09 — Risk Engine.

Coordinates signal resolution, pure calculation, and idempotent persistence in `risk_scores`.
"""
import uuid
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.models.risk_score import RiskScore
from backend.app.models.transaction import Transaction
from backend.app.engine.risk.types import RiskResult, RiskLevel
from backend.app.engine.risk.config import RiskScoringConfig, default_risk_config
from backend.app.engine.risk.calculator import PureRiskCalculator

logger = logging.getLogger("risk_engine_service")


class RiskEngineService:
    """
    Service orchestrator for risk calculation, persistence, and auditability.
    """
    _config: RiskScoringConfig = default_risk_config

    @classmethod
    def get_config(cls) -> RiskScoringConfig:
        return cls._config

    @classmethod
    def set_config(cls, new_config: RiskScoringConfig):
        cls._config = new_config
        logger.info("Updated Risk Engine scoring configuration: version=%s", new_config.scoring_version)

    @classmethod
    def calculate_risk(
        cls,
        transaction_dict: Dict[str, Any],
        features: Optional[Dict[str, Any]] = None,
        triggered_rules: Optional[List[Dict[str, Any]]] = None,
        ml_anomaly_score: Optional[float] = None,
        config: Optional[RiskScoringConfig] = None,
        model_version: Optional[str] = None,
        feature_version: Optional[str] = None
    ) -> RiskResult:
        """
        Pure calculation wrapper using currently configured risk scoring parameters.
        """
        cfg = config or cls._config
        return PureRiskCalculator.calculate_risk(
            transaction_dict=transaction_dict,
            features=features,
            triggered_rules=triggered_rules,
            ml_anomaly_score=ml_anomaly_score,
            config=cfg,
            model_version=model_version,
            feature_version=feature_version
        )

    @classmethod
    async def evaluate_and_persist_transaction_risk(
        cls,
        session: AsyncSession,
        transaction_dict: Dict[str, Any],
        features: Optional[Dict[str, Any]] = None,
        triggered_rules: Optional[List[Dict[str, Any]]] = None,
        ml_anomaly_score: Optional[float] = None,
        persist: bool = True,
        config: Optional[RiskScoringConfig] = None,
        model_version: Optional[str] = None,
        feature_version: Optional[str] = None
    ) -> RiskResult:
        """
        Evaluates risk score and idempotently persists the record to the `risk_scores` database table.
        """
        result = cls.calculate_risk(
            transaction_dict=transaction_dict,
            features=features,
            triggered_rules=triggered_rules,
            ml_anomaly_score=ml_anomaly_score,
            config=config,
            model_version=model_version,
            feature_version=feature_version
        )

        if persist and result.transaction_id:
            txn_id = result.transaction_id
            
            # Check for existing risk score record (idempotency)
            stmt = select(RiskScore).where(RiskScore.transaction_id == txn_id)
            res = await session.execute(stmt)
            risk_record = res.scalar_one_or_none()

            explanation_payload = [f.model_dump() for f in result.factors]

            if risk_record:
                risk_record.score = result.risk_score
                risk_record.risk_level = result.risk_level.value
                risk_record.rule_score = result.rule_score
                risk_record.ml_score = result.ml_score
                risk_record.behavior_score = result.behavior_score
                risk_record.explanation = explanation_payload
                risk_record.scoring_version = result.scoring_version
            else:
                risk_record = RiskScore(
                    id=str(uuid.uuid4()),
                    transaction_id=txn_id,
                    score=result.risk_score,
                    risk_level=result.risk_level.value,
                    rule_score=result.rule_score,
                    ml_score=result.ml_score,
                    behavior_score=result.behavior_score,
                    explanation=explanation_payload,
                    scoring_version=result.scoring_version,
                    created_at=datetime.now(timezone.utc)
                )
                session.add(risk_record)

        return result
