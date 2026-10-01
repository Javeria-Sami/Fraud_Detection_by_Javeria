"""
Amount-Based Feature Calculators.
Section 06 — Feature Engineering.
Calculates monetary amounts, deviations from user historical baselines, ratios, and summary metrics.
"""
from typing import Dict, Any, List, Optional

def calculate_amount_features(
    amount: float,
    user_baseline: float,
    past_amounts: List[float]
) -> Dict[str, Any]:
    """
    Computes financial amount features against user historical context.
    Strictly uses history prior to current transaction.
    """
    amount = float(amount)
    user_baseline = float(user_baseline) if user_baseline and user_baseline > 0 else 100.0
    
    # 1. Historical calculations from past transactions
    if past_amounts:
        user_avg = sum(past_amounts) / len(past_amounts)
        sorted_amounts = sorted(past_amounts)
        n = len(sorted_amounts)
        if n % 2 == 1:
            user_median = sorted_amounts[n // 2]
        else:
            user_median = (sorted_amounts[n // 2 - 1] + sorted_amounts[n // 2]) / 2.0
        user_max = max(past_amounts)
        user_min = min(past_amounts)
    else:
        user_avg = user_baseline
        user_median = user_baseline
        user_max = amount
        user_min = amount

    # 2. Deviations and ratios (division-by-zero protected)
    amount_deviation = round(amount / max(1.0, user_baseline), 4)
    amount_deviation_from_avg = round((amount - user_avg) / max(1.0, user_avg), 4)
    amount_ratio_to_avg = round(amount / max(1.0, user_avg), 4)

    return {
        "amount": amount,
        "transaction_amount": amount,
        "user_baseline_amount": round(user_baseline, 2),
        "user_average_transaction_amount": round(user_avg, 2),
        "user_median_transaction_amount": round(user_median, 2),
        "amount_deviation": amount_deviation,
        "amount_deviation_from_user_average": amount_deviation_from_avg,
        "amount_ratio_to_user_average": amount_ratio_to_avg,
        "user_max_transaction_amount": round(user_max, 2),
        "user_min_transaction_amount": round(user_min, 2)
    }
