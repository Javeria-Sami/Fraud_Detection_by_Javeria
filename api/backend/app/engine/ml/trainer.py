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
import pandas as pd
from typing import Dict, Any, Tuple, Optional
from datetime import datetime, timezone
from sklearn.ensemble import IsolationForest

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
        df: pd.DataFrame,
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
            max_samples=cfg.max_samples,
            contamination=cfg.contamination,
            max_features=cfg.max_features,
            bootstrap=cfg.bootstrap,
            random_state=cfg.random_state,
            n_jobs=cfg.n_jobs
        )
        model.fit(X_train_scaled)

        # 4. Predict raw scores and compute normalized probabilities on validation split
        X_val_scaled = preprocessor.transform(val_df)
        val_raw_scores = model.decision_function(X_val_scaled)
        val_scores = 1.0 / (1.0 + np.exp(val_raw_scores * 12.0))

        # 5. Calibrate threshold on validation split
        calibrated_threshold = MLEvaluationService.calibrate_threshold(
            val_scores=val_scores,
            target_contamination=cfg.contamination
        )

        # 6. Evaluate on test split
        X_test_scaled = preprocessor.transform(test_df)
        test_raw_scores = model.decision_function(X_test_scaled)
        test_scores = 1.0 / (1.0 + np.exp(test_raw_scores * 12.0))

        test_labels = test_df["is_fraud"].values if "is_fraud" in test_df.columns else None
        eval_report = MLEvaluationService.evaluate(
            model_version=version,
            feature_version=FEATURE_VERSION,
            scores=test_scores,
            train_count=len(train_df),
            val_count=len(val_df),
            test_count=len(test_df),
            threshold=calibrated_threshold,
            labels=test_labels
        )

        # 7. Serialize Artifact Bundle
        artifact_file = f"isolation_forest_{version}.joblib"
        artifact_path = os.path.join(target_dir, artifact_file)
        meta_file = f"metadata_{version}.json"
        meta_path = os.path.join(target_dir, meta_file)

        artifact_payload = {
            "model": model,
            "preprocessor": preprocessor,
            "feature_names": ML_FEATURE_NAMES,
            "feature_version": FEATURE_VERSION,
            "model_version": version,
            "threshold": calibrated_threshold,
            "config": cfg.model_dump(),
            "metrics": eval_report.model_dump(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        joblib.dump(artifact_payload, artifact_path)

        metadata_dict = {
            "model_name": f"IsolationForest_{version}",
            "version": version,
            "algorithm": "Isolation Forest",
            "feature_version": FEATURE_VERSION,
            "features": ML_FEATURE_NAMES,
            "threshold": calibrated_threshold,
            "parameters": cfg.model_dump(),
            "metrics": eval_report.model_dump(),
            "artifact_path": artifact_path,
            "status": "APPROVED",
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        with open(meta_path, "w") as f:
            json.dump(metadata_dict, f, indent=2)

        return artifact_path, eval_report, metadata_dict
