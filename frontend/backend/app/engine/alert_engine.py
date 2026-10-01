"""
Alert Engine Adapter.
Section 10 — Alert Engine.
Delegates to modular AlertEngineService.
"""
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.alert import Alert
from backend.app.engine.risk.types import RiskResult, RiskLevel, RiskExplanationFactor
from backend.app.engine.alerts.service import AlertEngineService


class AlertEngine:
    @staticmethod
    async def process_alert(
        session: AsyncSession,
        txn_id: str,
        user_id: str,
        risk_score: float,
        risk_level: str,
        triggered_rules: List[Dict[str, Any]],
        model_version: str
    ) -> Optional[Alert]:
        """
        Determines whether an alert must be generated and persists it idempotently.
        """
        factors = [
            RiskExplanationFactor(
                factor_name=f"Rule: {r.get('rule_name', r.get('rule_code', 'RULE'))}",
                code=r.get("rule_code", "RULE"),
                weight=1.0,
                score=float(r.get("score") or r.get("points", 50.0)),
                contribution=float(r.get("score") or r.get("points", 50.0)),
                description=r.get("reason") or r.get("details", {}).get("explanation", f"Rule triggered with score {r.get('score')}."),
                evidence={"severity": r.get("severity", "MEDIUM"), **(r.get("details", {}).get("evidence") or r.get("evidence") or {})}
            )
            for r in (triggered_rules or [])
        ]

        risk_res = RiskResult(
            transaction_id=txn_id,
            risk_score=risk_score,
            risk_level=RiskLevel(risk_level) if risk_level in RiskLevel.__members__ else RiskLevel.LOW,
            rule_score=risk_score if triggered_rules else 0.0,
            ml_score=0.0,
            behavior_score=0.0,
            factors=factors,
            model_version=model_version
        )

        txn_dict = {
            "id": txn_id,
            "transaction_id": txn_id,
            "user_id": user_id
        }

        return await AlertEngineService.process_and_persist_alert(
            session=session,
            risk_result=risk_res,
            transaction_dict=txn_dict
        )

