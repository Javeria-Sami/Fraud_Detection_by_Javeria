"""
Temporal and Cyclical Feature Calculators.
Section 06 — Feature Engineering.
Calculates hour, day, month, weekend, night, cyclical trigonometric encodings, and behavioral unusual time indicators.
"""
import math
from datetime import datetime, timezone
from typing import Dict, Any, List

def calculate_time_features(
    timestamp: datetime,
    historical_hours: List[int]
) -> Dict[str, Any]:
    """
    Computes temporal features from UTC timestamp and user historical transaction hours.
    """
    if timestamp.tzinfo is None:
        ts = timestamp.replace(tzinfo=timezone.utc)
    else:
        ts = timestamp

    hour = ts.hour
    day_of_week = ts.weekday()  # 0=Monday, 6=Sunday
    day_of_month = ts.day
    month = ts.month

    is_weekend = 1 if day_of_week in [5, 6] else 0
    is_night = 1 if (hour >= 23 or hour < 5) else 0

    # Cyclical trigonometric projection (preserves distance between 23:00 and 00:00)
    hour_sin = round(math.sin(2.0 * math.pi * hour / 24.0), 4)
    hour_cos = round(math.cos(2.0 * math.pi * hour / 24.0), 4)

    # Behavioral unusual hour check: if user has >= 5 past transactions, check if current hour is rare (< 5% of past activity)
    is_unusual_hour = 0
    if historical_hours and len(historical_hours) >= 5:
        hour_count = historical_hours.count(hour)
        if (hour_count / len(historical_hours)) < 0.05 and is_night:
            is_unusual_hour = 1

    return {
        "hour_of_day": int(hour),
        "day_of_week": int(day_of_week),
        "day_of_month": int(day_of_month),
        "month": int(month),
        "is_weekend": int(is_weekend),
        "is_night": int(is_night),
        "hour_sin": hour_sin,
        "hour_cos": hour_cos,
        "is_unusual_transaction_hour": int(is_unusual_hour)
    }
