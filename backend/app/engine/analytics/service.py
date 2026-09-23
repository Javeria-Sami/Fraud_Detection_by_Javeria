"""
Analytics & Aggregation Engine.
Section 18 — Analytics & Visualization.
"""
from datetime import datetime, timezone, timedelta
import calendar
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc, and_, or_, case

from backend.app.models.transaction import Transaction
from backend.app.models.alert import Alert
from backend.app.models.case import Case
from backend.app.models.risk_profile import UserRiskProfile, DeviceRiskProfile, MerchantRiskProfile
from backend.app.models.rule import FraudRule
from backend.app.models.user import User
from backend.app.schemas.analytics import (
    AnalyticsFilterParams,
    AnalyticsOverviewResponse,
    AnalyticsOverviewKPIs,
    CurrencyVolumeSummary,
    TransactionAnalyticsResponse,
    TimeSeriesPoint,
    StatusDistributionItem,
    CategoryDistributionItem,
    PaymentMethodDistributionItem,
    RiskAnalyticsResponse,
    RiskLevelDistributionItem,
    RiskHistogramBucket,
    RiskTrendPoint,
    AlertAnalyticsResponse,
    AlertTrendPoint,
    AlertDistributionItem,
    AlertResponseMetrics,
    MLAnomalyAnalyticsResponse,
    AnomalyScoreBucket,
    ModelVersionItem,
    RuleAnalyticsResponse,
    RuleTriggerItem,
    CaseAnalyticsResponse,
    CaseTrendPoint,
    CaseDistributionItem,
    AnalystWorkloadItem,
    GeographicAnalyticsResponse,
    CountryAnalyticsItem,
    CityAnalyticsItem,
    EntityPatternsResponse,
    MerchantRankingItem,
    DeviceRankingItem,
)


class AnalyticsService:
    """
    Core aggregation engine for read-only historical analytics and visualizations.
    """

    @staticmethod
    def parse_date_range(params: AnalyticsFilterParams) -> Tuple[datetime, datetime, str]:
        """
        Calculates normalized UTC date boundaries from filter parameters.
        Returns: (dt_from, dt_to, time_range_label)
        """
        now = datetime.now(timezone.utc)
        r = (params.range or "30d").lower()

        if r == "today":
            dt_from = now.replace(hour=0, minute=0, second=0, microsecond=0)
            dt_to = now
            label = "Today"
        elif r == "yesterday":
            start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
            dt_from = start_today - timedelta(days=1)
            dt_to = start_today - timedelta(microseconds=1)
            label = "Yesterday"
        elif r == "7d":
            dt_from = now - timedelta(days=7)
            dt_to = now
            label = "Last 7 Days"
        elif r == "90d":
            dt_from = now - timedelta(days=90)
            dt_to = now
            label = "Last 90 Days"
        elif r == "this_month":
            dt_from = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            dt_to = now
            label = "This Month"
        elif r == "previous_month":
            first_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            last_prev_month = first_this_month - timedelta(days=1)
            dt_from = last_prev_month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            dt_to = first_this_month - timedelta(microseconds=1)
            label = "Previous Month"
        elif (r == "custom" or (params.date_from and params.date_to)) and params.date_from and params.date_to:
            try:
                dt_from_str = params.date_from.replace("Z", "+00:00").replace(" ", "+")
                dt_to_str = params.date_to.replace("Z", "+00:00").replace(" ", "+")
                dt_from = datetime.fromisoformat(dt_from_str)
                dt_to = datetime.fromisoformat(dt_to_str)
                if dt_from.tzinfo is None:
                    dt_from = dt_from.replace(tzinfo=timezone.utc)
                if dt_to.tzinfo is None:
                    dt_to = dt_to.replace(tzinfo=timezone.utc)
                if dt_from > dt_to:
                    dt_from, dt_to = dt_to, dt_from
                # Max boundary safety: 365 days
                if (dt_to - dt_from).days > 365:
                    dt_from = dt_to - timedelta(days=365)
                label = f"Custom ({dt_from.strftime('%Y-%m-%d')} to {dt_to.strftime('%Y-%m-%d')})"
            except Exception:
                dt_from = now - timedelta(days=30)
                dt_to = now
                label = "Last 30 Days"
        else:  # Default to 30d
            dt_from = now - timedelta(days=30)
            dt_to = now
            label = "Last 30 Days"

        return dt_from, dt_to, label

    @staticmethod
    def _build_transaction_filters(params: AnalyticsFilterParams, dt_from: datetime, dt_to: datetime) -> List[Any]:
        conditions = [
            Transaction.timestamp >= dt_from,
            Transaction.timestamp <= dt_to
        ]
        if params.currency and params.currency.upper() != "ALL":
            conditions.append(Transaction.currency == params.currency.upper())
        if params.status and params.status.upper() != "ALL":
            conditions.append(Transaction.status == params.status.upper())
        if params.risk_level and params.risk_level.upper() != "ALL":
            conditions.append(Transaction.risk_level == params.risk_level.upper())
        if params.merchant:
            conditions.append(Transaction.merchant_name.ilike(f"%{params.merchant.strip()}%"))
        if params.device_id:
            conditions.append(Transaction.device_id == params.device_id.strip())
        if params.user_id:
            conditions.append(Transaction.user_id == params.user_id.strip())
        return conditions

    @classmethod
    async def get_overview(
        cls,
        db: AsyncSession,
        params: AnalyticsFilterParams,
        user_role: str = "viewer"
    ) -> AnalyticsOverviewResponse:
        """
        Aggregates top-level KPI metrics across Transactions, Alerts, Cases, and User Profiles.
        """
        dt_from, dt_to, range_label = cls.parse_date_range(params)
        now_utc = datetime.now(timezone.utc)
        txn_conditions = cls._build_transaction_filters(params, dt_from, dt_to)

        # 1. Transaction aggregations
        txn_kpi_stmt = select(
            func.count(Transaction.id),
            func.count(case((Transaction.risk_level == "HIGH", 1))),
            func.count(case((Transaction.risk_level == "CRITICAL", 1))),
            func.count(case((Transaction.risk_level.in_(["HIGH", "CRITICAL"]), 1))),
            func.coalesce(func.sum(case((Transaction.risk_level.in_(["HIGH", "CRITICAL"]), Transaction.amount))), 0.0),
            func.count(case((Transaction.ml_anomaly_score >= 0.65, 1))),
            func.count(case((Transaction.ml_anomaly_score.isnot(None), 1)))
        ).where(and_(*txn_conditions))

        txn_kpi_res = await db.execute(txn_kpi_stmt)
        (
            total_txns,
            high_risk_count,
            critical_risk_count,
            suspicious_count,
            flagged_vol,
            anomaly_count,
            scored_txns_count
        ) = txn_kpi_res.first() or (0, 0, 0, 0, 0.0, 0, 0)

        total_txns = total_txns or 0
        high_risk_count = high_risk_count or 0
        critical_risk_count = critical_risk_count or 0
        suspicious_count = suspicious_count or 0
        flagged_vol = float(flagged_vol or 0.0)
        anomaly_count = anomaly_count or 0
        scored_txns_count = scored_txns_count or 0

        anomaly_rate = round((anomaly_count / scored_txns_count * 100), 2) if scored_txns_count > 0 else 0.0

        # 2. Currency Grouped Breakdown
        curr_stmt = (
            select(
                Transaction.currency,
                func.count(Transaction.id),
                func.coalesce(func.sum(Transaction.amount), 0.0),
                func.coalesce(func.sum(case((Transaction.risk_level.in_(["HIGH", "CRITICAL"]), Transaction.amount))), 0.0)
            )
            .where(and_(*txn_conditions))
            .group_by(Transaction.currency)
        )
        curr_res = await db.execute(curr_stmt)
        currencies = []
        total_vol_usd = 0.0
        for c_code, c_count, c_vol, c_flagged in curr_res.all():
            c_code = c_code or "USD"
            c_vol = float(c_vol or 0.0)
            c_flagged = float(c_flagged or 0.0)
            currencies.append(
                CurrencyVolumeSummary(
                    currency=c_code,
                    total_volume=round(c_vol, 2),
                    flagged_volume=round(c_flagged, 2),
                    transaction_count=c_count or 0
                )
            )
            total_vol_usd += c_vol

        # 3. Active & Critical Alerts
        alert_conditions = [Alert.status.in_(["NEW", "ACKNOWLEDGED", "INVESTIGATING", "ESCALATED"])]
        if params.severity and params.severity.upper() != "ALL":
            alert_conditions.append(Alert.severity == params.severity.upper())

        active_alerts_stmt = select(
            func.count(Alert.id),
            func.count(case((Alert.severity == "CRITICAL", 1)))
        ).where(and_(*alert_conditions))
        active_alerts_res = await db.execute(active_alerts_stmt)
        active_alerts, crit_alerts = active_alerts_res.first() or (0, 0)

        # 4. Open Cases
        open_cases = 0
        if user_role in ["analyst", "admin"]:
            open_cases_stmt = select(func.count(Case.id)).where(
                Case.status.in_(["OPEN", "INVESTIGATING", "PENDING"])
            )
            open_cases_res = await db.execute(open_cases_stmt)
            open_cases = open_cases_res.scalar() or 0

        # 5. High Risk Users
        high_risk_users_stmt = select(func.count(UserRiskProfile.user_id)).where(
            UserRiskProfile.active_risk_level.in_(["HIGH", "CRITICAL"])
        )
        high_risk_users_res = await db.execute(high_risk_users_stmt)
        high_risk_users = high_risk_users_res.scalar() or 0

        kpis = AnalyticsOverviewKPIs(
            total_transactions=total_txns,
            total_volume_usd_equiv=round(total_vol_usd, 2),
            currencies=currencies,
            high_risk_transactions=high_risk_count,
            critical_risk_transactions=critical_risk_count,
            suspicious_transactions=suspicious_count,
            flagged_amount_usd_equiv=round(flagged_vol, 2),
            anomaly_count=anomaly_count,
            anomaly_rate=anomaly_rate,
            active_alerts=active_alerts or 0,
            critical_alerts=crit_alerts or 0,
            open_cases=open_cases,
            high_risk_users=high_risk_users or 0
        )

        return AnalyticsOverviewResponse(
            time_range=range_label,
            date_from=dt_from.isoformat(),
            date_to=dt_to.isoformat(),
            generated_at=now_utc.isoformat(),
            kpis=kpis
        )

    @classmethod
    async def get_transaction_analytics(
        cls,
        db: AsyncSession,
        params: AnalyticsFilterParams
    ) -> TransactionAnalyticsResponse:
        """
        Calculates time-series volume trends, status breakdown, sector distributions, and payment methods.
        """
        dt_from, dt_to, range_label = cls.parse_date_range(params)
        txn_conditions = cls._build_transaction_filters(params, dt_from, dt_to)

        # 1. Total transaction count in window
        total_q = select(func.count(Transaction.id)).where(and_(*txn_conditions))
        total_txns = (await db.execute(total_q)).scalar() or 0

        # 2. Time-series bucket generation
        total_seconds = (dt_to - dt_from).total_seconds()
        if total_seconds <= 24 * 3600:
            bucket_delta = timedelta(hours=1)
            time_fmt = "%H:00"
            bucket_count = max(1, int(total_seconds // 3600) + 1)
        elif total_seconds <= 31 * 24 * 3600:
            bucket_delta = timedelta(days=1)
            time_fmt = "%b %d"
            bucket_count = max(1, int(total_seconds // 86400) + 1)
        else:
            bucket_delta = timedelta(days=7)
            time_fmt = "%b %d"
            bucket_count = max(1, int(total_seconds // (7 * 86400)) + 1)

        bucket_map = {}
        for i in range(bucket_count):
            b_start = dt_from + (bucket_delta * i)
            if b_start > dt_to:
                break
            b_key = b_start.strftime(time_fmt)
            bucket_map[b_key] = {
                "time": b_key,
                "timestamp": b_start.isoformat(),
                "transaction_count": 0,
                "flagged_count": 0,
                "total_volume": 0.0,
                "total_amount": 0.0,
                "total_risk_score": 0.0,
                "avg_amount": 0.0,
                "avg_risk_score": 0.0,
            }

        # Query all matching transactions for time series
        ts_stmt = (
            select(Transaction.timestamp, Transaction.amount, Transaction.risk_score, Transaction.risk_level)
            .where(and_(*txn_conditions))
            .order_by(Transaction.timestamp.asc())
        )
        ts_res = await db.execute(ts_stmt)
        for ts, amt, r_score, r_level in ts_res.all():
            if ts:
                b_key = ts.strftime(time_fmt)
                if b_key in bucket_map:
                    bucket_map[b_key]["transaction_count"] += 1
                    amt_val = float(amt or 0.0)
                    bucket_map[b_key]["total_volume"] = round(bucket_map[b_key]["total_volume"] + amt_val, 2)
                    bucket_map[b_key]["total_amount"] += amt_val
                    bucket_map[b_key]["total_risk_score"] += float(r_score or 0.0)
                    if r_level in ["HIGH", "CRITICAL"]:
                        bucket_map[b_key]["flagged_count"] += 1

        volume_trend = []
        for b in bucket_map.values():
            cnt = b["transaction_count"]
            avg_amt = round(b["total_amount"] / cnt, 2) if cnt > 0 else 0.0
            avg_risk = round(b["total_risk_score"] / cnt, 1) if cnt > 0 else 0.0
            volume_trend.append(
                TimeSeriesPoint(
                    time=b["time"],
                    timestamp=b["timestamp"],
                    transaction_count=cnt,
                    flagged_count=b["flagged_count"],
                    total_volume=b["total_volume"],
                    avg_amount=avg_amt,
                    avg_risk_score=avg_risk
                )
            )

        # 3. Status Distribution
        status_stmt = (
            select(
                Transaction.status,
                func.count(Transaction.id),
                func.coalesce(func.sum(Transaction.amount), 0.0)
            )
            .where(and_(*txn_conditions))
            .group_by(Transaction.status)
        )
        status_res = await db.execute(status_stmt)
        status_distribution = []
        for st_name, st_count, st_vol in status_res.all():
            st_name = st_name or "UNKNOWN"
            st_count = st_count or 0
            st_vol = float(st_vol or 0.0)
            pct = round((st_count / total_txns * 100), 1) if total_txns > 0 else 0.0
            status_distribution.append(
                StatusDistributionItem(
                    status=st_name,
                    count=st_count,
                    volume=round(st_vol, 2),
                    percentage=pct
                )
            )

        # 4. Merchant Category Distribution
        cat_stmt = (
            select(
                Transaction.merchant_category,
                func.count(Transaction.id),
                func.coalesce(func.sum(Transaction.amount), 0.0)
            )
            .where(and_(*txn_conditions))
            .group_by(Transaction.merchant_category)
            .order_by(desc(func.count(Transaction.id)))
            .limit(10)
        )
        cat_res = await db.execute(cat_stmt)
        category_distribution = []
        for c_name, c_count, c_vol in cat_res.all():
            c_name = c_name or "GENERAL"
            c_count = c_count or 0
            c_vol = float(c_vol or 0.0)
            pct = round((c_count / total_txns * 100), 1) if total_txns > 0 else 0.0
            category_distribution.append(
                CategoryDistributionItem(
                    category=c_name,
                    count=c_count,
                    volume=round(c_vol, 2),
                    percentage=pct
                )
            )

        # 5. Payment Method Distribution
        pm_stmt = (
            select(
                Transaction.payment_method,
                func.count(Transaction.id),
                func.coalesce(func.sum(Transaction.amount), 0.0)
            )
            .where(and_(*txn_conditions))
            .group_by(Transaction.payment_method)
        )
        pm_res = await db.execute(pm_stmt)
        payment_method_distribution = []
        for pm_name, pm_count, pm_vol in pm_res.all():
            pm_name = (pm_name or "CREDIT_CARD").upper()
            pm_count = pm_count or 0
            pm_vol = float(pm_vol or 0.0)
            pct = round((pm_count / total_txns * 100), 1) if total_txns > 0 else 0.0
            payment_method_distribution.append(
                PaymentMethodDistributionItem(
                    payment_method=pm_name,
                    count=pm_count,
                    volume=round(pm_vol, 2),
                    percentage=pct
                )
            )

        # 6. Currency summaries
        curr_stmt = (
            select(
                Transaction.currency,
                func.count(Transaction.id),
                func.coalesce(func.sum(Transaction.amount), 0.0),
                func.coalesce(func.sum(case((Transaction.risk_level.in_(["HIGH", "CRITICAL"]), Transaction.amount))), 0.0)
            )
            .where(and_(*txn_conditions))
            .group_by(Transaction.currency)
        )
        curr_res = await db.execute(curr_stmt)
        currencies = [
            CurrencyVolumeSummary(
                currency=r[0] or "USD",
                transaction_count=r[1] or 0,
                total_volume=round(float(r[2] or 0.0), 2),
                flagged_volume=round(float(r[3] or 0.0), 2)
            )
            for r in curr_res.all()
        ]

        return TransactionAnalyticsResponse(
            time_range=range_label,
            date_from=dt_from.isoformat(),
            date_to=dt_to.isoformat(),
            total_transactions=total_txns,
            volume_trend=volume_trend,
            status_distribution=status_distribution,
            category_distribution=category_distribution,
            payment_method_distribution=payment_method_distribution,
            currencies=currencies
        )

    @classmethod
    async def get_risk_analytics(
        cls,
        db: AsyncSession,
        params: AnalyticsFilterParams
    ) -> RiskAnalyticsResponse:
        """
        Calculates risk tier distributions, score histograms (0-100), and risk score trends.
        """
        dt_from, dt_to, range_label = cls.parse_date_range(params)
        txn_conditions = cls._build_transaction_filters(params, dt_from, dt_to)

        # Total and average score
        summary_stmt = select(
            func.count(Transaction.id),
            func.coalesce(func.avg(Transaction.risk_score), 0.0)
        ).where(and_(*txn_conditions))
        summary_res = await db.execute(summary_stmt)
        total_scored, avg_score = summary_res.first() or (0, 0.0)
        total_scored = total_scored or 0
        avg_score = round(float(avg_score or 0.0), 1)

        # 1. Risk Tier Breakdown
        tier_stmt = (
            select(
                Transaction.risk_level,
                func.count(Transaction.id),
                func.coalesce(func.sum(Transaction.amount), 0.0)
            )
            .where(and_(*txn_conditions))
            .group_by(Transaction.risk_level)
        )
        tier_res = await db.execute(tier_stmt)
        tier_counts = {r[0]: (r[1], float(r[2] or 0.0)) for r in tier_res.all()}

        risk_level_distribution = []
        for lvl in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
            cnt, vol = tier_counts.get(lvl, (0, 0.0))
            pct = round((cnt / total_scored * 100), 1) if total_scored > 0 else 0.0
            risk_level_distribution.append(
                RiskLevelDistributionItem(
                    risk_level=lvl,
                    count=cnt,
                    percentage=pct,
                    total_volume=round(vol, 2)
                )
            )

        # 2. Risk Score Histogram Buckets (0-20, 21-40, 41-60, 61-80, 81-100)
        hist_stmt = select(
            func.count(case((Transaction.risk_score < 20.0, 1))),
            func.count(case((and_(Transaction.risk_score >= 20.0, Transaction.risk_score < 40.0), 1))),
            func.count(case((and_(Transaction.risk_score >= 40.0, Transaction.risk_score < 60.0), 1))),
            func.count(case((and_(Transaction.risk_score >= 60.0, Transaction.risk_score < 80.0), 1))),
            func.count(case((Transaction.risk_score >= 80.0, 1)))
        ).where(and_(*txn_conditions))
        hist_res = await db.execute(hist_stmt)
        b0_20, b20_40, b40_60, b60_80, b80_100 = hist_res.first() or (0, 0, 0, 0, 0)

        hist_definitions = [
            ("0–20 (Minimal)", 0.0, 20.0, b0_20 or 0),
            ("21–40 (Low)", 20.0, 40.0, b20_40 or 0),
            ("41–60 (Medium)", 40.0, 60.0, b40_60 or 0),
            ("61–80 (High)", 60.0, 80.0, b60_80 or 0),
            ("81–100 (Critical)", 80.0, 100.0, b80_100 or 0),
        ]
        risk_histogram = [
            RiskHistogramBucket(
                bucket=label,
                min_score=mn,
                max_score=mx,
                count=c,
                percentage=round((c / total_scored * 100), 1) if total_scored > 0 else 0.0
            )
            for label, mn, mx, c in hist_definitions
        ]

        # 3. Risk Trend Time Series
        total_seconds = (dt_to - dt_from).total_seconds()
        if total_seconds <= 24 * 3600:
            bucket_delta = timedelta(hours=1)
            time_fmt = "%H:00"
            bucket_count = max(1, int(total_seconds // 3600) + 1)
        elif total_seconds <= 31 * 24 * 3600:
            bucket_delta = timedelta(days=1)
            time_fmt = "%b %d"
            bucket_count = max(1, int(total_seconds // 86400) + 1)
        else:
            bucket_delta = timedelta(days=7)
            time_fmt = "%b %d"
            bucket_count = max(1, int(total_seconds // (7 * 86400)) + 1)

        trend_map = {}
        for i in range(bucket_count):
            b_start = dt_from + (bucket_delta * i)
            if b_start > dt_to:
                break
            b_key = b_start.strftime(time_fmt)
            trend_map[b_key] = {
                "time": b_key,
                "timestamp": b_start.isoformat(),
                "total_score": 0.0,
                "count": 0,
                "high_count": 0,
                "crit_count": 0
            }

        trend_q = (
            select(Transaction.timestamp, Transaction.risk_score, Transaction.risk_level)
            .where(and_(*txn_conditions))
            .order_by(Transaction.timestamp.asc())
        )
        trend_res = await db.execute(trend_q)
        for ts, score, r_lvl in trend_res.all():
            if ts:
                b_key = ts.strftime(time_fmt)
                if b_key in trend_map:
                    trend_map[b_key]["count"] += 1
                    trend_map[b_key]["total_score"] += float(score or 0.0)
                    if r_lvl == "HIGH":
                        trend_map[b_key]["high_count"] += 1
                    elif r_lvl == "CRITICAL":
                        trend_map[b_key]["crit_count"] += 1

        risk_trend = []
        for b in trend_map.values():
            cnt = b["count"]
            avg_s = round(b["total_score"] / cnt, 1) if cnt > 0 else 0.0
            risk_trend.append(
                RiskTrendPoint(
                    time=b["time"],
                    timestamp=b["timestamp"],
                    avg_risk_score=avg_s,
                    high_risk_count=b["high_count"],
                    critical_risk_count=b["crit_count"]
                )
            )

        return RiskAnalyticsResponse(
            time_range=range_label,
            date_from=dt_from.isoformat(),
            date_to=dt_to.isoformat(),
            total_scored_transactions=total_scored,
            average_risk_score=avg_score,
            risk_level_distribution=risk_level_distribution,
            risk_histogram=risk_histogram,
            risk_trend=risk_trend
        )

    @classmethod
    async def get_alert_analytics(
        cls,
        db: AsyncSession,
        params: AnalyticsFilterParams
    ) -> AlertAnalyticsResponse:
        """
        Calculates alert timelines, severity/status distributions, trigger types, and resolution times (MTTR).
        """
        dt_from, dt_to, range_label = cls.parse_date_range(params)

        alert_conditions = [
            Alert.created_at >= dt_from,
            Alert.created_at <= dt_to
        ]
        if params.severity and params.severity.upper() != "ALL":
            alert_conditions.append(Alert.severity == params.severity.upper())
        if params.status and params.status.upper() != "ALL":
            alert_conditions.append(Alert.status == params.status.upper())

        # Total, Active, and Critical alerts in window
        count_stmt = select(
            func.count(Alert.id),
            func.count(case((Alert.status.in_(["NEW", "ACKNOWLEDGED", "INVESTIGATING", "ESCALATED"]), 1))),
            func.count(case((Alert.severity == "CRITICAL", 1)))
        ).where(and_(*alert_conditions))
        total_alerts, active_alerts, crit_alerts = (await db.execute(count_stmt)).first() or (0, 0, 0)
        total_alerts = total_alerts or 0
        active_alerts = active_alerts or 0
        crit_alerts = crit_alerts or 0

        # 1. Severity Distribution
        sev_stmt = (
            select(Alert.severity, func.count(Alert.id))
            .where(and_(*alert_conditions))
            .group_by(Alert.severity)
        )
        sev_res = await db.execute(sev_stmt)
        sev_map = {r[0]: r[1] for r in sev_res.all()}
        severity_distribution = [
            AlertDistributionItem(
                label=lvl,
                count=sev_map.get(lvl, 0),
                percentage=round((sev_map.get(lvl, 0) / total_alerts * 100), 1) if total_alerts > 0 else 0.0
            )
            for lvl in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        ]

        # 2. Status Distribution
        st_stmt = (
            select(Alert.status, func.count(Alert.id))
            .where(and_(*alert_conditions))
            .group_by(Alert.status)
        )
        st_res = await db.execute(st_stmt)
        status_distribution = [
            AlertDistributionItem(
                label=r[0] or "UNKNOWN",
                count=r[1] or 0,
                percentage=round((r[1] / total_alerts * 100), 1) if total_alerts > 0 else 0.0
            )
            for r in st_res.all()
        ]

        # 3. Top Alert Trigger Reasons
        reasons_stmt = (
            select(Alert.alert_reason, func.count(Alert.id))
            .where(and_(*alert_conditions))
            .group_by(Alert.alert_reason)
            .order_by(desc(func.count(Alert.id)))
            .limit(8)
        )
        reasons_res = await db.execute(reasons_stmt)
        top_alert_reasons = [
            AlertDistributionItem(
                label=r[0] or "General Anomaly",
                count=r[1] or 0,
                percentage=round((r[1] / total_alerts * 100), 1) if total_alerts > 0 else 0.0
            )
            for r in reasons_res.all()
        ]

        # 4. Alert Timeline Trend
        total_seconds = (dt_to - dt_from).total_seconds()
        time_fmt = "%H:00" if total_seconds <= 86400 else "%b %d"
        bucket_delta = timedelta(hours=1) if total_seconds <= 86400 else (timedelta(days=1) if total_seconds <= 31*86400 else timedelta(days=7))
        bucket_count = max(1, int(total_seconds // bucket_delta.total_seconds()) + 1)

        trend_map = {}
        for i in range(bucket_count):
            b_start = dt_from + (bucket_delta * i)
            if b_start > dt_to:
                break
            b_key = b_start.strftime(time_fmt)
            trend_map[b_key] = {
                "time": b_key,
                "timestamp": b_start.isoformat(),
                "total": 0,
                "critical": 0,
                "resolved": 0
            }

        all_alerts_stmt = (
            select(Alert.created_at, Alert.severity, Alert.status, Alert.resolved_at)
            .where(and_(*alert_conditions))
            .order_by(Alert.created_at.asc())
        )
        all_alerts_res = await db.execute(all_alerts_stmt)
        resolved_durations_minutes = []

        for c_at, sev, st, r_at in all_alerts_res.all():
            if c_at:
                b_key = c_at.strftime(time_fmt)
                if b_key in trend_map:
                    trend_map[b_key]["total"] += 1
                    if sev == "CRITICAL":
                        trend_map[b_key]["critical"] += 1
                    if st == "RESOLVED":
                        trend_map[b_key]["resolved"] += 1

            if r_at and c_at and r_at >= c_at:
                diff_m = (r_at - c_at).total_seconds() / 60.0
                resolved_durations_minutes.append(diff_m)

        alert_trend = [
            AlertTrendPoint(
                time=b["time"],
                timestamp=b["timestamp"],
                total_alerts=b["total"],
                critical_alerts=b["critical"],
                resolved_alerts=b["resolved"]
            )
            for b in trend_map.values()
        ]

        # 5. Response Metrics (Resolution MTTR)
        total_resolved = len(resolved_durations_minutes)
        avg_res_min = None
        median_res_min = None
        if total_resolved > 0:
            avg_res_min = round(sum(resolved_durations_minutes) / total_resolved, 1)
            sorted_durations = sorted(resolved_durations_minutes)
            mid = total_resolved // 2
            if total_resolved % 2 == 1:
                median_res_min = round(sorted_durations[mid], 1)
            else:
                median_res_min = round((sorted_durations[mid - 1] + sorted_durations[mid]) / 2.0, 1)

        response_metrics = AlertResponseMetrics(
            total_resolved=total_resolved,
            avg_resolution_time_minutes=avg_res_min,
            median_resolution_time_minutes=median_res_min,
            total_active=active_alerts
        )

        return AlertAnalyticsResponse(
            time_range=range_label,
            date_from=dt_from.isoformat(),
            date_to=dt_to.isoformat(),
            total_alerts=total_alerts,
            active_alerts=active_alerts,
            critical_alerts=crit_alerts,
            alert_trend=alert_trend,
            severity_distribution=severity_distribution,
            status_distribution=status_distribution,
            top_alert_reasons=top_alert_reasons,
            response_metrics=response_metrics
        )

    @classmethod
    async def get_ml_analytics(
        cls,
        db: AsyncSession,
        params: AnalyticsFilterParams
    ) -> MLAnomalyAnalyticsResponse:
        """
        Calculates ML Anomaly Detection metrics and score distribution across model versions.
        """
        dt_from, dt_to, range_label = cls.parse_date_range(params)
        txn_conditions = cls._build_transaction_filters(params, dt_from, dt_to)

        # Anomaly counts & average anomaly score
        ml_stmt = select(
            func.count(case((Transaction.ml_anomaly_score.isnot(None), 1))),
            func.count(case((Transaction.ml_anomaly_score >= 0.65, 1))),
            func.coalesce(func.avg(Transaction.ml_anomaly_score), 0.0)
        ).where(and_(*txn_conditions))
        total_preds, anomaly_cnt, avg_score = (await db.execute(ml_stmt)).first() or (0, 0, 0.0)
        total_preds = total_preds or 0
        anomaly_cnt = anomaly_cnt or 0
        avg_score = round(float(avg_score or 0.0), 3)
        anomaly_rate = round((anomaly_cnt / total_preds * 100), 2) if total_preds > 0 else 0.0

        # Score Histogram Buckets (0.0-0.2, 0.2-0.4, 0.4-0.6, 0.6-0.8, 0.8-1.0)
        hist_stmt = select(
            func.count(case((and_(Transaction.ml_anomaly_score.isnot(None), Transaction.ml_anomaly_score < 0.2), 1))),
            func.count(case((and_(Transaction.ml_anomaly_score >= 0.2, Transaction.ml_anomaly_score < 0.4), 1))),
            func.count(case((and_(Transaction.ml_anomaly_score >= 0.4, Transaction.ml_anomaly_score < 0.6), 1))),
            func.count(case((and_(Transaction.ml_anomaly_score >= 0.6, Transaction.ml_anomaly_score < 0.8), 1))),
            func.count(case((Transaction.ml_anomaly_score >= 0.8, 1)))
        ).where(and_(*txn_conditions))
        h_res = await db.execute(hist_stmt)
        b1, b2, b3, b4, b5 = h_res.first() or (0, 0, 0, 0, 0)

        score_histogram = [
            AnomalyScoreBucket(bucket="0.0–0.2 (Nominal)", min_score=0.0, max_score=0.2, count=b1 or 0, percentage=round(((b1 or 0)/total_preds*100), 1) if total_preds > 0 else 0.0),
            AnomalyScoreBucket(bucket="0.2–0.4 (Low)", min_score=0.2, max_score=0.4, count=b2 or 0, percentage=round(((b2 or 0)/total_preds*100), 1) if total_preds > 0 else 0.0),
            AnomalyScoreBucket(bucket="0.4–0.6 (Elevated)", min_score=0.4, max_score=0.6, count=b3 or 0, percentage=round(((b3 or 0)/total_preds*100), 1) if total_preds > 0 else 0.0),
            AnomalyScoreBucket(bucket="0.6–0.8 (Anomalous)", min_score=0.6, max_score=0.8, count=b4 or 0, percentage=round(((b4 or 0)/total_preds*100), 1) if total_preds > 0 else 0.0),
            AnomalyScoreBucket(bucket="0.8–1.0 (Critical Outlier)", min_score=0.8, max_score=1.0, count=b5 or 0, percentage=round(((b5 or 0)/total_preds*100), 1) if total_preds > 0 else 0.0),
        ]

        # Model Version Breakdown
        model_versions = [
            ModelVersionItem(
                model_version="isolation_forest_v1.0",
                prediction_count=total_preds,
                anomaly_count=anomaly_cnt,
                avg_anomaly_score=avg_score,
                anomaly_rate=anomaly_rate
            )
        ]

        return MLAnomalyAnalyticsResponse(
            time_range=range_label,
            date_from=dt_from.isoformat(),
            date_to=dt_to.isoformat(),
            total_predictions=total_preds,
            anomaly_count=anomaly_cnt,
            anomaly_rate=anomaly_rate,
            avg_anomaly_score=avg_score,
            score_histogram=score_histogram,
            model_versions=model_versions
        )

    @classmethod
    async def get_rule_analytics(
        cls,
        db: AsyncSession,
        params: AnalyticsFilterParams
    ) -> RuleAnalyticsResponse:
        """
        Calculates fraud rule executions, trigger counts, and top triggered rules ranking.
        """
        from backend.app.models.rule import RuleExecution
        dt_from, dt_to, range_label = cls.parse_date_range(params)

        # 1. Fetch all fraud rules
        rules_stmt = select(FraudRule)
        rules_res = await db.execute(rules_stmt)
        rules = rules_res.scalars().all()

        # 2. Aggregate rule executions in time window
        exec_stmt = (
            select(
                RuleExecution.rule_id,
                func.count(RuleExecution.id),
                func.count(case((RuleExecution.triggered == True, 1)))
            )
            .where(and_(RuleExecution.created_at >= dt_from, RuleExecution.created_at <= dt_to))
            .group_by(RuleExecution.rule_id)
        )
        exec_res = await db.execute(exec_stmt)
        exec_map = {r[0]: (r[1] or 0, r[2] or 0) for r in exec_res.all()}

        total_rules = len(rules)
        total_execs = sum(exec_map.get(r.id, (0, 0))[0] for r in rules)
        total_triggers = sum(exec_map.get(r.id, (0, 0))[1] for r in rules)
        overall_rate = round((total_triggers / total_execs * 100), 2) if total_execs > 0 else 0.0

        top_rules = []
        for r in rules:
            e_cnt, t_cnt = exec_map.get(r.id, (0, 0))
            rate = round((t_cnt / e_cnt * 100), 2) if e_cnt > 0 else 0.0
            top_rules.append(
                RuleTriggerItem(
                    rule_id=r.id or r.rule_code,
                    rule_name=r.name,
                    category=r.category or "GENERAL",
                    severity=r.severity or "MEDIUM",
                    trigger_count=t_cnt,
                    execution_count=e_cnt,
                    trigger_rate=rate
                )
            )

        top_rules.sort(key=lambda item: item.trigger_count, reverse=True)

        return RuleAnalyticsResponse(
            time_range=range_label,
            date_from=dt_from.isoformat(),
            date_to=dt_to.isoformat(),
            total_rules=total_rules,
            total_executions=total_execs,
            total_triggers=total_triggers,
            overall_trigger_rate=overall_rate,
            top_triggered_rules=top_rules[:10]
        )

    @classmethod
    async def get_case_analytics(
        cls,
        db: AsyncSession,
        params: AnalyticsFilterParams,
        user_role: str = "viewer"
    ) -> CaseAnalyticsResponse:
        """
        Calculates case lifecycle pipelines, creation vs resolution trends, and analyst workload.
        Restricted by RBAC.
        """
        dt_from, dt_to, range_label = cls.parse_date_range(params)

        if user_role not in ["analyst", "admin"]:
            return CaseAnalyticsResponse(
                time_range=range_label,
                date_from=dt_from.isoformat(),
                date_to=dt_to.isoformat(),
                total_cases=0,
                open_cases=0,
                investigating_cases=0,
                resolved_cases=0,
                closed_cases=0,
                case_trend=[],
                status_distribution=[],
                severity_distribution=[],
                resolution_distribution=[],
                analyst_workload=None
            )

        case_conditions = [
            Case.created_at >= dt_from,
            Case.created_at <= dt_to
        ]
        if params.severity and params.severity.upper() != "ALL":
            case_conditions.append(Case.severity == params.severity.upper())
        if params.status and params.status.upper() != "ALL":
            case_conditions.append(Case.status == params.status.upper())

        # 1. Total counts by status
        status_q = select(Case.status, func.count(Case.id)).where(and_(*case_conditions)).group_by(Case.status)
        st_res = await db.execute(status_q)
        st_map = {r[0]: r[1] for r in st_res.all()}
        total_cases = sum(st_map.values())
        open_c = st_map.get("OPEN", 0)
        inv_c = st_map.get("INVESTIGATING", 0)
        res_c = st_map.get("RESOLVED", 0)
        closed_c = st_map.get("CLOSED", 0)

        status_distribution = [
            CaseDistributionItem(
                label=st,
                count=st_map.get(st, 0),
                percentage=round((st_map.get(st, 0) / total_cases * 100), 1) if total_cases > 0 else 0.0
            )
            for st in ["OPEN", "INVESTIGATING", "PENDING", "RESOLVED", "CLOSED"]
            if st in st_map or st in ["OPEN", "INVESTIGATING", "RESOLVED"]
        ]

        # 2. Severity distribution
        sev_q = select(Case.severity, func.count(Case.id)).where(and_(*case_conditions)).group_by(Case.severity)
        sev_res = await db.execute(sev_q)
        sev_map = {r[0]: r[1] for r in sev_res.all()}
        severity_distribution = [
            CaseDistributionItem(
                label=lvl,
                count=sev_map.get(lvl, 0),
                percentage=round((sev_map.get(lvl, 0) / total_cases * 100), 1) if total_cases > 0 else 0.0
            )
            for lvl in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        ]

        # 3. Resolution distribution (Confirmed Fraud vs False Positive, etc.)
        res_q = (
            select(Case.resolution, func.count(Case.id))
            .where(and_(*case_conditions, Case.resolution.isnot(None)))
            .group_by(Case.resolution)
        )
        res_rows = await db.execute(res_q)
        res_items = res_rows.all()
        res_total = sum(r[1] for r in res_items)
        resolution_distribution = [
            CaseDistributionItem(
                label=r[0] or "UNRESOLVED",
                count=r[1],
                percentage=round((r[1] / res_total * 100), 1) if res_total > 0 else 0.0
            )
            for r in res_items
        ]

        # 4. Case creation vs resolution timeline
        total_seconds = (dt_to - dt_from).total_seconds()
        time_fmt = "%H:00" if total_seconds <= 86400 else "%b %d"
        bucket_delta = timedelta(hours=1) if total_seconds <= 86400 else (timedelta(days=1) if total_seconds <= 31*86400 else timedelta(days=7))
        bucket_count = max(1, int(total_seconds // bucket_delta.total_seconds()) + 1)

        trend_map = {}
        for i in range(bucket_count):
            b_start = dt_from + (bucket_delta * i)
            if b_start > dt_to:
                break
            b_key = b_start.strftime(time_fmt)
            trend_map[b_key] = {"time": b_key, "timestamp": b_start.isoformat(), "created": 0, "resolved": 0}

        all_cases_stmt = select(Case.created_at, Case.resolved_at).where(and_(*case_conditions))
        all_cases_res = await db.execute(all_cases_stmt)
        for c_at, r_at in all_cases_res.all():
            if c_at:
                b_key = c_at.strftime(time_fmt)
                if b_key in trend_map:
                    trend_map[b_key]["created"] += 1
            if r_at:
                b_key = r_at.strftime(time_fmt)
                if b_key in trend_map:
                    trend_map[b_key]["resolved"] += 1

        case_trend = [
            CaseTrendPoint(
                time=b["time"],
                timestamp=b["timestamp"],
                created_count=b["created"],
                resolved_count=b["resolved"]
            )
            for b in trend_map.values()
        ]

        # 5. Analyst workload
        workload_stmt = (
            select(
                Case.assigned_to,
                func.count(Case.id),
                func.count(case((Case.status.in_(["OPEN", "INVESTIGATING", "PENDING"]), 1))),
                func.count(case((Case.status.in_(["RESOLVED", "CLOSED"]), 1)))
            )
            .where(and_(*case_conditions))
            .group_by(Case.assigned_to)
        )
        workload_res = await db.execute(workload_stmt)
        analyst_workload = []
        for a_id, assigned_c, open_cnt, resolved_cnt in workload_res.all():
            analyst_name = a_id or "Unassigned"
            analyst_workload.append(
                AnalystWorkloadItem(
                    analyst_name=analyst_name,
                    assigned_cases=assigned_c or 0,
                    open_cases=open_cnt or 0,
                    resolved_cases=resolved_cnt or 0
                )
            )

        return CaseAnalyticsResponse(
            time_range=range_label,
            date_from=dt_from.isoformat(),
            date_to=dt_to.isoformat(),
            total_cases=total_cases,
            open_cases=open_c,
            investigating_cases=inv_c,
            resolved_cases=res_c,
            closed_cases=closed_c,
            case_trend=case_trend,
            status_distribution=status_distribution,
            severity_distribution=severity_distribution,
            resolution_distribution=resolution_distribution,
            analyst_workload=analyst_workload
        )

    @classmethod
    async def get_geographic_analytics(
        cls,
        db: AsyncSession,
        params: AnalyticsFilterParams
    ) -> GeographicAnalyticsResponse:
        """
        Aggregates transaction volumes and risk rates across countries and cities.
        """
        dt_from, dt_to, range_label = cls.parse_date_range(params)
        txn_conditions = cls._build_transaction_filters(params, dt_from, dt_to)

        # 1. Countries Breakdown
        country_stmt = (
            select(
                Transaction.country,
                func.count(Transaction.id),
                func.coalesce(func.sum(Transaction.amount), 0.0),
                func.count(case((Transaction.risk_level.in_(["HIGH", "CRITICAL"]), 1)))
            )
            .where(and_(*txn_conditions, Transaction.country.isnot(None)))
            .group_by(Transaction.country)
            .order_by(desc(func.count(Transaction.id)))
            .limit(10)
        )
        country_res = await db.execute(country_stmt)
        countries = []
        for c_code, c_cnt, c_vol, c_high in country_res.all():
            c_cnt = c_cnt or 0
            c_high = c_high or 0
            pct = round((c_high / c_cnt * 100), 1) if c_cnt > 0 else 0.0
            countries.append(
                CountryAnalyticsItem(
                    country=c_code or "Unknown",
                    transaction_count=c_cnt,
                    total_volume=round(float(c_vol or 0.0), 2),
                    high_risk_count=c_high,
                    high_risk_percentage=pct
                )
            )

        # 2. Cities Breakdown
        city_stmt = (
            select(
                Transaction.city,
                Transaction.country,
                func.count(Transaction.id),
                func.count(case((Transaction.risk_level.in_(["HIGH", "CRITICAL"]), 1)))
            )
            .where(and_(*txn_conditions, Transaction.city.isnot(None)))
            .group_by(Transaction.city, Transaction.country)
            .order_by(desc(func.count(Transaction.id)))
            .limit(10)
        )
        city_res = await db.execute(city_stmt)
        cities = [
            CityAnalyticsItem(
                city=r[0] or "Unknown",
                country=r[1] or "Unknown",
                transaction_count=r[2] or 0,
                high_risk_count=r[3] or 0
            )
            for r in city_res.all()
        ]

        return GeographicAnalyticsResponse(
            time_range=range_label,
            date_from=dt_from.isoformat(),
            date_to=dt_to.isoformat(),
            countries=countries,
            cities=cities
        )

    @classmethod
    async def get_entity_patterns(
        cls,
        db: AsyncSession,
        params: AnalyticsFilterParams
    ) -> EntityPatternsResponse:
        """
        Analyzes entity behaviors including top merchants by volume and shared/high-velocity devices.
        """
        dt_from, dt_to, range_label = cls.parse_date_range(params)
        txn_conditions = cls._build_transaction_filters(params, dt_from, dt_to)

        # Top merchants by volume
        m_stmt = (
            select(
                Transaction.merchant_name,
                Transaction.merchant_category,
                func.count(Transaction.id),
                func.coalesce(func.sum(Transaction.amount), 0.0),
                func.count(case((Transaction.risk_level.in_(["HIGH", "CRITICAL"]), 1)))
            )
            .where(and_(*txn_conditions, Transaction.merchant_name.isnot(None)))
            .group_by(Transaction.merchant_name, Transaction.merchant_category)
            .order_by(desc(func.sum(Transaction.amount)))
            .limit(8)
        )
        m_res = await db.execute(m_stmt)
        top_merchants = []
        for m_name, m_cat, m_cnt, m_vol, m_high in m_res.all():
            m_cnt = m_cnt or 0
            m_high = m_high or 0
            rate = round((m_high / m_cnt * 100), 1) if m_cnt > 0 else 0.0
            top_merchants.append(
                MerchantRankingItem(
                    merchant_name=m_name or "Unknown Merchant",
                    merchant_category=m_cat,
                    transaction_count=m_cnt,
                    total_volume=round(float(m_vol or 0.0), 2),
                    high_risk_count=m_high,
                    high_risk_rate=rate
                )
            )

        # Top active / shared devices
        dev_stmt = (
            select(
                Transaction.device_id,
                func.count(func.distinct(Transaction.user_id)),
                func.count(Transaction.id),
                func.coalesce(func.avg(Transaction.risk_score), 0.0)
            )
            .where(and_(*txn_conditions, Transaction.device_id.isnot(None)))
            .group_by(Transaction.device_id)
            .order_by(desc(func.count(Transaction.id)))
            .limit(8)
        )
        dev_res = await db.execute(dev_stmt)
        top_devices = []
        for d_id, distinct_u, d_cnt, avg_s in dev_res.all():
            distinct_u = distinct_u or 0
            top_devices.append(
                DeviceRankingItem(
                    device_id=d_id or "Unknown",
                    distinct_users=distinct_u,
                    transaction_count=d_cnt or 0,
                    avg_risk_score=round(float(avg_s or 0.0), 1),
                    is_shared=bool(distinct_u > 1)
                )
            )

        return EntityPatternsResponse(
            time_range=range_label,
            date_from=dt_from.isoformat(),
            date_to=dt_to.isoformat(),
            top_merchants=top_merchants,
            top_devices=top_devices
        )
