"""
Notification Query, Lifecycle, and Preference Management Service.
Section 24 — Notification System.
"""
import uuid
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc, update

from backend.app.models.notification import (
    Notification,
    NotificationPreference,
    NotificationDelivery,
    NotificationCategory,
    NotificationChannelType,
    NotificationSeverity,
    NotificationPriority,
    DeliveryStatus
)
from backend.app.schemas.notification import (
    NotificationRead,
    NotificationListResponse,
    UnreadCountResponse,
    NotificationPreferenceItem,
    NotificationPreferencesResponse,
    NotificationPreferenceUpdate,
    NotificationAdminConfig
)
from backend.app.core.audit import AuditService
from backend.app.engine.notifications.policy import MANDATORY_IN_APP_CATEGORIES

logger = logging.getLogger("notification_service")

# Default category definitions with user-friendly metadata
CATEGORY_METADATA = [
    {
        "category": NotificationCategory.SECURITY_ALERTS.value,
        "label": "Security & Fraud Alerts",
        "description": "High and critical risk operational alerts, anomaly detections, and security incidents."
    },
    {
        "category": NotificationCategory.CASE_UPDATES.value,
        "label": "Case Management",
        "description": "Assignments, escalations, triage updates, and resolutions on investigation cases."
    },
    {
        "category": NotificationCategory.MODEL_MONITORING.value,
        "label": "ML & MLOps Health",
        "description": "Drift warnings, health degradation, automated retraining triggers, and metrics alerts."
    },
    {
        "category": NotificationCategory.ADMIN_SYSTEM.value,
        "label": "Administration & System",
        "description": "Rule administration changes, system configuration updates, and security logs."
    }
]


class NotificationService:
    """
    CRUD and management service for user notifications and channel preferences.
    Enforces strict IDOR boundaries so users can only view and update their own notifications.
    """

    @classmethod
    async def list_notifications(
        cls,
        session: AsyncSession,
        user_id: str,
        unread_only: bool = False,
        category: Optional[str] = None,
        severity: Optional[str] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> NotificationListResponse:
        """Queries paginated notifications belonging to the authenticated user."""
        conditions = [
            Notification.recipient_user_id == user_id,
            Notification.dismissed_at.is_(None)
        ]

        if unread_only:
            conditions.append(Notification.read_at.is_(None))

        if category:
            conditions.append(Notification.category == category)

        if severity:
            conditions.append(Notification.severity == severity.upper())

        if priority:
            conditions.append(Notification.priority == priority.upper())

        if search:
            search_clean = f"%{search.strip()}%"
            conditions.append(
                or_(
                    Notification.title.ilike(search_clean),
                    Notification.message.ilike(search_clean),
                    Notification.source_id.ilike(search_clean)
                )
            )

        # Count total matching
        count_stmt = select(func.count(Notification.id)).where(and_(*conditions))
        total_res = await session.execute(count_stmt)
        total = total_res.scalar() or 0

        # Fetch items
        offset = max(0, (page - 1) * page_size)
        query = (
            select(Notification)
            .where(and_(*conditions))
            .order_by(desc(Notification.created_at))
            .offset(offset)
            .limit(page_size)
        )
        items_res = await session.execute(query)
        items = items_res.scalars().all()

        # Unread total
        unread_res = await session.execute(
            select(func.count(Notification.id)).where(
                and_(
                    Notification.recipient_user_id == user_id,
                    Notification.read_at.is_(None),
                    Notification.dismissed_at.is_(None)
                )
            )
        )
        unread_count = unread_res.scalar() or 0

        return NotificationListResponse(
            items=[NotificationRead.model_validate(item) for item in items],
            total=total,
            page=page,
            page_size=page_size,
            unread_count=unread_count
        )

    @classmethod
    async def get_unread_counts(cls, session: AsyncSession, user_id: str) -> UnreadCountResponse:
        """Fast aggregate query for unread notifications and severity breakdown."""
        stmt = (
            select(
                func.count(Notification.id),
                func.count(func.nullif(Notification.severity != NotificationSeverity.CRITICAL.value, True)),
                func.count(func.nullif(Notification.severity != NotificationSeverity.HIGH.value, True))
            )
            .where(
                and_(
                    Notification.recipient_user_id == user_id,
                    Notification.read_at.is_(None),
                    Notification.dismissed_at.is_(None)
                )
            )
        )
        res = await session.execute(stmt)
        row = res.one()

        return UnreadCountResponse(
            unread_count=row[0] or 0,
            critical_count=row[1] or 0,
            high_count=row[2] or 0
        )

    @classmethod
    async def get_notification(
        cls,
        session: AsyncSession,
        user_id: str,
        notification_id: str
    ) -> Optional[Notification]:
        """Fetches a single notification enforcing user ownership (IDOR prevention)."""
        stmt = select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.recipient_user_id == user_id
            )
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    @classmethod
    async def mark_as_read(
        cls,
        session: AsyncSession,
        user_id: str,
        notification_id: str
    ) -> Optional[Notification]:
        """Marks a specific notification as read."""
        notif = await cls.get_notification(session, user_id, notification_id)
        if not notif:
            return None

        if not notif.read_at:
            notif.read_at = datetime.now(timezone.utc)
            notif.updated_at = datetime.now(timezone.utc)
            await session.flush()

        return notif

    @classmethod
    async def mark_all_as_read(cls, session: AsyncSession, user_id: str) -> int:
        """Marks all unread notifications for the user as read."""
        now_utc = datetime.now(timezone.utc)
        stmt = (
            update(Notification)
            .where(
                and_(
                    Notification.recipient_user_id == user_id,
                    Notification.read_at.is_(None)
                )
            )
            .values(read_at=now_utc, updated_at=now_utc)
        )
        res = await session.execute(stmt)
        await session.flush()
        return res.rowcount

    @classmethod
    async def dismiss_notification(
        cls,
        session: AsyncSession,
        user_id: str,
        notification_id: str
    ) -> Optional[Notification]:
        """Dismisses a notification from user view."""
        notif = await cls.get_notification(session, user_id, notification_id)
        if not notif:
            return None

        notif.dismissed_at = datetime.now(timezone.utc)
        notif.updated_at = datetime.now(timezone.utc)
        await session.flush()
        return notif

    @classmethod
    async def get_user_preferences(cls, session: AsyncSession, user_id: str) -> NotificationPreferencesResponse:
        """Returns the complete preference grid for the user with default values."""
        # Query saved preferences
        stmt = select(NotificationPreference).where(NotificationPreference.user_id == user_id)
        res = await session.execute(stmt)
        saved_prefs = {(p.category, p.channel): p.enabled for p in res.scalars().all()}

        items: List[NotificationPreferenceItem] = []
        for cat in CATEGORY_METADATA:
            category_key = cat["category"]
            for channel_name in (NotificationChannelType.IN_APP.value, NotificationChannelType.EMAIL.value, NotificationChannelType.WEBHOOK.value):
                is_mandatory = (channel_name == NotificationChannelType.IN_APP.value and category_key in MANDATORY_IN_APP_CATEGORIES)
                
                # Determine current status
                if (category_key, channel_name) in saved_prefs:
                    enabled = saved_prefs[(category_key, channel_name)]
                else:
                    # Safe defaults
                    if channel_name == NotificationChannelType.IN_APP.value:
                        enabled = True
                    elif channel_name == NotificationChannelType.EMAIL.value:
                        enabled = category_key in (NotificationCategory.SECURITY_ALERTS.value, NotificationCategory.ADMIN_SYSTEM.value)
                    else:
                        enabled = False

                if is_mandatory:
                    enabled = True

                items.append(
                    NotificationPreferenceItem(
                        category=category_key,
                        channel=channel_name,
                        enabled=enabled,
                        is_mandatory=is_mandatory,
                        label=cat["label"],
                        description=cat["description"]
                    )
                )

        return NotificationPreferencesResponse(preferences=items)

    @classmethod
    async def update_user_preferences(
        cls,
        session: AsyncSession,
        user_id: str,
        updates: List[NotificationPreferenceUpdate]
    ) -> NotificationPreferencesResponse:
        """Updates user preferences and prevents disabling mandatory categories."""
        now_utc = datetime.now(timezone.utc)

        for item in updates:
            # Check mandatory override
            if item.channel == NotificationChannelType.IN_APP.value and item.category in MANDATORY_IN_APP_CATEGORIES:
                # Mandatory security alert cannot be disabled
                item.enabled = True

            stmt = select(NotificationPreference).where(
                and_(
                    NotificationPreference.user_id == user_id,
                    NotificationPreference.category == item.category,
                    NotificationPreference.channel == item.channel
                )
            )
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()

            if existing:
                existing.enabled = item.enabled
                existing.updated_at = now_utc
            else:
                new_pref = NotificationPreference(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    category=item.category,
                    channel=item.channel,
                    enabled=item.enabled,
                    created_at=now_utc,
                    updated_at=now_utc
                )
                session.add(new_pref)

        await session.flush()
        return await cls.get_user_preferences(session, user_id)
