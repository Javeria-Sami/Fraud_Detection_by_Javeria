"""
Rule 8 — Merchant Anomaly (MERCHANT_ANOMALY).
Section 07 — Rule-Based Fraud Engine.
"""
from typing import Dict, Any, List
from backend.app.engine.rules.base import BaseRule
from backend.app.engine.rules.types import (
    RuleEvaluationResult,
    RuleSeverity,
    RuleCategory,
    RuleEvidence
)

DEFAULT_HIGH_RISK_CATEGORIES = [
    "crypto_exchange",
    "luxury_goods",
    "gambling_casino",
    "Crypto & Exchange",
    "Gambling & Casino",
    "crypto",
    "casino",
    "gambling"
]


class MerchantAnomalyRule(BaseRule):
    """
    Detects abnormal merchant interactions, such as high-risk MCC categories with high amount deviations
    or novel merchant anomalies.
    """
    code = "MERCHANT_ANOMALY"
    name = "High-Risk Merchant Anomaly"
    description = "Flags transactions with high-risk merchant categories (crypto, casino) accompanied by baseline deviation."
    category = RuleCategory.MERCHANT
    default_severity = RuleSeverity.HIGH
    default_weight = 25.0

    def evaluate(
        self,
        transaction: Dict[str, Any],
        features: Dict[str, Any],
        configuration: Dict[str, Any],
        version: str
    ) -> RuleEvaluationResult:
        high_risk_list: List[str] = configuration.get("high_risk_categories", DEFAULT_HIGH_RISK_CATEGORIES)
        min_dev = float(configuration.get("min_amount_deviation", 2.0))

        category = str(transaction.get("merchant_category", "")).strip()
        merchant_name = str(transaction.get("merchant_name", "Unknown Merchant")).strip()
        amount_dev = float(features.get("amount_deviation", 1.0))
        is_new_merchant = int(features.get("is_new_merchant_for_user", 0))

        is_high_risk_cat = (
            category in high_risk_list
            or any(sub.lower() in category.lower() for sub in ["crypto", "casino", "gambling", "luxury"])
        )

        triggered = False
        reason = ""
        evidence = None

        if is_high_risk_cat and amount_dev >= min_dev:
            triggered = True
            reason = (
                f"High-risk merchant category '{category}' with elevated spending "
                f"({amount_dev:.1f}x baseline deviation vs {min_dev:.1f}x threshold)."
            )
            evidence = RuleEvidence(
                feature="merchant_category",
                actual_value=category,
                threshold=min_dev,
                comparison="category_match_with_deviation",
                metadata={"merchant_name": merchant_name, "amount_deviation": amount_dev}
            )
        elif is_high_risk_cat and is_new_merchant == 1:
            triggered = True
            reason = f"First-time transaction at high-risk merchant category '{category}' ({merchant_name})."
            evidence = RuleEvidence(
                feature="is_new_merchant_for_user",
                actual_value=1,
                threshold=1,
                comparison="equal",
                metadata={"merchant_category": category, "merchant_name": merchant_name}
            )

        return RuleEvaluationResult(
            rule_code=self.code,
            triggered=triggered,
            reason=reason if triggered else f"Merchant interaction '{merchant_name}' ({category}) conforms to acceptable risk profile.",
            evidence=evidence,
            matched_features={
                "merchant_category": category,
                "merchant_name": merchant_name,
                "is_high_risk_category": is_high_risk_cat,
                "is_new_merchant_for_user": is_new_merchant,
                "amount_deviation": amount_dev
            }
        )
