"""
Configurable Fraud Rule Engine.
Evaluates deterministic financial security rules against transaction and extracted features.
Routes through Section 07 modular FraudRuleEngineService.
"""
from typing import List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.engine.rules.service import FraudRuleEngineService


class RulesEngine:
    @staticmethod
    async def evaluate_rules(
        session: AsyncSession,
        txn_dict: Dict[str, Any],
        features: Dict[str, Any]
    ) -> Tuple[List[Dict[str, Any]], float]:
        """
        Evaluates active rules from database against transaction and feature vector.
        Returns (list_of_triggered_rules, total_rule_points).
        """
        return await FraudRuleEngineService.evaluate_rules_legacy_format(session, txn_dict, features)
