"""
Immutable Audit Logging and System Settings Models.
Section 23 — Audit Logging.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.core.database import Base, utc_now


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    actor_email = Column(String(255), nullable=True, index=True)
    actor_role = Column(String(50), nullable=True, index=True)
    actor_type = Column(String(50), default="USER", nullable=True, index=True)  # USER, SYSTEM, SERVICE, SCHEDULED_JOB, API, ADMIN

    action = Column(String(100), nullable=False, index=True)  # e.g. LOGIN, USER_CREATE, RULE_UPDATE, ALERT_ASSIGN, etc.
    entity_type = Column(String(100), nullable=False, index=True)  # User, FraudRule, Case, Alert, MLModel, SystemSetting, etc.
    entity_id = Column(String(100), nullable=False, index=True)

    result = Column(String(20), default="SUCCESS", index=True)  # SUCCESS, FAILURE, DENIED, PARTIAL
    severity = Column(String(20), default="INFO", index=True)  # INFO, WARNING, HIGH, CRITICAL
    source = Column(String(50), default="API", nullable=True, index=True)  # API, UI, BACKGROUND_WORKER, SYSTEM

    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    request_id = Column(String(100), nullable=True, index=True)
    correlation_id = Column(String(100), nullable=True, index=True)
    session_id = Column(String(100), nullable=True)

    metadata_json = Column(JSON, nullable=True)
    diff_old = Column(JSON, nullable=True)
    diff_new = Column(JSON, nullable=True)
    details = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    event_version = Column(String(10), default="1.0", nullable=True)

    created_at = Column(DateTime, default=utc_now, index=True)
    timestamp = Column(DateTime, default=utc_now, index=True)  # compatibility alias

    # Relationships
    actor = relationship("User", foreign_keys=[actor_user_id])

    __table_args__ = (
        Index("ix_audit_logs_timestamp_severity", "timestamp", "severity"),
        Index("ix_audit_logs_action_result", "action", "result"),
        Index("ix_audit_logs_entity_composite", "entity_type", "entity_id"),
    )

    def __init__(self, **kwargs):
        # Map legacy and modern parameter aliases
        if "target_entity" in kwargs and "entity_type" not in kwargs:
            kwargs["entity_type"] = kwargs.pop("target_entity")
        if "resource_type" in kwargs and "entity_type" not in kwargs:
            kwargs["entity_type"] = kwargs.pop("resource_type")
        if "target_id" in kwargs and "entity_id" not in kwargs:
            kwargs["entity_id"] = kwargs.pop("target_id")
        if "resource_id" in kwargs and "entity_id" not in kwargs:
            kwargs["entity_id"] = kwargs.pop("resource_id")
        if "status" in kwargs and "result" not in kwargs:
            kwargs["result"] = kwargs.pop("status")
        if "outcome" in kwargs and "result" not in kwargs:
            kwargs["result"] = kwargs.pop("outcome")
        if "metadata" in kwargs and "metadata_json" not in kwargs:
            kwargs["metadata_json"] = kwargs.pop("metadata")
        super().__init__(**kwargs)

    @property
    def target_entity(self) -> str:
        return self.entity_type

    @property
    def resource_type(self) -> str:
        return self.entity_type

    @property
    def target_id(self) -> str:
        return self.entity_id

    @property
    def resource_id(self) -> str:
        return self.entity_id

    @property
    def status(self) -> str:
        return self.result

    @property
    def outcome(self) -> str:
        return self.result

    @property
    def metadata(self) -> dict:
        return self.metadata_json or {}


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(JSON, nullable=False)
    description = Column(String(255), nullable=True)
    updated_by = Column(String(100), default="system")
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
