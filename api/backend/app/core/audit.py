"""
Centralized, Tamper-Resistant Audit Logging Subsystem.
Section 23 — Audit Logging.
Provides authoritative audit trail recording with automatic secret sanitization,
request correlation, standardized actor/action models, and fail-safe persistence.
"""
from datetime import datetime, timezone
import logging
from typing import Optional, Dict, Any, Union
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.audit_log import AuditLog
from backend.app.schemas.audit import (
    ActorType,
    AuditSeverity,
    AuditOutcome,
    ResourceType,
    AuditAction,
    AuditEventCreate,
)

logger = logging.getLogger("audit.service")

# Sensitive fields that must NEVER be stored in plaintext inside audit metadata or diffs
SENSITIVE_FIELD_KEYS = {
    "password",
    "hashed_password",
    "password_hash",
    "token",
    "access_token",
    "refresh_token",
    "jwt",
    "secret",
    "api_key",
    "encryption_key",
    "signing_secret",
    "webhook_signing_secret",
    "cvv",
    "pin",
    "card_number",
    "pan",
    "authorization",
}


def sanitize_audit_data(data: Any) -> Any:
    """
    Recursively scans and redacts sensitive credentials, passwords, tokens,
    and keys before persisting audit records.
    """
    if data is None:
        return None

    if isinstance(data, dict):
        cleaned = {}
        for k, v in data.items():
            k_lower = str(k).lower()
            if any(s in k_lower for s in SENSITIVE_FIELD_KEYS):
                cleaned[k] = "••••••••••••"
            elif isinstance(v, (dict, list)):
                cleaned[k] = sanitize_audit_data(v)
            else:
                cleaned[k] = v
        return cleaned

    if isinstance(data, list):
        return [sanitize_audit_data(item) for item in data]

    return data


def derive_default_severity(action: str, outcome: str) -> str:
    """Derives default audit severity if not explicitly provided."""
    action_upper = action.upper()
    outcome_upper = outcome.upper()

    if outcome_upper in ("DENIED", "FAILURE"):
        if any(w in action_upper for w in ["LOCK", "BLOCKED", "ESCALATION", "SECURITY"]):
            return AuditSeverity.HIGH.value
        return AuditSeverity.WARNING.value

    if any(w in action_upper for w in ["LOCK", "DEACTIVATE", "RETIRE", "CANCEL", "CRITICAL"]):
        return AuditSeverity.HIGH.value

    if any(w in action_upper for w in ["CREATE", "UPDATE", "ROLE", "DEPLOY", "ACTIVATE", "SETTING"]):
        return AuditSeverity.INFO.value

    return AuditSeverity.INFO.value


def derive_actor_type(actor_role: Optional[str], actor_email: Optional[str]) -> str:
    """Infers actor type category from role and email."""
    if not actor_email or actor_email.lower() in ("system", "system@fraudshield.io", "scheduler"):
        return ActorType.SYSTEM.value
    if "job" in actor_email.lower() or "retrain" in actor_email.lower():
        return ActorType.SCHEDULED_JOB.value
    if actor_role and actor_role.lower() == "admin":
        return ActorType.ADMIN.value
    return ActorType.USER.value


class AuditService:
    @staticmethod
    async def log_event(
        session: AsyncSession,
        event: AuditEventCreate,
        fail_silent: bool = False,
    ) -> Optional[AuditLog]:
        """
        Authoritative method to record a structured, sanitized audit event.
        """
        try:
            cleaned_diff_old = sanitize_audit_data(event.diff_old)
            cleaned_diff_new = sanitize_audit_data(event.diff_new)
            cleaned_metadata = sanitize_audit_data(event.metadata)

            severity = event.severity or derive_default_severity(event.action, event.outcome)
            actor_type = event.actor_type or derive_actor_type(event.actor_role, event.actor_email)

            log_entry = AuditLog(
                actor_user_id=event.actor_user_id,
                actor_email=event.actor_email,
                actor_role=event.actor_role,
                actor_type=actor_type,
                action=event.action,
                entity_type=event.resource_type,
                entity_id=event.resource_id,
                result=event.outcome,
                severity=severity,
                source=event.source or "API",
                ip_address=event.ip_address,
                user_agent=event.user_agent,
                request_id=event.request_id,
                correlation_id=event.correlation_id,
                session_id=event.session_id,
                diff_old=cleaned_diff_old,
                diff_new=cleaned_diff_new,
                details=event.details,
                error_message=event.error_message,
                metadata_json=cleaned_metadata,
                timestamp=datetime.now(timezone.utc),
                created_at=datetime.now(timezone.utc),
            )

            session.add(log_entry)
            await session.flush()
            return log_entry
        except Exception as e:
            logger.error(f"Audit log persistence failed for action '{event.action}': {str(e)}", exc_info=True)
            if not fail_silent:
                raise
            return None

    @staticmethod
    async def log_action(
        session: AsyncSession,
        actor_email: str,
        actor_role: str,
        action: str,
        target_entity: str,
        target_id: str,
        diff_old: Optional[Dict[str, Any]] = None,
        diff_new: Optional[Dict[str, Any]] = None,
        details: Optional[str] = None,
        correlation_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        status: str = "SUCCESS",
        actor_user_id: Optional[str] = None,
        actor_type: Optional[str] = None,
        severity: Optional[str] = None,
        source: Optional[str] = "API",
        request_id: Optional[str] = None,
        session_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        fail_silent: bool = True,
    ) -> Optional[AuditLog]:
        """
        Backward-compatible logging facade used across all existing domain services.
        """
        event = AuditEventCreate(
            actor_user_id=actor_user_id,
            actor_email=actor_email,
            actor_role=actor_role,
            actor_type=actor_type or derive_actor_type(actor_role, actor_email),
            action=action,
            resource_type=target_entity,
            resource_id=target_id,
            outcome=status,
            severity=severity or derive_default_severity(action, status),
            source=source or "API",
            ip_address=ip_address,
            request_id=request_id or correlation_id,
            correlation_id=correlation_id,
            session_id=session_id,
            diff_old=diff_old,
            diff_new=diff_new,
            details=details,
            error_message=error_message,
            metadata=metadata,
        )
        return await AuditService.log_event(session, event, fail_silent=fail_silent)


# Architectural Alias
AuditLogService = AuditService
