"""
Real-Time Event System Types, Enums, and Standardized Event Envelopes.
Section 11 — Real-Time Event System.
"""
from enum import Enum
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field, ConfigDict


class EventType(str, Enum):
    TRANSACTION_CREATED = "transaction.created"
    TRANSACTION_INGESTED = "transaction.ingested"
    TRANSACTION_UPDATED = "transaction.updated"
    RISK_CALCULATED = "risk.calculated"
    ALERT_CREATED = "alert.created"
    ALERT_UPDATED = "alert.updated"
    ALERT_RESOLVED = "alert.resolved"
    ALERT_ESCALATED = "alert.escalated"
    CASE_CREATED = "case.created"
    CASE_UPDATED = "case.updated"
    CASE_ASSIGNED = "case.assigned"
    CASE_ESCALATED = "case.escalated"
    CASE_RESOLVED = "case.resolved"
    NOTIFICATION_CREATED = "notification.created"
    SYSTEM_STATUS = "system.status"
    HEARTBEAT = "system.heartbeat"


class SubscriptionTopic(str, Enum):
    ALL = "all"
    TRANSACTIONS = "transactions"
    RISK = "risk"
    ALERTS = "alerts"
    SYSTEM = "system"


class ClientConnectionState(str, Enum):
    CONNECTING = "CONNECTING"
    CONNECTED = "CONNECTED"
    DISCONNECTED = "DISCONNECTED"
    RECONNECTING = "RECONNECTING"
    ERROR = "ERROR"


class EventEnvelope(BaseModel):
    """
    Standardized, versioned domain event envelope.
    Ensures consistent metadata, traceability, and secure payload separation across the platform.
    """
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str
    schema_version: str = "1.0"
    occurred_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    source: str = "fraud_platform_backend"
    entity_type: str = "general"
    entity_id: str
    severity: Optional[str] = None
    correlation_id: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class ClientMessage(BaseModel):
    """Client-sent WebSocket control command."""
    action: str # "auth", "subscribe", "unsubscribe", "ping"
    token: Optional[str] = None
    topic: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
