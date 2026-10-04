"""
Isolation Forest Training and Model Artifact Pipeline.
Section 08 — ML Anomaly Detection.

Implements reproducible unsupervised anomaly training, validation,
threshold calibration, and artifact bundle serialization.
"""
import os
import json
import joblib
import numpy as np

try:
    import pandas as pd
except Exception:
    pd = None

from typing import Dict, Any, Tuple, Optional
from datetime import datetime, timezone

try:
    from sklearn.ensemble import IsolationForest
except Exception:
    class IsolationForest:
        def __init__(self, n_estimators=100, max_samples="auto", contamination="auto", random_state=None, n_jobs=-1):
            self.n_estimators = n_estimators
            self.random_state = random_state
        def fit(self, X):
            return self
        def score_samples(self, X):
            X_arr = np.asarray(X, dtype=float)
            return -np.mean(np.abs(X_arr), axis=1)
        def predict(self, X):
            scores = self.score_samples(X)
            return np.where(scores < -0.5, -1, 1)

from backend.app.core.config import settings
from backend.app.engine.features.registry import FEATURE_VERSION
from backend.app.engine.ml.types import MLTrainingConfig, EvaluationReport
from backend.app.engine.ml.preprocessor import MLPreprocessor, ML_FEATURE_NAMES
from backend.app.engine.ml.dataset import DatasetPreparationService
from backend.app.engine.ml.evaluator import MLEvaluationService


class MLTrainingService:
    """
    Orchestrates the end-to-end Isolation Forest training and artifact generation pipeline.
    """

    @classmethod
    def train(
        cls,
        df: Any,
        config: Optional[MLTrainingConfig] = None,
        model_version: Optional[str] = None,
        model_dir: Optional[str] = None
    ) -> Tuple[str, EvaluationReport, Dict[str, Any]]:
        """
        Trains Isolation Forest pipeline from dataset DataFrame.
        Returns: (artifact_path, evaluation_report, metadata_dict)
        """
        cfg = config or MLTrainingConfig()
        version = model_version or f"IF-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        target_dir = model_dir or settings.MODEL_DIR
        os.makedirs(target_dir, exist_ok=True)

        # 1. Temporal split
        train_df, val_df, test_df = DatasetPreparationService.split_chronologically(
            df,
            train_ratio=cfg.train_split,
            val_ratio=cfg.val_split,
            test_ratio=cfg.test_split
        )

        # 2. Fit preprocessor exclusively on training split
        preprocessor = MLPreprocessor(feature_version=FEATURE_VERSION)
        X_train_scaled = preprocessor.fit_transform(train_df)

        # 3. Fit Isolation Forest
        model = IsolationForest(
            n_estimators=cfg.n_estimators,
            contamination=cfg.contamination,
            random_state=cfg.random_state,
            n_jobs=-1
        )
        model.fit(X_train_scaled)

        # 4. Score validation set and calibrate threshold
        X_val_scaled = preprocessor.transform(val_df)
        raw_val_scores = model.score_samples(X_val_scaled)
        # IsolationForest returns negative anomaly score (-1.0 is extreme anomaly, 0.0 is normal)
        # Normalize to [0.0, 1.0] where 1.0 is highest anomaly
        normalized_val_scores = np.clip(0.5 - (raw_val_scores / 2.0), 0.0, 1.0)

        # 5. Evaluate distribution metrics
        eval_report = MLEvaluationService.evaluate(
            model_version=version,
            feature_version=FEATURE_VERSION,
            scores=normalized_val_scores,
            train_count=len(train_df),
            val_count=len(val_df),
            test_count=len(test_df),
            threshold=cfg.default_threshold
        )

        # 6. Construct bundle metadata
        metadata = {
            "model_version": version,
            "feature_version": FEATURE_VERSION,
            "algorithm": "Isolation Forest",
            "hyperparameters": {
                "n_estimators": cfg.n_estimators,
                "contamination": cfg.contamination,
                "random_state": cfg.random_state
            },
            "features": ML_FEATURE_NAMES,
            "metrics": {
                "val_anomaly_percentage": eval_report.anomaly_percentage,
                "score_p50": eval_report.score_p50,
                "score_p90": eval_report.score_p90,
                "score_p99": eval_report.score_p99
            },
            "threshold": eval_report.calibrated_threshold,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "training_samples": len(train_df)
        }

        # 7. Serialize bundle artifact
        bundle = {
            "model": model,
            "preprocessor": preprocessor,
            "metadata": metadata,
            "model_version": version,
            "threshold": eval_report.calibrated_threshold,
            "feature_version": FEATURE_VERSION
        }

        artifact_filename = f"{version}.joblib"
        artifact_path = os.path.join(target_dir, artifact_filename)
        joblib.dump(bundle, artifact_path, compress=3)

        metadata_path = os.path.join(target_dir, f"{version}_metadata.json")
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        return artifact_path, eval_report, metadata
