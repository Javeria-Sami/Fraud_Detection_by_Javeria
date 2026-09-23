"""
User, Role, Permission, and RBAC Database Models.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Table, Text
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

# Association table for Many-to-Many relationship between Roles and Permissions
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", String(36), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", String(36), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
    Column("created_at", DateTime, default=lambda: datetime.now(timezone.utc))
)

class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False, index=True) # e.g. transaction.read, alert.update
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    roles = relationship("Role", secondary=role_permissions, back_populates="permissions", lazy="selectin")

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(50), unique=True, nullable=False, index=True) # ADMIN, ANALYST, VIEWER
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    users = relationship("User", back_populates="role")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles", lazy="selectin")

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role_id = Column(String(36), ForeignKey("roles.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    role = relationship("Role", back_populates="users", lazy="joined")
    devices = relationship("Device", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", foreign_keys="Transaction.user_id")
    risk_profile = relationship("UserRiskProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")

    @property
    def password_hash(self):
        return self.hashed_password

    @password_hash.setter
    def password_hash(self, value):
        self.hashed_password = value

    def get(self, key: str, default=None):
        if key == "sub":
            return self.id
        if key == "role":
            return self.role.name.lower() if self.role else "viewer"
        return getattr(self, key, default)
