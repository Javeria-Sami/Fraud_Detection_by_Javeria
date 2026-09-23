"""
Sliding-Window Velocity and Volume Feature Calculators.
Section 06 — Feature Engineering.
Calculates time-window transaction frequencies (1m, 5m, 10m, 1h, 24h) and monetary volumes strictly prior to current transaction.
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Tuple

def calculate_velocity_features(
    current_time: datetime,
    recent_transactions: List[Tuple[datetime, float]]
) -> Dict[str, Any]:
    """
    Computes rolling transaction counts and volumes for sliding time windows:
    [T - 1m, T), [T - 5m, T), [T - 10m, T), [T - 1h, T), [T - 24h, T).
    
    Args:
        current_time: Timestamp of current transaction T
        recent_transactions: List of (timestamp, amount) tuples strictly prior to T
    """
    # Ensure timezone-aware UTC
    if current_time.tzinfo is None:
        t_now = current_time.replace(tzinfo=timezone.utc)
    else:
        t_now = current_time

    c_1m, v_1m = 0, 0.0
    c_5m, v_5m = 0, 0.0
    c_10m, v_10m = 0, 0.0
    c_1h, v_1h = 0, 0.0
    c_24h, v_24h = 0, 0.0

    t_1m = t_now - timedelta(minutes=1)
    t_5m = t_now - timedelta(minutes=5)
    t_10m = t_now - timedelta(minutes=10)
    t_1h = t_now - timedelta(hours=1)
    t_24h = t_now - timedelta(hours=24)

    intervals = []
    prev_time = None

    for tx_time, tx_amt in recent_transactions:
        # Standardize timezone
        if tx_time.tzinfo is None:
            tx_time_utc = tx_time.replace(tzinfo=timezone.utc)
        else:
            tx_time_utc = tx_time

        # Strictly before current transaction (data leakage guard)
        if tx_time_utc < t_now:
            amt = float(tx_amt or 0.0)

            if tx_time_utc >= t_1m:
                c_1m += 1
                v_1m += amt
            if tx_time_utc >= t_5m:
                c_5m += 1
                v_5m += amt
            if tx_time_utc >= t_10m:
                c_10m += 1
                v_10m += amt
            if tx_time_utc >= t_1h:
                c_1h += 1
                v_1h += amt
            if tx_time_utc >= t_24h:
                c_24h += 1
                v_24h += amt

            if prev_time is not None:
                interval_sec = abs((tx_time_utc - prev_time).total_seconds())
                intervals.append(interval_sec)
            prev_time = tx_time_utc

    avg_interval_seconds = round(sum(intervals) / len(intervals), 2) if intervals else 0.0

    return {
        "velocity_1m": int(c_1m),
        "velocity_5m": int(c_5m),
        "velocity_10m": int(c_10m),
        "velocity_1h": int(c_1h),
        "velocity_24h": int(c_24h),
        "volume_1m": round(float(v_1m), 2),
        "volume_5m": round(float(v_5m), 2),
        "volume_10m": round(float(v_10m), 2),
        "volume_1h": round(float(v_1h), 2),
        "volume_24h": round(float(v_24h), 2),
        "average_transaction_interval_seconds": avg_interval_seconds
    }
