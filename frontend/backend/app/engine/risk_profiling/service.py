"""
360-Degree Behavioral Risk Profiling Calculation Engine.
Provides time-aware entity baselines, statistical aggregations, cold-start handling,
and evidence-backed contextual risk signals for Users, Devices, and Merchants.
"""
import statistics
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc, and_, or_

from backend.app.models.transaction import Transaction
from backend.app.models.alert import Alert
from backend.app.models.case import Case
from backend.app.models.risk_profile import UserRiskProfile, DeviceRiskProfile, MerchantRiskProfile
from backend.app.schemas.profile import (
    UserProfileResponse, DeviceProfileResponse, MerchantProfileResponse,
    ProfileSignalItem, ProfileSummaryResponse
)

class RiskProfilingService:
    PROFILE_VERSION = "v1.0"
    FEATURE_VERSION = "v1.0.0"

    @classmethod
    async def calculate_user_profile(
        cls,
        session: AsyncSession,
        user_id: str,
        as_of_time: Optional[datetime] = None
    ) -> UserProfileResponse:
        """
        Calculate time-aware 360-degree behavioral profile for a user.
        as_of_time prevents temporal leakage when evaluating historical states.
        """
        # 1. Fetch transactions up to as_of_time
        query = select(Transaction).where(Transaction.user_id == user_id)
        if as_of_time:
            query = query.where(Transaction.timestamp <= as_of_time)
        query = query.order_by(asc(Transaction.timestamp))

        res = await session.execute(query)
        txns = res.scalars().all()

        # Fetch persistent cached profile for display name & prior fraud counters if available
        cached_res = await session.execute(
            select(UserRiskProfile).where(UserRiskProfile.user_id == user_id)
        )
        cached_prof = cached_res.scalar_one_or_none()
        user_name = (
            cached_prof.user_name if cached_prof and cached_prof.user_name
            else (txns[0].user_name if txns and txns[0].user_name else None)
        )

        total_txns = len(txns)

        # Cold start handling
        if total_txns == 0:
            signals = [
                ProfileSignalItem(
                    signal_code="NEW_USER_ACCOUNT",
                    label="New Customer Profile",
                    severity="INFO",
                    description="No prior transaction history on record for this user.",
                    evidence={"transactions_count": 0}
                )
            ]
            return UserProfileResponse(
                user_id=user_id,
                user_name=user_name,
                profile_state="NEW_ENTITY",
                baseline_spending=0.0,
                std_dev_spending=0.0,
                total_transactions_count=0,
                total_spend_amount=0.0,
                average_transaction_amount=0.0,
                median_transaction_amount=None,
                min_transaction_amount=None,
                max_transaction_amount=None,
                fraud_incident_count=cached_prof.fraud_incident_count if cached_prof else 0,
                last_known_risk_score=cached_prof.last_known_risk_score if cached_prof else 0.0,
                active_risk_level=cached_prof.active_risk_level if cached_prof else "LOW",
                usual_country=None,
                usual_city=None,
                usual_transaction_hours=[],
                known_devices=[],
                known_locations=[],
                merchant_preferences=[],
                contextual_signals=signals,
                first_seen_at=None,
                last_seen_at=None,
                last_calculated_at=datetime.now(timezone.utc).isoformat(),
                profile_version=cls.PROFILE_VERSION
            )

        # Profile state determination
        if total_txns < 5:
            profile_state = "LIMITED_HISTORY"
        else:
            profile_state = "ESTABLISHED"

        # Amount statistics
        amounts = [float(t.amount) for t in txns]
        total_spend = sum(amounts)
        avg_amount = round(total_spend / total_txns, 2)
        med_amount = round(statistics.median(amounts), 2)
        min_amount = round(min(amounts), 2)
        max_amount = round(max(amounts), 2)
        std_dev = round(statistics.stdev(amounts), 2) if total_txns > 1 else 0.0

        # Time & Habitual Hours
        hours_count: Dict[int, int] = {}
        for t in txns:
            ts = t.transaction_timestamp or t.timestamp
            if ts:
                h = ts.hour
                hours_count[h] = hours_count.get(h, 0) + 1
        usual_hours = sorted(hours_count.keys(), key=lambda h: hours_count[h], reverse=True)

        # Location Analysis
        country_counts: Dict[str, int] = {}
        city_counts: Dict[str, int] = {}
        locations_map: Dict[str, Dict[str, Any]] = {}

        for t in txns:
            c = t.country or "UNKNOWN"
            ci = t.city or "UNKNOWN"
            country_counts[c] = country_counts.get(c, 0) + 1
            city_counts[ci] = city_counts.get(ci, 0) + 1
            key = f"{ci}:{c}"
            if key not in locations_map and ci != "UNKNOWN":
                locations_map[key] = {"city": ci, "country": c, "count": 0}
            if key in locations_map:
                locations_map[key]["count"] += 1

        usual_country = max(country_counts.keys(), key=lambda k: country_counts[k]) if country_counts else None
        usual_city = max(city_counts.keys(), key=lambda k: city_counts[k]) if city_counts else None
        known_locations = list(locations_map.values())

        # Device Analysis
        device_counts: Dict[str, int] = {}
        for t in txns:
            d = t.device_id or "DEV-UNKNOWN"
            device_counts[d] = device_counts.get(d, 0) + 1
        known_devices = sorted(device_counts.keys(), key=lambda d: device_counts[d], reverse=True)

        # Merchant Preferences
        merch_counts: Dict[str, int] = {}
        for t in txns:
            m = t.merchant_name or "Unknown"
            merch_counts[m] = merch_counts.get(m, 0) + 1
        merchant_preferences = [
            {"merchant": m, "count": cnt}
            for m, cnt in sorted(merch_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        ]

        # Timestamps
        first_ts = (txns[0].transaction_timestamp or txns[0].timestamp or txns[0].created_at)
        last_ts = (txns[-1].transaction_timestamp or txns[-1].timestamp or txns[-1].created_at)
        first_seen_at = first_ts.isoformat() if first_ts else None
        last_seen_at = last_ts.isoformat() if last_ts else None

        # Risk score calculation / caching
        last_risk = float(txns[-1].risk_score or 0.0)
        active_level = txns[-1].risk_level or "LOW"

        # Prior fraud incidents
        fraud_incidents = cached_prof.fraud_incident_count if cached_prof else 0

        # Contextual Signals Derivation
        signals: List[ProfileSignalItem] = []

        if profile_state == "LIMITED_HISTORY":
            signals.append(
                ProfileSignalItem(
                    signal_code="LIMITED_HISTORY",
                    label="Limited Profile Baseline",
                    severity="INFO",
                    description=f"User has completed {total_txns} lifetime transactions. Baseline is still establishing.",
                    evidence={"transaction_count": total_txns}
                )
            )

        if len(known_devices) > 2:
            signals.append(
                ProfileSignalItem(
                    signal_code="MULTIPLE_DEVICES_OBSERVED",
                    label="Multiple Devices Observed",
                    severity="LOW",
                    description=f"User transacts across {len(known_devices)} distinct device fingerprints.",
                    evidence={"distinct_devices": len(known_devices), "devices": known_devices[:5]}
                )
            )

        if len(known_locations) > 2:
            signals.append(
                ProfileSignalItem(
                    signal_code="MULTI_LOCATION_FOOTPRINT",
                    label="Multi-City Geolocation Footprint",
                    severity="LOW",
                    description=f"User has transacted across {len(known_locations)} distinct cities.",
                    evidence={"locations_count": len(known_locations)}
                )
            )

        if fraud_incidents > 0:
            signals.append(
                ProfileSignalItem(
                    signal_code="PRIOR_FRAUD_INCIDENTS",
                    label="Prior Confirmed Fraud History",
                    severity="HIGH",
                    description=f"User account has {fraud_incidents} confirmed prior fraud/security incidents on record.",
                    evidence={"fraud_incidents": fraud_incidents}
                )
            )

        # Check latest transaction outlier relative to historical median
        if total_txns >= 3 and amounts[-1] > (med_amount * 3.0) and amounts[-1] > 500:
            signals.append(
                ProfileSignalItem(
                    signal_code="AMOUNT_ABOVE_HISTORICAL_MEDIAN",
                    label="Unusual Transaction Amount",
                    severity="MEDIUM",
                    description=f"Latest transaction amount (${amounts[-1]:,.2f}) is significantly above historical median (${med_amount:,.2f}).",
                    evidence={"latest_amount": amounts[-1], "historical_median": med_amount, "historical_average": avg_amount}
                )
            )

        return UserProfileResponse(
            user_id=user_id,
            user_name=user_name,
            profile_state=profile_state,
            baseline_spending=med_amount,
            std_dev_spending=std_dev,
            total_transactions_count=total_txns,
            total_spend_amount=total_spend,
            average_transaction_amount=avg_amount,
            median_transaction_amount=med_amount,
            min_transaction_amount=min_amount,
            max_transaction_amount=max_amount,
            fraud_incident_count=fraud_incidents,
            last_known_risk_score=last_risk,
            active_risk_level=active_level,
            usual_country=usual_country,
            usual_city=usual_city,
            usual_transaction_hours=usual_hours,
            known_devices=known_devices,
            known_locations=known_locations,
            merchant_preferences=merchant_preferences,
            contextual_signals=signals,
            first_seen_at=first_seen_at,
            last_seen_at=last_seen_at,
            last_calculated_at=datetime.now(timezone.utc).isoformat(),
            profile_version=cls.PROFILE_VERSION
        )

    @classmethod
    async def calculate_device_profile(
        cls,
        session: AsyncSession,
        device_id: str,
        as_of_time: Optional[datetime] = None
    ) -> DeviceProfileResponse:
        """
        Calculate time-aware behavioral profile for a device fingerprint.
        """
        query = select(Transaction).where(Transaction.device_id == device_id)
        if as_of_time:
            query = query.where(Transaction.timestamp <= as_of_time)
        query = query.order_by(asc(Transaction.timestamp))

        res = await session.execute(query)
        txns = res.scalars().all()

        total_txns = len(txns)

        if total_txns == 0:
            signals = [
                ProfileSignalItem(
                    signal_code="NEW_DEVICE",
                    label="Unseen Device Fingerprint",
                    severity="INFO",
                    description="No prior transaction telemetry recorded for this device.",
                    evidence={"transactions_count": 0}
                )
            ]
            return DeviceProfileResponse(
                device_id=device_id,
                profile_state="NEW_ENTITY",
                first_seen_at=None,
                last_seen_at=None,
                associated_users=[],
                distinct_users_count=0,
                locations_used=[],
                total_transactions=0,
                failed_transaction_count=0,
                failure_rate=0.0,
                anomalous_transactions=0,
                is_blacklisted="FALSE",
                risk_score=0.0,
                risk_level="LOW",
                average_amount=0.0,
                max_amount=0.0,
                contextual_signals=signals,
                last_calculated_at=datetime.now(timezone.utc).isoformat(),
                profile_version=cls.PROFILE_VERSION
            )

        profile_state = "LIMITED_HISTORY" if total_txns < 5 else "ESTABLISHED"

        # Unique users
        users_set = list(dict.fromkeys(t.user_id for t in txns if t.user_id))
        distinct_users_count = len(users_set)

        # Failures
        failed_count = sum(1 for t in txns if t.status in ["FAILED", "DECLINED", "BLOCKED"])
        failure_rate = round(failed_count / total_txns, 4) if total_txns > 0 else 0.0

        # Anomalous / High risk count
        anomalous_count = sum(1 for t in txns if t.risk_level in ["HIGH", "CRITICAL"])

        # Amounts
        amounts = [float(t.amount) for t in txns]
        avg_amount = round(sum(amounts) / total_txns, 2)
        max_amount = round(max(amounts), 2)

        # Locations
        locs: List[Dict[str, Any]] = []
        loc_keys = set()
        for t in txns:
            ci = t.city or "Unknown"
            co = t.country or "Unknown"
            key = f"{ci}:{co}"
            if key not in loc_keys:
                loc_keys.add(key)
                locs.append({"city": ci, "country": co})

        # Max risk score
        risk_score = max(float(t.risk_score or 0.0) for t in txns)
        risk_level = "CRITICAL" if risk_score >= 80 else ("HIGH" if risk_score >= 60 else ("MEDIUM" if risk_score >= 40 else "LOW"))

        first_ts = (txns[0].transaction_timestamp or txns[0].timestamp or txns[0].created_at)
        last_ts = (txns[-1].transaction_timestamp or txns[-1].timestamp or txns[-1].created_at)

        # Contextual Signals
        signals: List[ProfileSignalItem] = []

        if distinct_users_count > 1:
            signals.append(
                ProfileSignalItem(
                    signal_code="DEVICE_SHARED_BY_USERS",
                    label="Multi-Account Device Sharing",
                    severity="MEDIUM" if distinct_users_count <= 3 else "HIGH",
                    description=f"Device fingerprint is associated with {distinct_users_count} distinct user accounts.",
                    evidence={"distinct_users": distinct_users_count, "associated_users": users_set}
                )
            )

        if failure_rate >= 0.25 and total_txns >= 3:
            signals.append(
                ProfileSignalItem(
                    signal_code="HIGH_DEVICE_FAILURE_RATE",
                    label="Elevated Device Decline Rate",
                    severity="HIGH",
                    description=f"Device exhibits an elevated failure/decline rate of {failure_rate * 100:.1f}%.",
                    evidence={"failed_count": failed_count, "total_transactions": total_txns, "failure_rate": failure_rate}
                )
            )

        if len(locs) > 2:
            signals.append(
                ProfileSignalItem(
                    signal_code="GEO_HOPPING_DEVICE",
                    label="Geographically Dispersed Device",
                    severity="MEDIUM",
                    description=f"Device observed across {len(locs)} distinct geographic cities.",
                    evidence={"locations_count": len(locs)}
                )
            )

        return DeviceProfileResponse(
            device_id=device_id,
            profile_state=profile_state,
            first_seen_at=first_ts.isoformat() if first_ts else None,
            last_seen_at=last_ts.isoformat() if last_ts else None,
            associated_users=users_set,
            distinct_users_count=distinct_users_count,
            locations_used=locs,
            total_transactions=total_txns,
            failed_transaction_count=failed_count,
            failure_rate=failure_rate,
            anomalous_transactions=anomalous_count,
            is_blacklisted="TRUE" if risk_score >= 95.0 else "FALSE",
            risk_score=risk_score,
            risk_level=risk_level,
            average_amount=avg_amount,
            max_amount=max_amount,
            contextual_signals=signals,
            last_calculated_at=datetime.now(timezone.utc).isoformat(),
            profile_version=cls.PROFILE_VERSION
        )

    @classmethod
    async def calculate_merchant_profile(
        cls,
        session: AsyncSession,
        merchant_name: str,
        as_of_time: Optional[datetime] = None
    ) -> MerchantProfileResponse:
        """
        Calculate time-aware behavioral profile for a merchant entity.
        """
        query = select(Transaction).where(Transaction.merchant_name == merchant_name)
        if as_of_time:
            query = query.where(Transaction.timestamp <= as_of_time)
        query = query.order_by(asc(Transaction.timestamp))

        res = await session.execute(query)
        txns = res.scalars().all()

        total_txns = len(txns)

        if total_txns == 0:
            signals = [
                ProfileSignalItem(
                    signal_code="NEW_MERCHANT",
                    label="New Merchant Entity",
                    severity="INFO",
                    description="No prior transaction records for this merchant.",
                    evidence={"transactions_count": 0}
                )
            ]
            return MerchantProfileResponse(
                merchant_name=merchant_name,
                merchant_id=None,
                category=None,
                profile_state="NEW_ENTITY",
                base_risk_tier="LOW",
                total_volume=0.0,
                total_transactions=0,
                average_amount=0.0,
                median_amount=None,
                max_amount=None,
                failure_rate=0.0,
                distinct_users_count=0,
                distinct_devices_count=0,
                alert_count=0,
                fraud_confirmed_count=0,
                distinct_locations=[],
                contextual_signals=signals,
                first_seen_at=None,
                last_seen_at=None,
                last_calculated_at=datetime.now(timezone.utc).isoformat(),
                profile_version=cls.PROFILE_VERSION
            )

        profile_state = "LIMITED_HISTORY" if total_txns < 5 else "ESTABLISHED"
        category = txns[0].merchant_category if txns else "general"

        amounts = [float(t.amount) for t in txns]
        total_vol = sum(amounts)
        avg_amt = round(total_vol / total_txns, 2)
        med_amt = round(statistics.median(amounts), 2)
        max_amt = round(max(amounts), 2)

        failed_count = sum(1 for t in txns if t.status in ["FAILED", "DECLINED", "BLOCKED"])
        failure_rate = round(failed_count / total_txns, 4) if total_txns > 0 else 0.0

        distinct_users = len(set(t.user_id for t in txns if t.user_id))
        distinct_devices = len(set(t.device_id for t in txns if t.device_id))

        # Check alerts count for transactions associated with this merchant
        txn_ids = [t.id for t in txns]
        a_stmt = select(func.count(Alert.id)).where(Alert.transaction_id.in_(txn_ids))
        a_res = await session.execute(a_stmt)
        alert_count = a_res.scalar() or 0

        # Base risk tier
        if category in ["crypto_exchange", "luxury_goods", "money_transfer", "gambling"]:
            base_tier = "HIGH"
        elif category in ["electronics", "airline_tickets"]:
            base_tier = "MEDIUM"
        else:
            base_tier = "LOW"

        locs: List[Dict[str, Any]] = []
        loc_keys = set()
        for t in txns:
            ci = t.city or "Unknown"
            co = t.country or "Unknown"
            key = f"{ci}:{co}"
            if key not in loc_keys:
                loc_keys.add(key)
                locs.append({"city": ci, "country": co})

        first_ts = (txns[0].transaction_timestamp or txns[0].timestamp or txns[0].created_at)
        last_ts = (txns[-1].transaction_timestamp or txns[-1].timestamp or txns[-1].created_at)

        # Contextual Signals
        signals: List[ProfileSignalItem] = []

        if alert_count > 0:
            signals.append(
                ProfileSignalItem(
                    signal_code="MERCHANT_ALERT_HISTORY",
                    label="Associated Security Alerts",
                    severity="HIGH" if alert_count >= 3 else "MEDIUM",
                    description=f"Merchant has {alert_count} security alerts triggered across customer orders.",
                    evidence={"alert_count": alert_count}
                )
            )

        if failure_rate >= 0.20 and total_txns >= 4:
            signals.append(
                ProfileSignalItem(
                    signal_code="ELEVATED_MERCHANT_FAILURE_RATE",
                    label="Elevated Payment Decline Rate",
                    severity="MEDIUM",
                    description=f"Merchant exhibits an elevated payment decline rate of {failure_rate * 100:.1f}%.",
                    evidence={"failure_rate": failure_rate, "total_transactions": total_txns}
                )
            )

        return MerchantProfileResponse(
            merchant_name=merchant_name,
            merchant_id=txns[0].merchant_id if txns else None,
            category=category,
            profile_state=profile_state,
            base_risk_tier=base_tier,
            total_volume=total_vol,
            total_transactions=total_txns,
            average_amount=avg_amt,
            median_amount=med_amt,
            max_amount=max_amt,
            failure_rate=failure_rate,
            distinct_users_count=distinct_users,
            distinct_devices_count=distinct_devices,
            alert_count=alert_count,
            fraud_confirmed_count=0,
            distinct_locations=locs,
            contextual_signals=signals,
            first_seen_at=first_ts.isoformat() if first_ts else None,
            last_seen_at=last_ts.isoformat() if last_ts else None,
            last_calculated_at=datetime.now(timezone.utc).isoformat(),
            profile_version=cls.PROFILE_VERSION
        )

    @classmethod
    async def get_entity_summary(
        cls,
        session: AsyncSession,
        entity_type: str,
        entity_id: str
    ) -> ProfileSummaryResponse:
        """
        Unified compact summary endpoint for fast drawer/modal contextual embedding.
        """
        etype = entity_type.upper()
        if etype == "USER":
            prof = await cls.calculate_user_profile(session, entity_id)
            return ProfileSummaryResponse(
                entity_type="USER",
                entity_id=prof.user_id,
                display_name=prof.user_name or prof.user_id,
                profile_state=prof.profile_state,
                risk_score=prof.last_known_risk_score,
                risk_level=prof.active_risk_level,
                total_transactions=prof.total_transactions_count,
                total_volume=prof.total_spend_amount,
                primary_location=f"{prof.usual_city}, {prof.usual_country}" if prof.usual_city else None,
                key_signals=prof.contextual_signals[:3],
                last_activity_at=prof.last_seen_at
            )
        elif etype == "DEVICE":
            prof = await cls.calculate_device_profile(session, entity_id)
            return ProfileSummaryResponse(
                entity_type="DEVICE",
                entity_id=prof.device_id,
                display_name=prof.device_id,
                profile_state=prof.profile_state,
                risk_score=prof.risk_score,
                risk_level=prof.risk_level,
                total_transactions=prof.total_transactions,
                total_volume=0.0,
                primary_location=f"{prof.locations_used[0]['city']}, {prof.locations_used[0]['country']}" if prof.locations_used else None,
                key_signals=prof.contextual_signals[:3],
                last_activity_at=prof.last_seen_at
            )
        elif etype == "MERCHANT":
            prof = await cls.calculate_merchant_profile(session, entity_id)
            return ProfileSummaryResponse(
                entity_type="MERCHANT",
                entity_id=prof.merchant_name,
                display_name=prof.merchant_name,
                profile_state=prof.profile_state,
                risk_score=85.0 if prof.base_risk_tier == "HIGH" else 20.0,
                risk_level=prof.base_risk_tier,
                total_transactions=prof.total_transactions,
                total_volume=prof.total_volume,
                primary_location=f"{prof.distinct_locations[0]['city']}, {prof.distinct_locations[0]['country']}" if prof.distinct_locations else None,
                key_signals=prof.contextual_signals[:3],
                last_activity_at=prof.last_seen_at
            )
        else:
            raise ValueError(f"Unknown entity type: {entity_type}. Supported: USER, DEVICE, MERCHANT")
