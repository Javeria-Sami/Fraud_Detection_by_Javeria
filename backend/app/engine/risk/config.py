"""
Risk Scoring Configuration and Threshold Calibration.
Section 09 — Risk Engine.
"""
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict

RISK_SCORING_VERSION = "risk-v1.0.0"


class RiskScoringConfig(BaseModel):
    """
    Centralized configuration for risk score calculation, weights, and bands.
    """
    scoring_version: str = RISK_SCORING_VERSION

    # Component signal weights (must sum to ~1.0)
    rule_weight: float = Field(0.50, ge=0.0, le=1.0)
    ml_weight: float = Field(0.35, ge=0.0, le=1.0)
    behavior_weight: float = Field(0.15, ge=0.0, le=1.0)

    # Risk band thresholds (0 to 100)
    threshold_low: float = Field(30.0, ge=0.0, le=100.0)
    threshold_medium: float = Field(70.0, ge=0.0, le=100.0)
    threshold_high: float = Field(90.0, ge=0.0, le=100.0)

    # Severity floor overrides
    critical_severity_floor: float = Field(91.0, ge=0.0, le=100.0)
    high_severity_floor: float = Field(71.0, ge=0.0, le=100.0)
    enable_severity_floors: bool = True

    # Rule aggregation mode: 'diminishing_sum' or 'weighted_max'
    rule_aggregation_mode: str = "diminishing_sum"
    diminishing_factor: float = Field(0.60, ge=0.0, le=1.0)

    @field_validator("threshold_medium")
    @classmethod
    def validate_medium_threshold(cls, v: float, info) -> float:
        low = info.data.get("threshold_low", 30.0)
        if v < low:
            raise ValueError(f"threshold_medium ({v}) must be greater than or equal to threshold_low ({low}).")
        return v

    @field_validator("threshold_high")
    @classmethod
    def validate_high_threshold(cls, v: float, info) -> float:
        medium = info.data.get("threshold_medium", 70.0)
        if v < medium:
            raise ValueError(f"threshold_high ({v}) must be greater than or equal to threshold_medium ({medium}).")
        return v

    model_config = ConfigDict(from_attributes=True)


# Default global instance
default_risk_config = RiskScoringConfig()
