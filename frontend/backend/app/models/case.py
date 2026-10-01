"""
Case Management, Association Tables, Notes, Evidence, and History Models.
"""
import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, JSON, ForeignKey, Text, Table
from sqlalchemy.orm import relationship
from backend.app.core.database import Base, utc_now

class CaseStatus(str, enum.Enum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    IN_PROGRESS = "IN_PROGRESS"
    PENDING = "PENDING"
    ESCALATED = "ESCALATED"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    REOPENED = "REOPENED"

class CaseSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class CasePriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

# Association table for Case <-> Alerts
case_alerts = Table(
    "case_alerts",
    Base.metadata,
    Column("case_id", String(50), ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True),
    Column("alert_id", String(50), ForeignKey("alerts.id", ondelete="CASCADE"), primary_key=True),
    Column("created_at", DateTime, default=utc_now)
)

# Association table for Case <-> Transactions
case_transactions = Table(
    "case_transactions",
    Base.metadata,
    Column("case_id", String(50), ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True),
    Column("transaction_id", String(50), ForeignKey("transactions.id", ondelete="CASCADE"), primary_key=True),
    Column("created_at", DateTime, default=utc_now)
)

class Case(Base):
    __tablename__ = "cases"
    
    id = Column(String(50), primary_key=True) # CASE-XXXXXX
    case_id = Column(String(50), unique=True, nullable=False, index=True) # CASE-XXXXXX
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    severity = Column(String(20), default="MEDIUM", index=True) # LOW, MEDIUM, HIGH, CRITICAL
    priority = Column(String(20), default="MEDIUM", index=True) # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(30), default="OPEN", index=True) # OPEN, INVESTIGATING, PENDING, RESOLVED, CLOSED
    
    assigned_to = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_analyst = Column(String(100), nullable=True) # compatibility alias
    
    user_id = Column(String(50), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True) # Subject customer
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    risk_score = Column(Float, default=0.0)
    related_transaction_ids = Column(JSON, default=list) # compatibility cache
    related_alert_ids = Column(JSON, default=list) # compatibility cache
    
    resolution = Column(String(50), nullable=True) # CONFIRMED_FRAUD, FALSE_POSITIVE, SUSPICIOUS, CLOSED_NORMAL
    resolution_notes = Column(Text, nullable=True)
    resolved_by = Column(String(100), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=utc_now, index=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    assigned_user = relationship("User", foreign_keys=[assigned_to])
    subject_user = relationship("User", foreign_keys=[user_id])
    creator_user = relationship("User", foreign_keys=[created_by])
    
    alerts = relationship("Alert", secondary=case_alerts, back_populates="cases", lazy="selectin")
    transactions = relationship("Transaction", secondary=case_transactions, back_populates="cases", lazy="selectin")
    notes = relationship("CaseNote", back_populates="case", cascade="all, delete-orphan", lazy="selectin")
    evidence = relationship("CaseEvidence", back_populates="case", cascade="all, delete-orphan", lazy="selectin")
    history = relationship("CaseHistory", back_populates="case", cascade="all, delete-orphan", lazy="selectin")

    def __init__(self, **kwargs):
        if "case_id" not in kwargs and "id" in kwargs:
            kwargs["case_id"] = kwargs["id"]
        elif "id" not in kwargs and "case_id" in kwargs:
            kwargs["id"] = kwargs["case_id"]
        super().__init__(**kwargs)

class CaseNote(Base):
    __tablename__ = "case_notes"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(50), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    author = Column(String(100), nullable=False) # name or email
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    case = relationship("Case", back_populates="notes")
    author_user = relationship("User", foreign_keys=[author_id])

class CaseEvidence(Base):
    __tablename__ = "case_evidence"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(50), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    evidence_type = Column(String(50), default="TRANSACTION_LOG") # TRANSACTION_LOG, DEVICE_FINGERPRINT, IP_GEO, USER_COMMUNICATION, DOCUMENT
    file_reference = Column(String(500), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    payload = Column(JSON, nullable=True) # compatibility alias
    uploaded_by = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    case = relationship("Case", back_populates="evidence")

class CaseHistory(Base):
    __tablename__ = "case_history"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(50), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(100), nullable=False) # CASE_CREATED, ASSIGNED, REASSIGNED, NOTE_ADDED, EVIDENCE_ADDED, STATUS_CHANGED, RESOLVED, CLOSED
    from_status = Column(String(30), nullable=True)
    to_status = Column(String(30), nullable=True)
    note = Column(Text, nullable=True)
    actor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_name = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now, index=True)
    
    # Relationships
    case = relationship("Case", back_populates="history")
    actor_user = relationship("User", foreign_keys=[actor_id])
