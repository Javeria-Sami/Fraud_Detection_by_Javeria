"""
Device Domain Model.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base, utc_now

class Device(Base):
    __tablename__ = "devices"
    
    id = Column(String(100), primary_key=True, default=lambda: f"DEV-{uuid.uuid4().hex[:12].upper()}")
    device_identifier = Column(String(100), unique=True, nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    device_type = Column(String(50), nullable=True) # MOBILE, DESKTOP, TABLET, BOT, UNKNOWN
    operating_system = Column(String(50), nullable=True) # iOS, Android, Windows, macOS, Linux
    browser = Column(String(50), nullable=True) # Chrome, Safari, Firefox, Edge
    ip_address = Column(String(50), nullable=True)
    country = Column(String(10), nullable=True)
    city = Column(String(100), nullable=True)
    first_seen_at = Column(DateTime, default=utc_now)
    last_seen_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    user = relationship("User", back_populates="devices")
    transactions = relationship("Transaction", back_populates="device")
    risk_profile = relationship("DeviceRiskProfile", back_populates="device", uselist=False, cascade="all, delete-orphan")
