"""
Pydantic Schemas for Fraud Rules, Versions, Executions, Simulation, and Alert Engine Configuration.
Section 19 — Configurable Alerts & Rule Administration.
"""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field


class FraudRuleBase(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category: str = "AMOUNT"
    weight: float = 20.0
    severity: str = "MEDIUM"
    priority: int = 1
    is_active: bool = True
    condition_config: Dict[str, Any] = Field(default_factory=dict)
    version: str = "1.0"


class FraudRuleCreate(FraudRuleBase):
    pass


class FraudRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    weight: Optional[float] = None
    severity: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None
    condition_config: Optional[Dict[str, Any]] = None
    version: Optional[str] = None
    reason: Optional[str] = None


class FraudRuleVersionCreate(BaseModel):
    version: str
    configuration: Dict[str, Any] = Field(default_factory=dict)
    threshold: Optional[float] = None
    weight: float = 20.0
    is_active: bool = True
    reason: Optional[str] = None


class FraudRuleVersionResponse(BaseModel):
    id: str
    rule_id: str
    version: str
    configuration: Dict[str, Any]
    threshold: Optional[float] = None
    weight: float
    is_active: bool
    created_by: str
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FraudRuleResponse(FraudRuleBase):
    rule_code: Optional[str] = None
    created_by: str
    updated_by: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    versions: Optional[List[FraudRuleVersionResponse]] = None
    active_version_id: Optional[str] = None
    total_executions: int = 0
    total_triggers: int = 0
    trigger_rate: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class RuleExecutionResponse(BaseModel):
    id: str
    transaction_id: str
    rule_id: str
    rule_version_id: Optional[str] = None
    triggered: bool
    score: float
    reason: Optional[str] = None
    execution_time_ms: float
    points_awarded: Optional[float] = None
    execution_detail: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RuleEvaluationDetailResponse(BaseModel):
    rule_code: str
    rule_id: Optional[str] = None
    rule_version: str = "1.0"
    rule_version_id: Optional[str] = None
    name: str = ""
    category: str = "AMOUNT"
    severity: str = "MEDIUM"
    triggered: bool = False
    score: float = 0.0
    weight: float = 20.0
    reason: str = ""
    evidence: Optional[Dict[str, Any]] = None
    matched_features: Dict[str, Any] = Field(default_factory=dict)
    execution_time_ms: float = 0.0
    error: Optional[str] = None


class TransactionRulesEvaluateResponse(BaseModel):
    transaction_id: str
    total_score: float = 0.0
    triggered_count: int = 0
    total_evaluated_count: int = 0
    triggered_rules: List[RuleEvaluationDetailResponse] = Field(default_factory=list)
    all_rules: List[RuleEvaluationDetailResponse] = Field(default_factory=list)
    execution_duration_ms: float = 0.0


# ---------------------------------------------------------------------------
# Section 19: Administration, Validation, Version Diff, Simulation, & Alert Config
# ---------------------------------------------------------------------------

class RuleConfigValidationRequest(BaseModel):
    rule_code: str
    configuration: Dict[str, Any] = Field(default_factory=dict)


class RuleConfigValidationResponse(BaseModel):
    valid: bool
    rule_code: str
    cleaned_configuration: Dict[str, Any] = Field(default_factory=dict)
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    required_features: List[str] = Field(default_factory=list)


class RuleVersionCompareRequest(BaseModel):
    version_id_a: str
    version_id_b: str


class ConfigFieldDiff(BaseModel):
    field: str
    value_a: Any = None
    value_b: Any = None
    changed: bool = False


class RuleVersionCompareResponse(BaseModel):
    rule_id: str
    rule_code: str
    version_a: str
    version_b: str
    weight_a: float
    weight_b: float
    is_active_a: bool
    is_active_b: bool
    created_at_a: Optional[str] = None
    created_at_b: Optional[str] = None
    configuration_diff: List[ConfigFieldDiff] = Field(default_factory=list)


class RuleSimulationRequest(BaseModel):
    rule_code: str
    configuration: Optional[Dict[str, Any]] = None
    weight: Optional[float] = None
    severity: Optional[str] = None
    transaction_data: Dict[str, Any] = Field(
        default_factory=lambda: {
            "id": "SIM-TXN-001",
            "amount": 15000.0,
            "currency": "USD",
            "user_id": "USR-SIM-101",
            "merchant_name": "Crypto Exchange Global",
            "merchant_category": "crypto_exchange",
            "payment_method": "credit_card",
            "device_id": "DEV-SIM-999",
            "city": "Unknown City",
            "country": "US",
            "failed_attempts": 3
        }
    )
    feature_overrides: Optional[Dict[str, Any]] = None


class RuleSimulationResponse(BaseModel):
    rule_code: str
    triggered: bool
    score: float
    severity: str
    explanation: str
    matched_features: Dict[str, Any] = Field(default_factory=dict)
    configured_thresholds: Dict[str, Any] = Field(default_factory=dict)
    execution_time_ms: float
    simulated_at: str
    is_simulation: bool = True


class RuleExecutionListResponse(BaseModel):
    total: int
    rule_id: str
    items: List[RuleExecutionResponse] = Field(default_factory=list)


class AlertEngineConfigDTO(BaseModel):
    alert_config_version: str = "alert-v1.0.0"
    high_risk_threshold: float = 70.1
    critical_risk_threshold: float = 90.1
    ml_anomaly_threshold: float = 0.85
    cooldown_seconds: int = 300
    enable_cooldown: bool = True
    enable_critical_cooldown_override: bool = True
    enabled_alert_types: List[str] = Field(default_factory=list)
    severity_priority_map: Dict[str, str] = Field(default_factory=dict)
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AlertEngineConfigUpdateDTO(BaseModel):
    high_risk_threshold: Optional[float] = None
    critical_risk_threshold: Optional[float] = None
    ml_anomaly_threshold: Optional[float] = None
    cooldown_seconds: Optional[int] = None
    enable_cooldown: Optional[bool] = None
    enable_critical_cooldown_override: Optional[bool] = None
    enabled_alert_types: Optional[List[str]] = None
    severity_priority_map: Optional[Dict[str, str]] = None
    reason: Optional[str] = None
