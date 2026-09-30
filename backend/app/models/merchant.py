"""
Merchant Domain Model.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from backend.app.core.database import Base, utc_now

class Merchant(Base):
    __tablename__ = "merchants"
    
    id = Column(String(50), primary_key=True, default=lambda: f"MERCH-{uuid.uuid4().hex[:8].upper()}")
    merchant_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True) # e.g. Electronics, Crypto, Luxury, Grocery
    country = Column(String(10), nullable=True)
    city = Column(String(100), nullable=True)
    risk_level = Column(String(20), default="LOW") # LOW, MEDIUM, HIGH, CRITICAL
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    transactions = relationship("Transaction", back_populates="merchant")
    risk_profile = relationship("MerchantRiskProfile", back_populates="merchant", uselist=False, cascade="all, delete-orphan")
