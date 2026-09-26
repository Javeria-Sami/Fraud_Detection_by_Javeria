"""
Case Management & Analyst Investigation Workspace API Endpoints.
"""
import uuid
import math
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc, and_, or_, delete, insert
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_payload, require_roles
from backend.app.core.audit import AuditService
from backend.app.core.events import ws_manager
from backend.app.engine.notifications.policy import NotificationPolicyService
from backend.app.models.case import (
    Case, CaseNote, CaseEvidence, CaseHistory,
    case_alerts, case_transactions
)
from backend.app.models.alert import Alert
from backend.app.models.transaction import Transaction
from backend.app.models.risk_profile import UserRiskProfile
from backend.app.schemas.case import (
    CaseCreate, CaseUpdate, CaseResolveRequest, CaseResponse, CaseDetailResponse,
    CasePaginatedResponse, CaseStatsResponse,
    CaseNoteCreate, CaseNoteResponse, CaseEvidenceCreate, CaseEvidenceResponse,
    CaseTimelineItem, CaseAlertItem, CaseTransactionItem,
    CaseStatusUpdateRequest, CaseAssignRequest,
    CaseLinkAlertRequest, CaseLinkTransactionRequest
)

router = APIRouter(prefix="/cases", tags=["Case Management"])

# Valid state machine transitions
ALLOWED_STATUS_TRANSITIONS: Dict[str, List[str]] = {
    "OPEN": ["INVESTIGATING", "CLOSED"],
    "INVESTIGATING": ["PENDING", "RESOLVED", "CLOSED"],
    "PENDING": ["INVESTIGATING", "RESOLVED", "CLOSED"],
    "RESOLVED": ["CLOSED", "REOPENED", "OPEN", "INVESTIGATING"],
    "CLOSED": ["REOPENED", "OPEN"],
    "REOPENED": ["INVESTIGATING", "RESOLVED", "CLOSED"]
}

SORTABLE_FIELDS = {
    "created_at": Case.created_at,
    "updated_at": Case.updated_at,
    "severity": Case.severity,
    "status": Case.status,
    "case_id": Case.id,
    "risk_score": Case.risk_score,
}

def _build_case_filter_conditions(
    status_filter: Optional[str] = None,
    severity: Optional[str] = None,
    assigned_analyst: Optional[str] = None,
    user_id: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Any]:
    conditions = []
    if status_filter and status_filter.upper() != "ALL":
        conditions.append(Case.status == status_filter.upper())
    if severity and severity.upper() != "ALL":
        conditions.append(Case.severity == severity.upper())
    if assigned_analyst:
        if assigned_analyst.upper() == "UNASSIGNED":
            conditions.append(or_(Case.assigned_analyst.is_(None), Case.assigned_analyst == ""))
        else:
            conditions.append(Case.assigned_analyst.ilike(f"%{assigned_analyst}%"))
    if user_id:
        conditions.append(Case.user_id == user_id)
    if search:
        term = f"%{search.strip()}%"
        conditions.append(
            or_(
                Case.id.ilike(term),
                Case.title.ilike(term),
                Case.description.ilike(term),
                Case.user_id.ilike(term),
                Case.assigned_analyst.ilike(term)
            )
        )
    if start_date:
        try:
            st = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            conditions.append(Case.created_at >= st)
        except Exception:
            pass
    if end_date:
        try:
            et = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            conditions.append(Case.created_at <= et)
        except Exception:
            pass
    return conditions

def _format_case_response(c: Case) -> CaseResponse:
    return CaseResponse(
        id=c.id,
        case_id=c.id,
        title=c.title,
        description=c.description,
        user_id=c.user_id,
        severity=c.severity,
        status=c.status,
        assigned_analyst=c.assigned_analyst,
        assigned_to=c.assigned_to,
        risk_score=c.risk_score or 0.0,
        related_transaction_ids=c.related_transaction_ids or [],
        related_alert_ids=c.related_alert_ids or [],
        resolution=c.resolution,
        resolution_notes=c.resolution_notes,
        resolved_by=c.resolved_by,
        resolved_at=c.resolved_at.isoformat() if c.resolved_at else None,
        closed_at=c.closed_at.isoformat() if c.closed_at else None,
        created_at=c.created_at.isoformat() if c.created_at else None,
        updated_at=c.updated_at.isoformat() if c.updated_at else None,
        alerts_count=len(c.alerts) if hasattr(c, "alerts") and c.alerts is not None else len(c.related_alert_ids or []),
        transactions_count=len(c.transactions) if hasattr(c, "transactions") and c.transactions is not None else len(c.related_transaction_ids or []),
        notes=[
            CaseNoteResponse(
                id=n.id,
                case_id=n.case_id,
                author=n.author,
                author_id=n.author_id,
                content=n.content,
                created_at=n.created_at.isoformat() if n.created_at else None,
                updated_at=n.updated_at.isoformat() if n.updated_at else None
            ) for n in (getattr(c, "notes", []) or [])
        ],
        evidence=[
            CaseEvidenceResponse(
                id=e.id,
                case_id=e.case_id,
                title=e.title,
                description=e.description,
                evidence_type=e.evidence_type,
                file_reference=e.file_reference,
                payload=e.payload or e.metadata_json,
                metadata_json=e.metadata_json or e.payload,
                uploaded_by=e.uploaded_by,
                created_at=e.created_at.isoformat() if e.created_at else None
            ) for e in (getattr(c, "evidence", []) or [])
        ]
    )


@router.get("/stats", response_model=CaseStatsResponse)
async def get_case_stats(
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Retrieve real-time aggregate statistics for Case Management workspace KPI cards.
    """
    total_q = select(func.count(Case.id))
    open_q = select(func.count(Case.id)).where(Case.status == "OPEN")
    investigating_q = select(func.count(Case.id)).where(Case.status == "INVESTIGATING")
    critical_q = select(func.count(Case.id)).where(Case.severity == "CRITICAL")
    unassigned_q = select(func.count(Case.id)).where(
        and_(
            Case.status.in_(["OPEN", "INVESTIGATING", "PENDING"]),
            or_(Case.assigned_analyst.is_(None), Case.assigned_analyst == "")
        )
    )

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    resolved_today_q = select(func.count(Case.id)).where(
        and_(
            Case.status.in_(["RESOLVED", "CLOSED"]),
            Case.resolved_at >= today_start
        )
    )

    total_cases = (await db.execute(total_q)).scalar() or 0
    open_cases = (await db.execute(open_q)).scalar() or 0
    investigating_cases = (await db.execute(investigating_q)).scalar() or 0
    critical_cases = (await db.execute(critical_q)).scalar() or 0
    unassigned_cases = (await db.execute(unassigned_q)).scalar() or 0
    resolved_today = (await db.execute(resolved_today_q)).scalar() or 0

    return CaseStatsResponse(
        total_cases=total_cases,
        open_cases=open_cases,
        investigating_cases=investigating_cases,
        critical_cases=critical_cases,
        unassigned_cases=unassigned_cases,
        resolved_today=resolved_today
    )


@router.get("/paginated", response_model=CasePaginatedResponse)
async def list_cases_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = None,
    assigned_analyst: Optional[str] = None,
    user_id: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    sort_by: str = Query("created_at"),
    order: str = Query("desc"),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Paginated endpoint returning envelope with items, total, and page navigation info.
    """
    conditions = _build_case_filter_conditions(
        status_filter=status_filter,
        severity=severity,
        assigned_analyst=assigned_analyst,
        user_id=user_id,
        search=search,
        start_date=start_date,
        end_date=end_date
    )

    # Count total
    count_query = select(func.count(Case.id))
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total_result = await db.execute(count_query)
    total_count = total_result.scalar() or 0

    total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1
    offset = (page - 1) * page_size

    # Fetch rows
    query = select(Case).options(
        selectinload(Case.notes),
        selectinload(Case.evidence),
        selectinload(Case.alerts),
        selectinload(Case.transactions)
    )
    if conditions:
        query = query.where(and_(*conditions))

    sort_column = SORTABLE_FIELDS.get(sort_by, Case.created_at)
    if order.lower() == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    cases = result.scalars().all()

    return CasePaginatedResponse(
        items=[_format_case_response(c) for c in cases],
        total=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("", response_model=List[CaseResponse])
async def list_cases(
    response: Response,
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = None,
    assigned_analyst: Optional[str] = None,
    user_id: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    sort_by: str = Query("created_at"),
    order: str = Query("desc"),
    limit: Optional[int] = Query(None, ge=1, le=200),
    offset: Optional[int] = Query(None, ge=0),
    page: Optional[int] = Query(None, ge=1),
    page_size: Optional[int] = Query(None, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    List cases with multidimensional filtering, allowlisted sorting, pagination, and response headers.
    """
    conditions = _build_case_filter_conditions(
        status_filter=status_filter,
        severity=severity,
        assigned_analyst=assigned_analyst,
        user_id=user_id,
        search=search,
        start_date=start_date,
        end_date=end_date
    )

    # Count total
    count_query = select(func.count(Case.id))
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total_result = await db.execute(count_query)
    total_count = total_result.scalar() or 0

    # Calculate pagination params
    effective_limit = 50
    effective_offset = 0

    if page is not None and page_size is not None:
        effective_limit = page_size
        effective_offset = (page - 1) * page_size
    elif limit is not None:
        effective_limit = limit
        if offset is not None:
            effective_offset = offset

    total_pages = math.ceil(total_count / effective_limit) if total_count > 0 else 1
    current_page = (effective_offset // effective_limit) + 1

    # Set response headers
    response.headers["X-Total-Count"] = str(total_count)
    response.headers["X-Page"] = str(current_page)
    response.headers["X-Page-Size"] = str(effective_limit)
    response.headers["X-Total-Pages"] = str(total_pages)

    query = select(Case).options(
        selectinload(Case.notes),
        selectinload(Case.evidence),
        selectinload(Case.alerts),
        selectinload(Case.transactions)
    )
    if conditions:
        query = query.where(and_(*conditions))

    sort_column = SORTABLE_FIELDS.get(sort_by, Case.created_at)
    if order.lower() == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    query = query.offset(effective_offset).limit(effective_limit)
    result = await db.execute(query)
    cases = result.scalars().all()

    return [_format_case_response(c) for c in cases]


@router.post("", response_model=CaseResponse)
async def create_case(
    payload: CaseCreate,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Create a new investigation case, link initial alerts and transactions, create initial note, and publish live event.
    """
    year = datetime.now(timezone.utc).year
    case_id = f"CASE-{year}-{uuid.uuid4().hex[:6].upper()}"
    actor_email = user_payload.get("email", "analyst")
    actor_id = user_payload.get("sub") or user_payload.get("id")
    analyst = payload.assigned_analyst or actor_email

    risk_score = 85.0 if payload.severity.upper() in ["HIGH", "CRITICAL"] else 50.0

    new_case = Case(
        id=case_id,
        case_id=case_id,
        title=payload.title,
        description=payload.description,
        user_id=payload.user_id,
        severity=payload.severity.upper(),
        status="OPEN",
        assigned_analyst=analyst,
        assigned_to=actor_id,
        created_by=actor_id,
        risk_score=risk_score,
        related_transaction_ids=list(set(payload.related_transaction_ids)),
        related_alert_ids=list(set(payload.related_alert_ids)),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(new_case)
    await db.flush()

    # Link initial alerts in case_alerts association table
    for alert_id in set(payload.related_alert_ids):
        a_stmt = select(Alert).where(Alert.id == alert_id)
        a_res = await db.execute(a_stmt)
        alert = a_res.scalar_one_or_none()
        if alert:
            # Association table entry
            await db.execute(
                insert(case_alerts).values(
                    case_id=case_id,
                    alert_id=alert.id,
                    created_at=datetime.now(timezone.utc)
                )
            )
            alert.case_id = case_id
            alert.status = "INVESTIGATING"
            alert.assigned_to = actor_id

    # Link initial transactions in case_transactions association table
    for txn_id in set(payload.related_transaction_ids):
        t_stmt = select(Transaction).where(Transaction.id == txn_id)
        t_res = await db.execute(t_stmt)
        txn = t_res.scalar_one_or_none()
        if txn:
            await db.execute(
                insert(case_transactions).values(
                    case_id=case_id,
                    transaction_id=txn.id,
                    created_at=datetime.now(timezone.utc)
                )
            )

    # Initial Note if provided
    if payload.initial_note:
        note = CaseNote(
            case_id=case_id,
            author_id=actor_id,
            author=actor_email,
            content=payload.initial_note,
            created_at=datetime.now(timezone.utc)
        )
        db.add(note)

    # History timeline entry
    history = CaseHistory(
        case_id=case_id,
        action="CASE_CREATED",
        from_status=None,
        to_status="OPEN",
        note=f"Case opened with severity {payload.severity.upper()}",
        actor_id=actor_id,
        actor_name=actor_email,
        details={
            "initial_alerts": payload.related_alert_ids,
            "initial_transactions": payload.related_transaction_ids,
            "severity": payload.severity.upper()
        },
        created_at=datetime.now(timezone.utc)
    )
    db.add(history)

    await AuditService.log_action(
        db,
        actor_email=actor_email,
        actor_role=user_payload.get("role", "analyst"),
        action="CASE_CREATE",
        target_entity="Case",
        target_id=case_id,
        details=f"Created case {case_id}: '{payload.title}' with severity {payload.severity.upper()}"
    )

    await db.commit()

    # Re-fetch with relationships
    stmt = select(Case).options(
        selectinload(Case.notes),
        selectinload(Case.evidence),
        selectinload(Case.alerts),
        selectinload(Case.transactions)
    ).where(Case.id == case_id)
    refreshed = (await db.execute(stmt)).scalar_one()

    # Broadcast event
    await ws_manager.broadcast_event(
        "case.created",
        case_id,
        {
            "id": case_id,
            "title": refreshed.title,
            "severity": refreshed.severity,
            "status": refreshed.status,
            "assigned_analyst": refreshed.assigned_analyst
        }
    )

    # Trigger Notification Policy Engine
    try:
        await NotificationPolicyService.handle_case_event(
            session=db,
            case=refreshed,
            event_type="case.assigned" if refreshed.assigned_to or refreshed.assigned_analyst else "case.updated"
        )
    except Exception:
        pass

    return _format_case_response(refreshed)


@router.get("/{case_id}", response_model=CaseDetailResponse)
async def get_case_detail(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Get detailed case workspace data with full joined alerts, transactions, notes, evidence, and audit timeline.
    """
    stmt = select(Case).options(
        selectinload(Case.notes),
        selectinload(Case.evidence),
        selectinload(Case.alerts),
        selectinload(Case.transactions),
        selectinload(Case.history)
    ).where(Case.id == case_id)
    res = await db.execute(stmt)
    case = res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Format alerts
    alert_items: List[CaseAlertItem] = []
    for a in (case.alerts or []):
        alert_items.append(
            CaseAlertItem(
                id=a.id,
                alert_id=a.alert_id or a.id,
                title=a.title or a.alert_reason or "Fraud Alert",
                severity=a.severity,
                status=a.status,
                risk_score=a.risk_score or 0.0,
                alert_reason=a.alert_reason,
                created_at=a.created_at.isoformat() if a.created_at else None
            )
        )

    # Format transactions
    txn_items: List[CaseTransactionItem] = []
    for t in (case.transactions or []):
        txn_items.append(
            CaseTransactionItem(
                id=t.id,
                amount=t.amount,
                currency=t.currency or "USD",
                merchant_name=t.merchant_name or (t.merchant.merchant_name if t.merchant else "Unknown"),
                payment_method=t.payment_method,
                risk_score=t.risk_score or 0.0,
                risk_level=t.risk_level or "LOW",
                status=t.status,
                timestamp=(t.transaction_timestamp or t.timestamp or t.created_at).isoformat() if (t.transaction_timestamp or t.timestamp or t.created_at) else None
            )
        )

    # Format notes
    note_items = [
        CaseNoteResponse(
            id=n.id,
            case_id=n.case_id,
            author=n.author,
            author_id=n.author_id,
            content=n.content,
            created_at=n.created_at.isoformat() if n.created_at else None,
            updated_at=n.updated_at.isoformat() if n.updated_at else None
        ) for n in sorted(case.notes or [], key=lambda x: x.created_at or datetime.min)
    ]

    # Format evidence
    evidence_items = [
        CaseEvidenceResponse(
            id=e.id,
            case_id=e.case_id,
            title=e.title,
            description=e.description,
            evidence_type=e.evidence_type,
            file_reference=e.file_reference,
            payload=e.payload or e.metadata_json,
            metadata_json=e.metadata_json or e.payload,
            uploaded_by=e.uploaded_by,
            created_at=e.created_at.isoformat() if e.created_at else None
        ) for e in (case.evidence or [])
    ]

    # Format history/timeline (sorted newest to oldest)
    history_items = [
        CaseTimelineItem(
            id=h.id,
            case_id=h.case_id,
            action=h.action,
            from_status=h.from_status,
            to_status=h.to_status,
            note=h.note,
            actor_id=h.actor_id,
            actor_name=h.actor_name,
            details=h.details,
            created_at=h.created_at.isoformat() if h.created_at else None
        ) for h in sorted(case.history or [], key=lambda x: x.created_at or datetime.min, reverse=True)
    ]

    return CaseDetailResponse(
        id=case.id,
        case_id=case.id,
        title=case.title,
        description=case.description,
        user_id=case.user_id,
        severity=case.severity,
        status=case.status,
        assigned_analyst=case.assigned_analyst,
        assigned_to=case.assigned_to,
        risk_score=case.risk_score or 0.0,
        related_transaction_ids=case.related_transaction_ids or [],
        related_alert_ids=case.related_alert_ids or [],
        resolution=case.resolution,
        resolution_notes=case.resolution_notes,
        resolved_by=case.resolved_by,
        resolved_at=case.resolved_at.isoformat() if case.resolved_at else None,
        closed_at=case.closed_at.isoformat() if case.closed_at else None,
        created_at=case.created_at.isoformat() if case.created_at else None,
        updated_at=case.updated_at.isoformat() if case.updated_at else None,
        alerts=alert_items,
        transactions=txn_items,
        notes=note_items,
        evidence=evidence_items,
        history=history_items
    )


@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: str,
    update_data: CaseUpdate,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Update core case properties (title, description, severity, analyst assignment).
    """
    stmt = select(Case).options(
        selectinload(Case.notes),
        selectinload(Case.evidence),
        selectinload(Case.alerts),
        selectinload(Case.transactions)
    ).where(Case.id == case_id)
    res = await db.execute(stmt)
    case = res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    actor_email = user_payload.get("email", "analyst")
    actor_id = user_payload.get("sub") or user_payload.get("id")

    changes = []
    if update_data.title is not None and update_data.title != case.title:
        changes.append(f"Title: '{case.title}' -> '{update_data.title}'")
        case.title = update_data.title
    if update_data.description is not None and update_data.description != case.description:
        case.description = update_data.description
        changes.append("Description updated")
    if update_data.severity is not None and update_data.severity.upper() != case.severity:
        changes.append(f"Severity: {case.severity} -> {update_data.severity.upper()}")
        case.severity = update_data.severity.upper()
    if update_data.assigned_analyst is not None and update_data.assigned_analyst != case.assigned_analyst:
        changes.append(f"Assigned Analyst: {case.assigned_analyst} -> {update_data.assigned_analyst}")
        case.assigned_analyst = update_data.assigned_analyst

    case.updated_at = datetime.now(timezone.utc)

    if changes:
        history = CaseHistory(
            case_id=case_id,
            action="CASE_UPDATED",
            note="; ".join(changes),
            actor_id=actor_id,
            actor_name=actor_email,
            created_at=datetime.now(timezone.utc)
        )
        db.add(history)

        await AuditService.log_action(
            db,
            actor_email=actor_email,
            actor_role=user_payload.get("role", "analyst"),
            action="CASE_UPDATE",
            target_entity="Case",
            target_id=case_id,
            details="; ".join(changes)
        )

    await db.commit()
    await db.refresh(case)

    await ws_manager.broadcast_event(
        "case.updated",
        case_id,
        {"id": case_id, "title": case.title, "severity": case.severity, "status": case.status, "assigned_analyst": case.assigned_analyst}
    )

    return _format_case_response(case)


@router.post("/{case_id}/status", response_model=CaseResponse)
async def update_case_status(
    case_id: str,
    status_data: CaseStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Transition case status with state-machine validation, optimistic concurrency protection, and history tracking.
    """
    stmt = select(Case).options(
        selectinload(Case.notes),
        selectinload(Case.evidence),
        selectinload(Case.alerts),
        selectinload(Case.transactions)
    ).where(Case.id == case_id)
    res = await db.execute(stmt)
    case = res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    target_status = status_data.status.upper()
    current_status = case.status.upper()

    # Optimistic Concurrency Control Check
    if status_data.expected_status and status_data.expected_status.upper() != current_status:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Case status was modified concurrently. Expected '{status_data.expected_status}', but current status is '{current_status}'."
        )

    if target_status == current_status:
        return _format_case_response(case)

    # Validate transition
    allowed = ALLOWED_STATUS_TRANSITIONS.get(current_status, [])
    if target_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from '{current_status}' to '{target_status}'. Allowed transitions: {allowed}"
        )

    actor_email = user_payload.get("email", "analyst")
    actor_id = user_payload.get("sub") or user_payload.get("id")

    case.status = target_status
    case.updated_at = datetime.now(timezone.utc)
    if target_status == "CLOSED":
        case.closed_at = datetime.now(timezone.utc)

    history = CaseHistory(
        case_id=case_id,
        action="STATUS_CHANGED",
        from_status=current_status,
        to_status=target_status,
        note=status_data.reason_note or f"Status transitioned from {current_status} to {target_status}",
        actor_id=actor_id,
        actor_name=actor_email,
        created_at=datetime.now(timezone.utc)
    )
    db.add(history)

    await AuditService.log_action(
        db,
        actor_email=actor_email,
        actor_role=user_payload.get("role", "analyst"),
        action="CASE_STATUS_CHANGE",
        target_entity="Case",
        target_id=case_id,
        details=f"Status changed from {current_status} to {target_status}. Note: {status_data.reason_note or 'N/A'}"
    )

    await db.commit()
    await db.refresh(case)

    await ws_manager.broadcast_event(
        "case.updated",
        case_id,
        {"id": case_id, "status": target_status, "previous_status": current_status}
    )

    try:
        await NotificationPolicyService.handle_case_event(
            session=db,
            case=case,
            event_type="case.escalated" if target_status in ("ESCALATED", "INVESTIGATING") and case.severity == "CRITICAL" else "case.updated",
            note=status_data.reason_note
        )
    except Exception:
        pass

    return _format_case_response(case)


@router.post("/{case_id}/assign", response_model=CaseResponse)
async def assign_case(
    case_id: str,
    assign_data: CaseAssignRequest,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Assign or reassign an investigation case to an analyst.
    """
    stmt = select(Case).options(
        selectinload(Case.notes),
        selectinload(Case.evidence),
        selectinload(Case.alerts),
        selectinload(Case.transactions)
    ).where(Case.id == case_id)
    res = await db.execute(stmt)
    case = res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    actor_email = user_payload.get("email", "analyst")
    actor_id = user_payload.get("sub") or user_payload.get("id")
    prev_analyst = case.assigned_analyst

    case.assigned_analyst = assign_data.assigned_analyst
    case.updated_at = datetime.now(timezone.utc)

    action_type = "REASSIGNED" if prev_analyst else "ASSIGNED"
    history = CaseHistory(
        case_id=case_id,
        action=action_type,
        note=assign_data.note or f"Assigned to {assign_data.assigned_analyst}",
        actor_id=actor_id,
        actor_name=actor_email,
        details={"previous_analyst": prev_analyst, "new_analyst": assign_data.assigned_analyst},
        created_at=datetime.now(timezone.utc)
    )
    db.add(history)

    await AuditService.log_action(
        db,
        actor_email=actor_email,
        actor_role=user_payload.get("role", "analyst"),
        action=f"CASE_{action_type}",
        target_entity="Case",
        target_id=case_id,
        details=f"Assigned to {assign_data.assigned_analyst} (was {prev_analyst or 'Unassigned'})"
    )

    await db.commit()
    await db.refresh(case)

    await ws_manager.broadcast_event(
        "case.updated",
        case_id,
        {"id": case_id, "assigned_analyst": case.assigned_analyst}
    )

    try:
        await NotificationPolicyService.handle_case_event(
            session=db,
            case=case,
            event_type="case.assigned"
        )
    except Exception:
        pass

    return _format_case_response(case)


@router.post("/{case_id}/alerts", response_model=CaseResponse)
async def link_alert_to_case(
    case_id: str,
    payload: CaseLinkAlertRequest,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Associate an existing alert with this investigation case.
    """
    stmt = select(Case).options(
        selectinload(Case.notes),
        selectinload(Case.evidence),
        selectinload(Case.alerts),
        selectinload(Case.transactions)
    ).where(Case.id == case_id)
    res = await db.execute(stmt)
    case = res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Verify alert exists
    a_stmt = select(Alert).where(Alert.id == payload.alert_id)
    a_res = await db.execute(a_stmt)
    alert = a_res.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert '{payload.alert_id}' not found")

    # Check if already linked
    existing_alerts = [a.id for a in case.alerts or []]
    if payload.alert_id in existing_alerts or (case.related_alert_ids and payload.alert_id in case.related_alert_ids):
        return _format_case_response(case)

    actor_email = user_payload.get("email", "analyst")
    actor_id = user_payload.get("sub") or user_payload.get("id")

    # Insert into association table
    await db.execute(
        insert(case_alerts).values(
            case_id=case_id,
            alert_id=alert.id,
            created_at=datetime.now(timezone.utc)
        )
    )

    alert.case_id = case_id
    alert.status = "INVESTIGATING"

    # Update cache
    current_cache = list(case.related_alert_ids or [])
    if alert.id not in current_cache:
        current_cache.append(alert.id)
        case.related_alert_ids = current_cache

    case.updated_at = datetime.now(timezone.utc)

    history = CaseHistory(
        case_id=case_id,
        action="ALERT_LINKED",
        note=f"Linked alert {alert.id} ({alert.title or alert.alert_reason or 'Alert'})",
        actor_id=actor_id,
        actor_name=actor_email,
        details={"alert_id": alert.id, "severity": alert.severity},
        created_at=datetime.now(timezone.utc)
    )
    db.add(history)

    await AuditService.log_action(
        db,
        actor_email=actor_email,
        actor_role=user_payload.get("role", "analyst"),
        action="CASE_LINK_ALERT",
        target_entity="Case",
        target_id=case_id,
        details=f"Linked alert {alert.id} to case {case_id}"
    )

    await db.commit()
    await db.refresh(case)

    await ws_manager.broadcast_event(
        "case.updated",
        case_id,
        {"id": case_id, "action": "alert_linked", "alert_id": alert.id}
    )

    return _format_case_response(case)


@router.delete("/{case_id}/alerts/{alert_id}", response_model=CaseResponse)
async def unlink_alert_from_case(
    case_id: str,
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Remove an alert association from this case.
    """
    stmt = select(Case).options(
        selectinload(Case.notes),
        selectinload(Case.evidence),
        selectinload(Case.alerts),
        selectinload(Case.transactions)
    ).where(Case.id == case_id)
    res = await db.execute(stmt)
    case = res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    actor_email = user_payload.get("email", "analyst")
    actor_id = user_payload.get("sub") or user_payload.get("id")

    # Delete from association table
    await db.execute(
        delete(case_alerts).where(
            and_(case_alerts.c.case_id == case_id, case_alerts.c.alert_id == alert_id)
        )
    )

    # Update cache
    current_cache = list(case.related_alert_ids or [])
    if alert_id in current_cache:
        current_cache.remove(alert_id)
        case.related_alert_ids = current_cache

    case.updated_at = datetime.now(timezone.utc)

    history = CaseHistory(
        case_id=case_id,
        action="ALERT_UNLINKED",
        note=f"Unlinked alert {alert_id}",
        actor_id=actor_id,
        actor_name=actor_email,
        created_at=datetime.now(timezone.utc)
    )
    db.add(history)

    await AuditService.log_action(
        db,
        actor_email=actor_email,
        actor_role=user_payload.get("role", "analyst"),
        action="CASE_UNLINK_ALERT",
        target_entity="Case",
        target_id=case_id,
        details=f"Unlinked alert {alert_id} from case {case_id}"
    )

    await db.commit()
    await db.refresh(case)

    return _format_case_response(case)


@router.post("/{case_id}/transactions", response_model=CaseResponse)
async def link_transaction_to_case(
    case_id: str,
    payload: CaseLinkTransactionRequest,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Associate an existing transaction with this investigation case.
    """
    stmt = select(Case).options(
        selectinload(Case.notes),
        selectinload(Case.evidence),
        selectinload(Case.alerts),
        selectinload(Case.transactions)
    ).where(Case.id == case_id)
    res = await db.execute(stmt)
    case = res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Verify transaction exists
    t_stmt = select(Transaction).where(Transaction.id == payload.transaction_id)
    t_res = await db.execute(t_stmt)
    txn = t_res.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=404, detail=f"Transaction '{payload.transaction_id}' not found")

    existing_txns = [t.id for t in case.transactions or []]
    if payload.transaction_id in existing_txns or (case.related_transaction_ids and payload.transaction_id in case.related_transaction_ids):
        return _format_case_response(case)

    actor_email = user_payload.get("email", "analyst")
    actor_id = user_payload.get("sub") or user_payload.get("id")

    # Insert into association table
    await db.execute(
        insert(case_transactions).values(
            case_id=case_id,
            transaction_id=txn.id,
            created_at=datetime.now(timezone.utc)
        )
    )

    current_cache = list(case.related_transaction_ids or [])
    if txn.id not in current_cache:
        current_cache.append(txn.id)
        case.related_transaction_ids = current_cache

    case.updated_at = datetime.now(timezone.utc)

    history = CaseHistory(
        case_id=case_id,
        action="TRANSACTION_LINKED",
        note=f"Linked transaction {txn.id} ({txn.amount} {txn.currency})",
        actor_id=actor_id,
        actor_name=actor_email,
        details={"transaction_id": txn.id, "amount": txn.amount, "currency": txn.currency},
        created_at=datetime.now(timezone.utc)
    )
    db.add(history)

    await AuditService.log_action(
        db,
        actor_email=actor_email,
        actor_role=user_payload.get("role", "analyst"),
        action="CASE_LINK_TRANSACTION",
        target_entity="Case",
        target_id=case_id,
        details=f"Linked transaction {txn.id} to case {case_id}"
    )

    await db.commit()
    await db.refresh(case)

    await ws_manager.broadcast_event(
        "case.updated",
        case_id,
        {"id": case_id, "action": "transaction_linked", "transaction_id": txn.id}
    )

    return _format_case_response(case)


@router.delete("/{case_id}/transactions/{transaction_id}", response_model=CaseResponse)
async def unlink_transaction_from_case(
    case_id: str,
    transaction_id: str,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Remove a transaction association from this case.
    """
    stmt = select(Case).options(
        selectinload(Case.notes),
        selectinload(Case.evidence),
        selectinload(Case.alerts),
        selectinload(Case.transactions)
    ).where(Case.id == case_id)
    res = await db.execute(stmt)
    case = res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    actor_email = user_payload.get("email", "analyst")
    actor_id = user_payload.get("sub") or user_payload.get("id")

    await db.execute(
        delete(case_transactions).where(
            and_(case_transactions.c.case_id == case_id, case_transactions.c.transaction_id == transaction_id)
        )
    )

    current_cache = list(case.related_transaction_ids or [])
    if transaction_id in current_cache:
        current_cache.remove(transaction_id)
        case.related_transaction_ids = current_cache

    case.updated_at = datetime.now(timezone.utc)

    history = CaseHistory(
        case_id=case_id,
        action="TRANSACTION_UNLINKED",
        note=f"Unlinked transaction {transaction_id}",
        actor_id=actor_id,
        actor_name=actor_email,
        created_at=datetime.now(timezone.utc)
    )
    db.add(history)

    await AuditService.log_action(
        db,
        actor_email=actor_email,
        actor_role=user_payload.get("role", "analyst"),
        action="CASE_UNLINK_TRANSACTION",
        target_entity="Case",
        target_id=case_id,
        details=f"Unlinked transaction {transaction_id} from case {case_id}"
    )

    await db.commit()
    await db.refresh(case)

    return _format_case_response(case)


@router.get("/{case_id}/notes", response_model=List[CaseNoteResponse])
async def list_case_notes(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    List all investigation notes for a case in chronological order.
    """
    stmt = select(CaseNote).where(CaseNote.case_id == case_id).order_by(asc(CaseNote.created_at))
    res = await db.execute(stmt)
    notes = res.scalars().all()
    return [
        CaseNoteResponse(
            id=n.id,
            case_id=n.case_id,
            author=n.author,
            author_id=n.author_id,
            content=n.content,
            created_at=n.created_at.isoformat() if n.created_at else None,
            updated_at=n.updated_at.isoformat() if n.updated_at else None
        ) for n in notes
    ]


@router.post("/{case_id}/notes", response_model=CaseNoteResponse)
async def add_case_note(
    case_id: str,
    note_data: CaseNoteCreate,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Add a new investigation note to a case and record in timeline.
    """
    stmt = select(Case).where(Case.id == case_id)
    res = await db.execute(stmt)
    case = res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    actor_email = user_payload.get("email", "analyst")
    actor_id = user_payload.get("sub") or user_payload.get("id")

    note = CaseNote(
        case_id=case_id,
        author_id=actor_id,
        author=actor_email,
        content=note_data.content.strip(),
        created_at=datetime.now(timezone.utc)
    )
    db.add(note)

    case.updated_at = datetime.now(timezone.utc)

    history = CaseHistory(
        case_id=case_id,
        action="NOTE_ADDED",
        note=f"Note added by {actor_email}",
        actor_id=actor_id,
        actor_name=actor_email,
        created_at=datetime.now(timezone.utc)
    )
    db.add(history)

    await db.commit()
    await db.refresh(note)

    await ws_manager.broadcast_event(
        "case.updated",
        case_id,
        {"id": case_id, "action": "note_added", "note_id": note.id}
    )

    return CaseNoteResponse(
        id=note.id,
        case_id=note.case_id,
        author=note.author,
        author_id=note.author_id,
        content=note.content,
        created_at=note.created_at.isoformat() if note.created_at else None,
        updated_at=note.updated_at.isoformat() if note.updated_at else None
    )


@router.get("/{case_id}/evidence", response_model=List[CaseEvidenceResponse])
async def list_case_evidence(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    List all evidence records for a case.
    """
    stmt = select(CaseEvidence).where(CaseEvidence.case_id == case_id).order_by(desc(CaseEvidence.created_at))
    res = await db.execute(stmt)
    evidence = res.scalars().all()
    return [
        CaseEvidenceResponse(
            id=e.id,
            case_id=e.case_id,
            title=e.title,
            description=e.description,
            evidence_type=e.evidence_type,
            file_reference=e.file_reference,
            payload=e.payload or e.metadata_json,
            metadata_json=e.metadata_json or e.payload,
            uploaded_by=e.uploaded_by,
            created_at=e.created_at.isoformat() if e.created_at else None
        ) for e in evidence
    ]


@router.post("/{case_id}/evidence", response_model=CaseEvidenceResponse)
async def add_case_evidence(
    case_id: str,
    evidence_data: CaseEvidenceCreate,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Add a new evidence record or structured artifact to a case.
    """
    stmt = select(Case).where(Case.id == case_id)
    res = await db.execute(stmt)
    case = res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    actor_email = user_payload.get("email", "analyst")
    actor_id = user_payload.get("sub") or user_payload.get("id")

    payload_data = evidence_data.payload or evidence_data.metadata_json or {}

    evidence = CaseEvidence(
        case_id=case_id,
        title=evidence_data.title.strip(),
        description=evidence_data.description,
        evidence_type=evidence_data.evidence_type,
        file_reference=evidence_data.file_reference,
        payload=payload_data,
        metadata_json=payload_data,
        uploaded_by=actor_email,
        created_at=datetime.now(timezone.utc)
    )
    db.add(evidence)

    case.updated_at = datetime.now(timezone.utc)

    history = CaseHistory(
        case_id=case_id,
        action="EVIDENCE_ADDED",
        note=f"Attached evidence '{evidence_data.title}' ({evidence_data.evidence_type})",
        actor_id=actor_id,
        actor_name=actor_email,
        details={"evidence_type": evidence_data.evidence_type, "title": evidence_data.title},
        created_at=datetime.now(timezone.utc)
    )
    db.add(history)

    await db.commit()
    await db.refresh(evidence)

    await ws_manager.broadcast_event(
        "case.updated",
        case_id,
        {"id": case_id, "action": "evidence_added", "evidence_id": evidence.id}
    )

    return CaseEvidenceResponse(
        id=evidence.id,
        case_id=evidence.case_id,
        title=evidence.title,
        description=evidence.description,
        evidence_type=evidence.evidence_type,
        file_reference=evidence.file_reference,
        payload=evidence.payload or evidence.metadata_json,
        metadata_json=evidence.metadata_json or evidence.payload,
        uploaded_by=evidence.uploaded_by,
        created_at=evidence.created_at.isoformat() if evidence.created_at else None
    )


@router.get("/{case_id}/timeline", response_model=List[CaseTimelineItem])
async def get_case_timeline(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Get full audit timeline and lifecycle history of a case.
    """
    stmt = select(CaseHistory).where(CaseHistory.case_id == case_id).order_by(desc(CaseHistory.created_at))
    res = await db.execute(stmt)
    history = res.scalars().all()
    return [
        CaseTimelineItem(
            id=h.id,
            case_id=h.case_id,
            action=h.action,
            from_status=h.from_status,
            to_status=h.to_status,
            note=h.note,
            actor_id=h.actor_id,
            actor_name=h.actor_name,
            details=h.details,
            created_at=h.created_at.isoformat() if h.created_at else None
        ) for h in history
    ]


@router.post("/{case_id}/resolve", response_model=CaseResponse)
async def resolve_case(
    case_id: str,
    resolve_data: CaseResolveRequest,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Formally resolve an investigation case, sync associated alerts, log audit trail, and update risk profile if confirmed fraud.
    """
    stmt = select(Case).options(
        selectinload(Case.notes),
        selectinload(Case.evidence),
        selectinload(Case.alerts),
        selectinload(Case.transactions)
    ).where(Case.id == case_id)
    res = await db.execute(stmt)
    case = res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    actor_email = user_payload.get("email", "analyst")
    actor_id = user_payload.get("sub") or user_payload.get("id")

    prev_status = case.status
    case.status = "RESOLVED"
    case.resolution = resolve_data.resolution
    case.resolution_notes = resolve_data.resolution_notes
    case.resolved_by = actor_email
    case.resolved_at = datetime.now(timezone.utc)
    case.updated_at = datetime.now(timezone.utc)

    # Sync associated alerts to RESOLVED
    for alert in (case.alerts or []):
        alert.status = "RESOLVED"
        alert.resolved_at = datetime.now(timezone.utc)

    for alert_id in (case.related_alert_ids or []):
        a_stmt = select(Alert).where(Alert.id == alert_id)
        a_res = await db.execute(a_stmt)
        alt = a_res.scalar_one_or_none()
        if alt:
            alt.status = "RESOLVED"
            alt.resolved_at = datetime.now(timezone.utc)

    # If Confirmed Fraud, update user risk profile
    if resolve_data.resolution == "Confirmed Fraud" and case.user_id:
        u_res = await db.execute(select(UserRiskProfile).where(UserRiskProfile.user_id == case.user_id))
        u_prof = u_res.scalar_one_or_none()
        if u_prof:
            u_prof.fraud_incident_count = (u_prof.fraud_incident_count or 0) + 1
            u_prof.active_risk_level = "CRITICAL"

    history = CaseHistory(
        case_id=case_id,
        action="RESOLVED",
        from_status=prev_status,
        to_status="RESOLVED",
        note=f"Resolved as {resolve_data.resolution}. Notes: {resolve_data.resolution_notes}",
        actor_id=actor_id,
        actor_name=actor_email,
        details={"resolution": resolve_data.resolution, "notes": resolve_data.resolution_notes},
        created_at=datetime.now(timezone.utc)
    )
    db.add(history)

    await AuditService.log_action(
        db,
        actor_email=actor_email,
        actor_role=user_payload.get("role", "analyst"),
        action="CASE_RESOLVE",
        target_entity="Case",
        target_id=case.id,
        details=f"Case resolved as {resolve_data.resolution}. Notes: {resolve_data.resolution_notes}"
    )

    await db.commit()
    await db.refresh(case)

    await ws_manager.broadcast_event(
        "case.updated",
        case.id,
        {"id": case.id, "status": case.status, "resolution": case.resolution}
    )

    try:
        await NotificationPolicyService.handle_case_event(
            session=db,
            case=case,
            event_type="case.resolved",
            note=f"Resolved as {resolve_data.resolution}"
        )
    except Exception:
        pass

    return _format_case_response(case)
