"""
Alert Engine Schemas for API Serialization, Validation, and Config Management.
Section 10 & 14 — Alert Engine & Alert Center.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from backend.app.engine.alerts.types import AlertSeverity, AlertPriority, AlertStatus, AlertType


class AlertResponse(BaseModel):
    """Standardized response representation of an operational fraud alert."""
    id: str
    transaction_id: str
    user_id: Optional[str] = None
    severity: str
    risk_score: float
    alert_reason: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    triggered_rules: List[Any] = Field(default_factory=list)
    model_version: Optional[str] = "v1.0.0"
    status: str
    assigned_to: Optional[str] = None
    case_id: Optional[str] = None
    acknowledged_at: Optional[str] = None
    resolved_at: Optional[str] = None
    closed_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AlertPaginatedResponse(BaseModel):
    """Envelope for paginated alert query responses."""
    items: List[AlertResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AlertStatsResponse(BaseModel):
    """Aggregate KPI metrics for the Alert Center workspace."""
    total_alerts: int
    open_alerts: int
    critical_alerts: int
    high_priority_alerts: int
    unassigned_alerts: int
    escalated_alerts: int
    resolved_today: int


class AlertInvestigationDetail(BaseModel):
    """Deep investigation telemetry for an individual alert."""
    alert: AlertResponse
    transaction: Optional[Dict[str, Any]] = None
    risk: Optional[Dict[str, Any]] = None
    rules: List[Dict[str, Any]] = Field(default_factory=list)
    ml_prediction: Optional[Dict[str, Any]] = None
    lifecycle_history: List[Dict[str, Any]] = Field(default_factory=list)


class AlertUpdate(BaseModel):
    """Payload for modifying alert status, assignment, or investigation link."""
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    case_id: Optional[str] = None
    note: Optional[str] = None
    expected_status: Optional[str] = None


class AlertActionRequest(BaseModel):
    """Payload for lifecycle transitions requiring reasons/notes."""
    reason: Optional[str] = None
    note: Optional[str] = None
    expected_status: Optional[str] = None


class AlertAssignRequest(BaseModel):
    """Payload for assigning an alert to an analyst."""
    assigned_to: str
    note: Optional[str] = None


class AlertEvaluateRequest(BaseModel):
    """Request schema for on-demand alert condition evaluation."""
    transaction_id: Optional[str] = None
    user_id: Optional[str] = None
    risk_score: float = Field(..., ge=0.0, le=100.0)
    risk_level: str = "LOW"
    triggered_rules: List[Dict[str, Any]] = Field(default_factory=list)
    ml_anomaly_score: Optional[float] = None
    persist: bool = False


class AlertDecisionResponse(BaseModel):
    """Structured decision output from the Alert Engine."""
    should_create_alert: bool
    alert_type: Optional[str] = None
    severity: str
    priority: str
    title: str
    description: str
    reason: str
    evidence: Dict[str, Any] = Field(default_factory=dict)
    deduplication_key: str
    suppressed_by_cooldown: bool = False
    configuration_version: str
    created_alert_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AlertConfigResponse(BaseModel):
    """Response schema for active Alert Engine configuration."""
    alert_config_version: str
    high_risk_threshold: float
    critical_risk_threshold: float
    ml_anomaly_threshold: float
    cooldown_seconds: int
    enable_cooldown: bool
    enable_critical_cooldown_override: bool
    enabled_alert_types: List[str]
    severity_priority_map: Dict[str, str]

    model_config = ConfigDict(from_attributes=True)


class AlertConfigUpdateRequest(BaseModel):
    """Schema for updating Alert Engine thresholds and parameters."""
    high_risk_threshold: Optional[float] = Field(None, ge=0.0, le=100.0)
    critical_risk_threshold: Optional[float] = Field(None, ge=0.0, le=100.0)
    ml_anomaly_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    cooldown_seconds: Optional[int] = Field(None, ge=0)
    enable_cooldown: Optional[bool] = None
    enable_critical_cooldown_override: Optional[bool] = None
    enabled_alert_types: Optional[List[str]] = None
    severity_priority_map: Optional[Dict[str, str]] = None
