"""
Rule 9 — Compound Behavioral Deviation (BEHAVIOR_DEVIATION).
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


class BehaviorDeviationRule(BaseRule):
    """
    Detects complex multi-factor compound anomalies (e.g. simultaneous unfamiliar device + location leap + high amount).
    """
    code = "BEHAVIOR_DEVIATION"
    name = "Compound Behavioral Deviation"
    description = "Detects compound anomalies across simultaneous novel device, location leap, and elevated amount."
    category = RuleCategory.BEHAVIOR
    default_severity = RuleSeverity.CRITICAL
    default_weight = 35.0

    def evaluate(
        self,
        transaction: Dict[str, Any],
        features: Dict[str, Any],
        configuration: Dict[str, Any],
        version: str
    ) -> RuleEvaluationResult:
        is_new_dev = int(features.get("is_new_device", 0))
        is_unusual_loc = int(features.get("is_unusual_location", 0))
        is_new_country = int(features.get("is_new_country", 0))
        amount_dev = float(features.get("amount_deviation", 1.0))
        failed_attempts = int(features.get("failed_attempts", 0))

        min_dev_threshold = float(configuration.get("min_deviation_threshold", 4.0))

        triggered = False
        reason = ""
        evidence = None

        if is_new_dev == 1 and (is_unusual_loc == 1 or is_new_country == 1):
            triggered = True
            reason = "Compound behavioral anomaly: simultaneous novel device and unfamiliar geographical location."
            evidence = RuleEvidence(
                feature="compound_device_location",
                actual_value={"is_new_device": 1, "is_unusual_location": 1},
                threshold=None,
                comparison="compound_match",
                metadata={"amount_deviation": amount_dev}
            )
        elif amount_dev >= min_dev_threshold and failed_attempts > 0:
            triggered = True
            reason = f"Compound behavioral anomaly: high amount ({amount_dev:.1f}x baseline) directly preceded by {failed_attempts} failed auth attempts."
            evidence = RuleEvidence(
                feature="compound_amount_failed_attempts",
                actual_value={"amount_deviation": amount_dev, "failed_attempts": failed_attempts},
                threshold=min_dev_threshold,
                comparison="greater_than_or_equal",
                metadata={"min_deviation_threshold": min_dev_threshold}
            )

        return RuleEvaluationResult(
            rule_code=self.code,
            triggered=triggered,
            reason=reason if triggered else "Behavioral indicators do not exhibit compound anomaly patterns.",
            evidence=evidence,
            matched_features={
                "is_new_device": is_new_dev,
                "is_unusual_location": is_unusual_loc,
                "amount_deviation": amount_dev,
                "failed_attempts": failed_attempts
            }
        )
