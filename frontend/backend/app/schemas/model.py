"""
Pydantic Schemas for ML Models, Predictions, and Registry.
Section 08 — ML Anomaly Detection.
"""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field


class MLModelResponse(BaseModel):
    id: str
    name: Optional[str] = None
    model_name: Optional[str] = None
    version: str
    algorithm: str
    feature_version: str
    status: str
    parameters: Optional[Dict[str, Any]] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)
    drift_metrics: Dict[str, Any] = Field(default_factory=dict)
    artifact_path: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[str] = None
    deployed_at: Optional[str] = None
    retired_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TrainModelRequest(BaseModel):
    version: Optional[str] = None
    n_estimators: int = 150
    contamination: float = 0.08
    random_state: int = 42
    train_split: float = 0.70
    val_split: float = 0.15
    test_split: float = 0.15
    max_samples: Optional[int] = None
    description: Optional[str] = None


class RetrainRequest(BaseModel):
    num_samples: int = 1000
    anomaly_ratio: float = 0.08
    version: Optional[str] = None


class EvaluateModelRequest(BaseModel):
    dataset_limit: Optional[int] = 5000


class PredictRequest(BaseModel):
    transaction: Dict[str, Any]
    features: Optional[Dict[str, Any]] = None


class BatchPredictRequest(BaseModel):
    items: List[PredictRequest]


class MLPredictionResponse(BaseModel):
    transaction_id: str
    model_version: str
    model_version_id: Optional[str] = None
    feature_version: str
    anomaly_score: float
    is_anomaly: bool
    prediction: str
    confidence: float
    threshold: float
    inference_time_ms: float
    context_signals: List[str] = Field(default_factory=list)
    feature_snapshot: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class BatchPredictionResponse(BaseModel):
    total_processed: int
    anomalies_detected: int
    average_inference_time_ms: float
    total_duration_ms: float
    predictions: List[MLPredictionResponse] = Field(default_factory=list)
