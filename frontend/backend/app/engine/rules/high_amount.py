"""
Rule 1 — High Transaction Amount (HIGH_AMOUNT).
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


class HighAmountRule(BaseRule):
    """
    Flags transactions whose amount significantly exceeds the customer's historical baseline
    or a configured high absolute value threshold.
    """
    code = "HIGH_AMOUNT"
    name = "High Transaction Amount"
    description = "Flags transactions exceeding customer baseline average multiplier or absolute threshold."
    category = RuleCategory.AMOUNT
    default_severity = RuleSeverity.HIGH
    default_weight = 25.0

    def evaluate(
        self,
        transaction: Dict[str, Any],
        features: Dict[str, Any],
        configuration: Dict[str, Any],
        version: str
    ) -> RuleEvaluationResult:
        amount = float(transaction.get("amount", 0.0))
        amount_dev = float(features.get("amount_deviation", features.get("amount_deviation_from_user_average", 1.0)))
        user_baseline = float(features.get("user_baseline_amount", features.get("user_average_transaction_amount", amount)))

        # Configuration parameters
        multiplier = float(configuration.get("multiplier", configuration.get("deviation_threshold", 5.0)))
        min_amount = float(configuration.get("min_amount", configuration.get("threshold", 500.0)))
        mode = configuration.get("mode", "user_deviation")

        triggered = False
        reason = ""
        evidence = None

        if mode == "absolute_threshold":
            abs_threshold = float(configuration.get("threshold", 5000.0))
            if amount >= abs_threshold:
                triggered = True
                reason = f"Transaction amount ${amount:.2f} exceeds absolute threshold of ${abs_threshold:.2f}."
                evidence = RuleEvidence(
                    feature="amount",
                    actual_value=amount,
                    threshold=abs_threshold,
                    comparison="greater_than_or_equal",
                    metadata={"mode": mode}
                )
        else:
            # User baseline deviation mode
            if amount_dev >= multiplier and amount >= min_amount:
                triggered = True
                reason = (
                    f"Transaction amount ${amount:.2f} is {amount_dev:.1f}x the customer historical baseline "
                    f"(${user_baseline:.2f}), exceeding {multiplier:.1f}x threshold (minimum ${min_amount:.2f})."
                )
                evidence = RuleEvidence(
                    feature="amount_deviation",
                    actual_value=round(amount_dev, 2),
                    threshold=multiplier,
                    comparison="greater_than_or_equal",
                    metadata={
                        "amount": amount,
                        "user_baseline": round(user_baseline, 2),
                        "min_amount": min_amount
                    }
                )

        return RuleEvaluationResult(
            rule_code=self.code,
            triggered=triggered,
            reason=reason if triggered else "Transaction amount is within expected customer baseline bounds.",
            evidence=evidence,
            matched_features={
                "amount": amount,
                "amount_deviation": amount_dev,
                "user_baseline_amount": user_baseline
            }
        )
