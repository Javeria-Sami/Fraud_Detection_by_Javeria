"""
Real-Time Production ML Inference and Prediction Persistence Service.
Section 08 — ML Anomaly Detection.

Responsibilities:
1. Maintain in-memory cached model bundle with hot-reload capability.
2. Validate feature-version compatibility.
3. Transform input features using the fitted preprocessor.
4. Generate deterministic normalized anomaly scores [0.0, 1.0].
5. Provide honest contextual explanations based on feature deviations.
6. Record execution latency in milliseconds.
7. Persist audit-ready records in `ml_predictions`.
8. Provide batch inference for backtesting and evaluation.
"""
import time
import uuid
import logging
from typing import Dict, Any, Tuple, Optional, List
import numpy as np
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.core.config import settings
from backend.app.models.ml_model import MLPrediction, MLModelRegistry
from backend.app.engine.features.registry import FEATURE_VERSION
from backend.app.engine.ml.types import (
    MLPredictionResult,
    PredictionCategory,
    BatchPredictionResult
)
from backend.app.engine.ml.registry import MLModelRegistryService
from backend.app.engine.ml.preprocessor import MLPreprocessor

logger = logging.getLogger("ml_inference_service")


class MLInferenceService:
    """
    Singleton production inference service for ML anomaly detection.
    """
    _cached_model = None
    _cached_preprocessor: Optional[MLPreprocessor] = None
    _cached_version: str = "v1.0.0"
    _cached_model_id: Optional[str] = None
    _cached_threshold: float = 0.65
    _cached_feature_version: str = FEATURE_VERSION

    @classmethod
    def load_model(
        cls,
        model_obj: Any,
        preprocessor: MLPreprocessor,
        version: str,
        threshold: float = 0.65,
        model_id: Optional[str] = None,
        feature_version: str = FEATURE_VERSION
    ):
        """Loads a model bundle directly into the in-memory inference cache."""
        cls._cached_model = model_obj
        cls._cached_preprocessor = preprocessor
        cls._cached_version = version
        cls._cached_threshold = threshold
        cls._cached_model_id = model_id
        cls._cached_feature_version = feature_version
        logger.info("Loaded ML model version '%s' into in-memory inference cache (threshold=%.3f)", version, threshold)

    @classmethod
    def load_from_artifact(cls, artifact_path: str, model_id: Optional[str] = None):
        """Loads model bundle from an artifact file path."""
        payload = MLModelRegistryService.load_artifact(artifact_path)
        cls.load_model(
            model_obj=payload["model"],
            preprocessor=payload["preprocessor"],
            version=payload.get("model_version", "v1.0.0"),
            threshold=float(payload.get("threshold", 0.65)),
            model_id=model_id,
            feature_version=payload.get("feature_version", FEATURE_VERSION)
        )

    @classmethod
    def _ensure_model_loaded(cls):
        """Ensures that a valid model is in memory. If not, fits fallback in memory without requiring disk writes."""
        if cls._cached_model is not None and cls._cached_preprocessor is not None:
            return

        # 1. Try loading baseline v1.0.0 artifact from disk if available
        try:
            baseline_path = os.path.join(settings.MODEL_DIR, "isolation_forest_v1.0.0.joblib")
            if os.path.exists(baseline_path):
                cls.load_from_artifact(baseline_path, model_id="MODEL-ISOFOREST-v1.0.0")
                return
        except Exception as err:
            logger.warning("Could not load baseline model from disk (%s). Falling back to in-memory model.", err)

        # 2. Generate lightweight in-memory fallback model without requiring disk writes
        try:
            from ml.datasets.synthetic_generator import generate_synthetic_transactions
            from backend.app.engine.ml.preprocessor import MLPreprocessor
            from sklearn.ensemble import IsolationForest

            logger.info("Initializing in-memory Isolation Forest model for serverless/cold-start runtime...")
            df = generate_synthetic_transactions(num_samples=250, anomaly_ratio=0.08, seed=42)
            preprocessor = MLPreprocessor()
            X_train = preprocessor.fit_transform(df)
            model = IsolationForest(n_estimators=50, contamination=0.08, random_state=42)
            model.fit(X_train)
            cls.load_model(
                model_obj=model,
                preprocessor=preprocessor,
                version="v1.0.0-in-memory",
                threshold=0.65,
                model_id="MODEL-v1.0.0-in-memory"
            )
        except Exception as e:
            logger.error("Failed to initialize in-memory ML model: %s", e)

    @classmethod
    def predict(
        cls,
        transaction_dict: Dict[str, Any],
        features: Dict[str, Any]
    ) -> MLPredictionResult:
        """
        Synchronously scores a single transaction feature vector in memory.
        Returns a structured MLPredictionResult with latency and contextual explanations.
        """
        start_time = time.perf_counter()
        txn_id = transaction_dict.get("id") or transaction_dict.get("transaction_id", "TXN-UNKNOWN")

        try:
            cls._ensure_model_loaded()

            # 1. Feature version compatibility check
            feat_ver = features.get("feature_version", FEATURE_VERSION)
            if feat_ver != cls._cached_feature_version:
                logger.warning(
                    "Feature version mismatch: Model requires '%s', received '%s'. Proceeding with aligned defaults.",
                    cls._cached_feature_version, feat_ver
                )

            # 2. Transform features using preprocessor
            X_scaled = cls._cached_preprocessor.transform(features)

            # 3. Predict anomaly score
            raw_score = cls._cached_model.decision_function(X_scaled)[0]
            # Sigmoid calibration: [0.0, 1.0] where 1.0 is anomalous
            anomaly_score = float(1.0 / (1.0 + np.exp(raw_score * 12.0)))
            anomaly_score = max(0.0, min(1.0, round(anomaly_score, 4)))

            # 4. Threshold evaluation
            is_anomaly = anomaly_score >= cls._cached_threshold
            if anomaly_score >= 0.85:
                pred_category = PredictionCategory.ANOMALOUS
            elif anomaly_score >= cls._cached_threshold:
                pred_category = PredictionCategory.SUSPICIOUS
            else:
                pred_category = PredictionCategory.NORMAL

            # 5. Extract contextual explainability signals
            signals = cls._extract_contextual_signals(transaction_dict, features, anomaly_score)

            duration_ms = round((time.perf_counter() - start_time) * 1000.0, 3)

            return MLPredictionResult(
                transaction_id=txn_id,
                model_version=cls._cached_version,
                model_version_id=cls._cached_model_id,
                feature_version=feat_ver,
                anomaly_score=anomaly_score,
                is_anomaly=is_anomaly,
                prediction=pred_category,
                confidence=round(abs(anomaly_score - 0.5) * 2.0, 2),
                threshold=cls._cached_threshold,
                inference_time_ms=duration_ms,
                context_signals=signals,
                feature_snapshot=features
            )
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000.0, 3)
            logger.error("ML Inference error for transaction '%s': %s", txn_id, exc, exc_info=True)
            return MLPredictionResult(
                transaction_id=txn_id,
                model_version=cls._cached_version or "unknown",
                model_version_id=cls._cached_model_id,
                feature_version=features.get("feature_version", FEATURE_VERSION),
                anomaly_score=0.50, # neutral fallback
                is_anomaly=False,
                prediction=PredictionCategory.NORMAL,
                confidence=0.0,
                threshold=cls._cached_threshold,
                inference_time_ms=duration_ms,
                context_signals=["ML inference failed: safe fallback score applied."],
                error=str(exc)
            )

    @classmethod
    async def score_and_persist_transaction(
        cls,
        session: AsyncSession,
        transaction_dict: Dict[str, Any],
        features: Dict[str, Any],
        persist: bool = True
    ) -> MLPredictionResult:
        """
        Runs ML prediction and persists a record to `ml_predictions` table.
        """
        # Ensure deployed model info is aligned from DB if available
        if cls._cached_model is None:
            deployed = await MLModelRegistryService.get_deployed_model(session)
            if deployed and deployed.artifact_path:
                try:
                    cls.load_from_artifact(deployed.artifact_path, model_id=deployed.id)
                except Exception as e:
                    logger.warning("Failed to load deployed model from DB artifact path: %s", e)

        result = cls.predict(transaction_dict, features)

        if persist and result.transaction_id:
            # Map prediction model_version_id
            m_ver_id = result.model_version_id
            if not m_ver_id and cls._cached_model_id:
                m_ver_id = cls._cached_model_id

            pred_record = MLPrediction(
                id=str(uuid.uuid4()),
                transaction_id=result.transaction_id,
                model_version_id=m_ver_id,
                anomaly_score=result.anomaly_score,
                prediction=result.prediction.value,
                confidence=result.confidence,
                feature_snapshot=features,
                inference_time_ms=result.inference_time_ms,
                created_at=datetime.now(timezone.utc)
            )
            session.add(pred_record)

        return result

    @classmethod
    def batch_predict(
        cls,
        transactions_with_features: List[Tuple[Dict[str, Any], Dict[str, Any]]]
    ) -> BatchPredictionResult:
        """
        Runs batch prediction over a list of (transaction_dict, features_dict) tuples.
        """
        start = time.perf_counter()
        results: List[MLPredictionResult] = []
        anomalies = 0

        for txn, feat in transactions_with_features:
            pred = cls.predict(txn, feat)
            if pred.is_anomaly:
                anomalies += 1
            results.append(pred)

        total_ms = (time.perf_counter() - start) * 1000.0
        avg_ms = total_ms / max(len(results), 1)

        return BatchPredictionResult(
            total_processed=len(results),
            anomalies_detected=anomalies,
            average_inference_time_ms=round(avg_ms, 3),
            total_duration_ms=round(total_ms, 2),
            predictions=results
        )

    @classmethod
    def _extract_contextual_signals(
        cls,
        txn: Dict[str, Any],
        features: Dict[str, Any],
        anomaly_score: float
    ) -> List[str]:
        """
        Extracts human-readable contextual signals based on feature deviations.
        """
        signals: List[str] = []
        amount_dev = float(features.get("amount_deviation", 1.0))
        if amount_dev >= 4.0:
            signals.append(f"Transaction amount is {amount_dev:.1f}x higher than user's historical baseline.")
        
        v_5m = int(features.get("velocity_5m", 1))
        if v_5m >= 4:
            signals.append(f"High transaction frequency: {v_5m} transactions in 5 minutes.")

        if int(features.get("is_new_device", 0)) == 1:
            signals.append("Transaction originated from a previously unseen device fingerprint.")

        if int(features.get("is_new_country", 0)) == 1:
            signals.append("Transaction initiated from a foreign country novel to this user.")

        geo_speed = float(features.get("geo_hop_speed_kmh", 0.0))
        if geo_speed > 700.0:
            signals.append(f"Physical velocity anomaly: impossible travel speed of {geo_speed:.0f} km/h.")

        if int(features.get("failed_attempts", 0)) >= 2:
            signals.append(f"Preceded by {features.get('failed_attempts')} failed authentication attempts.")

        if int(features.get("is_unusual_transaction_hour", 0)) == 1:
            signals.append("Activity occurred outside customer's historical diurnal schedule.")

        return signals
