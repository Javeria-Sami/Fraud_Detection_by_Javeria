"""
Payment Instrument Behavioral Feature Calculators.
Section 06 — Feature Engineering.
Calculates payment instrument novelty and diversity.
"""
from typing import Dict, Any, List

def calculate_payment_features(
    payment_method: str,
    known_payment_methods: List[str]
) -> Dict[str, Any]:
    """
    Computes payment method novelty and diversity metrics.
    """
    clean_method = (payment_method or "").strip().upper()
    is_new_method = 1 if (known_payment_methods and clean_method not in known_payment_methods) else 0
    method_count = len(set(known_payment_methods) | {clean_method}) if known_payment_methods else 1

    return {
        "is_new_payment_method": int(is_new_method),
        "user_payment_method_count": int(method_count)
    }
