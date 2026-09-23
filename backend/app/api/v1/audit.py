"""
Audit Logs API Endpoints.
Guarded by Admin/Analyst permissions to inspect immutable audit trail.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from backend.app.core.database import get_db
from backend.app.core.security import require_roles
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.profile import AuditLogResponse

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"], dependencies=[Depends(require_roles(["admin", "analyst"]))])

@router.get("", response_model=List[AuditLogResponse])
async def list_audit_logs(
    action: Optional[str] = None,
    target_entity: Optional[str] = None,
    actor_email: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    query = select(AuditLog)
    conditions = []

    if action:
        conditions.append(AuditLog.action == action)
    if target_entity:
        conditions.append(AuditLog.target_entity == target_entity)
    if actor_email:
        conditions.append(AuditLog.actor_email == actor_email)

    if conditions:
        query = query.where(and_(*conditions))

    query = query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(limit)
    res = await db.execute(query)
    logs = res.scalars().all()

    return [
        AuditLogResponse(
            id=l.id,
            actor_email=l.actor_email,
            actor_role=l.actor_role,
            action=l.action,
            target_entity=l.target_entity,
            target_id=l.target_id,
            correlation_id=l.correlation_id,
            ip_address=l.ip_address,
            status=l.status,
            diff_old=l.diff_old,
            diff_new=l.diff_new,
            details=l.details,
            timestamp=l.timestamp.isoformat() if l.timestamp else None
        )
        for l in logs
    ]
