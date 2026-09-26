"""
Centralized Notification System API Router.
Section 24 — Notification System.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, require_roles
from backend.app.models.user import User
from backend.app.schemas.notification import (
    NotificationRead,
    NotificationListResponse,
    UnreadCountResponse,
    NotificationPreferencesResponse,
    NotificationPreferencesUpdatePayload,
    NotificationAdminConfig,
    NotificationMarkReadRequest
)
from backend.app.engine.notifications.service import NotificationService
from backend.app.engine.notifications.policy import NotificationPolicyService
from backend.app.core.audit import AuditService

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


@router.get("", response_model=NotificationListResponse)
async def list_user_notifications(
    unread_only: bool = Query(False, description="Filter only unread notifications"),
    category: Optional[str] = Query(None, description="Filter by notification category"),
    severity: Optional[str] = Query(None, description="Filter by severity (INFO, WARNING, HIGH, CRITICAL)"),
    priority: Optional[str] = Query(None, description="Filter by priority (LOW, NORMAL, HIGH, URGENT)"),
    search: Optional[str] = Query(None, description="Search keyword in title, message, or source"),
    page: int = Query(1, ge=1, description="Page index"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists paginated notifications for the authenticated user.
    Strictly isolated to current user identity (IDOR safe).
    """
    return await NotificationService.list_notifications(
        session=db,
        user_id=current_user.id,
        unread_only=unread_only,
        category=category,
        severity=severity,
        priority=priority,
        search=search,
        page=page,
        page_size=page_size
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_notification_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns unread notification metrics for the notification bell badge.
    """
    return await NotificationService.get_unread_counts(
        session=db,
        user_id=current_user.id
    )


@router.get("/preferences", response_model=NotificationPreferencesResponse)
async def get_user_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns channel preferences across all categories for the authenticated user.
    """
    return await NotificationService.get_user_preferences(
        session=db,
        user_id=current_user.id
    )


@router.put("/preferences", response_model=NotificationPreferencesResponse)
async def update_user_notification_preferences(
    payload: NotificationPreferencesUpdatePayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates notification delivery preferences.
    Mandatory security policies cannot be disabled.
    """
    updated_prefs = await NotificationService.update_user_preferences(
        session=db,
        user_id=current_user.id,
        updates=payload.preferences
    )

    await AuditService.log_action(
        session=db,
        actor_email=current_user.email,
        actor_role=current_user.role.name if hasattr(current_user.role, 'name') else str(current_user.role or ''),
        actor_user_id=current_user.id,
        action="NOTIFICATION_PREFERENCES_UPDATE",
        target_entity="NotificationPreference",
        target_id=current_user.id,
        details=f"Updated {len(payload.preferences)} notification preferences."
    )

    return updated_prefs


@router.post("/read-all")
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Marks all unread notifications for the user as read.
    """
    count = await NotificationService.mark_all_as_read(
        session=db,
        user_id=current_user.id
    )
    return {"message": f"Marked {count} notifications as read.", "count": count}


@router.get("/{notification_id}", response_model=NotificationRead)
async def get_notification_detail(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetches a single notification detail. Enforces user ownership (IDOR protection).
    """
    notif = await NotificationService.get_notification(
        session=db,
        user_id=current_user.id,
        notification_id=notification_id
    )
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or access denied."
        )
    return NotificationRead.model_validate(notif)


@router.patch("/{notification_id}/read", response_model=NotificationRead)
async def mark_single_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Marks a single notification as read.
    """
    notif = await NotificationService.mark_as_read(
        session=db,
        user_id=current_user.id,
        notification_id=notification_id
    )
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or access denied."
        )
    return NotificationRead.model_validate(notif)


@router.patch("/{notification_id}/dismiss")
async def dismiss_single_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Dismisses a notification from the active list.
    """
    notif = await NotificationService.dismiss_notification(
        session=db,
        user_id=current_user.id,
        notification_id=notification_id
    )
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or access denied."
        )
    return {"message": "Notification dismissed.", "id": notification_id}


# --- Admin Notification Policy Configuration ---

@router.get("/admin/config", response_model=NotificationAdminConfig, dependencies=[Depends(require_roles(["admin"]))])
async def get_notification_admin_config():
    """
    Administrator endpoint to view notification policy settings, cooldowns, and channels.
    """
    return NotificationAdminConfig(
        cooldown_seconds=NotificationPolicyService.cooldown_seconds,
        critical_cooldown_override=NotificationPolicyService.critical_cooldown_override
    )


@router.put("/admin/config", response_model=NotificationAdminConfig, dependencies=[Depends(require_roles(["admin"]))])
async def update_notification_admin_config(
    payload: NotificationAdminConfig,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Administrator endpoint to update notification policy cooldowns and settings.
    """
    old_cooldown = NotificationPolicyService.cooldown_seconds
    NotificationPolicyService.cooldown_seconds = payload.cooldown_seconds
    NotificationPolicyService.critical_cooldown_override = payload.critical_cooldown_override

    await AuditService.log_action(
        session=db,
        actor_email=current_user.email,
        actor_role="ADMIN",
        actor_user_id=current_user.id,
        action="NOTIFICATION_CONFIG_UPDATE",
        target_entity="NotificationPolicyConfig",
        target_id="global_notification_policy",
        diff_old={"cooldown_seconds": old_cooldown},
        diff_new={"cooldown_seconds": payload.cooldown_seconds, "critical_cooldown_override": payload.critical_cooldown_override},
        details="Updated notification policy cooldown settings."
    )

    return payload
