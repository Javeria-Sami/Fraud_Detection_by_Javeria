"""
Rule 6 — Failed Attempts Spike (FAILED_ATTEMPTS).
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


class FailedAttemptsRule(BaseRule):
    """
    Detects repeated failed authentication, PIN, or CVV attempts preceding the current transaction.
    """
    code = "FAILED_ATTEMPTS"
    name = "Authentication Attempt Spike"
    description = "Flags repeated failed authorizations, PIN, or CVV validation attempts preceding transaction."
    category = RuleCategory.FAILED_ATTEMPTS
    default_severity = RuleSeverity.HIGH
    default_weight = 25.0

    def evaluate(
        self,
        transaction: Dict[str, Any],
        features: Dict[str, Any],
        configuration: Dict[str, Any],
        version: str
    ) -> RuleEvaluationResult:
        max_failed = int(configuration.get("max_failed_attempts", configuration.get("count_threshold", 2)))
        failed_attempts = int(features.get("failed_attempts", transaction.get("failed_attempts", 0)))
        failed_10m = int(features.get("failed_transactions_last_10m", failed_attempts))

        effective_failed = max(failed_attempts, failed_10m)
        triggered = effective_failed >= max_failed
        reason = ""
        evidence = None

        if triggered:
            reason = f"{effective_failed} failed authentication/CVV attempts preceding this transaction (threshold: {max_failed})."
            evidence = RuleEvidence(
                feature="failed_attempts",
                actual_value=effective_failed,
                threshold=max_failed,
                comparison="greater_than_or_equal",
                metadata={"failed_attempts": failed_attempts, "failed_10m": failed_10m}
            )

        return RuleEvaluationResult(
            rule_code=self.code,
            triggered=triggered,
            reason=reason if triggered else f"Failed attempts ({effective_failed}) is below threshold of {max_failed}.",
            evidence=evidence,
            matched_features={
                "failed_attempts": effective_failed,
                "max_failed_threshold": max_failed
            }
        )
