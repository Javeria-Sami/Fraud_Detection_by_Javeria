"""
Rule 3 — New Device Detection (NEW_DEVICE).
Section 07 — Rule-Based Fraud Engine.
"""
from typing import Dict, Any
from backend.app.engine.rules.base import BaseRule
from backend.app.engine.rules.types import (
    RuleEvaluationResult,
    RuleSeverity,
    RuleCategory,
    RuleEvidence
)


class NewDeviceRule(BaseRule):
    """
    Identifies transactions originating from an unrecognized device fingerprint never before used by the user.
    """
    code = "NEW_DEVICE"
    name = "Unseen Novel Device"
    description = "Flags transactions originating from a device fingerprint not previously associated with this user."
    category = RuleCategory.DEVICE
    default_severity = RuleSeverity.MEDIUM
    default_weight = 20.0

    def evaluate(
        self,
        transaction: Dict[str, Any],
        features: Dict[str, Any],
        configuration: Dict[str, Any],
        version: str
    ) -> RuleEvaluationResult:
        is_enabled = bool(configuration.get("enabled", True))
        is_new_device = int(features.get("is_new_device", 0))
        device_id = transaction.get("device_id") or "DEV-UNKNOWN"
        device_txn_count = int(features.get("device_transaction_count", 0))

        triggered = is_enabled and (is_new_device == 1)
        reason = ""
        evidence = None

        if triggered:
            reason = f"Transaction originated from a device '{device_id}' not previously associated with this user's transaction history."
            evidence = RuleEvidence(
                feature="is_new_device",
                actual_value=1,
                threshold=1,
                comparison="equal",
                metadata={"device_id": device_id, "device_transaction_count": device_txn_count}
            )

        return RuleEvaluationResult(
            rule_code=self.code,
            triggered=triggered,
            reason=reason if triggered else "Device has been previously authenticated and used by this user.",
            evidence=evidence,
            matched_features={
                "is_new_device": is_new_device,
                "device_id": device_id,
                "device_transaction_count": device_txn_count
            }
        )
