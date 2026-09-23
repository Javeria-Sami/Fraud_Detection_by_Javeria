"""
Security, Password Hashing, JWT Authentication, and Granular RBAC Authorization.
"""
import hmac
import hashlib
import os
import uuid
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Set
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models.user import User, Role, Permission

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=True
)

# ---------------------------------------------------------------------------
# Rate Limiting Foundation
# ---------------------------------------------------------------------------
class SimpleRateLimiter:
    """In-memory sliding-window rate limiter for brute-force protection."""
    def __init__(self, max_attempts: int = 10, window_seconds: int = 60):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.attempts: Dict[str, List[float]] = defaultdict(list)

    def is_rate_limited(self, key: str) -> bool:
        now = time.time()
        # Clean older entries
        self.attempts[key] = [t for t in self.attempts[key] if now - t < self.window_seconds]
        if len(self.attempts[key]) >= self.max_attempts:
            return True
        self.attempts[key].append(now)
        return False

login_rate_limiter = SimpleRateLimiter(max_attempts=15, window_seconds=60)

# ---------------------------------------------------------------------------
# Password Hashing & Constant-Time Verification
# ---------------------------------------------------------------------------
def get_password_hash(password: str) -> str:
    """
    Secure password hash using PBKDF2 HMAC-SHA256 with cryptographically secure random salt
    and 100,000 iterations. Format: salt$hash
    """
    salt = os.urandom(16).hex()
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}${key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies plain password against stored salt$hash using constant-time comparison (anti-timing attack).
    """
    try:
        salt, stored_hash = hashed_password.split('$')
        key = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return hmac.compare_digest(key.hex(), stored_hash)
    except Exception:
        return False

# ---------------------------------------------------------------------------
# JWT Access & Refresh Token Management
# ---------------------------------------------------------------------------
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generates short-lived signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid.uuid4()),
        "type": "access"
    })
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generates signed JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid.uuid4()),
        "type": "refresh"
    })
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> dict:
    """Decodes and validates a JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ---------------------------------------------------------------------------
# Authentication & Identity Dependencies
# ---------------------------------------------------------------------------
async def get_current_user_payload(token: str = Depends(oauth2_scheme)) -> dict:
    """Validates JWT access token and returns payload dict."""
    payload = decode_token(token)
    user_id: str = payload.get("sub") or payload.get("user_id")
    token_type: str = payload.get("type", "access")
    
    if not user_id or token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload

async def get_current_user(
    payload: dict = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Fetches the authenticated User from the database including role and assigned permissions.
    Enforces active account status.
    """
    user_id = payload.get("sub") or payload.get("user_id")
    stmt = (
        select(User)
        .options(selectinload(User.role).selectinload(Role.permissions))
        .where(User.id == user_id)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User identity not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    return user

async def require_authenticated_user(user: User = Depends(get_current_user)) -> User:
    """Convenience alias for requiring an active, authenticated User."""
    return user

# ---------------------------------------------------------------------------
# Role-Based Access Control (RBAC) Dependencies
# ---------------------------------------------------------------------------
def require_roles(allowed_roles: List[str]):
    """
    Dependency factory enforcing role membership.
    Supports both payload and full DB User inspection.
    """
    async def role_checker(user: User = Depends(get_current_user)) -> User:
        user_role_name = user.role.name.upper() if user.role else "VIEWER"
        allowed_upper = [r.upper() for r in allowed_roles]
        
        if user_role_name not in allowed_upper:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Requires one of roles {allowed_roles}"
            )
        return user
    return role_checker

def require_role(role: str):
    """Requires single specific role."""
    return require_roles([role])

# ---------------------------------------------------------------------------
# Granular Permission-Based Access Control Dependencies
# ---------------------------------------------------------------------------
def get_user_permissions(user: User) -> Set[str]:
    """Extracts all active permission names for a user."""
    if not user.role:
        return set()
    role_name = user.role.name.upper()
    # ADMIN role inherits full wild-card authorization
    if role_name == "ADMIN":
        return {"*"} | {p.name for p in user.role.permissions}
    return {p.name for p in user.role.permissions}

def require_permissions(required_permissions: List[str], require_all: bool = True):
    """
    Dependency factory enforcing fine-grained permission checks.
    """
    async def permission_checker(user: User = Depends(get_current_user)) -> User:
        user_perms = get_user_permissions(user)
        
        # Admin wildcard
        if "*" in user_perms or (user.role and user.role.name.upper() == "ADMIN"):
            return user
            
        if require_all:
            missing = [p for p in required_permissions if p not in user_perms]
            if missing:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: Missing required permissions: {missing}"
                )
        else:
            has_any = any(p in user_perms for p in required_permissions)
            if not has_any:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: Requires at least one of permissions: {required_permissions}"
                )
        return user
    return permission_checker

def require_permission(permission: str):
    """Requires a single granular permission."""
    return require_permissions([permission], require_all=True)

# ---------------------------------------------------------------------------
# Object-Level Authorization Foundation Hook
# ---------------------------------------------------------------------------
def check_object_permission(
    user: User,
    resource_type: str,
    resource_owner_id: Optional[str] = None
) -> bool:
    """
    Object-level authorization verification foundation.
    Can be called inside endpoint handlers to verify tenant/owner access.
    """
    role_name = user.role.name.upper() if user.role else "VIEWER"
    # Admins and Security Analysts have broad system visibility
    if role_name in ["ADMIN", "ANALYST"]:
        return True
    # For user-specific resources (e.g. self profile or user-specific telemetry)
    if resource_owner_id and user.id == resource_owner_id:
        return True
    return False
