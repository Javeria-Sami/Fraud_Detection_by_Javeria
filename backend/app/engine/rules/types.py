"""
Rule Engine Data Types, Enums, and Structured Results.
Section 07 — Rule-Based Fraud Engine.
"""
from enum import Enum
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


class RuleSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RuleCategory(str, Enum):
    AMOUNT = "AMOUNT"
    VELOCITY = "VELOCITY"
    DEVICE = "DEVICE"
    LOCATION = "LOCATION"
    TIME = "TIME"
    FAILED_ATTEMPTS = "FAILED_ATTEMPTS"
    BEHAVIOR = "BEHAVIOR"
    MERCHANT = "MERCHANT"


class ComparisonOperator(str, Enum):
    GREATER_THAN = "greater_than"
    GREATER_THAN_OR_EQUAL = "greater_than_or_equal"
    LESS_THAN = "less_than"
    LESS_THAN_OR_EQUAL = "less_than_or_equal"
    EQUAL = "equal"
    NOT_EQUAL = "not_equal"
    IN = "in"
    NOT_IN = "not_in"


class RuleEvidence(BaseModel):
    """Structured evidence for explainability."""
    feature: str
    actual_value: Any
    threshold: Optional[Any] = None
    comparison: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class RuleEvaluationResult(BaseModel):
    """Structured result returned by an individual rule evaluation."""
    rule_code: str
    rule_id: Optional[str] = None
    rule_version: str = "1.0"
    rule_version_id: Optional[str] = None
    name: str = ""
    category: str = "AMOUNT"
    severity: RuleSeverity = RuleSeverity.MEDIUM
    triggered: bool = False
    score: float = 0.0
    weight: float = 20.0
    reason: str = ""
    evidence: Optional[RuleEvidence] = None
    matched_features: Dict[str, Any] = Field(default_factory=dict)
    execution_time_ms: float = 0.0
    error: Optional[str] = None


class TransactionRuleEvaluationResponse(BaseModel):
    """Overall response returned by the rule engine for a transaction."""
    transaction_id: str
    total_score: float = 0.0
    triggered_count: int = 0
    total_evaluated_count: int = 0
    triggered_rules: List[RuleEvaluationResult] = Field(default_factory=list)
    all_rules: List[RuleEvaluationResult] = Field(default_factory=list)
    execution_duration_ms: float = 0.0
