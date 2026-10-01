"""
Risk Score and Evaluation Domain Models.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, JSON, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from backend.app.core.database import Base, utc_now

class RiskScore(Base):
    __tablename__ = "risk_scores"
    __table_args__ = (
        CheckConstraint("score >= 0 AND score <= 100", name="check_risk_score_range"),
    )
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    transaction_id = Column(String(50), ForeignKey("transactions.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    score = Column(Float, nullable=False) # 0 to 100
    risk_level = Column(String(20), default="LOW", index=True) # LOW, MEDIUM, HIGH, CRITICAL
    
    rule_score = Column(Float, default=0.0)
    ml_score = Column(Float, default=0.0)
    behavior_score = Column(Float, default=0.0)
    
    explanation = Column(JSON, default=list) # explainability factors
    scoring_version = Column(String(20), default="v1.0")
    
    created_at = Column(DateTime, default=utc_now, index=True)
    
    # Relationships
    transaction = relationship("Transaction", back_populates="risk_score_record")
    alerts = relationship("Alert", back_populates="risk_score_rel")
