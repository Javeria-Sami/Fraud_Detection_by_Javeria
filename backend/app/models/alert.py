"""
Alert and Incident Database Models.
"""
import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, JSON, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class AlertSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class AlertStatus(str, enum.Enum):
    NEW = "NEW"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    ESCALATED = "ESCALATED"

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(String(50), primary_key=True) # ALT-XXXXXX
    alert_id = Column(String(50), unique=True, nullable=False, index=True) # ALT-XXXXXX
    
    transaction_id = Column(String(50), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    risk_score_id = Column(String(36), ForeignKey("risk_scores.id", ondelete="SET NULL"), nullable=True)
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), nullable=False, default="MEDIUM", index=True) # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(30), default="NEW", index=True) # NEW, ACKNOWLEDGED, INVESTIGATING, RESOLVED, CLOSED
    
    assigned_to = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Risk & Rule metadata
    risk_score = Column(Float, default=0.0) # 0 to 100
    alert_reason = Column(Text, nullable=True)
    triggered_rules = Column(JSON, default=list)
    model_version = Column(String(50), default="v1.0.0")
    case_id = Column(String(50), nullable=True) # Direct case link cache
    
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    transaction = relationship("Transaction", back_populates="alerts")
    user = relationship("User", foreign_keys=[user_id])
    assigned_user = relationship("User", foreign_keys=[assigned_to])
    risk_score_rel = relationship("RiskScore", back_populates="alerts")
    cases = relationship("Case", secondary="case_alerts", back_populates="alerts", lazy="selectin")

    def __init__(self, **kwargs):
        if "alert_id" not in kwargs and "id" in kwargs:
            kwargs["alert_id"] = kwargs["id"]
        elif "id" not in kwargs and "alert_id" in kwargs:
            kwargs["id"] = kwargs["alert_id"]
        if "title" not in kwargs:
            kwargs["title"] = kwargs.get("alert_reason") or "Fraud Alert"
        super().__init__(**kwargs)
