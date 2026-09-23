"""
Real-Time ML Anomaly Inference Engine Adapter.
Section 08 — ML Anomaly Detection.

Routes through Section 08 MLInferenceService for in-memory scoring,
latency measurement, and prediction generation.
"""
from typing import Dict, Any, Tuple
from backend.app.engine.ml.service import MLInferenceService


class MLEngine:
    _model_version: str = "v1.0.0"

    @classmethod
    def score_transaction(cls, txn_dict: Dict[str, Any], features: Dict[str, Any]) -> Tuple[float, float, str]:
        """
        Runs ML anomaly inference.
        Returns: (anomaly_score_0_to_1, inference_latency_ms, model_version)
        """
        result = MLInferenceService.predict(txn_dict, features)
        return float(result.anomaly_score), float(result.inference_time_ms), str(result.model_version)

    @classmethod
    def reload_model(cls, version: str):
        """Signals model reload from disk or registry."""
        pass
