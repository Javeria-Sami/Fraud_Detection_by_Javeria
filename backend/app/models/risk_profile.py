"""
User, Device, and Merchant 360-degree Behavioral Risk Profiles.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base, utc_now

class UserRiskProfile(Base):
    __tablename__ = "user_risk_profiles"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    user_name = Column(String(255), nullable=True) # cached display name
    
    average_transaction_amount = Column(Float, default=100.0)
    transaction_count = Column(Integer, default=0)
    total_transactions_count = Column(Integer, default=0) # compatibility alias
    total_spend_amount = Column(Float, default=0.0)
    
    usual_country = Column(String(10), default="US")
    usual_city = Column(String(100), default="New York")
    usual_transaction_hours = Column(JSON, default=list) # e.g. [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    
    known_device_count = Column(Integer, default=1)
    known_merchant_count = Column(Integer, default=5)
    
    baseline_spending = Column(Float, default=100.0)
    std_dev_spending = Column(Float, default=25.0)
    fraud_incident_count = Column(Integer, default=0)
    
    risk_score = Column(Float, default=0.0) # 0 to 100
    risk_level = Column(String(20), default="LOW") # LOW, MEDIUM, HIGH, CRITICAL
    active_risk_level = Column(String(20), default="LOW") # compatibility alias
    last_known_risk_score = Column(Float, default=0.0) # compatibility alias
    
    known_devices = Column(JSON, default=list)
    known_locations = Column(JSON, default=list)
    merchant_preferences = Column(JSON, default=list)
    
    last_calculated_at = Column(DateTime, default=utc_now)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    user = relationship("User", back_populates="risk_profile")

class DeviceRiskProfile(Base):
    __tablename__ = "device_risk_profiles"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String(100), ForeignKey("devices.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    transaction_count = Column(Integer, default=0)
    total_transactions = Column(Integer, default=0) # compatibility alias
    failed_transaction_count = Column(Integer, default=0)
    anomalous_transactions = Column(Integer, default=0)
    associated_user_count = Column(Integer, default=1)
    
    risk_score = Column(Float, default=0.0)
    risk_level = Column(String(20), default="LOW")
    is_blacklisted = Column(String(10), default="FALSE")
    
    associated_users = Column(JSON, default=list)
    locations_used = Column(JSON, default=list)
    first_seen_at = Column(DateTime, default=utc_now, nullable=True)
    last_seen_at = Column(DateTime, default=utc_now, nullable=True)
    
    last_calculated_at = Column(DateTime, default=utc_now)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    device = relationship("Device", back_populates="risk_profile")

class MerchantRiskProfile(Base):
    __tablename__ = "merchant_risk_profiles"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    merchant_id = Column(String(50), ForeignKey("merchants.id", ondelete="CASCADE"), unique=True, nullable=True, index=True)
    merchant_name = Column(String(100), nullable=True, index=True)
    category = Column(String(100), nullable=True)
    
    transaction_count = Column(Integer, default=0)
    total_transactions = Column(Integer, default=0) # compatibility alias
    alert_count = Column(Integer, default=0)
    fraud_count = Column(Integer, default=0)
    fraud_confirmed_count = Column(Integer, default=0) # compatibility alias
    total_volume = Column(Float, default=0.0)
    
    risk_score = Column(Float, default=0.0)
    risk_level = Column(String(20), default="LOW") # LOW, MEDIUM, HIGH, CRITICAL
    base_risk_tier = Column(String(20), default="LOW")
    
    last_calculated_at = Column(DateTime, default=utc_now)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    merchant = relationship("Merchant", back_populates="risk_profile")
