"""
ML Model Registry, Versioning, Prediction, and MLOps Monitoring Models.
Section 08 — ML Anomaly Detection & Section 20 — Model Monitoring & MLOps.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class MLModelRegistry(Base):
    __tablename__ = "model_versions"
    
    id = Column(String(50), primary_key=True)  # e.g. MODEL-ISOFOREST-V1
    model_name = Column(String(100), nullable=False)
    version = Column(String(50), unique=True, nullable=False, index=True)  # v1.0.0
    algorithm = Column(String(100), default="Isolation Forest")
    status = Column(String(30), default="DEPLOYED", index=True)  # CANDIDATE, EVALUATED, APPROVED, DEPLOYED, MONITORED, RETIRED
    
    training_dataset = Column(String(255), nullable=True)
    feature_version = Column(String(50), default="v1.0")
    parameters = Column(JSON, default=dict)
    metrics = Column(JSON, default=dict)  # precision, recall, f1, roc_auc
    drift_metrics = Column(JSON, default=dict)  # psi, feature drift
    artifact_path = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    
    trained_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    deployed_at = Column(DateTime, nullable=True)
    retired_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    predictions = relationship("MLPrediction", back_populates="model_version")
    monitoring_runs = relationship("ModelMonitoringRun", back_populates="model_version", cascade="all, delete-orphan")
    health_statuses = relationship("ModelHealthStatus", back_populates="model_version", cascade="all, delete-orphan")


# Alias for backward compatibility
ModelVersion = MLModelRegistry


class MLPrediction(Base):
    __tablename__ = "ml_predictions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    transaction_id = Column(String(50), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    model_version_id = Column(String(50), ForeignKey("model_versions.id", ondelete="SET NULL"), nullable=True, index=True)
    
    anomaly_score = Column(Float, nullable=False)  # 0.0 to 1.0 (or -0.5 to 0.5 normalized)
    prediction = Column(String(50), default="NORMAL")  # NORMAL, ANOMALOUS, SUSPICIOUS
    confidence = Column(Float, default=0.95)
    feature_snapshot = Column(JSON, nullable=True)
    inference_time_ms = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    
    # Relationships
    transaction = relationship("Transaction", back_populates="ml_predictions")
    model_version = relationship("MLModelRegistry", back_populates="predictions")


class ModelMonitoringRun(Base):
    __tablename__ = "model_monitoring_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    model_version_id = Column(String(50), ForeignKey("model_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    feature_version = Column(String(50), default="v1.0")

    reference_window_start = Column(DateTime, nullable=True)
    reference_window_end = Column(DateTime, nullable=True)
    monitoring_window_start = Column(DateTime, nullable=True)
    monitoring_window_end = Column(DateTime, nullable=True)

    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(30), default="RUNNING", index=True)  # RUNNING, COMPLETED, PARTIAL, FAILED
    records_evaluated = Column(Integer, default=0)
    duration_ms = Column(Float, default=0.0)
    error_message = Column(Text, nullable=True)
    summary = Column(JSON, default=dict)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    model_version = relationship("MLModelRegistry", back_populates="monitoring_runs")
    metric_snapshots = relationship("ModelMetricSnapshot", back_populates="monitoring_run", cascade="all, delete-orphan")
    drift_results = relationship("FeatureDriftResult", back_populates="monitoring_run", cascade="all, delete-orphan")
    health_status = relationship("ModelHealthStatus", back_populates="monitoring_run", uselist=False, cascade="all, delete-orphan")


class ModelMetricSnapshot(Base):
    __tablename__ = "model_metric_snapshots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    monitoring_run_id = Column(String(36), ForeignKey("model_monitoring_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    metric_name = Column(String(100), nullable=False, index=True)
    metric_value = Column(Float, nullable=False)
    metric_unit = Column(String(30), nullable=True)
    threshold = Column(Float, nullable=True)
    status = Column(String(30), default="NORMAL")  # NORMAL, WARNING, CRITICAL, UNKNOWN
    calculation_metadata = Column(JSON, default=dict)
    calculated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    monitoring_run = relationship("ModelMonitoringRun", back_populates="metric_snapshots")


class FeatureDriftResult(Base):
    __tablename__ = "feature_drift_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    monitoring_run_id = Column(String(36), ForeignKey("model_monitoring_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    feature_name = Column(String(100), nullable=False, index=True)
    feature_version = Column(String(50), default="v1.0")
    drift_method = Column(String(50), default="PSI")  # PSI, KS_TEST, JENSEN_SHANNON, CHI_SQUARE
    drift_value = Column(Float, nullable=False)
    p_value = Column(Float, nullable=True)
    threshold = Column(Float, nullable=True)
    status = Column(String(30), default="NORMAL", index=True)  # NORMAL, WARNING, CRITICAL, UNKNOWN
    reference_statistics = Column(JSON, default=dict)
    current_statistics = Column(JSON, default=dict)
    calculated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    monitoring_run = relationship("ModelMonitoringRun", back_populates="drift_results")


class ModelHealthStatus(Base):
    __tablename__ = "model_health_statuses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    model_version_id = Column(String(50), ForeignKey("model_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    monitoring_run_id = Column(String(36), ForeignKey("model_monitoring_runs.id", ondelete="CASCADE"), nullable=True, index=True)
    health_status = Column(String(30), default="NORMAL", index=True)  # NORMAL, WARNING, CRITICAL, UNKNOWN
    reason = Column(Text, nullable=True)
    checks_summary = Column(JSON, default=dict)
    calculated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    model_version = relationship("MLModelRegistry", back_populates="health_statuses")
    monitoring_run = relationship("ModelMonitoringRun", back_populates="health_status")


class ModelRetrainingRun(Base):
    __tablename__ = "model_retraining_runs"

    id = Column(String(60), primary_key=True, default=lambda: f"RETRAIN-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:8]}")
    model_type = Column(String(100), default="Isolation Forest")
    base_model_version_id = Column(String(50), ForeignKey("model_versions.id", ondelete="SET NULL"), nullable=True, index=True)
    candidate_model_version_id = Column(String(50), ForeignKey("model_versions.id", ondelete="SET NULL"), nullable=True, index=True)
    feature_version = Column(String(50), default="features-v1")

    dataset_reference = Column(String(255), nullable=True)
    training_window_start = Column(DateTime, nullable=True)
    training_window_end = Column(DateTime, nullable=True)
    validation_window_start = Column(DateTime, nullable=True)
    validation_window_end = Column(DateTime, nullable=True)
    test_window_start = Column(DateTime, nullable=True)
    test_window_end = Column(DateTime, nullable=True)

    configuration_snapshot = Column(JSON, default=dict)
    status = Column(String(30), default="QUEUED", index=True)  # QUEUED, RUNNING, VALIDATING_DATA, FEATURE_ENGINEERING, TRAINING, EVALUATING, COMPLETED, FAILED, CANCELLED
    records_used = Column(Integer, default=0)

    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    completed_at = Column(DateTime, nullable=True)
    duration_ms = Column(Float, default=0.0)
    error_message = Column(Text, nullable=True)

    evaluation_report = Column(JSON, default=dict)
    model_comparison = Column(JSON, default=dict)
    data_quality_summary = Column(JSON, default=dict)
    artifact_checksum = Column(String(100), nullable=True)

    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    base_model_version = relationship("MLModelRegistry", foreign_keys=[base_model_version_id], lazy="selectin")
    candidate_model_version = relationship("MLModelRegistry", foreign_keys=[candidate_model_version_id], lazy="selectin")


