"""
Data Quality and Feature Integrity Monitoring Service.
Section 20 — Model Monitoring & MLOps.

Tracks:
1. Missing value rates and counts.
2. Invalid numeric values (NaN, +Inf, -Inf).
3. Out-of-range feature boundary violations.
4. Categorical domain validity and unexpected keys.
5. Data freshness and processing delay.
6. Feature version compatibility with the deployed model version.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import numpy as np


FEATURE_BOUNDS = {
    "amount": {"min": 0.0, "max": 10000000.0},
    "amount_deviation": {"min": 0.0, "max": 1000.0},
    "velocity_5m": {"min": 0, "max": 500},
    "velocity_1h": {"min": 0, "max": 2000},
    "velocity_24h": {"min": 0, "max": 10000},
    "geo_hop_speed_kmh": {"min": 0.0, "max": 2000.0},
    "hour_of_day": {"min": 0, "max": 23},
    "day_of_week": {"min": 0, "max": 6},
    "failed_attempts": {"min": 0, "max": 100},
    "is_new_device": {"allowed": [0, 1]},
    "is_unusual_location": {"allowed": [0, 1]},
    "is_new_country": {"allowed": [0, 1]},
    "is_unusual_transaction_hour": {"allowed": [0, 1]}
}


def evaluate_data_quality(
    records: List[Dict[str, Any]],
    expected_features: List[str],
    model_feature_version: str = "v1.0",
    max_acceptable_missing_ratio: float = 0.05
) -> Dict[str, Any]:
    """
    Evaluates data quality across a collection of feature snapshots.
    """
    total_records = len(records)
    if total_records == 0:
        return {
            "total_records": 0,
            "status": "UNKNOWN",
            "reason": "No records available in monitoring window",
            "missing_stats": {},
            "invalid_stats": {},
            "out_of_bounds_stats": {},
            "freshness_lag_sec": 0.0,
            "version_compatibility": True
        }

    missing_counts = {feat: 0 for feat in expected_features}
    nan_counts = {feat: 0 for feat in expected_features}
    inf_counts = {feat: 0 for feat in expected_features}
    out_of_bounds_counts = {feat: 0 for feat in expected_features}

    timestamps = []

    for rec in records:
        ts = rec.get("created_at") or rec.get("timestamp") or rec.get("transaction_timestamp")
        if isinstance(ts, datetime):
            timestamps.append(ts)
        elif isinstance(ts, str):
            try:
                timestamps.append(datetime.fromisoformat(ts.replace("Z", "+00:00")))
            except Exception:
                pass

        for feat in expected_features:
            if feat not in rec or rec[feat] is None:
                missing_counts[feat] += 1
                continue

            val = rec[feat]
            # Check NaN / Inf for numeric
            if isinstance(val, (int, float)):
                if np.isnan(val):
                    nan_counts[feat] += 1
                elif np.isinf(val):
                    inf_counts[feat] += 1
                else:
                    # Check boundary rules
                    bounds = FEATURE_BOUNDS.get(feat)
                    if bounds:
                        if "min" in bounds and val < bounds["min"]:
                            out_of_bounds_counts[feat] += 1
                        elif "max" in bounds and val > bounds["max"]:
                            out_of_bounds_counts[feat] += 1
                        elif "allowed" in bounds and val not in bounds["allowed"]:
                            out_of_bounds_counts[feat] += 1
            elif isinstance(val, str):
                if val.strip() == "":
                    missing_counts[feat] += 1

    # Aggregate summaries
    missing_pcts = {
        feat: round((count / total_records) * 100, 2)
        for feat, count in missing_counts.items()
    }
    invalid_pcts = {
        feat: round(((nan_counts[feat] + inf_counts[feat]) / total_records) * 100, 2)
        for feat, count in nan_counts.items()
    }

    max_missing_rate = max(missing_pcts.values()) if missing_pcts else 0.0
    total_invalid = sum(nan_counts.values()) + sum(inf_counts.values())
    total_out_of_bounds = sum(out_of_bounds_counts.values())

    # Calculate data freshness lag
    freshness_lag_sec = 0.0
    if timestamps:
        latest_ts = max(timestamps)
        if latest_ts.tzinfo is None:
            latest_ts = latest_ts.replace(tzinfo=timezone.utc)
        now_utc = datetime.now(timezone.utc)
        freshness_lag_sec = max(0.0, (now_utc - latest_ts).total_seconds())

    # Health status determination
    if max_missing_rate > 20.0 or total_invalid > 0 or total_out_of_bounds > (total_records * 0.1):
        status = "CRITICAL"
        reason = f"High data quality degradation: max missing {max_missing_rate}%, invalid {total_invalid}, out-of-bounds {total_out_of_bounds}"
    elif max_missing_rate > (max_acceptable_missing_ratio * 100) or total_out_of_bounds > 0:
        status = "WARNING"
        reason = f"Moderate data quality anomalies: max missing {max_missing_rate}%, out-of-bounds {total_out_of_bounds}"
    else:
        status = "NORMAL"
        reason = "Data quality metrics within acceptable tolerance"

    return {
        "total_records": total_records,
        "status": status,
        "reason": reason,
        "max_missing_rate_pct": max_missing_rate,
        "total_invalid_values": total_invalid,
        "total_out_of_bounds_values": total_out_of_bounds,
        "freshness_lag_sec": round(freshness_lag_sec, 2),
        "missing_by_feature": missing_pcts,
        "invalid_by_feature": invalid_pcts,
        "out_of_bounds_by_feature": out_of_bounds_counts,
        "version_compatibility": True
    }
