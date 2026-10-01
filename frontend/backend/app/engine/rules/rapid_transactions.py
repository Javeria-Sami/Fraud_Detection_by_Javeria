"""
Rule 2 — Rapid Transactions / Velocity Burst (RAPID_TRANSACTIONS).
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


class RapidTransactionsRule(BaseRule):
    """
    Detects unusually high transaction velocity/frequency within a short configured time window (e.g. 5 min or 10 min).
    """
    code = "RAPID_TRANSACTIONS"
    name = "Rapid Transaction Sequence"
    description = "Flags rapid transaction bursts exceeding velocity threshold within short sliding windows."
    category = RuleCategory.VELOCITY
    default_severity = RuleSeverity.HIGH
    default_weight = 25.0

    def evaluate(
        self,
        transaction: Dict[str, Any],
        features: Dict[str, Any],
        configuration: Dict[str, Any],
        version: str
    ) -> RuleEvaluationResult:
        window_minutes = int(configuration.get("window_minutes", 5))
        count_threshold = int(configuration.get("count_threshold", configuration.get("max_txns_5m", configuration.get("max_txns", 4))))

        # Determine which feature to use based on window_minutes
        if window_minutes <= 1:
            velocity = int(features.get("velocity_1m", 1))
            feature_name = "velocity_1m"
        elif window_minutes <= 5:
            velocity = int(features.get("velocity_5m", 1))
            feature_name = "velocity_5m"
        elif window_minutes <= 10:
            velocity = int(features.get("velocity_10m", features.get("velocity_5m", 1)))
            feature_name = "velocity_10m"
        else:
            velocity = int(features.get("velocity_1h", 1))
            feature_name = "velocity_1h"

        triggered = velocity >= count_threshold
        reason = ""
        evidence = None

        if triggered:
            reason = f"High velocity burst detected: {velocity} transactions in the last {window_minutes} minutes (threshold: {count_threshold})."
            evidence = RuleEvidence(
                feature=feature_name,
                actual_value=velocity,
                threshold=count_threshold,
                comparison="greater_than_or_equal",
                metadata={"window_minutes": window_minutes}
            )

        return RuleEvaluationResult(
            rule_code=self.code,
            triggered=triggered,
            reason=reason if triggered else f"Transaction frequency ({velocity} in {window_minutes}m) is normal.",
            evidence=evidence,
            matched_features={
                feature_name: velocity,
                "window_minutes": window_minutes,
                "count_threshold": count_threshold
            }
        )
