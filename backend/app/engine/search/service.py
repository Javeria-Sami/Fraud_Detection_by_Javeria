"""
Centralized Historical & Cross-Entity Search Engine Service.
Section 17 — Historical Search.
"""
import time
import math
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc, asc, distinct, case

from backend.app.models.transaction import Transaction
from backend.app.models.alert import Alert
from backend.app.models.case import Case
from backend.app.models.user import User
from backend.app.schemas.search import (
    SearchQueryRequest,
    SearchResponse,
    SearchCountsByCategory,
    EntityGroupResult,
    TransactionSearchResult,
    AlertSearchResult,
    CaseSearchResult,
    UserSearchResult,
    DeviceSearchResult,
    MerchantSearchResult,
    AutocompleteSuggestion,
)


class HistoricalSearchEngine:
    """
    High-performance, parameterized multi-entity historical investigation search engine.
    """

    @classmethod
    async def execute_search(
        cls,
        db: AsyncSession,
        req: SearchQueryRequest,
        user_role: str = "analyst"
    ) -> SearchResponse:
        start_time = time.perf_counter()

        entity_types = set([e.lower().strip() for e in (req.entity_types or [])])
        if not entity_types:
            entity_types = {"transactions", "alerts", "cases", "users", "devices", "merchants"}

        is_analyst_or_admin = user_role.lower() in ["admin", "analyst"]

        # Parse date bounds safely
        dt_from = None
        dt_to = None
        if req.date_from:
            try:
                dt_from = datetime.fromisoformat(req.date_from.replace(" ", "+").replace("Z", "+00:00"))
            except Exception:
                pass
        if req.date_to:
            try:
                dt_to = datetime.fromisoformat(req.date_to.replace(" ", "+").replace("Z", "+00:00"))
            except Exception:
                pass

        # Validate date range
        if dt_from and dt_to and dt_from > dt_to:
            dt_from, dt_to = dt_to, dt_from

        # 1. Search Transactions
        txn_items, txn_total = ([], 0)
        if "transactions" in entity_types:
            txn_items, txn_total = await cls._search_transactions(db, req, dt_from, dt_to)

        # 2. Search Alerts
        alert_items, alert_total = ([], 0)
        if "alerts" in entity_types:
            alert_items, alert_total = await cls._search_alerts(db, req, dt_from, dt_to)

        # 3. Search Cases (RBAC Protected: Analyst & Admin Only)
        case_items, case_total = ([], 0)
        if "cases" in entity_types and is_analyst_or_admin:
            case_items, case_total = await cls._search_cases(db, req, dt_from, dt_to)

        # 4. Search Users
        user_items, user_total = ([], 0)
        if "users" in entity_types:
            user_items, user_total = await cls._search_users(db, req)

        # 5. Search Devices
        dev_items, dev_total = ([], 0)
        if "devices" in entity_types:
            dev_items, dev_total = await cls._search_devices(db, req)

        # 6. Search Merchants
        merch_items, merch_total = ([], 0)
        if "merchants" in entity_types:
            merch_items, merch_total = await cls._search_merchants(db, req)

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        def make_group(items: List[Any], total: int) -> EntityGroupResult:
            page_sz = max(1, req.page_size)
            tot_pages = math.ceil(total / page_sz) if total > 0 else 1
            return EntityGroupResult(
                items=items,
                total=total,
                page=req.page,
                page_size=req.page_size,
                total_pages=tot_pages
            )

        counts = SearchCountsByCategory(
            transactions=txn_total,
            alerts=alert_total,
            cases=case_total,
            users=user_total,
            devices=dev_total,
            merchants=merch_total,
            total=txn_total + alert_total + case_total + user_total + dev_total + merch_total
        )

        return SearchResponse(
            query=req.q,
            execution_time_ms=elapsed_ms,
            counts=counts,
            transactions=make_group(txn_items, txn_total),
            alerts=make_group(alert_items, alert_total),
            cases=make_group(case_items, case_total),
            users=make_group(user_items, user_total),
            devices=make_group(dev_items, dev_total),
            merchants=make_group(merch_items, merch_total),
            page=req.page,
            page_size=req.page_size
        )

    # -------------------------------------------------------------------------
    # Internal Entity Search Handlers
    # -------------------------------------------------------------------------

    @classmethod
    async def _search_transactions(
        cls,
        db: AsyncSession,
        req: SearchQueryRequest,
        dt_from: Optional[datetime],
        dt_to: Optional[datetime]
    ) -> Tuple[List[TransactionSearchResult], int]:
        query = select(Transaction)
        conditions = []

        q = req.q.strip() if req.q else None
        if q:
            # Exact or partial matching
            conditions.append(
                or_(
                    Transaction.id == q,
                    Transaction.user_id == q,
                    Transaction.device_id == q,
                    Transaction.merchant_name == q,
                    Transaction.id.ilike(f"%{q}%"),
                    Transaction.user_id.ilike(f"%{q}%"),
                    Transaction.merchant_name.ilike(f"%{q}%"),
                    Transaction.device_id.ilike(f"%{q}%"),
                    Transaction.city.ilike(f"%{q}%"),
                    Transaction.country.ilike(f"%{q}%")
                )
            )

        if dt_from:
            conditions.append(Transaction.timestamp >= dt_from)
        if dt_to:
            conditions.append(Transaction.timestamp <= dt_to)
        if req.risk_min is not None:
            conditions.append(Transaction.risk_score >= req.risk_min)
        if req.risk_max is not None:
            conditions.append(Transaction.risk_score <= req.risk_max)
        if req.risk_level and req.risk_level.upper() != "ALL":
            conditions.append(Transaction.risk_level == req.risk_level.upper())
        if req.status and req.status.upper() != "ALL":
            conditions.append(Transaction.status == req.status.upper())
        if req.min_amount is not None:
            conditions.append(Transaction.amount >= req.min_amount)
        if req.max_amount is not None:
            conditions.append(Transaction.amount <= req.max_amount)
        if req.payment_method and req.payment_method.upper() != "ALL":
            conditions.append(Transaction.payment_method == req.payment_method.lower())
        if req.currency and req.currency.upper() != "ALL":
            conditions.append(Transaction.currency == req.currency.upper())
        if req.country:
            conditions.append(Transaction.country.ilike(f"%{req.country.strip()}%"))
        if req.city:
            conditions.append(Transaction.city.ilike(f"%{req.city.strip()}%"))

        if conditions:
            query = query.where(and_(*conditions))

        # Count total
        count_q = select(func.count()).select_from(query.subquery())
        total_res = await db.execute(count_q)
        total = total_res.scalar() or 0

        # Sorting
        sort_by = (req.sort_by or "relevance").lower()
        if sort_by == "newest":
            query = query.order_by(desc(Transaction.timestamp))
        elif sort_by == "oldest":
            query = query.order_by(asc(Transaction.timestamp))
        elif sort_by == "risk_desc":
            query = query.order_by(desc(Transaction.risk_score))
        elif sort_by == "amount_desc":
            query = query.order_by(desc(Transaction.amount))
        else:  # relevance
            if q:
                # Prioritize exact ID matches
                exact_id_case = (Transaction.id == q)
                query = query.order_by(desc(exact_id_case), desc(Transaction.timestamp))
            else:
                query = query.order_by(desc(Transaction.timestamp))

        offset = (req.page - 1) * req.page_size
        query = query.offset(offset).limit(req.page_size)

        res = await db.execute(query)
        rows = res.scalars().all()

        results = []
        for r in rows:
            relevance = 1.0
            if q:
                if r.id == q or r.user_id == q or r.device_id == q or r.merchant_name == q:
                    relevance = 3.0
                elif q.lower() in (r.merchant_name or "").lower():
                    relevance = 2.0

            results.append(
                TransactionSearchResult(
                    id=r.id,
                    timestamp=r.timestamp.isoformat() if r.timestamp else "",
                    user_id=r.user_id or "",
                    amount=float(r.amount or 0.0),
                    currency=r.currency or "USD",
                    merchant_name=r.merchant_name or "Unknown Merchant",
                    merchant_category=r.merchant_category,
                    payment_method=r.payment_method or "CREDIT_CARD",
                    device_id=r.device_id,
                    city=r.city,
                    country=r.country,
                    status=r.status or "PENDING",
                    risk_score=float(r.risk_score or 0.0),
                    risk_level=r.risk_level or "LOW",
                    is_flagged=bool((r.risk_score or 0) >= 70 or (r.rules_triggered and len(r.rules_triggered) > 0)),
                    relevance_score=relevance
                )
            )

        return results, total

    @classmethod
    async def _search_alerts(
        cls,
        db: AsyncSession,
        req: SearchQueryRequest,
        dt_from: Optional[datetime],
        dt_to: Optional[datetime]
    ) -> Tuple[List[AlertSearchResult], int]:
        query = select(Alert)
        conditions = []

        q = req.q.strip() if req.q else None
        if q:
            conditions.append(
                or_(
                    Alert.id == q,
                    Alert.transaction_id == q,
                    Alert.user_id == q,
                    Alert.id.ilike(f"%{q}%"),
                    Alert.title.ilike(f"%{q}%"),
                    Alert.alert_reason.ilike(f"%{q}%"),
                    Alert.transaction_id.ilike(f"%{q}%"),
                    Alert.user_id.ilike(f"%{q}%")
                )
            )

        if dt_from:
            conditions.append(Alert.created_at >= dt_from)
        if dt_to:
            conditions.append(Alert.created_at <= dt_to)
        if req.risk_min is not None:
            conditions.append(Alert.risk_score >= req.risk_min)
        if req.risk_max is not None:
            conditions.append(Alert.risk_score <= req.risk_max)
        if req.severity and req.severity.upper() != "ALL":
            conditions.append(Alert.severity == req.severity.upper())
        if req.status and req.status.upper() != "ALL":
            conditions.append(Alert.status == req.status.upper())

        if conditions:
            query = query.where(and_(*conditions))

        count_q = select(func.count()).select_from(query.subquery())
        total_res = await db.execute(count_q)
        total = total_res.scalar() or 0

        sort_by = (req.sort_by or "relevance").lower()
        if sort_by == "newest":
            query = query.order_by(desc(Alert.created_at))
        elif sort_by == "oldest":
            query = query.order_by(asc(Alert.created_at))
        elif sort_by == "risk_desc":
            query = query.order_by(desc(Alert.risk_score))
        else:
            if q:
                exact_case = (Alert.id == q)
                query = query.order_by(desc(exact_case), desc(Alert.created_at))
            else:
                query = query.order_by(desc(Alert.created_at))

        offset = (req.page - 1) * req.page_size
        query = query.offset(offset).limit(req.page_size)

        res = await db.execute(query)
        rows = res.scalars().all()

        results = []
        for r in rows:
            relevance = 1.0
            if q and (r.id == q or r.transaction_id == q or r.user_id == q):
                relevance = 3.0
            elif q and q.lower() in (r.title or "").lower():
                relevance = 2.0

            results.append(
                AlertSearchResult(
                    id=r.id,
                    title=r.title or "Fraud Alert",
                    severity=r.severity or "MEDIUM",
                    status=r.status or "NEW",
                    risk_score=float(r.risk_score or 0.0),
                    transaction_id=r.transaction_id,
                    user_id=r.user_id,
                    assigned_to=r.assigned_to,
                    alert_reason=r.alert_reason,
                    created_at=r.created_at.isoformat() if r.created_at else "",
                    resolved_at=r.resolved_at.isoformat() if r.resolved_at else None,
                    relevance_score=relevance
                )
            )

        return results, total

    @classmethod
    async def _search_cases(
        cls,
        db: AsyncSession,
        req: SearchQueryRequest,
        dt_from: Optional[datetime],
        dt_to: Optional[datetime]
    ) -> Tuple[List[CaseSearchResult], int]:
        query = select(Case)
        conditions = []

        q = req.q.strip() if req.q else None
        if q:
            conditions.append(
                or_(
                    Case.id == q,
                    Case.user_id == q,
                    Case.id.ilike(f"%{q}%"),
                    Case.title.ilike(f"%{q}%"),
                    Case.user_id.ilike(f"%{q}%"),
                    Case.description.ilike(f"%{q}%")
                )
            )

        if dt_from:
            conditions.append(Case.created_at >= dt_from)
        if dt_to:
            conditions.append(Case.created_at <= dt_to)
        if req.risk_min is not None:
            conditions.append(Case.risk_score >= req.risk_min)
        if req.risk_max is not None:
            conditions.append(Case.risk_score <= req.risk_max)
        if req.severity and req.severity.upper() != "ALL":
            conditions.append(Case.severity == req.severity.upper())
        if req.status and req.status.upper() != "ALL":
            conditions.append(Case.status == req.status.upper())

        if conditions:
            query = query.where(and_(*conditions))

        count_q = select(func.count()).select_from(query.subquery())
        total_res = await db.execute(count_q)
        total = total_res.scalar() or 0

        sort_by = (req.sort_by or "relevance").lower()
        if sort_by == "newest":
            query = query.order_by(desc(Case.created_at))
        elif sort_by == "oldest":
            query = query.order_by(asc(Case.created_at))
        elif sort_by == "risk_desc":
            query = query.order_by(desc(Case.risk_score))
        else:
            if q:
                exact_case = (Case.id == q)
                query = query.order_by(desc(exact_case), desc(Case.created_at))
            else:
                query = query.order_by(desc(Case.created_at))

        offset = (req.page - 1) * req.page_size
        query = query.offset(offset).limit(req.page_size)

        res = await db.execute(query)
        rows = res.scalars().all()

        results = []
        for r in rows:
            relevance = 1.0
            if q and (r.id == q or r.user_id == q):
                relevance = 3.0
            elif q and q.lower() in (r.title or "").lower():
                relevance = 2.0

            results.append(
                CaseSearchResult(
                    id=r.id,
                    title=r.title or "Investigation Case",
                    description=r.description,
                    user_id=r.user_id,
                    severity=r.severity or "MEDIUM",
                    status=r.status or "OPEN",
                    assigned_to=r.assigned_to or getattr(r, "assigned_analyst", None),
                    risk_score=float(r.risk_score or 0.0),
                    alerts_count=len(r.related_alert_ids or []) if getattr(r, "related_alert_ids", None) else 0,
                    transactions_count=len(r.related_transaction_ids or []) if getattr(r, "related_transaction_ids", None) else 0,
                    created_at=r.created_at.isoformat() if r.created_at else "",
                    relevance_score=relevance
                )
            )

        return results, total

    @classmethod
    async def _search_users(
        cls,
        db: AsyncSession,
        req: SearchQueryRequest
    ) -> Tuple[List[UserSearchResult], int]:
        q = req.q.strip() if req.q else None
        query = (
            select(
                Transaction.user_id,
                func.count(Transaction.id).label("total_txns"),
                func.coalesce(func.sum(Transaction.amount), 0.0).label("total_volume"),
                func.coalesce(func.avg(Transaction.amount), 0.0).label("avg_amount"),
                func.max(Transaction.risk_score).label("max_risk"),
                func.max(Transaction.risk_level).label("risk_lvl")
            )
            .where(Transaction.user_id.isnot(None))
            .group_by(Transaction.user_id)
        )

        if q:
            query = query.having(
                or_(
                    Transaction.user_id == q,
                    Transaction.user_id.ilike(f"%{q}%")
                )
            )

        if req.risk_level and req.risk_level.upper() != "ALL":
            query = query.having(func.max(Transaction.risk_level) == req.risk_level.upper())

        count_q = select(func.count()).select_from(query.subquery())
        total_res = await db.execute(count_q)
        total = total_res.scalar() or 0

        query = query.order_by(desc("total_txns"))
        offset = (req.page - 1) * req.page_size
        query = query.offset(offset).limit(req.page_size)

        res = await db.execute(query)
        rows = res.all()

        results = []
        for r in rows:
            uid = r[0]
            txns_count = r[1]
            vol = float(r[2])
            avg_amt = float(r[3])
            risk_sc = float(r[4] or 0.0)
            risk_lvl = r[5] or "LOW"

            if txns_count >= 5:
                state = "ESTABLISHED"
            elif txns_count >= 1:
                state = "LIMITED_HISTORY"
            else:
                state = "NEW_ENTITY"

            relevance = 3.0 if (q and uid == q) else 1.0

            results.append(
                UserSearchResult(
                    user_id=uid,
                    user_name=f"Customer {uid}",
                    profile_state=state,
                    total_transactions=txns_count,
                    total_volume=vol,
                    avg_amount=avg_amt,
                    risk_level=risk_lvl,
                    last_known_risk_score=risk_sc,
                    relevance_score=relevance
                )
            )

        return results, total

    @classmethod
    async def _search_devices(
        cls,
        db: AsyncSession,
        req: SearchQueryRequest
    ) -> Tuple[List[DeviceSearchResult], int]:
        q = req.q.strip() if req.q else None
        query = (
            select(
                Transaction.device_id,
                func.count(Transaction.id).label("total_txns"),
                func.count(distinct(Transaction.user_id)).label("unique_users"),
                func.coalesce(
                    func.sum(case((Transaction.status.in_(["FAILED", "DECLINED"]), 1), else_=0)), 0
                ).label("failed_txns")
            )
            .where(Transaction.device_id.isnot(None))
            .group_by(Transaction.device_id)
        )

        if q:
            query = query.having(
                or_(
                    Transaction.device_id == q,
                    Transaction.device_id.ilike(f"%{q}%")
                )
            )

        count_q = select(func.count()).select_from(query.subquery())
        total_res = await db.execute(count_q)
        total = total_res.scalar() or 0

        query = query.order_by(desc("total_txns"))
        offset = (req.page - 1) * req.page_size
        query = query.offset(offset).limit(req.page_size)

        res = await db.execute(query)
        rows = res.all()

        results = []
        for r in rows:
            did = r[0]
            tot_txns = r[1]
            uniq_users = r[2]
            failed = r[3]
            fail_rate = round(failed / tot_txns, 4) if tot_txns > 0 else 0.0

            state = "ESTABLISHED" if tot_txns >= 5 else "LIMITED_HISTORY"
            relevance = 3.0 if (q and did == q) else 1.0

            results.append(
                DeviceSearchResult(
                    device_id=did,
                    profile_state=state,
                    total_transactions=tot_txns,
                    distinct_users_count=uniq_users,
                    failure_rate=fail_rate,
                    is_shared=(uniq_users > 1),
                    relevance_score=relevance
                )
            )

        return results, total

    @classmethod
    async def _search_merchants(
        cls,
        db: AsyncSession,
        req: SearchQueryRequest
    ) -> Tuple[List[MerchantSearchResult], int]:
        q = req.q.strip() if req.q else None
        query = (
            select(
                Transaction.merchant_name,
                func.max(Transaction.merchant_category).label("cat"),
                func.count(Transaction.id).label("total_txns"),
                func.coalesce(func.sum(Transaction.amount), 0.0).label("total_vol"),
                func.count(distinct(Transaction.user_id)).label("unique_users")
            )
            .where(Transaction.merchant_name.isnot(None))
            .group_by(Transaction.merchant_name)
        )

        if q:
            query = query.having(
                or_(
                    Transaction.merchant_name == q,
                    Transaction.merchant_name.ilike(f"%{q}%"),
                    func.max(Transaction.merchant_category).ilike(f"%{q}%")
                )
            )

        count_q = select(func.count()).select_from(query.subquery())
        total_res = await db.execute(count_q)
        total = total_res.scalar() or 0

        query = query.order_by(desc("total_txns"))
        offset = (req.page - 1) * req.page_size
        query = query.offset(offset).limit(req.page_size)

        res = await db.execute(query)
        rows = res.all()

        results = []
        for r in rows:
            mname = r[0]
            cat = r[1] or "general"
            tot_txns = r[2]
            vol = float(r[3])
            users_cnt = r[4]

            tier = "HIGH" if cat in ["crypto_exchange", "luxury_goods", "gambling", "money_transfer"] else "LOW"
            state = "ESTABLISHED" if tot_txns >= 5 else "LIMITED_HISTORY"
            relevance = 3.0 if (q and mname == q) else (2.0 if (q and q.lower() in mname.lower()) else 1.0)

            results.append(
                MerchantSearchResult(
                    merchant_name=mname,
                    category=cat,
                    base_risk_tier=tier,
                    profile_state=state,
                    total_volume=vol,
                    total_transactions=tot_txns,
                    distinct_users_count=users_cnt,
                    relevance_score=relevance
                )
            )

        return results, total

    @classmethod
    async def get_autocomplete_suggestions(
        cls,
        db: AsyncSession,
        query_str: str,
        limit: int = 8,
        user_role: str = "analyst"
    ) -> List[AutocompleteSuggestion]:
        """
        Ultra-fast lightweight suggestions for search bar dropdown.
        """
        q = query_str.strip()
        if not q:
            return []

        suggestions: List[AutocompleteSuggestion] = []
        is_analyst_or_admin = user_role.lower() in ["admin", "analyst"]

        # 1. Match Transactions by ID or User
        txns_q = select(Transaction).where(
            or_(
                Transaction.id.ilike(f"{q}%"),
                Transaction.id.ilike(f"%{q}%"),
                Transaction.user_id.ilike(f"%{q}%")
            )
        ).limit(limit)
        txns_res = await db.execute(txns_q)
        for t in txns_res.scalars().all():
            suggestions.append(
                AutocompleteSuggestion(
                    id=t.id,
                    title=t.id,
                    subtitle=f"{t.currency} {t.amount:,.2f} • {t.merchant_name} • User: {t.user_id}",
                    entity_type="transaction",
                    risk_level=t.risk_level,
                    navigation_url=f"/transactions/{t.id}"
                )
            )
            if len(suggestions) >= limit:
                return suggestions

        # 2. Match Alerts
        alerts_q = select(Alert).where(
            or_(
                Alert.id.ilike(f"{q}%"),
                Alert.id.ilike(f"%{q}%"),
                Alert.title.ilike(f"%{q}%"),
                Alert.alert_reason.ilike(f"%{q}%")
            )
        ).limit(limit)
        alerts_res = await db.execute(alerts_q)
        for a in alerts_res.scalars().all():
            suggestions.append(
                AutocompleteSuggestion(
                    id=a.id,
                    title=a.id,
                    subtitle=f"{a.title} • Risk: {a.risk_score:.0f} • {a.severity}",
                    entity_type="alert",
                    risk_level=a.severity,
                    navigation_url=f"/alerts/{a.id}"
                )
            )
            if len(suggestions) >= limit:
                return suggestions

        # 3. Match Cases (if authorized)
        if is_analyst_or_admin:
            cases_q = select(Case).where(
                or_(
                    Case.id.ilike(f"{q}%"),
                    Case.id.ilike(f"%{q}%"),
                    Case.title.ilike(f"%{q}%")
                )
            ).limit(limit)
            cases_res = await db.execute(cases_q)
            for c in cases_res.scalars().all():
                suggestions.append(
                    AutocompleteSuggestion(
                        id=c.id,
                        title=c.id,
                        subtitle=f"{c.title} • {c.status} • Risk: {c.risk_score:.0f}",
                        entity_type="case",
                        risk_level=c.severity,
                        navigation_url=f"/cases/{c.id}"
                    )
                )
                if len(suggestions) >= limit:
                    return suggestions

        return suggestions[:limit]
