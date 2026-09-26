"""
Centralized Notification Policy Engine.
Section 24 — Notification System.
"""
import uuid
import html
import re
import logging
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from backend.app.models.user import User
from backend.app.models.alert import Alert
from backend.app.models.case import Case
from backend.app.models.notification import (
    Notification,
    NotificationPreference,
    NotificationDelivery,
    NotificationType,
    NotificationCategory,
    NotificationChannelType,
    NotificationSeverity,
    NotificationPriority,
    DeliveryStatus
)
from backend.app.engine.notifications.channels import channel_registry
from backend.app.engine.events.manager import ws_manager
from backend.app.engine.events.types import EventEnvelope

logger = logging.getLogger("notification_policy_engine")

# Mandatory categories that cannot be disabled for IN_APP delivery
MANDATORY_IN_APP_CATEGORIES = {
    NotificationCategory.SECURITY_ALERTS.value
}


def sanitize_text(content: Optional[str]) -> str:
    """Sanitizes text content against XSS and HTML injection."""
    if not content:
        return ""
    # Strip HTML tags
    cleaned = re.sub(r'<[^>]*?>', '', str(content))
    # HTML escape special characters
    return html.escape(cleaned.strip())


class NotificationPolicyService:
    """
    Evaluates events, applies deterministic deduplication, resolves recipients,
    enforces mandatory policies and preferences, persists notifications, and triggers deliveries.
    """
    cooldown_seconds: int = 60
    critical_cooldown_override: bool = True

    @classmethod
    async def resolve_recipients(
        cls,
        session: AsyncSession,
        direct_user_id: Optional[str] = None,
        roles: Optional[List[str]] = None
    ) -> List[User]:
        """Resolves target User entities from user IDs or roles."""
        recipients_map: Dict[str, User] = {}

        if direct_user_id:
            user_stmt = select(User).where(and_(User.id == direct_user_id, User.is_active == True))
            res = await session.execute(user_stmt)
            user = res.scalar_one_or_none()
            if user:
                recipients_map[user.id] = user

        if roles:
            roles_upper = [r.upper() for r in roles]
            role_stmt = select(User).where(and_(User.is_active == True))
            res = await session.execute(role_stmt)
            users = res.scalars().all()
            for u in users:
                user_role_str = (u.role.name if hasattr(u.role, 'name') else str(u.role or '')).upper()
                if user_role_str in roles_upper:
                    recipients_map[u.id] = u

        # Fallback to any active administrator if no recipients found
        if not recipients_map:
            fallback_stmt = select(User).where(User.is_active == True).limit(5)
            res = await session.execute(fallback_stmt)
            for u in res.scalars().all():
                recipients_map[u.id] = u

        return list(recipients_map.values())

    @classmethod
    async def is_channel_enabled_for_user(
        cls,
        session: AsyncSession,
        user_id: str,
        category: str,
        channel: str,
        severity: str
    ) -> bool:
        """
        Determines whether a notification channel is active for a user given the category and severity.
        Enforces that Critical/High Security In-App notifications CANNOT be disabled.
        """
        # Mandatory policy check
        if channel == NotificationChannelType.IN_APP.value:
            if category in MANDATORY_IN_APP_CATEGORIES and severity in (NotificationSeverity.CRITICAL.value, NotificationSeverity.HIGH.value):
                return True

        # User preference lookup
        pref_stmt = select(NotificationPreference).where(
            and_(
                NotificationPreference.user_id == user_id,
                NotificationPreference.category == category,
                NotificationPreference.channel == channel
            )
        )
        res = await session.execute(pref_stmt)
        pref = res.scalar_one_or_none()

        if pref is not None:
            return pref.enabled

        # Default: IN_APP is True for everything, EMAIL is True for Security & Admin, WEBHOOK is False by default
        if channel == NotificationChannelType.IN_APP.value:
            return True
        elif channel == NotificationChannelType.EMAIL.value:
            return category in (NotificationCategory.SECURITY_ALERTS.value, NotificationCategory.ADMIN_SYSTEM.value)
        return False

    @classmethod
    async def dispatch_notification(
        cls,
        session: AsyncSession,
        recipient: User,
        notification_type: str,
        category: str,
        title: str,
        message: str,
        severity: str = NotificationSeverity.INFO.value,
        priority: str = NotificationPriority.NORMAL.value,
        source_type: Optional[str] = None,
        source_id: Optional[str] = None,
        metadata_json: Optional[Dict[str, Any]] = None,
        expires_at: Optional[datetime] = None
    ) -> Optional[Notification]:
        """
        Evaluates deduplication, persists the notification, executes delivery channels, and broadcasts real-time event.
        """
        now_utc = datetime.now(timezone.utc)
        sanitized_title = sanitize_text(title)
        sanitized_message = sanitize_text(message)

        # 1. Deterministic Deduplication Key
        dedup_key = f"{recipient.id}:{notification_type}:{source_type or 'NONE'}:{source_id or 'NONE'}"

        # 2. Cooldown Check
        is_critical = severity == NotificationSeverity.CRITICAL.value
        if not (is_critical and cls.critical_cooldown_override):
            cooldown_threshold = now_utc - timedelta(seconds=cls.cooldown_seconds)
            recent_stmt = select(Notification).where(
                and_(
                    Notification.deduplication_key == dedup_key,
                    Notification.created_at >= cooldown_threshold
                )
            ).limit(1)
            recent_res = await session.execute(recent_stmt)
            existing_recent = recent_res.scalar_one_or_none()

            if existing_recent:
                logger.info(
                    "Notification deduplicated/suppressed by cooldown for user %s (key=%s)",
                    recipient.id, dedup_key
                )
                return None

        # 3. Create Notification Record
        notif_id = str(uuid.uuid4())
        notification = Notification(
            id=notif_id,
            recipient_user_id=recipient.id,
            notification_type=notification_type,
            category=category,
            title=sanitized_title,
            message=sanitized_message,
            severity=severity,
            priority=priority,
            source_type=source_type,
            source_id=source_id,
            delivery_status=DeliveryStatus.DELIVERED.value,
            deduplication_key=dedup_key,
            metadata_json=metadata_json or {},
            created_at=now_utc,
            expires_at=expires_at
        )
        session.add(notification)
        await session.flush()

        # 4. Deliver across configured channels
        recipient_context = {
            "id": recipient.id,
            "email": recipient.email,
            "full_name": recipient.full_name,
            "role": recipient.role.name if hasattr(recipient.role, 'name') else str(recipient.role or '')
        }
        notif_context = {
            "id": notif_id,
            "title": sanitized_title,
            "message": sanitized_message,
            "severity": severity,
            "priority": priority,
            "source_type": source_type,
            "source_id": source_id,
            "category": category,
            "created_at": now_utc.isoformat()
        }

        # Check and send on channels
        for channel_name in (NotificationChannelType.IN_APP.value, NotificationChannelType.EMAIL.value, NotificationChannelType.WEBHOOK.value):
            enabled = await cls.is_channel_enabled_for_user(
                session=session,
                user_id=recipient.id,
                category=category,
                channel=channel_name,
                severity=severity
            )
            if not enabled:
                continue

            channel_handler = channel_registry.get(channel_name)
            if channel_handler:
                try:
                    delivery_result = await channel_handler.send(notif_context, recipient_context)
                    delivery_record = NotificationDelivery(
                        id=str(uuid.uuid4()),
                        notification_id=notif_id,
                        channel=channel_name,
                        status=delivery_result.status,
                        attempt_count=delivery_result.attempt_count,
                        last_attempt_at=now_utc,
                        delivered_at=delivery_result.delivered_at,
                        failure_reason=delivery_result.failure_reason,
                        provider_reference=delivery_result.provider_reference,
                        created_at=now_utc
                    )
                    session.add(delivery_record)
                except Exception as e:
                    logger.error("Delivery failure on channel %s for notification %s: %s", channel_name, notif_id, str(e))
                    delivery_record = NotificationDelivery(
                        id=str(uuid.uuid4()),
                        notification_id=notif_id,
                        channel=channel_name,
                        status=DeliveryStatus.FAILED.value,
                        attempt_count=1,
                        last_attempt_at=now_utc,
                        failure_reason=str(e)[:500],
                        created_at=now_utc
                    )
                    session.add(delivery_record)

        await session.flush()

        # 5. Broadcast WebSocket Real-Time Event
        try:
            ws_payload = {
                "id": notif_id,
                "recipient_user_id": recipient.id,
                "notification_type": notification_type,
                "category": category,
                "title": sanitized_title,
                "message": sanitized_message,
                "severity": severity,
                "priority": priority,
                "source_type": source_type,
                "source_id": source_id,
                "created_at": now_utc.isoformat()
            }
            envelope = EventEnvelope(
                event_type="notification.created",
                entity_type="notification",
                entity_id=notif_id,
                severity=severity,
                payload=ws_payload
            )
            await ws_manager.broadcast_envelope(envelope, topic="alerts")
        except Exception as e:
            logger.debug("Failed broadcasting real-time notification envelope: %s", str(e))

        return notification

    # --- Domain Event Handlers ---

    @classmethod
    async def handle_alert_event(
        cls,
        session: AsyncSession,
        alert: Alert,
        event_type: str = "alert.created"
    ) -> List[Notification]:
        """Handles alert creation, assignment, escalation, and resolution."""
        notifications: List[Notification] = []
        severity = alert.severity or "MEDIUM"
        
        # Priority mapping
        if severity == "CRITICAL":
            notif_severity = NotificationSeverity.CRITICAL.value
            notif_priority = NotificationPriority.URGENT.value
            notif_type = NotificationType.CRITICAL_RISK_ALERT.value
        elif severity == "HIGH":
            notif_severity = NotificationSeverity.HIGH.value
            notif_priority = NotificationPriority.HIGH.value
            notif_type = NotificationType.HIGH_RISK_ALERT.value
        elif severity == "LOW":
            notif_severity = NotificationSeverity.INFO.value
            notif_priority = NotificationPriority.LOW.value
            notif_type = NotificationType.SECURITY_ALERT.value
        else:
            notif_severity = NotificationSeverity.WARNING.value
            notif_priority = NotificationPriority.NORMAL.value
            notif_type = NotificationType.SECURITY_ALERT.value

        # Custom alert lifecycle event mappings
        if event_type == "alert.assigned":
            notif_type = NotificationType.ALERT_ASSIGNED.value
            title = f"Alert Assigned: {alert.id}"
            message = f"Alert {alert.id} ({severity}) has been assigned to you for investigation."
        elif event_type == "alert.escalated":
            notif_type = NotificationType.ALERT_ESCALATED.value
            title = f"Alert Escalated: {alert.id}"
            message = f"Alert {alert.id} has been escalated to higher priority triage."
        elif event_type == "alert.resolved":
            notif_type = NotificationType.ALERT_RESOLVED.value
            title = f"Alert Resolved: {alert.id}"
            message = f"Alert {alert.id} has been marked as resolved."
        else:
            title = f"{severity} Security Alert: {alert.title or alert.id}"
            message = alert.description or alert.alert_reason or f"Transaction {alert.transaction_id} requires immediate analyst investigation."

        # Resolve target recipients
        if alert.assigned_to:
            recipients = await cls.resolve_recipients(session, direct_user_id=alert.assigned_to)
        elif severity in ("CRITICAL", "HIGH"):
            # Critical unassigned alerts notify all analysts and admins
            recipients = await cls.resolve_recipients(session, roles=["ADMIN", "ANALYST"])
        else:
            recipients = await cls.resolve_recipients(session, roles=["ANALYST"])

        for recipient in recipients:
            notif = await cls.dispatch_notification(
                session=session,
                recipient=recipient,
                notification_type=notif_type,
                category=NotificationCategory.SECURITY_ALERTS.value,
                title=title,
                message=message,
                severity=notif_severity,
                priority=notif_priority,
                source_type="ALERT",
                source_id=alert.id,
                metadata_json={
                    "alert_id": alert.id,
                    "transaction_id": alert.transaction_id,
                    "risk_score": alert.risk_score
                }
            )
            if notif:
                notifications.append(notif)

        return notifications

    @classmethod
    async def handle_case_event(
        cls,
        session: AsyncSession,
        case: Case,
        event_type: str = "case.assigned",
        note: Optional[str] = None
    ) -> List[Notification]:
        """Handles case management lifecycle events (assigned, escalated, updated, resolved)."""
        notifications: List[Notification] = []

        if event_type == "case.assigned":
            notif_type = NotificationType.CASE_ASSIGNED.value
            title = f"Case Assigned: {case.case_number or case.id}"
            message = f"Case {case.title} has been assigned to you."
            severity = NotificationSeverity.INFO.value
            priority = NotificationPriority.NORMAL.value
        elif event_type == "case.escalated":
            notif_type = NotificationType.CASE_ESCALATED.value
            title = f"Case Escalated: {case.case_number or case.id}"
            message = f"Case {case.title} has been escalated for priority investigation."
            severity = NotificationSeverity.HIGH.value
            priority = NotificationPriority.HIGH.value
        elif event_type == "case.resolved":
            notif_type = NotificationType.CASE_RESOLVED.value
            title = f"Case Resolved: {case.case_number or case.id}"
            message = f"Case {case.title} has been resolved."
            severity = NotificationSeverity.INFO.value
            priority = NotificationPriority.LOW.value
        else:
            notif_type = NotificationType.CASE_UPDATED.value
            title = f"Case Updated: {case.case_number or case.id}"
            message = note or f"Case {case.title} status updated to {case.status}."
            severity = NotificationSeverity.INFO.value
            priority = NotificationPriority.NORMAL.value

        if case.assigned_to:
            recipients = await cls.resolve_recipients(session, direct_user_id=case.assigned_to)
        else:
            recipients = await cls.resolve_recipients(session, roles=["ANALYST", "ADMIN"])

        for recipient in recipients:
            notif = await cls.dispatch_notification(
                session=session,
                recipient=recipient,
                notification_type=notif_type,
                category=NotificationCategory.CASE_UPDATES.value,
                title=title,
                message=message,
                severity=severity,
                priority=priority,
                source_type="CASE",
                source_id=case.id,
                metadata_json={
                    "case_id": case.id,
                    "case_number": case.case_number,
                    "status": case.status
                }
            )
            if notif:
                notifications.append(notif)

        return notifications

    @classmethod
    async def handle_ml_event(
        cls,
        session: AsyncSession,
        model_name: str,
        event_type: str,
        details: str,
        severity: str = "WARNING",
        model_id: Optional[str] = None
    ) -> List[Notification]:
        """Handles ML model health anomalies and retraining workflow updates."""
        notifications: List[Notification] = []

        if event_type == "model.health_critical":
            notif_type = NotificationType.MODEL_HEALTH_CRITICAL.value
            title = f"Critical ML Model Health: {model_name}"
            notif_sev = NotificationSeverity.CRITICAL.value
            notif_pri = NotificationPriority.URGENT.value
        elif event_type == "model.health_warning":
            notif_type = NotificationType.MODEL_HEALTH_WARNING.value
            title = f"ML Model Drift Warning: {model_name}"
            notif_sev = NotificationSeverity.WARNING.value
            notif_pri = NotificationPriority.NORMAL.value
        elif event_type == "model.retraining_completed":
            notif_type = NotificationType.MODEL_RETRAINING_COMPLETED.value
            title = f"Model Retraining Completed: {model_name}"
            notif_sev = NotificationSeverity.INFO.value
            notif_pri = NotificationPriority.NORMAL.value
        elif event_type == "model.retraining_failed":
            notif_type = NotificationType.MODEL_RETRAINING_FAILED.value
            title = f"Model Retraining Failed: {model_name}"
            notif_sev = NotificationSeverity.HIGH.value
            notif_pri = NotificationPriority.HIGH.value
        else:
            notif_type = NotificationType.MODEL_HEALTH_WARNING.value
            title = f"ML System Event: {model_name}"
            notif_sev = NotificationSeverity.INFO.value
            notif_pri = NotificationPriority.LOW.value

        recipients = await cls.resolve_recipients(session, roles=["ADMIN"])

        for recipient in recipients:
            notif = await cls.dispatch_notification(
                session=session,
                recipient=recipient,
                notification_type=notif_type,
                category=NotificationCategory.MODEL_MONITORING.value,
                title=title,
                message=details,
                severity=notif_sev,
                priority=notif_pri,
                source_type="MODEL",
                source_id=model_id or model_name,
                metadata_json={"model_name": model_name, "model_id": model_id}
            )
            if notif:
                notifications.append(notif)

        return notifications
