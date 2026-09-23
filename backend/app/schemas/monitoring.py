"""
Pydantic Data Transfer Objects for Model Monitoring & MLOps.
Section 20 — Model Monitoring & MLOps.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ModelMonitoringRunRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    model_version_id: Optional[str] = Field(None, description="Target model version identifier or string version")
    monitoring_window_start: Optional[datetime] = Field(None, description="Start time for current evaluation window (UTC)")
    monitoring_window_end: Optional[datetime] = Field(None, description="End time for current evaluation window (UTC)")
    reference_window_start: Optional[datetime] = Field(None, description="Start time for reference baseline window (UTC)")
    reference_window_end: Optional[datetime] = Field(None, description="End time for reference baseline window (UTC)")


class FeatureDriftDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    feature_name: str
    drift_method: str = "PSI"
    drift_value: float
    p_value: Optional[float] = None
    threshold: Optional[float] = None
    status: str = "NORMAL"  # NORMAL, WARNING, CRITICAL, UNKNOWN
    reference_statistics: Optional[Dict[str, Any]] = None
    current_statistics: Optional[Dict[str, Any]] = None


class MetricSnapshotDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    metric_name: str
    metric_value: float
    metric_unit: Optional[str] = None
    threshold: Optional[float] = None
    status: str = "NORMAL"


class ModelMonitoringRunDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    model_version_id: str
    feature_version: Optional[str] = "v1.0"
    status: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    duration_ms: float = 0.0
    records_evaluated: int = 0
    reference_window_start: Optional[str] = None
    reference_window_end: Optional[str] = None
    monitoring_window_start: Optional[str] = None
    monitoring_window_end: Optional[str] = None
    summary: Dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = None
    drift_results: Optional[List[FeatureDriftDTO]] = None
    metric_snapshots: Optional[List[MetricSnapshotDTO]] = None


class ModelMonitoringRunListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total: int
    items: List[ModelMonitoringRunDTO]


class ModelMonitoringConfigDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    psi_warning_threshold: float = 0.10
    psi_critical_threshold: float = 0.25
    ks_pvalue_critical: float = 0.01
    latency_p95_warning_ms: float = 100.0
    latency_p95_critical_ms: float = 250.0
    min_sample_size: int = 15
    max_acceptable_missing_pct: float = 5.0
    anomaly_rate_warning_pct: float = 35.0
    default_monitoring_window_hours: int = 24
    default_reference_window_days: int = 7


class ModelMonitoringConfigUpdateDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    psi_warning_threshold: Optional[float] = Field(None, ge=0.01, le=1.0)
    psi_critical_threshold: Optional[float] = Field(None, ge=0.05, le=2.0)
    ks_pvalue_critical: Optional[float] = Field(None, ge=0.0001, le=0.1)
    latency_p95_warning_ms: Optional[float] = Field(None, ge=1.0, le=5000.0)
    latency_p95_critical_ms: Optional[float] = Field(None, ge=5.0, le=10000.0)
    min_sample_size: Optional[int] = Field(None, ge=5, le=10000)
    max_acceptable_missing_pct: Optional[float] = Field(None, ge=0.0, le=50.0)
    anomaly_rate_warning_pct: Optional[float] = Field(None, ge=1.0, le=100.0)
    default_monitoring_window_hours: Optional[int] = Field(None, ge=1, le=720)
    default_reference_window_days: Optional[int] = Field(None, ge=1, le=90)


class MLOpsHealthSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    active_model_id: Optional[str] = None
    active_model_version: Optional[str] = None
    feature_version: Optional[str] = None
    health_status: str = "NORMAL"
    health_reason: str = "All telemetry nominal"
    checks_summary: Dict[str, Any] = Field(default_factory=dict)
    last_monitored_at: Optional[str] = None
    last_run_id: Optional[str] = None
    prediction_volume: int = 0
    anomaly_rate_pct: float = 0.0
    p95_latency_ms: float = 0.0
    features_monitored: int = 0
    features_with_drift: int = 0
    critical_features_count: int = 0
    score_psi: float = 0.0
    data_quality_status: str = "NORMAL"
