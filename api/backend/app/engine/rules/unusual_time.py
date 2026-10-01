"""
Rule 5 — Unusual Transaction Time (UNUSUAL_TIME).
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


class UnusualTimeRule(BaseRule):
    """
    Flags transactions occurring outside historically normal transaction hours
    or overnight high-value activity relative to user baseline.
    """
    code = "UNUSUAL_TIME"
    name = "Unusual Transaction Time"
    description = "Flags transactions occurring during off-hours or outside historically normal customer patterns."
    category = RuleCategory.TIME
    default_severity = RuleSeverity.LOW
    default_weight = 15.0

    def evaluate(
        self,
        transaction: Dict[str, Any],
        features: Dict[str, Any],
        configuration: Dict[str, Any],
        version: str
    ) -> RuleEvaluationResult:
        night_start = int(configuration.get("night_start", configuration.get("night_start_hour", 1)))
        night_end = int(configuration.get("night_end", configuration.get("night_end_hour", 5)))
        min_dev_threshold = float(configuration.get("min_deviation_threshold", 2.0))

        hour = int(features.get("hour_of_day", 12))
        is_unusual_hour = int(features.get("is_unusual_transaction_hour", 0))
        amount_dev = float(features.get("amount_deviation", 1.0))

        triggered = False
        reason = ""
        evidence = None

        if is_unusual_hour == 1 and amount_dev >= 1.5:
            triggered = True
            reason = f"Transaction occurred outside the user's historically common transaction hours ({hour:02d}:00 UTC) with elevated amount."
            evidence = RuleEvidence(
                feature="is_unusual_transaction_hour",
                actual_value=1,
                threshold=1,
                comparison="equal",
                metadata={"hour_of_day": hour, "amount_deviation": amount_dev}
            )
        elif (night_start <= hour <= night_end) and amount_dev >= min_dev_threshold:
            triggered = True
            reason = (
                f"Elevated transaction initiated during off-hours window ({hour:02d}:00 UTC) "
                f"with {amount_dev:.1f}x customer baseline spend."
            )
            evidence = RuleEvidence(
                feature="hour_of_day",
                actual_value=hour,
                threshold=f"{night_start:02d}:00-{night_end:02d}:00",
                comparison="in_window",
                metadata={"night_start": night_start, "night_end": night_end, "amount_deviation": amount_dev}
            )

        return RuleEvaluationResult(
            rule_code=self.code,
            triggered=triggered,
            reason=reason if triggered else f"Transaction time ({hour:02d}:00 UTC) aligns with expected customer pattern.",
            evidence=evidence,
            matched_features={
                "hour_of_day": hour,
                "is_unusual_transaction_hour": is_unusual_hour,
                "amount_deviation": amount_dev
            }
        )
