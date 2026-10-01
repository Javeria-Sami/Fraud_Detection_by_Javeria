"""
Multi-Factor Risk Scoring Engine Adapter.
Section 09 — Risk Engine.

Routes through Section 09 RiskEngineService for multi-factor risk blending,
anti-inflation rule aggregation, risk band classification, and explainability.
"""
from typing import List, Dict, Any, Tuple
from backend.app.engine.risk.service import RiskEngineService


class RiskEngine:
    @staticmethod
    def calculate_risk(
        txn_dict: Dict[str, Any],
        features: Dict[str, Any],
        triggered_rules: List[Dict[str, Any]],
        ml_anomaly_score: float
    ) -> Tuple[float, str, List[Dict[str, Any]]]:
        """
        Calculates calibrated risk score (0-100), risk tier, and human-readable explainability factor matrix.
        Returns: (final_risk_score_0_to_100, risk_level, list_of_risk_factors)
        """
        result = RiskEngineService.calculate_risk(
            transaction_dict=txn_dict,
            features=features,
            triggered_rules=triggered_rules,
            ml_anomaly_score=ml_anomaly_score
        )
        factors_dict_list = [f.model_dump() for f in result.factors]
        return float(result.risk_score), result.risk_level.value, factors_dict_list
