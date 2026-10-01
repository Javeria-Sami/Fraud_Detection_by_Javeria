"""
Failed Attempt Behavioral Feature Calculators.
Section 06 — Feature Engineering.
Calculates historical failed transaction counts across sliding windows (10m, 1h, 24h).
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Tuple

def calculate_failed_attempt_features(
    current_failed_attempts: int,
    current_time: datetime,
    historical_failures: List[datetime]
) -> Dict[str, Any]:
    """
    Computes failed attempt counts in sliding windows strictly prior to current transaction.
    """
    if current_time.tzinfo is None:
        t_now = current_time.replace(tzinfo=timezone.utc)
    else:
        t_now = current_time

    t_10m = t_now - timedelta(minutes=10)
    t_1h = t_now - timedelta(hours=1)
    t_24h = t_now - timedelta(hours=24)

    f_10m, f_1h, f_24h = 0, 0, 0

    for fail_ts in historical_failures:
        if fail_ts.tzinfo is None:
            ts_utc = fail_ts.replace(tzinfo=timezone.utc)
        else:
            ts_utc = fail_ts

        if ts_utc < t_now:
            if ts_utc >= t_10m:
                f_10m += 1
            if ts_utc >= t_1h:
                f_1h += 1
            if ts_utc >= t_24h:
                f_24h += 1

    return {
        "failed_attempts": int(current_failed_attempts or 0),
        "failed_transactions_last_10m": int(f_10m),
        "failed_transactions_last_1h": int(f_1h),
        "failed_transactions_last_24h": int(f_24h)
    }
