"""
Notification System Pydantic Schemas.
Section 24 — Notification System.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class NotificationDeliveryRead(BaseModel):
    id: str
    channel: str
    status: str
    attempt_count: int
    last_attempt_at: datetime
    delivered_at: Optional[datetime] = None
    failure_reason: Optional[str] = None
    provider_reference: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class NotificationRead(BaseModel):
    id: str
    recipient_user_id: str
    notification_type: str
    category: str
    title: str
    message: str
    severity: str
    priority: str
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    delivery_status: str
    read_at: Optional[datetime] = None
    dismissed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    deliveries: Optional[List[NotificationDeliveryRead]] = None

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    items: List[NotificationRead]
    total: int
    page: int
    page_size: int
    unread_count: int


class UnreadCountResponse(BaseModel):
    unread_count: int
    critical_count: int
    high_count: int


class NotificationPreferenceItem(BaseModel):
    category: str
    channel: str
    enabled: bool
    is_mandatory: bool = False
    label: Optional[str] = None
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class NotificationPreferenceUpdate(BaseModel):
    category: str
    channel: str
    enabled: bool


class NotificationPreferencesUpdatePayload(BaseModel):
    preferences: List[NotificationPreferenceUpdate]


class NotificationPreferencesResponse(BaseModel):
    preferences: List[NotificationPreferenceItem]


class NotificationAdminConfig(BaseModel):
    cooldown_seconds: int = 60
    critical_cooldown_override: bool = True
    retention_days: int = 90
    channels_enabled: Dict[str, bool] = Field(default_factory=lambda: {
        "IN_APP": True,
        "EMAIL": True,
        "WEBHOOK": True
    })
    mandatory_categories: List[str] = Field(default_factory=lambda: [
        "SECURITY_ALERTS"
    ])


class NotificationMarkReadRequest(BaseModel):
    notification_ids: Optional[List[str]] = None  # None means mark all
