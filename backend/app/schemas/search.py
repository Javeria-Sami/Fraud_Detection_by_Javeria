"""
Historical & Cross-Entity Search Schemas.
Section 17 — Historical Search.
"""
from typing import Optional, List, Dict, Any, Generic, TypeVar
from datetime import datetime
from pydantic import BaseModel, Field

T = TypeVar("T")


class SearchQueryRequest(BaseModel):
    """
    Multi-dimensional historical search query request envelope.
    """
    q: Optional[str] = Field(None, description="Free-text search query or exact identifier")
    entity_types: Optional[List[str]] = Field(
        default=["transactions", "alerts", "cases", "users", "devices", "merchants"],
        description="List of entity categories to search"
    )
    date_from: Optional[str] = Field(None, description="ISO timestamp start boundary")
    date_to: Optional[str] = Field(None, description="ISO timestamp end boundary")
    risk_min: Optional[float] = Field(None, ge=0.0, le=100.0, description="Minimum risk score")
    risk_max: Optional[float] = Field(None, ge=0.0, le=100.0, description="Maximum risk score")
    risk_level: Optional[str] = Field(None, description="Risk level filter: LOW, MEDIUM, HIGH, CRITICAL")
    status: Optional[str] = Field(None, description="Status filter applicable to transaction, alert, or case")
    severity: Optional[str] = Field(None, description="Severity filter: LOW, MEDIUM, HIGH, CRITICAL")
    priority: Optional[str] = Field(None, description="Priority filter: P1_CRITICAL, P2_HIGH, P3_MEDIUM, P4_LOW")
    min_amount: Optional[float] = Field(None, ge=0.0, description="Minimum transaction amount")
    max_amount: Optional[float] = Field(None, ge=0.0, description="Maximum transaction amount")
    payment_method: Optional[str] = Field(None, description="Payment method filter")
    currency: Optional[str] = Field(None, description="Currency filter, e.g. USD, EUR, PKR")
    country: Optional[str] = Field(None, description="Country filter")
    city: Optional[str] = Field(None, description="City filter")
    sort_by: Optional[str] = Field(
        default="relevance",
        description="Sort field: relevance, newest, oldest, risk_desc, amount_desc"
    )
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=25, ge=1, le=100, description="Items per page per entity category")


class TransactionSearchResult(BaseModel):
    id: str
    timestamp: str = ""
    user_id: str = ""
    amount: float = 0.0
    currency: str = "USD"
    merchant_name: Optional[str] = "Unknown Merchant"
    merchant_category: Optional[str] = None
    payment_method: Optional[str] = "CREDIT_CARD"
    device_id: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    status: str = "PENDING"
    risk_score: float = 0.0
    risk_level: str = "LOW"
    is_flagged: bool = False
    relevance_score: float = 1.0


class AlertSearchResult(BaseModel):
    id: str
    title: str = "Fraud Alert"
    severity: str = "MEDIUM"
    status: str = "NEW"
    risk_score: float = 0.0
    transaction_id: Optional[str] = None
    user_id: Optional[str] = None
    assigned_to: Optional[str] = None
    alert_reason: Optional[str] = None
    created_at: str = ""
    resolved_at: Optional[str] = None
    relevance_score: float = 1.0


class CaseSearchResult(BaseModel):
    id: str
    title: str = ""
    description: Optional[str] = None
    user_id: Optional[str] = None
    severity: str = "MEDIUM"
    status: str = "OPEN"
    assigned_to: Optional[str] = None
    risk_score: float = 0.0
    alerts_count: int = 0
    transactions_count: int = 0
    created_at: str = ""
    relevance_score: float = 1.0


class UserSearchResult(BaseModel):
    user_id: str
    user_name: Optional[str] = None
    profile_state: str = "ACTIVE"
    total_transactions: int = 0
    total_volume: float = 0.0
    avg_amount: float = 0.0
    risk_level: str = "LOW"
    last_known_risk_score: Optional[float] = None
    relevance_score: float = 1.0


class DeviceSearchResult(BaseModel):
    device_id: str
    profile_state: str = "ACTIVE"
    total_transactions: int = 0
    distinct_users_count: int = 0
    failure_rate: float = 0.0
    is_shared: bool = False
    relevance_score: float = 1.0


class MerchantSearchResult(BaseModel):
    merchant_name: str
    category: Optional[str] = "GENERAL"
    base_risk_tier: Optional[str] = "LOW"
    profile_state: Optional[str] = "ACTIVE"
    total_volume: float = 0.0
    total_transactions: int = 0
    distinct_users_count: int = 0
    relevance_score: float = 1.0


class EntityGroupResult(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class SearchCountsByCategory(BaseModel):
    transactions: int = 0
    alerts: int = 0
    cases: int = 0
    users: int = 0
    devices: int = 0
    merchants: int = 0
    total: int = 0


class SearchResponse(BaseModel):
    query: Optional[str] = None
    execution_time_ms: float
    counts: SearchCountsByCategory
    transactions: EntityGroupResult[TransactionSearchResult]
    alerts: EntityGroupResult[AlertSearchResult]
    cases: EntityGroupResult[CaseSearchResult]
    users: EntityGroupResult[UserSearchResult]
    devices: EntityGroupResult[DeviceSearchResult]
    merchants: EntityGroupResult[MerchantSearchResult]
    page: int
    page_size: int


class AutocompleteSuggestion(BaseModel):
    id: str
    title: str
    subtitle: str
    entity_type: str
    risk_level: Optional[str] = None
    navigation_url: str
