"""
Isolation Forest ML Pipeline for Fraud & Anomaly Detection.
Handles feature extraction, preprocessing, model fitting, metric evaluation, and score calibration.
"""
import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score

FEATURE_NAMES = [
    "amount",
    "amount_deviation",
    "velocity_5m",
    "velocity_1h",
    "velocity_24h",
    "failed_attempts",
    "is_new_device",
    "is_unusual_location",
    "is_high_risk_category",
    "hour_sin",
    "hour_cos",
    "day_of_week"
]

class IsolationForestPipeline:
    def __init__(self, contamination: float = 0.08, random_state: int = 42):
        self.contamination = contamination
        self.random_state = random_state
        self.scaler = StandardScaler()
        self.model = IsolationForest(
            n_estimators=150,
            max_samples="auto",
            contamination=contamination,
            random_state=random_state,
            n_jobs=-1
        )
        self.is_fitted = False
        self.model_version = "v1.0.0"
        self.feature_version = "v1.0"
        self.metrics = {}

    def extract_features(self, df: pd.DataFrame) -> np.ndarray:
        """Extracts engineered feature matrix from DataFrame or raw record dicts."""
        data = df.copy()
        
        # Cyclical hour transformation
        if "hour_sin" not in data.columns or "hour_cos" not in data.columns:
            hours = data["hour_of_day"].values if "hour_of_day" in data.columns else 12
            data["hour_sin"] = np.sin(2 * np.pi * hours / 24.0)
            data["hour_cos"] = np.cos(2 * np.pi * hours / 24.0)
            
        for col in FEATURE_NAMES:
            if col not in data.columns:
                data[col] = 0.0
                
        feature_matrix = data[FEATURE_NAMES].values.astype(np.float64)
        return feature_matrix

    def fit(self, train_df: pd.DataFrame, eval_df: pd.DataFrame = None):
        """Fits scaler and Isolation Forest model."""
        X_train = self.extract_features(train_df)
        X_train_scaled = self.scaler.fit_transform(X_train)
        
        self.model.fit(X_train_scaled)
        self.is_fitted = True
        
        if eval_df is not None and "is_fraud" in eval_df.columns:
            self.evaluate(eval_df)
            
        return self

    def predict_anomaly_score(self, feature_vector_or_df) -> float:
        """
        Returns calibrated anomaly probability score between 0.0 (very normal) and 1.0 (highly anomalous).
        Isolation Forest decision_function outputs negative scores for anomalies and positive for inliers.
        We calibrate via sigmoid transformation.
        """
        if not self.is_fitted:
            raise ValueError("Model pipeline is not fitted.")
            
        if isinstance(feature_vector_or_df, dict):
            df = pd.DataFrame([feature_vector_or_df])
            X = self.extract_features(df)
        elif isinstance(feature_vector_or_df, pd.DataFrame):
            X = self.extract_features(feature_vector_or_df)
        elif isinstance(feature_vector_or_df, np.ndarray):
            X = feature_vector_or_df if feature_vector_or_df.ndim == 2 else feature_vector_or_df.reshape(1, -1)
        else:
            raise TypeError("Unsupported feature input format.")
            
        X_scaled = self.scaler.transform(X)
        # raw decision function: higher is normal, lower (< 0) is anomaly
        raw_scores = self.model.decision_function(X_scaled)
        
        # Calibrate: transform into [0, 1] where 1 is anomaly
        # Offset and scale for sharp discrimination
        calibrated_scores = 1.0 / (1.0 + np.exp(raw_scores * 12.0))
        
        if len(calibrated_scores) == 1:
            return float(calibrated_scores[0])
        return calibrated_scores

    def evaluate(self, eval_df: pd.DataFrame) -> dict:
        """Evaluates model on labeled evaluation dataset."""
        y_true = eval_df["is_fraud"].values
        scores = self.predict_anomaly_score(eval_df)
        
        # Threshold at 0.5 anomaly score
        y_pred = (np.array(scores) >= 0.5).astype(int)
        
        precision = float(precision_score(y_true, y_pred, zero_division=0))
        recall = float(recall_score(y_true, y_pred, zero_division=0))
        f1 = float(f1_score(y_true, y_pred, zero_division=0))
        try:
            auc = float(roc_auc_score(y_true, scores))
        except Exception:
            auc = 0.5
            
        self.metrics = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(auc, 4),
            "evaluated_samples": len(eval_df),
            "evaluated_at": datetime.now(timezone.utc).isoformat()
        }
        return self.metrics

    def save(self, model_dir: str, version: str = "v1.0.0"):
        os.makedirs(model_dir, exist_ok=True)
        self.model_version = version
        
        artifact_path = os.path.join(model_dir, f"isolation_forest_{version}.joblib")
        meta_path = os.path.join(model_dir, f"metadata_{version}.json")
        
        payload = {
            "model": self.model,
            "scaler": self.scaler,
            "feature_names": FEATURE_NAMES,
            "contamination": self.contamination,
            "random_state": self.random_state,
            "model_version": self.model_version,
            "feature_version": self.feature_version,
            "metrics": self.metrics
        }
        
        joblib.dump(payload, artifact_path)
        
        meta = {
            "model_name": "IsolationForest_AnomalyDetector",
            "version": self.model_version,
            "algorithm": "Isolation Forest",
            "feature_version": self.feature_version,
            "features": FEATURE_NAMES,
            "metrics": self.metrics,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "artifact_file": f"isolation_forest_{version}.joblib",
            "status": "PRODUCTION"
        }
        
        with open(meta_path, "w") as f:
            json.dump(meta, f, indent=2)
            
        print(f"Model {version} saved successfully to {artifact_path}")
        return artifact_path, meta_path

    @classmethod
    def load(cls, artifact_path: str):
        payload = joblib.load(artifact_path)
        instance = cls(
            contamination=payload.get("contamination", 0.08),
            random_state=payload.get("random_state", 42)
        )
        instance.model = payload["model"]
        instance.scaler = payload["scaler"]
        instance.model_version = payload.get("model_version", "v1.0.0")
        instance.feature_version = payload.get("feature_version", "v1.0")
        instance.metrics = payload.get("metrics", {})
        instance.is_fitted = True
        return instance
