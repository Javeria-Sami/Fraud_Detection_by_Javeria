"""
Authentication, Identity, Token Refresh, and RBAC API Endpoints.
"""
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    require_authenticated_user,
    require_roles,
    require_permission,
    get_user_permissions,
    login_rate_limiter
)
from backend.app.core.audit import AuditService
from backend.app.models.user import User, Role, Permission
from backend.app.schemas.auth import (
    LoginRequest,
    Token,
    TokenRefreshRequest,
    TokenRefreshResponse,
    UserResponse,
    RoleResponse,
    PermissionResponse
)

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])

@router.post("/login", response_model=Token)
async def login(
    credentials: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"{client_ip}:{credentials.email.strip().lower()}"

    if login_rate_limiter.is_rate_limited(rate_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Please try again later."
        )

    # Search user by email or username with roles & permissions eagerly loaded
    stmt = (
        select(User)
        .options(selectinload(User.role).selectinload(Role.permissions))
        .where(
            (User.email == credentials.email.strip().lower()) |
            (User.username == credentials.email.strip())
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    # Generic invalid credentials message to prevent account enumeration
    if not user or not verify_password(credentials.password, user.hashed_password):
        await AuditService.log_action(
            db,
            actor_email=credentials.email,
            actor_role="unknown",
            action="LOGIN_FAILED",
            target_entity="User",
            target_id=credentials.email,
            status="FAILED",
            ip_address=client_ip,
            details="Invalid email, username, or password"
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        await AuditService.log_action(
            db,
            actor_email=user.email,
            actor_role=user.role.name.lower() if user.role else "viewer",
            action="LOGIN_INACTIVE",
            target_entity="User",
            target_id=user.id,
            status="BLOCKED",
            ip_address=client_ip,
            details="Login attempted on deactivated account"
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    user_role = user.role.name.lower() if user.role else "viewer"
    user_perms = sorted(list(get_user_permissions(user)))
    user.last_login_at = datetime.now(timezone.utc)

    # Log successful login
    await AuditService.log_action(
        db,
        actor_email=user.email,
        actor_role=user_role,
        action="LOGIN_SUCCESS",
        target_entity="User",
        target_id=user.id,
        status="SUCCESS",
        ip_address=client_ip,
        details="User authenticated successfully"
    )
    await db.commit()

    token_data = {
        "sub": user.id,
        "user_id": user.id,
        "email": user.email,
        "role": user_role,
        "name": user.full_name,
        "permissions": user_perms
    }
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data={"sub": user.id, "user_id": user.id, "email": user.email})

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        role=user_role,
        permissions=user_perms,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name
    )

@router.post("/refresh", response_model=TokenRefreshResponse)
async def refresh_access_token(
    payload_in: TokenRefreshRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        payload = decode_token(payload_in.refresh_token)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token_type = payload.get("type")
    user_id = payload.get("sub") or payload.get("user_id")

    if token_type != "refresh" or not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token claims"
        )

    stmt = (
        select(User)
        .options(selectinload(User.role).selectinload(Role.permissions))
        .where(User.id == user_id)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account is deactivated"
        )

    user_role = user.role.name.lower() if user.role else "viewer"
    user_perms = sorted(list(get_user_permissions(user)))

    new_access_token = create_access_token(
        data={
            "sub": user.id,
            "user_id": user.id,
            "email": user.email,
            "role": user_role,
            "name": user.full_name,
            "permissions": user_perms
        }
    )

    await AuditService.log_action(
        db,
        actor_email=user.email,
        actor_role=user_role,
        action="TOKEN_REFRESH",
        target_entity="User",
        target_id=user.id,
        status="SUCCESS",
        details="Access token rotated via valid refresh token"
    )
    await db.commit()

    return TokenRefreshResponse(
        access_token=new_access_token,
        token_type="bearer"
    )

@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    user_role = user.role.name.lower() if user.role else "viewer"
    user_perms = sorted(list(get_user_permissions(user)))
    
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=user_role,
        permissions=user_perms,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at.isoformat() if user.created_at else None,
        last_login_at=user.last_login_at.isoformat() if user.last_login_at else None
    )

@router.post("/logout")
async def logout(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_role = user.role.name.lower() if user.role else "viewer"
    await AuditService.log_action(
        db,
        actor_email=user.email,
        actor_role=user_role,
        action="LOGOUT",
        target_entity="User",
        target_id=user.id,
        status="SUCCESS",
        details="User logged out successfully"
    )
    await db.commit()
    return {"message": "Logged out successfully"}

@router.get("/roles", response_model=List[RoleResponse])
async def list_roles(
    user: User = Depends(require_roles(["ADMIN", "ANALYST"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Role).options(selectinload(Role.permissions)).order_by(Role.name)
    result = await db.execute(stmt)
    roles = result.scalars().all()
    
    return [
        RoleResponse(
            id=r.id,
            name=r.name,
            description=r.description,
            permissions=[p.name for p in r.permissions]
        )
        for r in roles
    ]

@router.get("/permissions", response_model=List[PermissionResponse])
async def list_permissions(
    user: User = Depends(require_roles(["ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Permission).order_by(Permission.name)
    result = await db.execute(stmt)
    perms = result.scalars().all()
    return perms
