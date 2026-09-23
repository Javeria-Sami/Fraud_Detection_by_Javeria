"""
Risk Engine Data Types, Enums, and Structured Results.
Section 09 — Risk Engine.
"""
from enum import Enum
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class CalculationStatus(str, Enum):
    COMPLETED = "COMPLETED"
    PARTIAL = "PARTIAL"
    FAILED = "FAILED"


class SignalSource(str, Enum):
    RULE = "RULE"
    ML = "ML"
    FEATURE = "FEATURE"
    SYSTEM = "SYSTEM"


class RiskSignal(BaseModel):
    """Normalized atomic signal consumed by the Risk Engine."""
    source: SignalSource
    signal_code: str
    signal_type: str = "ANOMALY"
    score: float = Field(..., ge=0.0, le=100.0, description="Normalized signal score [0-100]")
    severity: str = "MEDIUM"
    triggered: bool = True
    weight: float = 1.0
    contribution: float = 0.0
    reason: str = ""
    evidence: Optional[Dict[str, Any]] = None
    version: Optional[str] = None


class RiskExplanationFactor(BaseModel):
    """Human-readable explainability component with structured evidence."""
    factor_name: str
    code: str
    weight: float
    score: float
    contribution: float
    description: str
    evidence: Optional[Dict[str, Any]] = None


class RiskResult(BaseModel):
    """Complete structured risk evaluation output."""
    transaction_id: str
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Final calibrated score 0 to 100")
    risk_level: RiskLevel = RiskLevel.LOW
    status: CalculationStatus = CalculationStatus.COMPLETED
    
    # Sub-component scores
    rule_score: float = 0.0
    ml_score: float = 0.0
    behavior_score: float = 0.0
    
    # Signal counts & explanations
    triggered_rule_count: int = 0
    signals_evaluated: int = 0
    factors: List[RiskExplanationFactor] = Field(default_factory=list)
    
    # Versioning & Audit
    scoring_version: str = "risk-v1.0.0"
    rule_version: Optional[str] = None
    model_version: Optional[str] = None
    feature_version: Optional[str] = None
    
    calculated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    calculation_time_ms: float = 0.0
    error: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
