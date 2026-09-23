"""
Audit Logging Service.
Records immutable audit trail entries for administrative, security, case, rule, and model operations.
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.audit_log import AuditLog

class AuditService:
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
        status: str = "SUCCESS"
    ) -> AuditLog:
        log_entry = AuditLog(
            actor_email=actor_email,
            actor_role=actor_role,
            action=action,
            target_entity=target_entity,
            target_id=target_id,
            diff_old=diff_old,
            diff_new=diff_new,
            details=details,
            correlation_id=correlation_id,
            ip_address=ip_address,
            status=status,
            timestamp=datetime.now(timezone.utc)
        )
        session.add(log_entry)
        await session.flush()
        return log_entry
