"""
Risk Engine Schemas for API Serialization and Validation.
Section 09 — Risk Engine.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from backend.app.engine.risk.types import RiskLevel, CalculationStatus


class RiskFactorResponse(BaseModel):
    """Structured explainability factor for client consumption."""
    factor_name: str
    code: str
    weight: float
    score: float
    contribution: float
    description: str
    evidence: Optional[Dict[str, Any]] = None


class RiskScoreResponse(BaseModel):
    """Standardized response schema for risk evaluation results."""
    transaction_id: str
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Final calibrated risk score [0-100]")
    risk_level: RiskLevel
    status: CalculationStatus = CalculationStatus.COMPLETED
    
    rule_score: float = 0.0
    ml_score: float = 0.0
    behavior_score: float = 0.0
    
    triggered_rule_count: int = 0
    signals_evaluated: int = 0
    factors: List[RiskFactorResponse] = Field(default_factory=list)
    
    scoring_version: str = "risk-v1.0.0"
    rule_version: Optional[str] = None
    model_version: Optional[str] = None
    feature_version: Optional[str] = None
    
    calculated_at: str
    calculation_time_ms: float = 0.0
    error: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RiskEvaluateRequest(BaseModel):
    """Request payload for on-demand risk evaluation."""
    transaction_id: Optional[str] = None
    transaction_data: Optional[Dict[str, Any]] = None
    features: Optional[Dict[str, Any]] = None
    triggered_rules: Optional[List[Dict[str, Any]]] = None
    ml_anomaly_score: Optional[float] = None
    persist: bool = False


class RiskConfigResponse(BaseModel):
    """Schema representing the active risk scoring configuration."""
    scoring_version: str
    rule_weight: float
    ml_weight: float
    behavior_weight: float
    threshold_low: float
    threshold_medium: float
    threshold_high: float
    critical_severity_floor: float
    high_severity_floor: float
    enable_severity_floors: bool
    rule_aggregation_mode: str
    diminishing_factor: float

    model_config = ConfigDict(from_attributes=True)


class RiskConfigUpdateRequest(BaseModel):
    """Schema for updating risk scoring configuration parameters."""
    rule_weight: Optional[float] = Field(None, ge=0.0, le=1.0)
    ml_weight: Optional[float] = Field(None, ge=0.0, le=1.0)
    behavior_weight: Optional[float] = Field(None, ge=0.0, le=1.0)
    threshold_low: Optional[float] = Field(None, ge=0.0, le=100.0)
    threshold_medium: Optional[float] = Field(None, ge=0.0, le=100.0)
    threshold_high: Optional[float] = Field(None, ge=0.0, le=100.0)
    critical_severity_floor: Optional[float] = Field(None, ge=0.0, le=100.0)
    high_severity_floor: Optional[float] = Field(None, ge=0.0, le=100.0)
    enable_severity_floors: Optional[bool] = None
    rule_aggregation_mode: Optional[str] = None
    diminishing_factor: Optional[float] = Field(None, ge=0.0, le=1.0)
