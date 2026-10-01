"""
Real-Time Ingestion and Detection Pipeline Orchestrator.
Coordinates: Ingestion -> Feature Extraction -> Rules + ML -> Risk Score -> Alert Engine -> Profile Updates -> WebSocket Broadcast.
"""
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.models.transaction import Transaction, FeatureSnapshot
from backend.app.models.risk_profile import UserRiskProfile, DeviceRiskProfile, MerchantRiskProfile
from backend.app.models.risk_score import RiskScore
from backend.app.models.rule import RuleExecution
from backend.app.engine.feature_store import FeatureStore
from backend.app.engine.rules_engine import RulesEngine
from backend.app.engine.ml_engine import MLEngine
from backend.app.engine.risk_engine import RiskEngine
from backend.app.engine.risk.service import RiskEngineService
from backend.app.engine.alert_engine import AlertEngine
from backend.app.core.events import ws_manager

class IngestionPipeline:
    @staticmethod
    async def process_transaction(session: AsyncSession, txn_dict: Dict[str, Any]) -> Tuple[Transaction, Optional[Any]]:
        # 1. Idempotency / Duplicate Check
        txn_id = txn_dict.get("transaction_id") or f"TXN-{uuid.uuid4().hex[:10].upper()}"
        existing_stmt = select(Transaction).where(Transaction.id == txn_id)
        existing_res = await session.execute(existing_stmt)
        if existing_res.scalar_one_or_none():
            raise ValueError(f"Duplicate transaction ID: {txn_id} already exists.")

        user_id = txn_dict["user_id"]
        amount = float(txn_dict["amount"])
        device_id = txn_dict.get("device_id", "DEV-UNKNOWN")
        merchant_name = txn_dict.get("merchant_name", "Unknown Merchant")
        category = txn_dict.get("merchant_category", "general")
        city = txn_dict.get("city", "Unknown")

        # Parse timestamp
        raw_ts = txn_dict.get("timestamp")
        if isinstance(raw_ts, str):
            try:
                txn_time = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
            except Exception:
                txn_time = datetime.now(timezone.utc)
        else:
            txn_time = datetime.now(timezone.utc)

        # 2. Extract Features
        features = await FeatureStore.extract_features(session, txn_dict)

        # 3. Evaluate Rule Engine
        triggered_rules, total_rule_points = await RulesEngine.evaluate_rules(session, txn_dict, features)

        # 4. Run ML Anomaly Detection
        ml_anomaly_score, ml_latency_ms, model_version = MLEngine.score_transaction(txn_dict, features)

        # 5. Compute Risk Score & Factors
        risk_score, risk_level, risk_factors = RiskEngine.calculate_risk(
            txn_dict, features, triggered_rules, ml_anomaly_score
        )

        # Determine transaction final status
        if risk_level == "CRITICAL":
            txn_status = "BLOCKED" if risk_score >= 95.0 else "REVIEW_REQUIRED"
        elif risk_level == "HIGH":
            txn_status = "REVIEW_REQUIRED"
        elif risk_level == "MEDIUM":
            txn_status = "FLAGGED"
        else:
            txn_status = "APPROVED"

        # 6. Create Transaction Entity
        txn = Transaction(
            id=txn_id,
            transaction_id=txn_id,
            user_id=user_id,
            user_name=txn_dict.get("user_name"),
            merchant_id=txn_dict.get("merchant_id"),
            merchant_name=merchant_name,
            merchant_category=category,
            payment_method=txn_dict.get("payment_method", "credit_card"),
            transaction_type=txn_dict.get("transaction_type", "PURCHASE"),
            amount=amount,
            currency=txn_dict.get("currency", "USD"),
            device_id=device_id,
            ip_address=txn_dict.get("ip_address"),
            city=city,
            country=txn_dict.get("country"),
            latitude=txn_dict.get("latitude"),
            longitude=txn_dict.get("longitude"),
            failed_attempts=int(txn_dict.get("failed_attempts", 0)),
            source=txn_dict.get("source", "API"),
            risk_score=risk_score,
            risk_level=risk_level,
            ml_anomaly_score=round(ml_anomaly_score, 4),
            rules_triggered=triggered_rules,
            risk_factors=risk_factors,
            status=txn_dict.get("status") or txn_status,
            transaction_timestamp=txn_time,
            timestamp=txn_time,
            created_at=datetime.now(timezone.utc)
        )
        session.add(txn)

        # Save feature snapshot
        feature_snap = FeatureSnapshot(
            id=str(uuid.uuid4()),
            transaction_id=txn_id,
            features=features,
            created_at=datetime.now(timezone.utc)
        )
        session.add(feature_snap)

        # Record Rule Executions
        for r in triggered_rules:
            rex = RuleExecution(
                id=str(uuid.uuid4()),
                transaction_id=txn_id,
                rule_id=r["rule_id"],
                rule_version_id=r.get("rule_version_id"),
                triggered=True,
                score=r.get("score", r.get("points", 0.0)),
                points_awarded=r.get("points", 0.0),
                reason=r.get("reason") or r.get("details", {}).get("explanation", ""),
                execution_detail=r.get("details", {})
            )
            session.add(rex)

        # Record Risk Score Record
        risk_record = RiskScore(
            id=str(uuid.uuid4()),
            transaction_id=txn_id,
            score=risk_score,
            risk_level=risk_level,
            rule_score=sum(r.get("points", 0.0) for r in triggered_rules),
            ml_score=round(ml_anomaly_score * 100.0, 1),
            behavior_score=0.0,
            explanation=risk_factors,
            scoring_version=RiskEngineService.get_config().scoring_version,
            created_at=datetime.now(timezone.utc)
        )
        session.add(risk_record)

        # 7. Evaluate Alert Engine
        alert_obj = await AlertEngine.process_alert(
            session, txn_id, user_id, risk_score, risk_level, triggered_rules, model_version
        )

        # 8. Update User, Device, Merchant Risk Profiles
        await IngestionPipeline._update_profiles(session, txn, features, risk_score, risk_level, alert_obj is not None)

        await session.commit()
        await session.refresh(txn)

        # 9. Real-Time WebSocket Broadcasts
        # Broadcast Transaction
        txn_payload = {
            "id": txn.id,
            "user_id": txn.user_id,
            "user_name": txn.user_name,
            "amount": txn.amount,
            "currency": txn.currency,
            "merchant_name": txn.merchant_name,
            "merchant_category": txn.merchant_category,
            "device_id": txn.device_id,
            "city": txn.city,
            "country": txn.country,
            "risk_score": txn.risk_score,
            "risk_level": txn.risk_level,
            "ml_anomaly_score": txn.ml_anomaly_score,
            "rules_triggered": txn.rules_triggered,
            "risk_factors": txn.risk_factors,
            "status": txn.status,
            "timestamp": txn.timestamp.isoformat() if txn.timestamp else "",
            "source": txn.source
        }
        await ws_manager.broadcast_event("transaction.created", txn.id, txn_payload)

        # Broadcast Alert if created
        if alert_obj:
            alert_payload = {
                "id": alert_obj.id,
                "transaction_id": alert_obj.transaction_id,
                "user_id": alert_obj.user_id,
                "severity": alert_obj.severity,
                "risk_score": alert_obj.risk_score,
                "alert_reason": alert_obj.alert_reason,
                "triggered_rules": alert_obj.triggered_rules,
                "status": alert_obj.status,
                "created_at": alert_obj.created_at.isoformat() if alert_obj.created_at else ""
            }
            await ws_manager.broadcast_event("alert.created", alert_obj.id, alert_payload)

        return txn, alert_obj

    @staticmethod
    async def _update_profiles(session: AsyncSession, txn: Transaction, features: Dict[str, Any], risk_score: float, risk_level: str, has_alert: bool):
        # Update User Risk Profile
        u_res = await session.execute(select(UserRiskProfile).where(UserRiskProfile.user_id == txn.user_id))
        u_prof = u_res.scalar_one_or_none()
        if not u_prof:
            u_prof = UserRiskProfile(
                user_id=txn.user_id,
                user_name=txn.user_name,
                baseline_spending=txn.amount,
                std_dev_spending=20.0,
                total_transactions_count=1,
                total_spend_amount=txn.amount,
                fraud_incident_count=1 if has_alert else 0,
                last_known_risk_score=risk_score,
                known_devices=[txn.device_id],
                known_locations=[{"city": txn.city, "country": txn.country}],
                merchant_preferences=[{"merchant": txn.merchant_name, "count": 1}],
                active_risk_level=risk_level
            )
            session.add(u_prof)
        else:
            u_prof.total_transactions_count += 1
            u_prof.total_spend_amount += txn.amount
            if has_alert:
                u_prof.fraud_incident_count += 1
            u_prof.last_known_risk_score = risk_score
            u_prof.active_risk_level = risk_level
            if txn.device_id not in (u_prof.known_devices or []):
                devs = list(u_prof.known_devices or [])
                devs.append(txn.device_id)
                u_prof.known_devices = devs[-10:] # keep recent 10
            
            # locations
            locs = list(u_prof.known_locations or [])
            if not any(l.get("city") == txn.city for l in locs if isinstance(l, dict)):
                locs.append({"city": txn.city, "country": txn.country})
                u_prof.known_locations = locs[-10:]

        # Update Device Risk Profile
        d_res = await session.execute(select(DeviceRiskProfile).where(DeviceRiskProfile.device_id == txn.device_id))
        d_prof = d_res.scalar_one_or_none()
        if not d_prof:
            d_prof = DeviceRiskProfile(
                device_id=txn.device_id,
                first_seen_at=datetime.now(timezone.utc),
                last_seen_at=datetime.now(timezone.utc),
                associated_users=[txn.user_id],
                locations_used=[{"city": txn.city, "country": txn.country}],
                total_transactions=1,
                anomalous_transactions=1 if risk_level in ["HIGH", "CRITICAL"] else 0,
                risk_score=risk_score
            )
            session.add(d_prof)
        else:
            d_prof.last_seen_at = datetime.now(timezone.utc)
            d_prof.total_transactions += 1
            if risk_level in ["HIGH", "CRITICAL"]:
                d_prof.anomalous_transactions += 1
            d_prof.risk_score = max(d_prof.risk_score, risk_score)
            if txn.user_id not in (d_prof.associated_users or []):
                users = list(d_prof.associated_users or [])
                users.append(txn.user_id)
                d_prof.associated_users = users

        # Update Merchant Risk Profile
        m_res = await session.execute(select(MerchantRiskProfile).where(MerchantRiskProfile.merchant_name == txn.merchant_name))
        m_prof = m_res.scalar_one_or_none()
        if not m_prof:
            m_prof = MerchantRiskProfile(
                merchant_name=txn.merchant_name,
                category=txn.merchant_category,
                base_risk_tier="HIGH" if txn.merchant_category in ["crypto_exchange", "luxury_goods"] else "LOW",
                total_volume=txn.amount,
                total_transactions=1,
                alert_count=1 if has_alert else 0,
                fraud_confirmed_count=0
            )
            session.add(m_prof)
        else:
            m_prof.total_volume += txn.amount
            m_prof.total_transactions += 1
            if has_alert:
                m_prof.alert_count += 1
