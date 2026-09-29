"""
Centralized Notification Engine Database Models.
Section 24 — Notification System.
"""
import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    DateTime,
    JSON,
    Text,
    ForeignKey,
    Boolean,
    Integer,
    Index,
    UniqueConstraint
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class NotificationType(str, enum.Enum):
    # Security events
    HIGH_RISK_ALERT = "HIGH_RISK_ALERT"
    CRITICAL_RISK_ALERT = "CRITICAL_RISK_ALERT"
    SECURITY_ALERT = "SECURITY_ALERT"
    SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY"
    
    # Alert lifecycle
    ALERT_ASSIGNED = "ALERT_ASSIGNED"
    ALERT_ESCALATED = "ALERT_ESCALATED"
    ALERT_RESOLVED = "ALERT_RESOLVED"
    
    # Case management
    CASE_ASSIGNED = "CASE_ASSIGNED"
    CASE_ESCALATED = "CASE_ESCALATED"
    CASE_UPDATED = "CASE_UPDATED"
    CASE_RESOLVED = "CASE_RESOLVED"
    
    # ML / MLOps
    MODEL_HEALTH_WARNING = "MODEL_HEALTH_WARNING"
    MODEL_HEALTH_CRITICAL = "MODEL_HEALTH_CRITICAL"
    MODEL_RETRAINING_COMPLETED = "MODEL_RETRAINING_COMPLETED"
    MODEL_RETRAINING_FAILED = "MODEL_RETRAINING_FAILED"
    
    # Administrative & System
    ADMIN_ACTION_REQUIRES_ATTENTION = "ADMIN_ACTION_REQUIRES_ATTENTION"
    SYSTEM_CONFIGURATION_CHANGED = "SYSTEM_CONFIGURATION_CHANGED"


class NotificationCategory(str, enum.Enum):
    SECURITY_ALERTS = "SECURITY_ALERTS"
    CASE_UPDATES = "CASE_UPDATES"
    MODEL_MONITORING = "MODEL_MONITORING"
    ADMIN_SYSTEM = "ADMIN_SYSTEM"


class NotificationChannelType(str, enum.Enum):
    IN_APP = "IN_APP"
    EMAIL = "EMAIL"
    WEBHOOK = "WEBHOOK"


class NotificationSeverity(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class NotificationPriority(str, enum.Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class NotificationStatus(str, enum.Enum):
    UNREAD = "UNREAD"
    READ = "READ"
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"
    DISMISSED = "DISMISSED"


class DeliveryStatus(str, enum.Enum):
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"
    DISMISSED = "DISMISSED"


class Notification(Base):
    """
    Central user-facing notification model.
    Decoupled from internal operational alert entity.
    """
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    recipient_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    notification_type = Column(String(64), nullable=False, index=True)
    category = Column(String(64), nullable=False, default=NotificationCategory.SECURITY_ALERTS.value, index=True)
    
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    severity = Column(String(32), nullable=False, default=NotificationSeverity.INFO.value, index=True)
    priority = Column(String(32), nullable=False, default=NotificationPriority.NORMAL.value, index=True)
    
    source_type = Column(String(64), nullable=True, index=True)  # ALERT, CASE, MODEL, SYSTEM, TRANSACTION
    source_id = Column(String(100), nullable=True, index=True)
    
    delivery_status = Column(String(32), nullable=False, default=DeliveryStatus.DELIVERED.value, index=True)
    
    read_at = Column(DateTime, nullable=True, index=True)
    dismissed_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    
    deduplication_key = Column(String(255), nullable=True, index=True)
    metadata_json = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    recipient = relationship("User", foreign_keys=[recipient_user_id])
    deliveries = relationship("NotificationDelivery", back_populates="notification", cascade="all, delete-orphan", lazy="selectin")

    __table_args__ = (
        Index("ix_notifications_recipient_read", "recipient_user_id", "read_at"),
        Index("ix_notifications_recipient_created", "recipient_user_id", "created_at"),
        Index("ix_notifications_dedup_created", "deduplication_key", "created_at"),
    )

    def __init__(self, **kwargs):
        if "type" in kwargs and "notification_type" not in kwargs:
            kwargs["notification_type"] = kwargs.pop("type")
        if "metadata" in kwargs and "metadata_json" not in kwargs:
            kwargs["metadata_json"] = kwargs.pop("metadata")
        if "status" in kwargs and "delivery_status" not in kwargs:
            val = kwargs.pop("status")
            kwargs["delivery_status"] = val.value if hasattr(val, "value") else str(val)
        super().__init__(**kwargs)

    @property
    def status(self) -> str:
        if self.read_at is not None:
            return NotificationStatus.READ.value
        return self.delivery_status or NotificationStatus.UNREAD.value

    @status.setter
    def status(self, value):
        val = value.value if hasattr(value, "value") else str(value)
        self.delivery_status = val


class NotificationPreference(Base):
    """
    User-configurable notification channel preferences.
    """
    __tablename__ = "notification_preferences"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    category = Column(String(64), nullable=False, index=True)  # SECURITY_ALERTS, CASE_UPDATES, MODEL_MONITORING, ADMIN_SYSTEM
    channel = Column(String(32), nullable=False, index=True)   # IN_APP, EMAIL, WEBHOOK
    enabled = Column(Boolean, nullable=False, default=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        UniqueConstraint("user_id", "category", "channel", name="uq_user_category_channel"),
    )


class NotificationDelivery(Base):
    """
    Audit and tracking record for channel-specific delivery attempts.
    """
    __tablename__ = "notification_deliveries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    notification_id = Column(String(36), ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False, index=True)
    
    channel = Column(String(32), nullable=False, index=True)  # IN_APP, EMAIL, WEBHOOK
    status = Column(String(32), nullable=False, default=DeliveryStatus.DELIVERED.value, index=True)
    
    attempt_count = Column(Integer, nullable=False, default=1)
    last_attempt_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    delivered_at = Column(DateTime, nullable=True)
    
    failure_reason = Column(Text, nullable=True)
    provider_reference = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    notification = relationship("Notification", back_populates="deliveries")
