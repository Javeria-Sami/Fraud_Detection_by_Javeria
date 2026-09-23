"""
Transaction, Status, and Feature Snapshot Database Models.
"""
import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class TransactionStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    DECLINED = "DECLINED"
    REVERSED = "REVERSED"
    CANCELLED = "CANCELLED"
    # Legacy aliases
    APPROVED = "APPROVED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    BLOCKED = "BLOCKED"

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(String(50), primary_key=True) # TXN-XXXXXX
    transaction_id = Column(String(50), unique=True, nullable=False, index=True) # TXN-XXXXXX
    
    user_id = Column(String(50), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    user_name = Column(String(255), nullable=True)
    merchant_id = Column(String(50), ForeignKey("merchants.id", ondelete="SET NULL"), nullable=True, index=True)
    device_id = Column(String(100), ForeignKey("devices.id", ondelete="SET NULL"), nullable=True, index=True)
    
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="USD")
    transaction_type = Column(String(50), default="PURCHASE") # PURCHASE, TRANSFER, WITHDRAWAL, REFUND
    payment_method = Column(String(50), nullable=False) # CREDIT_CARD, DEBIT_CARD, WIRE, CRYPTO, APPLE_PAY
    
    merchant_name = Column(String(255), nullable=True, index=True)
    merchant_category = Column(String(100), nullable=True, index=True)
    
    country = Column(String(10), nullable=True)
    city = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    ip_address = Column(String(50), nullable=True)
    
    transaction_timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True) # compatibility alias
    status = Column(String(30), default="PENDING", index=True)
    source = Column(String(50), default="API")
    failed_attempts = Column(Integer, default=0)
    
    # Risk & Evaluation cached outcome
    risk_score = Column(Float, default=0.0) # 0 to 100
    risk_level = Column(String(20), default="LOW", index=True) # LOW, MEDIUM, HIGH, CRITICAL
    ml_anomaly_score = Column(Float, default=0.0)
    rules_triggered = Column(JSON, default=list)
    risk_factors = Column(JSON, default=list) # explainability factors
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="transactions", foreign_keys=[user_id])
    merchant = relationship("Merchant", back_populates="transactions")
    device = relationship("Device", back_populates="transactions")
    
    alerts = relationship("Alert", back_populates="transaction", cascade="all, delete-orphan")
    feature_snapshot = relationship("FeatureSnapshot", back_populates="transaction", uselist=False, cascade="all, delete-orphan")
    rule_executions = relationship("RuleExecution", back_populates="transaction", cascade="all, delete-orphan")
    ml_predictions = relationship("MLPrediction", back_populates="transaction", cascade="all, delete-orphan")
    risk_score_record = relationship("RiskScore", back_populates="transaction", uselist=False, cascade="all, delete-orphan")
    cases = relationship("Case", secondary="case_transactions", back_populates="transactions", lazy="selectin")

    def __init__(self, **kwargs):
        if "transaction_id" not in kwargs and "id" in kwargs:
            kwargs["transaction_id"] = kwargs["id"]
        elif "id" not in kwargs and "transaction_id" in kwargs:
            kwargs["id"] = kwargs["transaction_id"]
        super().__init__(**kwargs)

class FeatureSnapshot(Base):
    __tablename__ = "feature_snapshots"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    transaction_id = Column(String(50), ForeignKey("transactions.id", ondelete="CASCADE"), unique=True, nullable=False)
    features = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    transaction = relationship("Transaction", back_populates="feature_snapshot")
