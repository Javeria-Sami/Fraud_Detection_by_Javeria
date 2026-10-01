"""
Merchant and Counterparty Behavioral Feature Calculators.
Section 06 — Feature Engineering.
Calculates merchant risk categories, transaction volume, and user-merchant relationship frequency.
"""
from typing import Dict, Any, List, Set

HIGH_RISK_MERCHANT_CATEGORIES = {
    "crypto_exchange",
    "crypto",
    "luxury_goods",
    "luxury",
    "casino",
    "gambling",
    "money_transfer",
    "wire_service"
}

def calculate_merchant_features(
    merchant_name: str,
    merchant_category: str,
    global_merchant_tx_count: int,
    user_merchant_tx_count: int,
    user_merchant_total_amount: float
) -> Dict[str, Any]:
    """
    Computes merchant category risk and user-merchant relationship metrics.
    """
    cat_clean = (merchant_category or "").lower().strip().replace(" & ", "_").replace(" ", "_")
    is_high_risk = 1 if any(h in cat_clean for h in HIGH_RISK_MERCHANT_CATEGORIES) else 0
    is_new_merchant_for_user = 1 if (user_merchant_tx_count or 0) == 0 else 0

    return {
        "is_high_risk_category": int(is_high_risk),
        "merchant_transaction_count": int(global_merchant_tx_count or 0),
        "user_merchant_transaction_count": int(user_merchant_tx_count or 0),
        "user_merchant_total_amount": round(float(user_merchant_total_amount or 0.0), 2),
        "is_new_merchant_for_user": int(is_new_merchant_for_user)
    }
