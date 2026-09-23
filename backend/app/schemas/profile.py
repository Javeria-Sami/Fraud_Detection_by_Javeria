"""
Pydantic Schemas for 360-Degree Entity Risk Profiling, Contextual Signals, Analytics, and Audit Logs.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ProfileSignalItem(BaseModel):
    signal_code: str
    label: str
    severity: str = "INFO" # INFO, LOW, MEDIUM, HIGH, CRITICAL
    description: str
    evidence: Optional[Dict[str, Any]] = None

class UserProfileResponse(BaseModel):
    user_id: str
    user_name: Optional[str] = None
    profile_state: str = "ESTABLISHED" # NEW_ENTITY, LIMITED_HISTORY, ESTABLISHED
    baseline_spending: float = 0.0
    std_dev_spending: float = 0.0
    total_transactions_count: int = 0
    total_spend_amount: float = 0.0
    average_transaction_amount: float = 0.0
    median_transaction_amount: Optional[float] = None
    min_transaction_amount: Optional[float] = None
    max_transaction_amount: Optional[float] = None
    fraud_incident_count: int = 0
    last_known_risk_score: float = 0.0
    active_risk_level: str = "LOW"
    usual_country: Optional[str] = None
    usual_city: Optional[str] = None
    usual_transaction_hours: List[int] = []
    known_devices: List[str] = []
    known_locations: List[Dict[str, Any]] = []
    merchant_preferences: List[Dict[str, Any]] = []
    contextual_signals: List[ProfileSignalItem] = []
    first_seen_at: Optional[str] = None
    last_seen_at: Optional[str] = None
    last_calculated_at: Optional[str] = None
    updated_at: Optional[str] = None
    profile_version: str = "v1.0"

    class Config:
        from_attributes = True

class DeviceProfileResponse(BaseModel):
    device_id: str
    profile_state: str = "ESTABLISHED" # NEW_ENTITY, LIMITED_HISTORY, ESTABLISHED
    first_seen_at: Optional[str] = None
    last_seen_at: Optional[str] = None
    associated_users: List[str] = []
    distinct_users_count: int = 0
    locations_used: List[Dict[str, Any]] = []
    total_transactions: int = 0
    failed_transaction_count: int = 0
    failure_rate: float = 0.0
    anomalous_transactions: int = 0
    is_blacklisted: str = "FALSE"
    risk_score: float = 0.0
    risk_level: str = "LOW"
    average_amount: float = 0.0
    max_amount: float = 0.0
    contextual_signals: List[ProfileSignalItem] = []
    last_calculated_at: Optional[str] = None
    updated_at: Optional[str] = None
    profile_version: str = "v1.0"

    class Config:
        from_attributes = True

class MerchantProfileResponse(BaseModel):
    merchant_name: str
    merchant_id: Optional[str] = None
    category: Optional[str] = None
    profile_state: str = "ESTABLISHED" # NEW_ENTITY, LIMITED_HISTORY, ESTABLISHED
    base_risk_tier: str = "LOW"
    total_volume: float = 0.0
    total_transactions: int = 0
    average_amount: float = 0.0
    median_amount: Optional[float] = None
    max_amount: Optional[float] = None
    failure_rate: float = 0.0
    distinct_users_count: int = 0
    distinct_devices_count: int = 0
    alert_count: int = 0
    fraud_confirmed_count: int = 0
    distinct_locations: List[Dict[str, Any]] = []
    contextual_signals: List[ProfileSignalItem] = []
    first_seen_at: Optional[str] = None
    last_seen_at: Optional[str] = None
    last_calculated_at: Optional[str] = None
    updated_at: Optional[str] = None
    profile_version: str = "v1.0"

    class Config:
        from_attributes = True

class ProfileSummaryResponse(BaseModel):
    entity_type: str # USER, DEVICE, MERCHANT
    entity_id: str
    display_name: Optional[str] = None
    profile_state: str
    risk_score: float
    risk_level: str
    total_transactions: int
    total_volume: float
    primary_location: Optional[str] = None
    key_signals: List[ProfileSignalItem] = []
    last_activity_at: Optional[str] = None

class ProfileStatsResponse(BaseModel):
    total_user_profiles: int
    high_risk_users: int
    total_devices: int
    shared_devices: int
    total_merchants: int
    high_risk_merchants: int

class UserProfilePaginatedResponse(BaseModel):
    items: List[UserProfileResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class DeviceProfilePaginatedResponse(BaseModel):
    items: List[DeviceProfileResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class MerchantProfilePaginatedResponse(BaseModel):
    items: List[MerchantProfileResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class ProfileRecalculateResponse(BaseModel):
    status: str
    recalculated_entities: Dict[str, int]
    timestamp: str

class AuditLogResponse(BaseModel):
    id: str
    actor_email: str
    actor_role: str
    action: str
    target_entity: str
    target_id: str
    correlation_id: Optional[str] = None
    ip_address: Optional[str] = None
    status: str
    diff_old: Optional[Dict[str, Any]] = None
    diff_new: Optional[Dict[str, Any]] = None
    details: Optional[str] = None
    timestamp: Optional[str] = None

    class Config:
        from_attributes = True

class SystemSettingResponse(BaseModel):
    key: str
    value: Any
    description: Optional[str] = None
    updated_by: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

class SettingUpdateRequest(BaseModel):
    value: Any
