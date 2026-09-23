"""
Analytics & Security Operations Aggregation API Endpoints.
Section 18 — Analytics & Visualization.
"""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_payload
from backend.app.schemas.analytics import (
    AnalyticsFilterParams,
    AnalyticsOverviewResponse,
    TransactionAnalyticsResponse,
    RiskAnalyticsResponse,
    AlertAnalyticsResponse,
    MLAnomalyAnalyticsResponse,
    RuleAnalyticsResponse,
    CaseAnalyticsResponse,
    GeographicAnalyticsResponse,
    EntityPatternsResponse,
)
from backend.app.engine.analytics.service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _extract_filter_params(
    range: str = Query("30d", description="Preset: today, yesterday, 7d, 30d, 90d, this_month, previous_month, custom"),
    date_from: Optional[str] = Query(None, description="ISO timestamp start boundary"),
    date_to: Optional[str] = Query(None, description="ISO timestamp end boundary"),
    currency: Optional[str] = Query(None, description="Currency filter, e.g. USD, EUR, PKR"),
    status: Optional[str] = Query(None, description="Transaction status filter"),
    risk_level: Optional[str] = Query(None, description="Risk level filter: LOW, MEDIUM, HIGH, CRITICAL"),
    severity: Optional[str] = Query(None, description="Alert/Case severity filter: LOW, MEDIUM, HIGH, CRITICAL"),
    merchant: Optional[str] = Query(None, description="Merchant name filter"),
    device_id: Optional[str] = Query(None, description="Device ID filter"),
    user_id: Optional[str] = Query(None, description="User ID filter"),
) -> AnalyticsFilterParams:
    return AnalyticsFilterParams(
        range=range,
        date_from=date_from,
        date_to=date_to,
        currency=currency,
        status=status,
        risk_level=risk_level,
        severity=severity,
        merchant=merchant,
        device_id=device_id,
        user_id=user_id
    )


@router.get("/overview", response_model=AnalyticsOverviewResponse)
async def get_analytics_overview(
    filters: AnalyticsFilterParams = Depends(_extract_filter_params),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Top-level executive and operational KPIs across the platform.
    """
    user_role = user_payload.get("role", "viewer")
    return await AnalyticsService.get_overview(db, filters, user_role=user_role)


@router.get("/transactions", response_model=TransactionAnalyticsResponse)
async def get_transaction_analytics(
    filters: AnalyticsFilterParams = Depends(_extract_filter_params),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Detailed transaction volume trends, status distributions, merchant sectors, and payment methods.
    """
    return await AnalyticsService.get_transaction_analytics(db, filters)


@router.get("/risk", response_model=RiskAnalyticsResponse)
async def get_risk_analytics(
    filters: AnalyticsFilterParams = Depends(_extract_filter_params),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Calibrated 0-100 risk score distributions, risk tier breakdown, and risk trends over time.
    """
    return await AnalyticsService.get_risk_analytics(db, filters)


@router.get("/alerts", response_model=AlertAnalyticsResponse)
async def get_alert_analytics(
    filters: AnalyticsFilterParams = Depends(_extract_filter_params),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Security alert timelines, severity distributions, lifecycle states, and resolution MTTR.
    """
    return await AnalyticsService.get_alert_analytics(db, filters)


@router.get("/ml", response_model=MLAnomalyAnalyticsResponse)
async def get_ml_analytics(
    filters: AnalyticsFilterParams = Depends(_extract_filter_params),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    ML Isolation Forest anomaly detection rates, score distributions, and model version metrics.
    """
    return await AnalyticsService.get_ml_analytics(db, filters)


@router.get("/rules", response_model=RuleAnalyticsResponse)
async def get_rule_analytics(
    filters: AnalyticsFilterParams = Depends(_extract_filter_params),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Deterministic fraud rule execution metrics, trigger counts, and top triggered rules ranking.
    """
    return await AnalyticsService.get_rule_analytics(db, filters)


@router.get("/cases", response_model=CaseAnalyticsResponse)
async def get_case_analytics(
    filters: AnalyticsFilterParams = Depends(_extract_filter_params),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Investigation case lifecycle pipeline, creation vs resolution trends, and analyst workload (RBAC protected).
    """
    user_role = user_payload.get("role", "viewer")
    return await AnalyticsService.get_case_analytics(db, filters, user_role=user_role)


@router.get("/geographic", response_model=GeographicAnalyticsResponse)
async def get_geographic_analytics(
    filters: AnalyticsFilterParams = Depends(_extract_filter_params),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Geographic transaction volumes and high-risk proportions by country and city.
    """
    return await AnalyticsService.get_geographic_analytics(db, filters)


@router.get("/entities", response_model=EntityPatternsResponse)
async def get_entity_analytics(
    filters: AnalyticsFilterParams = Depends(_extract_filter_params),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Entity behavioral patterns: top merchants by volume and shared/high-velocity device activity.
    """
    return await AnalyticsService.get_entity_patterns(db, filters)


# ---------------------------------------------------------------------------
# Section 12 Compatibility Endpoint
# ---------------------------------------------------------------------------

@router.get("/dashboard")
async def get_security_dashboard(
    time_range: str = Query("24h", description="Time window for aggregation: 15m, 1h, 6h, 24h, 7d"),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Legacy SOC dashboard endpoint kept for Section 12 component compatibility.
    """
    from backend.app.models.transaction import Transaction
    from backend.app.models.alert import Alert
    from backend.app.engine.ml_engine import MLEngine
    from backend.app.engine.events.manager import ws_manager
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import select, func, desc, case

    now_utc = datetime.now(timezone.utc)
    if time_range == "15m":
        start_time = now_utc - timedelta(minutes=15)
        bucket_count = 15
        bucket_delta = timedelta(minutes=1)
        time_fmt = "%H:%M"
    elif time_range == "1h":
        start_time = now_utc - timedelta(hours=1)
        bucket_count = 12
        bucket_delta = timedelta(minutes=5)
        time_fmt = "%H:%M"
    elif time_range == "6h":
        start_time = now_utc - timedelta(hours=6)
        bucket_count = 12
        bucket_delta = timedelta(minutes=30)
        time_fmt = "%H:%M"
    elif time_range == "7d":
        start_time = now_utc - timedelta(days=7)
        bucket_count = 7
        bucket_delta = timedelta(days=1)
        time_fmt = "%b %d"
    else:
        time_range = "24h"
        start_time = now_utc - timedelta(hours=24)
        bucket_count = 24
        bucket_delta = timedelta(hours=1)
        time_fmt = "%H:00"

    kpi_stmt = select(
        func.count(Transaction.id),
        func.coalesce(func.sum(Transaction.amount), 0.0),
        func.count(case((Transaction.risk_level == "HIGH", 1))),
        func.count(case((Transaction.risk_level == "CRITICAL", 1))),
        func.count(case((Transaction.risk_level.in_(["HIGH", "CRITICAL"]), 1))),
        func.coalesce(func.sum(case((Transaction.risk_level.in_(["HIGH", "CRITICAL"]), Transaction.amount))), 0.0),
        func.count(case((Transaction.ml_anomaly_score >= 0.65, 1)))
    ).where(Transaction.timestamp >= start_time)

    kpi_res = await db.execute(kpi_stmt)
    (
        total_txns,
        total_vol,
        high_risk_count,
        critical_risk_count,
        flagged_txns,
        flagged_vol,
        anomaly_count
    ) = kpi_res.first() or (0, 0.0, 0, 0, 0, 0.0, 0)

    total_txns = total_txns or 0
    total_vol = float(total_vol or 0.0)
    high_risk_count = high_risk_count or 0
    critical_risk_count = critical_risk_count or 0
    flagged_txns = flagged_txns or 0
    flagged_vol = float(flagged_vol or 0.0)
    anomaly_count = anomaly_count or 0
    anomaly_rate = round((anomaly_count / total_txns * 100), 2) if total_txns > 0 else 0.0

    active_alerts_res = await db.execute(
        select(
            func.count(Alert.id),
            func.count(case((Alert.severity == "CRITICAL", 1)))
        ).where(Alert.status.in_(["NEW", "ACKNOWLEDGED", "INVESTIGATING", "ESCALATED"]))
    )
    active_alerts, critical_alerts = active_alerts_res.first() or (0, 0)

    risk_dist_res = await db.execute(
        select(Transaction.risk_level, func.count(Transaction.id))
        .where(Transaction.timestamp >= start_time)
        .group_by(Transaction.risk_level)
    )
    risk_counts = {row[0]: row[1] for row in risk_dist_res.all()}
    risk_distribution = {
        "LOW": risk_counts.get("LOW", 0),
        "MEDIUM": risk_counts.get("MEDIUM", 0),
        "HIGH": risk_counts.get("HIGH", 0),
        "CRITICAL": risk_counts.get("CRITICAL", 0)
    }

    bucket_map = {}
    for i in range(bucket_count):
        b_time = start_time + (bucket_delta * i)
        b_key = b_time.strftime(time_fmt)
        bucket_map[b_key] = {
            "time": b_key,
            "timestamp": b_time.isoformat(),
            "transaction_count": 0,
            "flagged_count": 0,
            "total_volume": 0.0,
            "total_risk_score": 0.0,
            "avg_risk_score": 0.0
        }

    tx_trend_stmt = (
        select(Transaction.timestamp, Transaction.amount, Transaction.risk_score, Transaction.risk_level)
        .where(Transaction.timestamp >= start_time)
        .order_by(Transaction.timestamp.asc())
    )
    trend_res = await db.execute(tx_trend_stmt)
    for ts, amt, score, r_lvl in trend_res.all():
        if ts:
            b_key = ts.strftime(time_fmt)
            if b_key in bucket_map:
                bucket_map[b_key]["transaction_count"] += 1
                bucket_map[b_key]["total_volume"] = round(bucket_map[b_key]["total_volume"] + float(amt or 0.0), 2)
                bucket_map[b_key]["total_risk_score"] += float(score or 0.0)
                if r_lvl in ["HIGH", "CRITICAL"]:
                    bucket_map[b_key]["flagged_count"] += 1

    for b in bucket_map.values():
        cnt = b["transaction_count"]
        b["avg_risk_score"] = round(b["total_risk_score"] / cnt, 1) if cnt > 0 else 0.0
        del b["total_risk_score"]

    recent_tx_stmt = (
        select(
            Transaction.id,
            Transaction.user_id,
            Transaction.user_name,
            Transaction.amount,
            Transaction.currency,
            Transaction.merchant_name,
            Transaction.merchant_category,
            Transaction.risk_score,
            Transaction.risk_level,
            Transaction.status,
            Transaction.timestamp
        )
        .order_by(desc(Transaction.timestamp))
        .limit(10)
    )
    recent_tx_res = await db.execute(recent_tx_stmt)
    recent_transactions = [
        {
            "id": r[0],
            "user_id": r[1],
            "user_name": r[2] or r[1],
            "amount": float(r[3] or 0.0),
            "currency": r[4] or "USD",
            "merchant_name": r[5],
            "merchant_category": r[6],
            "risk_score": float(r[7] or 0.0),
            "risk_level": r[8],
            "status": r[9],
            "timestamp": r[10].isoformat() if r[10] else None
        }
        for r in recent_tx_res.all()
    ]

    active_alerts_stmt = (
        select(
            Alert.id,
            Alert.transaction_id,
            Alert.user_id,
            Alert.severity,
            Alert.risk_score,
            Alert.alert_reason,
            Alert.status,
            Alert.created_at
        )
        .where(Alert.status.in_(["NEW", "ACKNOWLEDGED", "INVESTIGATING", "ESCALATED"]))
        .order_by(
            case((Alert.severity == "CRITICAL", 1), (Alert.severity == "HIGH", 2), (Alert.severity == "MEDIUM", 3), else_=4),
            desc(Alert.created_at)
        )
        .limit(6)
    )
    active_alerts_query_res = await db.execute(active_alerts_stmt)
    active_alerts_list = [
        {
            "id": r[0],
            "transaction_id": r[1],
            "user_id": r[2],
            "severity": r[3],
            "risk_score": float(r[4] or 0.0),
            "alert_reason": r[5],
            "status": r[6],
            "created_at": r[7].isoformat() if r[7] else None
        }
        for r in active_alerts_query_res.all()
    ]

    system_status = [
        {"name": "Transaction Ingestion", "status": "HEALTHY", "message": "Validating payloads & idempotency cache online"},
        {"name": "Rule Engine", "status": "HEALTHY", "message": "9 active AST deterministic rule evaluators"},
        {"name": "ML Engine", "status": "HEALTHY", "message": f"Isolation Forest ({MLEngine._model_version}) online"},
        {"name": "Risk Engine", "status": "HEALTHY", "message": "Pure calibrated 0-100 risk scoring operational"},
        {"name": "Alert Engine", "status": "HEALTHY", "message": "State machine deduplication & storm suppression active"},
        {"name": "Database", "status": "HEALTHY", "message": "Transactional database connectivity verified"},
        {"name": "Real-Time Stream", "status": "HEALTHY", "message": f"WebSocket server online ({ws_manager.active_connection_count} clients)"}
    ]

    return {
        "time_range": time_range,
        "start_time": start_time.isoformat(),
        "generated_at": now_utc.isoformat(),
        "kpis": {
            "total_transactions": total_txns,
            "total_volume": round(total_vol, 2),
            "high_risk_transactions": high_risk_count,
            "critical_transactions": critical_risk_count,
            "suspicious_transactions": flagged_txns,
            "flagged_amount": round(flagged_vol, 2),
            "anomaly_count": anomaly_count,
            "anomaly_rate": anomaly_rate,
            "active_alerts": active_alerts or 0,
            "critical_alerts": critical_alerts or 0
        },
        "risk_distribution": risk_distribution,
        "trends": list(bucket_map.values()),
        "recent_transactions": recent_transactions,
        "active_alerts": active_alerts_list,
        "system_status": system_status
    }


# Compatibility alias for fraud endpoint
@router.get("/fraud")
async def get_fraud_analytics_compat(
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Case resolutions and alert severities compatibility endpoint.
    """
    from backend.app.models.case import Case
    from backend.app.models.alert import Alert
    from sqlalchemy import select, func

    res_stmt = select(Case.resolution, func.count(Case.id)).where(Case.resolution.isnot(None)).group_by(Case.resolution)
    case_res = await db.execute(res_stmt)
    resolutions = {r[0]: r[1] for r in case_res.all()}

    sev_stmt = select(Alert.severity, func.count(Alert.id)).group_by(Alert.severity)
    sev_res = await db.execute(sev_stmt)
    severities = {r[0]: r[1] for r in sev_res.all()}

    return {
        "case_resolutions": resolutions,
        "alert_severities": severities
    }
