"""
Fraud Rule, Rule Versions, and Execution Audit Database Models.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base, utc_now

class FraudRule(Base):
    __tablename__ = "fraud_rules"
    
    id = Column(String(50), primary_key=True) # e.g. HIGH_AMOUNT, RAPID_TRANSACTIONS
    rule_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), default="AMOUNT") # AMOUNT, VELOCITY, DEVICE, LOCATION, TIME, FAILED_ATTEMPTS, BEHAVIOR, MERCHANT
    is_active = Column(Boolean, default=True)
    default_severity = Column(String(20), default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    severity = Column(String(20), default="MEDIUM") # compatibility alias
    priority = Column(Integer, default=1)
    
    # Optional legacy fallback fields for backward compatibility
    weight = Column(Float, default=20.0)
    condition_config = Column(JSON, default=dict)
    version = Column(String(20), default="v1.0")
    created_by = Column(String(100), default="system")
    updated_by = Column(String(100), default="system")
    
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    versions = relationship("FraudRuleVersion", back_populates="rule", cascade="all, delete-orphan")
    executions = relationship("RuleExecution", back_populates="rule")

    def __init__(self, **kwargs):
        if "rule_code" not in kwargs and "id" in kwargs:
            kwargs["rule_code"] = kwargs["id"]
        elif "id" not in kwargs and "rule_code" in kwargs:
            kwargs["id"] = kwargs["rule_code"]
        super().__init__(**kwargs)

class FraudRuleVersion(Base):
    __tablename__ = "fraud_rule_versions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    rule_id = Column(String(50), ForeignKey("fraud_rules.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(String(20), nullable=False) # e.g. "1.0", "2.0"
    configuration = Column(JSON, default=dict) # JSON conditions/parameters
    threshold = Column(Float, nullable=True)
    weight = Column(Float, default=20.0) # score points
    is_active = Column(Boolean, default=True)
    created_by = Column(String(100), default="system")
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    rule = relationship("FraudRule", back_populates="versions")
    executions = relationship("RuleExecution", back_populates="rule_version")

class RuleExecution(Base):
    __tablename__ = "rule_executions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    transaction_id = Column(String(50), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_id = Column(String(50), ForeignKey("fraud_rules.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_version_id = Column(String(36), ForeignKey("fraud_rule_versions.id", ondelete="SET NULL"), nullable=True)
    
    triggered = Column(Boolean, default=False)
    score = Column(Float, default=0.0)
    reason = Column(Text, nullable=True)
    execution_time_ms = Column(Float, default=0.0)
    
    # Backward compatibility field
    points_awarded = Column(Float, default=0.0)
    execution_detail = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=utc_now, index=True)
    
    # Relationships
    transaction = relationship("Transaction", back_populates="rule_executions")
    rule = relationship("FraudRule", back_populates="executions")
    rule_version = relationship("FraudRuleVersion", back_populates="executions")

    def __init__(self, **kwargs):
        if "rule_version" in kwargs:
            kwargs.pop("rule_version")
        if "points_awarded" in kwargs and "score" not in kwargs:
            kwargs["score"] = kwargs.get("points_awarded", 0.0)
        super().__init__(**kwargs)
