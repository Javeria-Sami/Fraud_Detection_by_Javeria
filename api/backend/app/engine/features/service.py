"""
Feature Engineering Service.
Section 06 — Feature Engineering.
Orchestrates historical context extraction, time-window sliding calculations, cold-start handling,
data leakage prevention, and feature snapshot production.
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, distinct

from backend.app.models.transaction import Transaction
from backend.app.models.risk_profile import UserRiskProfile, DeviceRiskProfile, MerchantRiskProfile
from backend.app.engine.features.registry import FEATURE_VERSION
from backend.app.engine.features.amount import calculate_amount_features
from backend.app.engine.features.velocity import calculate_velocity_features
from backend.app.engine.features.device import calculate_device_features
from backend.app.engine.features.location import calculate_location_features
from backend.app.engine.features.time import calculate_time_features
from backend.app.engine.features.merchant import calculate_merchant_features
from backend.app.engine.features.failed_attempts import calculate_failed_attempt_features
from backend.app.engine.features.payment import calculate_payment_features
from backend.app.engine.features.validation import validate_feature_dict

class FeatureEngineeringService:
    @staticmethod
    async def extract_features(
        session: AsyncSession,
        txn_dict: Dict[str, Any],
        reference_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Extracts comprehensive features for a transaction with strict time-awareness and data leakage protection.
        
        Args:
            session: Async database session
            txn_dict: Raw or normalized transaction dictionary
            reference_time: Optional explicit timestamp (for historical recomputation)
        """
        user_id = str(txn_dict.get("user_id", "")).strip()
        amount = float(txn_dict.get("amount", 0.0))
        txn_id = txn_dict.get("transaction_id") or txn_dict.get("id")
        device_id = str(txn_dict.get("device_id", "")).strip()
        merchant_name = str(txn_dict.get("merchant_name", "")).strip()
        category = str(txn_dict.get("merchant_category", "general")).strip()
        payment_method = str(txn_dict.get("payment_method", "CREDIT_CARD")).strip()
        failed_attempts = int(txn_dict.get("failed_attempts", 0))
        country = txn_dict.get("country")
        city = txn_dict.get("city")
        lat = txn_dict.get("latitude")
        lon = txn_dict.get("longitude")

        # Determine authoritative transaction timestamp (UTC)
        if reference_time is not None:
            t_now = reference_time
        else:
            raw_ts = txn_dict.get("timestamp") or txn_dict.get("transaction_timestamp")
            if isinstance(raw_ts, str):
                try:
                    t_now = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
                except Exception:
                    t_now = datetime.now(timezone.utc)
            elif isinstance(raw_ts, datetime):
                t_now = raw_ts
            else:
                t_now = datetime.now(timezone.utc)

        if t_now.tzinfo is None:
            t_now = t_now.replace(tzinfo=timezone.utc)

        # -------------------------------------------------------------------
        # 1. Fetch User Risk Profile Context
        # -------------------------------------------------------------------
        u_prof_stmt = select(UserRiskProfile).where(UserRiskProfile.user_id == user_id)
        u_prof_res = await session.execute(u_prof_stmt)
        user_profile = u_prof_res.scalar_one_or_none()

        user_baseline = user_profile.baseline_spending if user_profile and user_profile.baseline_spending else 100.0
        known_devices = list(user_profile.known_devices or []) if user_profile else []
        known_locations = list(user_profile.known_locations or []) if user_profile else []
        known_cities = [loc.get("city") for loc in known_locations if isinstance(loc, dict) and loc.get("city")]
        known_countries = [loc.get("country") for loc in known_locations if isinstance(loc, dict) and loc.get("country")]

        # -------------------------------------------------------------------
        # 2. Query Historical User Transactions STRICTLY BEFORE t_now (Leakage Guard)
        # -------------------------------------------------------------------
        twenty_four_hours_ago = t_now - timedelta(hours=24)

        # A. Aggregate historical amounts prior to t_now
        user_history_stmt = (
            select(
                func.count(Transaction.id),
                func.sum(Transaction.amount),
                func.avg(Transaction.amount),
                func.max(Transaction.amount),
                func.min(Transaction.amount)
            )
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.transaction_timestamp < t_now,
                    Transaction.id != (txn_id or "")
                )
            )
        )
        u_hist_res = await session.execute(user_history_stmt)
        u_count, u_total, u_avg, u_max, u_min = u_hist_res.first() or (0, 0.0, None, None, None)
        u_count = u_count or 0
        u_total = float(u_total or 0.0)

        # B. Recent transactions in last 24h for sliding window velocities
        recent_tx_stmt = (
            select(Transaction.transaction_timestamp, Transaction.amount, Transaction.status)
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.transaction_timestamp >= twenty_four_hours_ago,
                    Transaction.transaction_timestamp < t_now,
                    Transaction.id != (txn_id or "")
                )
            )
            .order_by(Transaction.transaction_timestamp.asc())
        )
        recent_tx_res = await session.execute(recent_tx_stmt)
        recent_tx_rows = recent_tx_res.all()

        recent_tx_tuples = [(row[0], float(row[1] or 0.0)) for row in recent_tx_rows]
        historical_failures = [row[0] for row in recent_tx_rows if row[2] in ["FAILED", "DECLINED", "BLOCKED"]]

        # C. Previous single transaction for distance / geo-hop
        prev_tx_stmt = (
            select(
                Transaction.latitude,
                Transaction.longitude,
                Transaction.transaction_timestamp,
                Transaction.city,
                Transaction.country
            )
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.transaction_timestamp < t_now,
                    Transaction.id != (txn_id or "")
                )
            )
            .order_by(Transaction.transaction_timestamp.desc())
            .limit(1)
        )
        prev_tx_res = await session.execute(prev_tx_stmt)
        prev_tx_row = prev_tx_res.first()

        # D. Historical transaction hours for user behavioral time baseline
        hist_hours_stmt = (
            select(Transaction.transaction_timestamp)
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.transaction_timestamp < t_now,
                    Transaction.id != (txn_id or "")
                )
            )
            .limit(100)
        )
        hist_hours_res = await session.execute(hist_hours_stmt)
        hist_hours = [row[0].hour for row in hist_hours_res.all() if row[0]]

        # -------------------------------------------------------------------
        # 3. Query Device Historical Context
        # -------------------------------------------------------------------
        dev_stmt = (
            select(
                func.count(Transaction.id),
                func.count(distinct(Transaction.user_id)),
                func.min(Transaction.transaction_timestamp)
            )
            .where(
                and_(
                    Transaction.device_id == device_id,
                    Transaction.transaction_timestamp < t_now,
                    Transaction.id != (txn_id or "")
                )
            )
        )
        dev_res = await session.execute(dev_stmt)
        d_tx_count, d_user_count, d_first_seen = dev_res.first() or (0, 1, None)
        d_tx_count = d_tx_count or 0
        d_user_count = d_user_count or 1
        sec_since_device_first = (t_now - d_first_seen.replace(tzinfo=timezone.utc)).total_seconds() if d_first_seen else 0.0

        # -------------------------------------------------------------------
        # 4. Query Merchant Historical Context
        # -------------------------------------------------------------------
        merch_global_stmt = (
            select(func.count(Transaction.id))
            .where(
                and_(
                    Transaction.merchant_name == merchant_name,
                    Transaction.transaction_timestamp < t_now,
                    Transaction.id != (txn_id or "")
                )
            )
        )
        merch_global_res = await session.execute(merch_global_stmt)
        m_global_count = merch_global_res.scalar_one() or 0

        user_merch_stmt = (
            select(func.count(Transaction.id), func.sum(Transaction.amount))
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.merchant_name == merchant_name,
                    Transaction.transaction_timestamp < t_now,
                    Transaction.id != (txn_id or "")
                )
            )
        )
        user_merch_res = await session.execute(user_merch_stmt)
        u_m_count, u_m_vol = user_merch_res.first() or (0, 0.0)
        u_m_count = u_m_count or 0
        u_m_vol = float(u_m_vol or 0.0)

        # -------------------------------------------------------------------
        # 5. Compute Categorical Features
        # -------------------------------------------------------------------
        past_amounts_sample = [r[1] for r in recent_tx_tuples]
        if u_avg is not None and not past_amounts_sample:
            past_amounts_sample = [float(u_avg)]

        # Amount features
        amount_feats = calculate_amount_features(
            amount=amount,
            user_baseline=user_baseline,
            past_amounts=past_amounts_sample
        )

        # Velocity features
        velocity_feats = calculate_velocity_features(
            current_time=t_now,
            recent_transactions=recent_tx_tuples
        )

        # Device features
        device_feats = calculate_device_features(
            device_id=device_id,
            known_devices_for_user=known_devices,
            global_device_tx_count=d_tx_count,
            global_device_user_count=d_user_count,
            global_device_failed_count=0,
            seconds_since_first_seen=sec_since_device_first
        )

        # Location features
        loc_feats = calculate_location_features(
            country=country,
            city=city,
            latitude=lat,
            longitude=lon,
            current_time=t_now,
            known_countries=known_countries,
            known_cities=known_cities,
            last_tx_location=prev_tx_row
        )

        # Time features
        time_feats = calculate_time_features(
            timestamp=t_now,
            historical_hours=hist_hours
        )

        # Merchant features
        merch_feats = calculate_merchant_features(
            merchant_name=merchant_name,
            merchant_category=category,
            global_merchant_tx_count=m_global_count,
            user_merchant_tx_count=u_m_count,
            user_merchant_total_amount=u_m_vol
        )

        # Failed attempt features
        failed_feats = calculate_failed_attempt_features(
            current_failed_attempts=failed_attempts,
            current_time=t_now,
            historical_failures=historical_failures
        )

        # Payment features
        payment_feats = calculate_payment_features(
            payment_method=payment_method,
            known_payment_methods=[]
        )

        # -------------------------------------------------------------------
        # 6. Assemble Full Feature Snapshot
        # -------------------------------------------------------------------
        features: Dict[str, Any] = {
            "feature_version": FEATURE_VERSION,
            # Amount
            **amount_feats,
            # Historical & Cold-Start
            "user_transaction_count": int(u_count),
            "user_total_spend": round(u_total, 2),
            "has_sufficient_history": 1 if u_count >= 3 else 0,
            "is_first_user_transaction": 1 if u_count == 0 else 0,
            # Velocity
            **velocity_feats,
            # Device
            **device_feats,
            # Location
            **loc_feats,
            # Time
            **time_feats,
            # Merchant
            **merch_feats,
            # Failed Attempts
            **failed_feats,
            # Payment
            **payment_feats,
            # Context Metadata
            "currency": txn_dict.get("currency", "USD"),
            "transaction_type": txn_dict.get("transaction_type", "PURCHASE"),
            "payment_method": payment_method,
            "merchant_category": category,
            "city": city or "Unknown",
            "country": country or "Unknown",
            "source": txn_dict.get("source", "API"),
            "computed_at": datetime.now(timezone.utc).isoformat()
        }

        # Validate feature dictionary integrity
        is_valid, validation_errors = validate_feature_dict(features)
        if not is_valid:
            print(f"[!] Warning: Feature validation issues detected: {validation_errors}")

        return features
