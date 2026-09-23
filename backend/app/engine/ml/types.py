"""
ML Anomaly Detection Data Types, Enums, and Structured Results.
Section 08 — ML Anomaly Detection.
"""
from enum import Enum
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict


class ModelStatus(str, Enum):
    CANDIDATE = "CANDIDATE"
    EVALUATED = "EVALUATED"
    APPROVED = "APPROVED"
    DEPLOYED = "DEPLOYED"
    PRODUCTION = "PRODUCTION"
    MONITORED = "MONITORED"
    RETIRED = "RETIRED"


class PredictionCategory(str, Enum):
    NORMAL = "NORMAL"
    SUSPICIOUS = "SUSPICIOUS"
    ANOMALOUS = "ANOMALOUS"


class MLTrainingConfig(BaseModel):
    """Hyperparameters and configuration for Isolation Forest training."""
    n_estimators: int = 150
    contamination: float = 0.08
    max_samples: Any = "auto"
    max_features: float = 1.0
    bootstrap: bool = False
    random_state: int = 42
    n_jobs: int = -1
    train_split: float = 0.70
    val_split: float = 0.15
    test_split: float = 0.15
    min_samples_required: int = 50


class EvaluationReport(BaseModel):
    """Unsupervised anomaly detection evaluation summary."""
    model_version: str
    feature_version: str
    algorithm: str = "Isolation Forest"
    evaluated_samples: int
    train_samples: int = 0
    val_samples: int = 0
    test_samples: int = 0
    anomaly_count: int = 0
    anomaly_percentage: float = 0.0
    score_mean: float = 0.0
    score_std: float = 0.0
    score_min: float = 0.0
    score_max: float = 0.0
    score_p25: float = 0.0
    score_p50: float = 0.0
    score_p75: float = 0.0
    score_p90: float = 0.0
    score_p95: float = 0.0
    score_p99: float = 0.0
    calibrated_threshold: float = 0.65
    labeled_metrics: Optional[Dict[str, Any]] = None
    evaluated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class MLPredictionResult(BaseModel):
    """Structured result returned by the ML inference engine."""
    transaction_id: str
    model_version: str
    model_version_id: Optional[str] = None
    feature_version: str
    anomaly_score: float = Field(..., description="Normalized score between 0.0 (normal) and 1.0 (anomalous)")
    is_anomaly: bool
    prediction: PredictionCategory = PredictionCategory.NORMAL
    confidence: float = 0.95
    threshold: float = 0.65
    inference_time_ms: float = 0.0
    context_signals: List[str] = Field(default_factory=list)
    feature_snapshot: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class BatchPredictionResult(BaseModel):
    """Result for batch inference operations."""
    total_processed: int
    anomalies_detected: int
    average_inference_time_ms: float
    total_duration_ms: float
    predictions: List[MLPredictionResult] = Field(default_factory=list)
