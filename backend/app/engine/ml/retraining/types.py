"""
Retraining Data Types, Enums, and Configuration Specifications.
Section 21 — Model Retraining.
"""
import enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class RetrainingStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    VALIDATING_DATA = "VALIDATING_DATA"
    FEATURE_ENGINEERING = "FEATURE_ENGINEERING"
    TRAINING = "TRAINING"
    EVALUATING = "EVALUATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class ThresholdMethod(str, enum.Enum):
    PERCENTILE = "PERCENTILE"
    CONTAMINATION = "CONTAMINATION"
    FIXED = "FIXED"
    F1_OPTIMAL = "F1_OPTIMAL"


class TemporalSplitConfig(BaseModel):
    train_ratio: float = Field(0.70, ge=0.50, le=0.90)
    val_ratio: float = Field(0.15, ge=0.05, le=0.30)
    test_ratio: float = Field(0.15, ge=0.05, le=0.30)


class RetrainingConfig(BaseModel):
    model_type: str = "Isolation Forest"
    n_estimators: int = Field(150, ge=50, le=500)
    contamination: float = Field(0.08, ge=0.001, le=0.30)
    max_samples: Optional[Any] = "auto"
    max_features: float = Field(1.0, ge=0.1, le=1.0)
    bootstrap: bool = False
    random_state: int = Field(42, ge=0)
    threshold_method: ThresholdMethod = ThresholdMethod.CONTAMINATION
    fixed_threshold: float = Field(0.65, ge=0.0, le=1.0)
    splits: TemporalSplitConfig = TemporalSplitConfig()
    min_samples: int = Field(50, ge=20)
    target_feature_version: str = "features-v1"


class ModelComparisonReport(BaseModel):
    candidate_version: str
    active_version: Optional[str] = None
    comparison_timestamp: str
    feature_version: str
    metrics_comparison: Dict[str, Dict[str, Any]]
    score_distribution_comparison: Dict[str, Dict[str, Any]]
    score_psi_shift: float = 0.0
    anomaly_rate_candidate: float = 0.0
    anomaly_rate_active: Optional[float] = None
    latency_p95_candidate_ms: float = 0.0
    latency_p95_active_ms: Optional[float] = None
    supervised_metrics_available: bool = False
    verdict: str
