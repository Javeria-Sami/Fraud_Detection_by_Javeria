"""
Pydantic Schemas for Transaction Ingestion, Normalization, and Querying.
"""
from typing import Optional, List, Any, Dict
from datetime import datetime, timezone
from pydantic import BaseModel, Field, field_validator, ConfigDict

# Controlled payment methods and transaction types
VALID_PAYMENT_METHODS = {
    "CREDIT_CARD", "DEBIT_CARD", "WIRE_TRANSFER", "WIRE",
    "APPLE_PAY", "GOOGLE_PAY", "CRYPTO", "CASH", "MOBILE_WALLET", "OTHER"
}

VALID_TRANSACTION_TYPES = {
    "PURCHASE", "TRANSFER", "WITHDRAWAL", "REFUND", "PAYMENT", "DEPOSIT"
}

VALID_SOURCES = {
    "API", "SIMULATOR", "IMPORT", "INTERNAL"
}

VALID_STATUSES = {
    "PENDING", "COMPLETED", "FAILED", "DECLINED", "REVERSED", "CANCELLED",
    "APPROVED", "REVIEW_REQUIRED", "BLOCKED", "FLAGGED"
}

class TransactionCreate(BaseModel):
    transaction_id: Optional[str] = Field(None, max_length=50, description="Unique transaction identifier (e.g. TXN-10001)")
    user_id: str = Field(..., min_length=1, max_length=50, description="Associated customer or user identifier")
    user_name: Optional[str] = Field(None, max_length=255)
    merchant_id: Optional[str] = Field(None, max_length=50, description="Associated merchant ID")
    merchant_name: str = Field(..., min_length=1, max_length=255, description="Merchant or payee name")
    merchant_category: str = Field("general", min_length=1, max_length=100)
    
    amount: float = Field(..., gt=0, description="Transaction financial amount (strictly positive)")
    currency: str = Field("USD", min_length=3, max_length=3, description="ISO 4217 Currency Code (e.g. USD, EUR, GBP)")
    payment_method: str = Field("CREDIT_CARD", description="Payment instrument category")
    transaction_type: str = Field("PURCHASE", description="Type of transaction")
    
    device_id: str = Field(..., min_length=1, max_length=100, description="Device fingerprint or identifier")
    ip_address: Optional[str] = Field(None, max_length=50)
    
    country: Optional[str] = Field(None, min_length=2, max_length=2, description="ISO 3166-1 alpha-2 country code")
    city: Optional[str] = Field(None, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0, description="Longitude between -180 and 180")
    
    failed_attempts: int = Field(0, ge=0, description="Number of previous failed PIN/Auth attempts")
    source: Optional[str] = Field("API", description="Ingestion source: API, SIMULATOR, IMPORT, INTERNAL")
    status: Optional[str] = Field(None, description="Initial transaction status")
    timestamp: Optional[str] = Field(None, description="ISO 8601 transaction timestamp")

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, v: str) -> str:
        if not v or len(v.strip()) != 3:
            raise ValueError("Currency must be a valid 3-letter ISO code")
        return v.strip().upper()

    @field_validator("country")
    @classmethod
    def normalize_country(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        clean = v.strip().upper()
        if len(clean) != 2:
            raise ValueError("Country must be a valid 2-letter ISO 3166-1 alpha-2 code")
        return clean

    @field_validator("merchant_name", "merchant_category", "city", "user_name", "ip_address", "payment_method", "transaction_type", "source")
    @classmethod
    def normalize_strings(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return v.strip()

    @field_validator("payment_method")
    @classmethod
    def validate_payment_method(cls, v: str) -> str:
        clean = v.strip().upper().replace(" ", "_")
        if clean not in VALID_PAYMENT_METHODS:
            # Allow fallback gracefully or map
            return clean
        return clean

    @field_validator("transaction_type")
    @classmethod
    def validate_transaction_type(cls, v: str) -> str:
        clean = v.strip().upper().replace(" ", "_")
        if clean not in VALID_TRANSACTION_TYPES:
            return clean
        return clean

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: Optional[str]) -> str:
        if not v:
            return "API"
        clean = v.strip().upper()
        if clean not in VALID_SOURCES:
            return "API"
        return clean

    model_config = ConfigDict(extra="ignore")

class RiskFactor(BaseModel):
    factor_name: str
    weight: float
    contribution: float
    description: str

    model_config = ConfigDict(from_attributes=True)

class TransactionResponse(BaseModel):
    id: str
    transaction_id: Optional[str] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    merchant_id: Optional[str] = None
    merchant_name: Optional[str] = "Unknown Merchant"
    merchant_category: Optional[str] = "general"
    payment_method: Optional[str] = "CREDIT_CARD"
    transaction_type: str = "PURCHASE"
    amount: float
    currency: str = "USD"
    device_id: Optional[str] = "DEV-UNKNOWN"
    ip_address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    failed_attempts: int
    source: str
    risk_score: float
    risk_level: str
    ml_anomaly_score: float
    rules_triggered: List[Any] = Field(default_factory=list)
    risk_factors: List[Any] = Field(default_factory=list)
    status: str
    timestamp: str
    created_at: str

    model_config = ConfigDict(from_attributes=True)

class TransactionListResponse(BaseModel):
    items: List[TransactionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

    model_config = ConfigDict(from_attributes=True)

class TransactionRiskDetail(BaseModel):
    score: float
    risk_level: str
    rule_score: float = 0.0
    ml_score: float = 0.0
    behavior_score: float = 0.0
    explanation: List[Any] = Field(default_factory=list)
    scoring_version: str = "v1.0"
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class TransactionRuleSignal(BaseModel):
    rule_id: str
    rule_name: str
    category: str = "AMOUNT"
    severity: str = "MEDIUM"
    score: float = 0.0
    triggered: bool = False
    reason: Optional[str] = None
    evidence: Optional[Dict[str, Any]] = None
    version: Optional[str] = "v1.0"

    model_config = ConfigDict(from_attributes=True)

class TransactionMLAnalysis(BaseModel):
    model_name: str = "Isolation Forest"
    model_version: str = "v1.0.0"
    algorithm: str = "Isolation Forest"
    anomaly_score: float = 0.0
    prediction: str = "NORMAL"
    confidence: float = 0.95
    inference_time_ms: float = 0.0
    contextual_indicators: List[str] = Field(default_factory=list)
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class TransactionAlertSummary(BaseModel):
    id: str
    title: str
    severity: str
    status: str
    alert_reason: Optional[str] = None
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class TransactionInvestigationDetail(BaseModel):
    transaction: TransactionResponse
    risk: Optional[TransactionRiskDetail] = None
    rules: List[TransactionRuleSignal] = Field(default_factory=list)
    ml_prediction: Optional[TransactionMLAnalysis] = None
    features: Dict[str, Any] = Field(default_factory=dict)
    feature_version: str = "v1.0.0"
    alerts: List[TransactionAlertSummary] = Field(default_factory=list)
    user_context: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)

