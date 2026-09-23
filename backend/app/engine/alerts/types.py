"""
Alert Engine Data Types, Enums, Models, and Structured Decision Objects.
Section 10 — Alert Engine.
"""
from enum import Enum
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict


class AlertSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertPriority(str, Enum):
    P1 = "P1" # Critical
    P2 = "P2" # High
    P3 = "P3" # Medium
    P4 = "P4" # Low


class AlertStatus(str, Enum):
    NEW = "NEW"
    OPEN = "OPEN"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    INVESTIGATING = "INVESTIGATING"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    DISMISSED = "DISMISSED"
    ESCALATED = "ESCALATED"


class AlertType(str, Enum):
    CRITICAL_RISK_TRANSACTION = "CRITICAL_RISK_TRANSACTION"
    HIGH_RISK_TRANSACTION = "HIGH_RISK_TRANSACTION"
    RULE_TRIGGERED = "RULE_TRIGGERED"
    ML_ANOMALY = "ML_ANOMALY"
    RAPID_TRANSACTION_ACTIVITY = "RAPID_TRANSACTION_ACTIVITY"
    NEW_DEVICE_RISK = "NEW_DEVICE_RISK"
    UNUSUAL_LOCATION = "UNUSUAL_LOCATION"
    HIGH_AMOUNT = "HIGH_AMOUNT"
    FAILED_ATTEMPT_PATTERN = "FAILED_ATTEMPT_PATTERN"
    CUSTOM_CONDITION = "CUSTOM_CONDITION"


class AlertDecision(BaseModel):
    """Structured decision output produced by the pure alert evaluator."""
    should_create_alert: bool = False
    alert_type: Optional[AlertType] = None
    severity: AlertSeverity = AlertSeverity.MEDIUM
    priority: AlertPriority = AlertPriority.P3
    title: str = ""
    description: str = ""
    reason: str = ""
    evidence: Dict[str, Any] = Field(default_factory=dict)
    deduplication_key: str = ""
    suppressed_by_cooldown: bool = False
    configuration_version: str = "alert-v1.0.0"

    model_config = ConfigDict(from_attributes=True)
