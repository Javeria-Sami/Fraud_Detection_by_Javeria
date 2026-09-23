"""
Immutable Audit Logging and System Settings Models.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    actor_email = Column(String(255), nullable=True)
    actor_role = Column(String(50), nullable=True)
    
    action = Column(String(100), nullable=False, index=True) # e.g. LOGIN, RULE_UPDATED, ALERT_ASSIGNED, CASE_UPDATED, MODEL_APPROVED, SETTINGS_CHANGED, DATA_EXPORTED
    entity_type = Column(String(100), nullable=False, index=True) # User, FraudRule, Case, Alert, MLModel, SystemSetting
    entity_id = Column(String(100), nullable=False, index=True)
    
    result = Column(String(20), default="SUCCESS") # SUCCESS, FAILED
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    request_id = Column(String(100), nullable=True)
    correlation_id = Column(String(100), nullable=True)
    
    metadata_json = Column(JSON, nullable=True)
    diff_old = Column(JSON, nullable=True)
    diff_new = Column(JSON, nullable=True)
    details = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True) # compatibility alias
    
    # Relationships
    actor = relationship("User", foreign_keys=[actor_user_id])

    def __init__(self, **kwargs):
        # Map legacy argument names
        if "target_entity" in kwargs and "entity_type" not in kwargs:
            kwargs["entity_type"] = kwargs.pop("target_entity")
        if "target_id" in kwargs and "entity_id" not in kwargs:
            kwargs["entity_id"] = kwargs.pop("target_id")
        if "status" in kwargs and "result" not in kwargs:
            kwargs["result"] = kwargs.pop("status")
        super().__init__(**kwargs)

    @property
    def target_entity(self):
        return self.entity_type

    @property
    def target_id(self):
        return self.entity_id

    @property
    def status(self):
        return self.result

class SystemSetting(Base):
    __tablename__ = "system_settings"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(JSON, nullable=False)
    description = Column(String(255), nullable=True)
    updated_by = Column(String(100), default="system")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
