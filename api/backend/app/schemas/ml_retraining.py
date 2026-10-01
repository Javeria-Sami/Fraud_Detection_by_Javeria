"""
Pydantic Schemas for MLOps Model Retraining Subsystem.
Section 21 — Model Retraining.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class StartRetrainingRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    custom_version: Optional[str] = Field(None, description="Custom semantic model version name (e.g. v1.3.0)")
    model_type: str = Field("Isolation Forest", description="Model architecture")
    n_estimators: int = Field(150, ge=50, le=500)
    contamination: float = Field(0.08, ge=0.001, le=0.30)
    random_state: int = Field(42, ge=0)
    train_ratio: float = Field(0.70, ge=0.50, le=0.90)
    val_ratio: float = Field(0.15, ge=0.05, le=0.30)
    test_ratio: float = Field(0.15, ge=0.05, le=0.30)
    min_samples: int = Field(50, ge=20)
    threshold_method: str = Field("CONTAMINATION", description="PERCENTILE, CONTAMINATION, FIXED")
    fixed_threshold: float = Field(0.65, ge=0.0, le=1.0)
    target_feature_version: str = Field("features-v1", description="Expected feature store version")
    training_window_start: Optional[datetime] = None
    training_window_end: Optional[datetime] = None


class RetrainingRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    model_type: str
    base_model_version_id: Optional[str] = None
    candidate_model_version_id: Optional[str] = None
    candidate_version: Optional[str] = None
    feature_version: str
    dataset_reference: Optional[str] = None
    training_window_start: Optional[str] = None
    training_window_end: Optional[str] = None
    status: str
    records_used: int
    started_at: str
    completed_at: Optional[str] = None
    duration_ms: float = 0.0
    error_message: Optional[str] = None
    evaluation_report: Dict[str, Any] = Field(default_factory=dict)
    model_comparison: Dict[str, Any] = Field(default_factory=dict)
    data_quality_summary: Dict[str, Any] = Field(default_factory=dict)
    artifact_checksum: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[str] = None


class RetrainingRunListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total: int
    runs: List[RetrainingRunResponse]


class RetrainingConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    default_model_type: str
    default_n_estimators: int
    default_contamination: float
    default_random_state: int
    default_train_ratio: float
    default_val_ratio: float
    default_test_ratio: float
    minimum_training_samples: int
    maximum_training_samples: int
    default_threshold_method: str
    default_fixed_threshold: float
    auto_evaluate_candidate: bool
    target_feature_version: str
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None


class UpdateRetrainingConfigRequest(BaseModel):
    default_n_estimators: Optional[int] = Field(None, ge=50, le=500)
    default_contamination: Optional[float] = Field(None, ge=0.001, le=0.30)
    default_random_state: Optional[int] = Field(None, ge=0)
    default_train_ratio: Optional[float] = Field(None, ge=0.50, le=0.90)
    default_val_ratio: Optional[float] = Field(None, ge=0.05, le=0.30)
    default_test_ratio: Optional[float] = Field(None, ge=0.05, le=0.30)
    minimum_training_samples: Optional[int] = Field(None, ge=20)
    default_threshold_method: Optional[str] = None
    default_fixed_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
