"""
Domain Event Publisher and Payload Sanitization.
Section 11 — Real-Time Event System.
"""
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from backend.app.models.transaction import Transaction
from backend.app.models.alert import Alert
from backend.app.engine.risk.types import RiskResult
from backend.app.engine.events.types import EventEnvelope, EventType
from backend.app.engine.events.manager import ws_manager


class EventPublisher:
    """
    Central publisher formulating standardized, sanitized event envelopes and dispatching them to the event bus.
    """

    @classmethod
    async def publish_transaction_created(
        cls,
        txn: Transaction,
        correlation_id: Optional[str] = None
    ) -> EventEnvelope:
        """Publishes sanitized transaction creation event."""
        sanitized_payload = {
            "id": txn.id,
            "transaction_id": txn.transaction_id or txn.id,
            "user_id": txn.user_id,
            "user_name": txn.user_name,
            "merchant_name": txn.merchant_name,
            "merchant_category": txn.merchant_category,
            "device_id": txn.device_id,
            "amount": float(txn.amount),
            "currency": txn.currency or "USD",
            "transaction_type": txn.transaction_type or "PURCHASE",
            "payment_method": txn.payment_method,
            "city": txn.city,
            "country": txn.country,
            "risk_score": float(txn.risk_score or 0.0),
            "risk_level": txn.risk_level or "LOW",
            "status": txn.status or "PENDING",
            "timestamp": txn.timestamp.isoformat() if txn.timestamp else datetime.now(timezone.utc).isoformat()
        }

        envelope = EventEnvelope(
            event_type=EventType.TRANSACTION_CREATED.value,
            entity_type="transaction",
            entity_id=txn.id,
            severity=txn.risk_level,
            correlation_id=correlation_id,
            payload=sanitized_payload
        )
        await ws_manager.broadcast_envelope(envelope, topic="transactions")
        return envelope

    @classmethod
    async def publish_risk_calculated(
        cls,
        risk_result: RiskResult,
        correlation_id: Optional[str] = None
    ) -> EventEnvelope:
        """Publishes risk score calculation event."""
        payload = {
            "transaction_id": risk_result.transaction_id,
            "risk_score": risk_result.risk_score,
            "risk_level": risk_result.risk_level.value,
            "rule_score": risk_result.rule_score,
            "ml_score": risk_result.ml_score,
            "behavior_score": risk_result.behavior_score,
            "scoring_version": risk_result.scoring_version,
            "status": risk_result.status.value,
            "calculated_at": risk_result.calculated_at
        }

        envelope = EventEnvelope(
            event_type=EventType.RISK_CALCULATED.value,
            entity_type="risk_score",
            entity_id=risk_result.transaction_id,
            severity=risk_result.risk_level.value,
            correlation_id=correlation_id,
            payload=payload
        )
        await ws_manager.broadcast_envelope(envelope, topic="risk")
        return envelope

    @classmethod
    async def publish_alert_created(
        cls,
        alert: Alert,
        correlation_id: Optional[str] = None
    ) -> EventEnvelope:
        """Publishes operational security alert creation event."""
        payload = {
            "id": alert.id,
            "alert_id": alert.alert_id or alert.id,
            "transaction_id": alert.transaction_id,
            "user_id": alert.user_id,
            "severity": alert.severity,
            "risk_score": float(alert.risk_score or 0.0),
            "title": alert.title or "Fraud Alert",
            "alert_reason": alert.alert_reason,
            "status": alert.status or "NEW",
            "assigned_to": alert.assigned_to,
            "case_id": alert.case_id,
            "created_at": alert.created_at.isoformat() if alert.created_at else datetime.now(timezone.utc).isoformat()
        }

        envelope = EventEnvelope(
            event_type=EventType.ALERT_CREATED.value,
            entity_type="alert",
            entity_id=alert.id,
            severity=alert.severity,
            correlation_id=correlation_id,
            payload=payload
        )
        await ws_manager.broadcast_envelope(envelope, topic="alerts")
        return envelope

    @classmethod
    async def publish_alert_updated(
        cls,
        alert_id: str,
        diff: Dict[str, Any],
        severity: Optional[str] = None,
        correlation_id: Optional[str] = None
    ) -> EventEnvelope:
        """Publishes alert lifecycle state update event."""
        envelope = EventEnvelope(
            event_type=EventType.ALERT_UPDATED.value,
            entity_type="alert",
            entity_id=alert_id,
            severity=severity,
            correlation_id=correlation_id,
            payload={"id": alert_id, **diff}
        )
        await ws_manager.broadcast_envelope(envelope, topic="alerts")
        return envelope

    @classmethod
    async def publish_system_status(
        cls,
        status_payload: Dict[str, Any],
        correlation_id: Optional[str] = None
    ) -> EventEnvelope:
        """Publishes platform operational health and status event."""
        envelope = EventEnvelope(
            event_type=EventType.SYSTEM_STATUS.value,
            entity_type="system",
            entity_id="platform",
            correlation_id=correlation_id,
            payload=status_payload
        )
        await ws_manager.broadcast_envelope(envelope, topic="system")
        return envelope
