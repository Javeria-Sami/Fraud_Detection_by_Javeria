"""
Rule 7 — Sudden Spending Increase (SUDDEN_SPENDING_INCREASE).
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


class SuddenSpendingIncreaseRule(BaseRule):
    """
    Detects sudden abnormal surge in short-term cumulative spending volume or hourly velocity.
    """
    code = "SUDDEN_SPENDING_INCREASE"
    name = "Sudden Spending Surge"
    description = "Flags sudden sharp surge in short-term spending volume or velocity compared to historic baseline."
    category = RuleCategory.BEHAVIOR
    default_severity = RuleSeverity.MEDIUM
    default_weight = 20.0

    def evaluate(
        self,
        transaction: Dict[str, Any],
        features: Dict[str, Any],
        configuration: Dict[str, Any],
        version: str
    ) -> RuleEvaluationResult:
        spending_multiplier = float(configuration.get("spending_multiplier", configuration.get("multiplier", 3.0)))
        max_txns_1h = int(configuration.get("max_txns_1h", 10))

        v_1h = int(features.get("velocity_1h", 1))
        amount_dev = float(features.get("amount_deviation", 1.0))
        vol_1h = float(features.get("volume_1h", float(transaction.get("amount", 0.0))))

        triggered = False
        reason = ""
        evidence = None

        if v_1h >= max_txns_1h:
            triggered = True
            reason = f"Abnormal hourly transaction surge: {v_1h} transactions in the last hour (threshold: {max_txns_1h})."
            evidence = RuleEvidence(
                feature="velocity_1h",
                actual_value=v_1h,
                threshold=max_txns_1h,
                comparison="greater_than_or_equal",
                metadata={"volume_1h": vol_1h}
            )
        elif amount_dev >= spending_multiplier and v_1h >= 2:
            triggered = True
            reason = (
                f"Sudden spending increase detected: cumulative 1-hour activity combined with {amount_dev:.1f}x "
                f"spend deviation exceeding {spending_multiplier:.1f}x multiplier threshold."
            )
            evidence = RuleEvidence(
                feature="amount_deviation",
                actual_value=round(amount_dev, 2),
                threshold=spending_multiplier,
                comparison="greater_than_or_equal",
                metadata={"velocity_1h": v_1h, "volume_1h": vol_1h}
            )

        return RuleEvaluationResult(
            rule_code=self.code,
            triggered=triggered,
            reason=reason if triggered else "Hourly spending volume and frequency are within expected norms.",
            evidence=evidence,
            matched_features={
                "velocity_1h": v_1h,
                "amount_deviation": amount_dev,
                "volume_1h": vol_1h
            }
        )
