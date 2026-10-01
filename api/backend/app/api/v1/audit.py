"""
Audit Logs API Endpoints.
Guarded by Admin/Analyst permissions to inspect immutable audit trail.
Section 23 — Audit Logging.
"""
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, asc, and_, or_, func

from backend.app.core.database import get_db
from backend.app.core.security import require_roles
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.audit import (
    AuditLogResponse,
    AuditLogListResponse,
    AuditStatsResponse,
)

router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"],
    dependencies=[Depends(require_roles(["admin", "analyst"]))],
)


def _to_audit_response(l: AuditLog) -> AuditLogResponse:
    ts_str = l.timestamp.isoformat() if l.timestamp else l.created_at.isoformat() if l.created_at else None
    created_str = l.created_at.isoformat() if l.created_at else ts_str

    return AuditLogResponse(
        id=l.id,
        actor_user_id=l.actor_user_id,
        actor_email=l.actor_email or "system@fraudshield.io",
        actor_role=l.actor_role or "system",
        actor_type=getattr(l, "actor_type", "USER") or "USER",
        action=l.action,
        target_entity=l.entity_type,
        resource_type=l.entity_type,
        target_id=l.entity_id,
        resource_id=l.entity_id,
        status=l.result or "SUCCESS",
        outcome=l.result or "SUCCESS",
        severity=getattr(l, "severity", "INFO") or "INFO",
        source=getattr(l, "source", "API") or "API",
        ip_address=l.ip_address,
        user_agent=l.user_agent,
        request_id=l.request_id or l.correlation_id,
        correlation_id=l.correlation_id,
        session_id=getattr(l, "session_id", None),
        diff_old=l.diff_old,
        diff_new=l.diff_new,
        details=l.details,
        error_message=getattr(l, "error_message", None),
        metadata=l.metadata_json or {},
        created_at=created_str,
        timestamp=ts_str,
    )


@router.get("", response_model=Union[AuditLogListResponse, List[AuditLogResponse]])
@router.get("/logs", response_model=AuditLogListResponse)
async def list_audit_logs(
    query: Optional[str] = Query(None, description="Search by action, actor, resource ID, or detail text"),
    action: Optional[str] = Query(None, description="Filter by action code"),
    target_entity: Optional[str] = Query(None, description="Filter by resource/entity type"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type (alias)"),
    resource_id: Optional[str] = Query(None, description="Filter by resource ID"),
    target_id: Optional[str] = Query(None, description="Filter by target ID (alias)"),
    actor_email: Optional[str] = Query(None, description="Filter by actor email"),
    actor_role: Optional[str] = Query(None, description="Filter by actor role"),
    actor_type: Optional[str] = Query(None, description="Filter by actor type (USER, SYSTEM, ADMIN, etc.)"),
    severity: Optional[str] = Query(None, description="Filter by severity (INFO, WARNING, HIGH, CRITICAL)"),
    outcome: Optional[str] = Query(None, description="Filter by outcome (SUCCESS, FAILURE, DENIED, PARTIAL)"),
    status: Optional[str] = Query(None, description="Filter by status (alias for outcome)"),
    source: Optional[str] = Query(None, description="Filter by source (API, UI, SYSTEM, etc.)"),
    request_id: Optional[str] = Query(None, description="Filter by request or correlation ID"),
    date_from: Optional[datetime] = Query(None, description="Filter events on or after UTC datetime"),
    date_to: Optional[datetime] = Query(None, description="Filter events on or before UTC datetime"),
    page: Optional[int] = Query(None, ge=1, description="Page number (1-indexed)"),
    page_size: Optional[int] = Query(None, ge=1, le=200, description="Items per page"),
    limit: Optional[int] = Query(None, ge=1, le=200, description="Legacy limit parameter"),
    offset: Optional[int] = Query(None, ge=0, description="Legacy offset parameter"),
    sort_by: str = Query("timestamp", description="Field to sort by (timestamp, action, severity, outcome, actor_email)"),
    sort_order: str = Query("desc", description="Sort order (asc, desc)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Search, filter, and inspect immutable security audit records with server-side pagination.
    """
    stmt = select(AuditLog)
    conditions = []

    # Text Search
    if query:
        search_pattern = f"%{query.strip()}%"
        stmt = stmt.where(
            or_(
                AuditLog.action.ilike(search_pattern),
                AuditLog.actor_email.ilike(search_pattern),
                AuditLog.entity_type.ilike(search_pattern),
                AuditLog.entity_id.ilike(search_pattern),
                AuditLog.details.ilike(search_pattern),
                AuditLog.request_id.ilike(search_pattern),
                AuditLog.correlation_id.ilike(search_pattern),
            )
        )

    # Specific Filters
    if action:
        conditions.append(AuditLog.action == action.strip().upper())

    eff_resource_type = resource_type or target_entity
    if eff_resource_type:
        conditions.append(AuditLog.entity_type == eff_resource_type.strip())

    eff_resource_id = resource_id or target_id
    if eff_resource_id:
        conditions.append(AuditLog.entity_id == eff_resource_id.strip())

    if actor_email:
        conditions.append(AuditLog.actor_email.ilike(f"%{actor_email.strip()}%"))

    if actor_role:
        conditions.append(AuditLog.actor_role.ilike(actor_role.strip()))

    if actor_type:
        conditions.append(AuditLog.actor_type == actor_type.strip().upper())

    if severity:
        conditions.append(AuditLog.severity == severity.strip().upper())

    eff_outcome = outcome or status
    if eff_outcome:
        conditions.append(AuditLog.result == eff_outcome.strip().upper())

    if source:
        conditions.append(AuditLog.source == source.strip().upper())

    if request_id:
        conditions.append(
            or_(
                AuditLog.request_id == request_id.strip(),
                AuditLog.correlation_id == request_id.strip(),
            )
        )

    if date_from:
        conditions.append(AuditLog.timestamp >= date_from)

    if date_to:
        conditions.append(AuditLog.timestamp <= date_to)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    # Total Count Query
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total_count = total_res.scalar() or 0

    # Sorting
    sort_column_map = {
        "timestamp": AuditLog.timestamp,
        "created_at": AuditLog.created_at,
        "action": AuditLog.action,
        "severity": AuditLog.severity,
        "outcome": AuditLog.result,
        "status": AuditLog.result,
        "actor_email": AuditLog.actor_email,
    }
    sort_col = sort_column_map.get(sort_by, AuditLog.timestamp)
    if sort_order.lower() == "asc":
        stmt = stmt.order_by(asc(sort_col))
    else:
        stmt = stmt.order_by(desc(sort_col))

    # Pagination handling (supports both page/page_size and legacy limit/offset)
    if page is not None or page_size is not None:
        p = page or 1
        ps = page_size or 50
        calc_offset = (p - 1) * ps
        stmt = stmt.offset(calc_offset).limit(ps)
        res = await db.execute(stmt)
        logs = res.scalars().all()
        total_pages = max(1, (total_count + ps - 1) // ps)

        return AuditLogListResponse(
            total=total_count,
            page=p,
            page_size=ps,
            total_pages=total_pages,
            items=[_to_audit_response(l) for l in logs],
        )

    # Legacy limit/offset fallback
    effective_limit = limit or 50
    effective_offset = offset or 0
    stmt = stmt.offset(effective_offset).limit(effective_limit)
    res = await db.execute(stmt)
    logs = res.scalars().all()

    return [_to_audit_response(l) for l in logs]


@router.get("/stats", response_model=AuditStatsResponse)
async def get_audit_stats(
    db: AsyncSession = Depends(get_db),
):
    """
    Returns aggregated audit metrics (total count, today's activity, high/critical severity,
    denied/failed actions, and distribution by action and severity).
    """
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

    # Total events
    total_res = await db.execute(select(func.count(AuditLog.id)))
    total_events = total_res.scalar() or 0

    # Events today
    today_res = await db.execute(select(func.count(AuditLog.id)).where(AuditLog.timestamp >= today_start))
    events_today = today_res.scalar() or 0

    # High / Critical severity count
    high_crit_res = await db.execute(
        select(func.count(AuditLog.id)).where(AuditLog.severity.in_(["HIGH", "CRITICAL"]))
    )
    high_critical_count = high_crit_res.scalar() or 0

    # Failed / Denied outcomes
    failed_res = await db.execute(
        select(func.count(AuditLog.id)).where(AuditLog.result.in_(["FAILURE", "FAILED", "DENIED"]))
    )
    failed_denied_count = failed_res.scalar() or 0

    # Admin actions count
    admin_res = await db.execute(
        select(func.count(AuditLog.id)).where(
            or_(
                AuditLog.actor_role == "admin",
                AuditLog.actor_type == "ADMIN",
                AuditLog.action.like("USER_%"),
                AuditLog.action.like("SETTING_%"),
                AuditLog.action.like("RULE_%"),
            )
        )
    )
    admin_actions_count = admin_res.scalar() or 0

    # Action breakdown (Top 10)
    action_stmt = (
        select(AuditLog.action, func.count(AuditLog.id))
        .group_by(AuditLog.action)
        .order_by(desc(func.count(AuditLog.id)))
        .limit(10)
    )
    action_res = await db.execute(action_stmt)
    action_breakdown = {row[0]: row[1] for row in action_res.all()}

    # Severity breakdown
    sev_stmt = (
        select(AuditLog.severity, func.count(AuditLog.id))
        .group_by(AuditLog.severity)
    )
    sev_res = await db.execute(sev_stmt)
    severity_breakdown = {row[0] or "INFO": row[1] for row in sev_res.all()}

    # Outcome breakdown
    out_stmt = (
        select(AuditLog.result, func.count(AuditLog.id))
        .group_by(AuditLog.result)
    )
    out_res = await db.execute(out_stmt)
    outcome_breakdown = {row[0] or "SUCCESS": row[1] for row in out_res.all()}

    return AuditStatsResponse(
        total_events=total_events,
        events_today=events_today,
        high_critical_count=high_critical_count,
        failed_denied_count=failed_denied_count,
        admin_actions_count=admin_actions_count,
        action_breakdown=action_breakdown,
        severity_breakdown=severity_breakdown,
        outcome_breakdown=outcome_breakdown,
        generated_at=now.isoformat(),
    )


@router.get("/{audit_log_id}", response_model=AuditLogResponse)
async def get_audit_log_detail(
    audit_log_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves full detail of a specific immutable audit event.
    """
    stmt = select(AuditLog).where(AuditLog.id == audit_log_id)
    res = await db.execute(stmt)
    log = res.scalar_one_or_none()

    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audit log record with ID '{audit_log_id}' not found.",
        )

    return _to_audit_response(log)
