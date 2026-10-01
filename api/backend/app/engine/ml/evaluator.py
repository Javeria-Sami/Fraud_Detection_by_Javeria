"""
ML Model Evaluation and Threshold Calibration Service.
Section 08 — ML Anomaly Detection.

Produces unsupervised anomaly distribution statistics, quantiles, and threshold calibration.
Calculates precision, recall, and ROC-AUC only when valid ground-truth labels exist.
"""
from typing import Dict, Any, Optional
import numpy as np
import pandas as pd
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score

from backend.app.engine.ml.types import EvaluationReport


class MLEvaluationService:
    """
    Computes comprehensive anomaly metrics and calibrates operational decision thresholds.
    """

    @classmethod
    def evaluate(
        cls,
        model_version: str,
        feature_version: str,
        scores: np.ndarray,
        train_count: int = 0,
        val_count: int = 0,
        test_count: int = 0,
        threshold: float = 0.65,
        labels: Optional[np.ndarray] = None
    ) -> EvaluationReport:
        """
        Evaluates unsupervised anomaly distribution across scores and computes labeled metrics if available.
        """
        arr_scores = np.asarray(scores, dtype=np.float64)
        n = len(arr_scores)

        if n == 0:
            return EvaluationReport(
                model_version=model_version,
                feature_version=feature_version,
                evaluated_samples=0,
                calibrated_threshold=threshold
            )

        # Anomaly predictions at threshold
        is_anomaly = arr_scores >= threshold
        anomaly_count = int(np.sum(is_anomaly))
        anomaly_percentage = round((anomaly_count / n) * 100.0, 2)

        # Score quantiles
        p25, p50, p75, p90, p95, p99 = np.percentile(arr_scores, [25, 50, 75, 90, 95, 99])

        # Labeled metrics if labels are provided and non-trivial
        labeled_metrics = None
        if labels is not None and len(labels) == n and len(np.unique(labels)) > 1:
            y_true = np.asarray(labels, dtype=int)
            y_pred = is_anomaly.astype(int)

            prec = float(precision_score(y_true, y_pred, zero_division=0))
            rec = float(recall_score(y_true, y_pred, zero_division=0))
            f1 = float(f1_score(y_true, y_pred, zero_division=0))
            try:
                auc = float(roc_auc_score(y_true, arr_scores))
            except Exception:
                auc = 0.5

            labeled_metrics = {
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "f1_score": round(f1, 4),
                "roc_auc": round(auc, 4),
                "labeled_samples": n
            }

        return EvaluationReport(
            model_version=model_version,
            feature_version=feature_version,
            evaluated_samples=n,
            train_samples=train_count,
            val_samples=val_count,
            test_samples=test_count,
            anomaly_count=anomaly_count,
            anomaly_percentage=anomaly_percentage,
            score_mean=round(float(np.mean(arr_scores)), 4),
            score_std=round(float(np.std(arr_scores)), 4),
            score_min=round(float(np.min(arr_scores)), 4),
            score_max=round(float(np.max(arr_scores)), 4),
            score_p25=round(float(p25), 4),
            score_p50=round(float(p50), 4),
            score_p75=round(float(p75), 4),
            score_p90=round(float(p90), 4),
            score_p95=round(float(p95), 4),
            score_p99=round(float(p99), 4),
            calibrated_threshold=round(threshold, 4),
            labeled_metrics=labeled_metrics
        )

    @classmethod
    def calibrate_threshold(cls, val_scores: np.ndarray, target_contamination: float = 0.08) -> float:
        """
        Calibrates the anomaly decision threshold based on the validation score quantile.
        e.g., target_contamination = 0.08 sets threshold at (1 - 0.08) * 100 = 92nd percentile.
        """
        if len(val_scores) == 0:
            return 0.65
        percentile = (1.0 - target_contamination) * 100.0
        calibrated = float(np.percentile(val_scores, percentile))
        # Clamp to reasonable bounds
        return max(0.40, min(0.95, round(calibrated, 4)))
