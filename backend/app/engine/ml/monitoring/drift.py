"""
Statistical Feature & Prediction Drift Detection Engine.
Section 20 — Model Monitoring & MLOps.

Supported Methods:
1. Population Stability Index (PSI) - for continuous and discrete score/feature distributions.
2. Two-Sample Kolmogorov-Smirnov (KS) Test - for continuous numeric features.
3. Jensen-Shannon Divergence - for categorical and discrete distributions.
"""
import math
import logging
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from scipy import stats

logger = logging.getLogger("ml_drift_engine")


def calculate_psi(
    reference: List[float] | np.ndarray,
    current: List[float] | np.ndarray,
    num_bins: int = 10,
    epsilon: float = 1e-4
) -> Tuple[float, Dict[str, Any]]:
    """
    Computes the Population Stability Index (PSI) between a reference baseline distribution
    and a current monitoring distribution.

    Interpretation:
    - PSI < 0.10: No significant distribution change (NORMAL)
    - 0.10 <= PSI < 0.25: Moderate distribution shift (WARNING)
    - PSI >= 0.25: Significant distribution shift (CRITICAL)
    """
    ref = np.asarray(reference, dtype=float)
    curr = np.asarray(current, dtype=float)

    # Filter non-finite values
    ref = ref[np.isfinite(ref)]
    curr = curr[np.isfinite(curr)]

    if len(ref) < 5 or len(curr) < 5:
        return 0.0, {
            "error": "Insufficient samples for PSI calculation",
            "ref_count": len(ref),
            "curr_count": len(curr),
            "bins": []
        }

    # Generate quantile bin edges from reference distribution
    try:
        quantiles = np.linspace(0, 100, num_bins + 1)
        bin_edges = np.percentile(ref, quantiles)
        bin_edges = np.unique(bin_edges)  # handle discrete/duplicate boundaries

        if len(bin_edges) < 2:
            # Fallback to linear range if percentiles collapse (e.g. constant values)
            min_val = min(np.min(ref), np.min(curr))
            max_val = max(np.max(ref), np.max(curr))
            if min_val == max_val:
                return 0.0, {"bins": [], "note": "Constant feature value"}
            bin_edges = np.linspace(min_val, max_val, num_bins + 1)

        # Ensure infinite bounds on extremes to capture out-of-range drift
        bin_edges[0] = -np.inf
        bin_edges[-1] = np.inf

        # Count frequencies in bins
        ref_counts, _ = np.histogram(ref, bins=bin_edges)
        curr_counts, _ = np.histogram(curr, bins=bin_edges)

        ref_total = len(ref)
        curr_total = len(curr)

        # Proportions with epsilon smoothing
        ref_props = np.maximum(ref_counts / ref_total, epsilon)
        curr_props = np.maximum(curr_counts / curr_total, epsilon)

        # Re-normalize after epsilon injection
        ref_props = ref_props / np.sum(ref_props)
        curr_props = curr_props / np.sum(curr_props)

        # Calculate PSI sum
        psi_contributions = (curr_props - ref_props) * np.log(curr_props / ref_props)
        psi_value = float(np.sum(psi_contributions))

        bin_details = []
        for i in range(len(ref_counts)):
            bin_details.append({
                "bin_index": i,
                "ref_count": int(ref_counts[i]),
                "curr_count": int(curr_counts[i]),
                "ref_prop": round(float(ref_props[i]), 4),
                "curr_prop": round(float(curr_props[i]), 4),
                "psi_contrib": round(float(psi_contributions[i]), 6)
            })

        return max(0.0, psi_value), {
            "num_bins": len(bin_details),
            "ref_samples": ref_total,
            "curr_samples": curr_total,
            "bins": bin_details
        }
    except Exception as e:
        logger.error("Failed to compute PSI: %s", str(e))
        return 0.0, {"error": str(e)}


def calculate_ks_test(
    reference: List[float] | np.ndarray,
    current: List[float] | np.ndarray
) -> Tuple[float, float]:
    """
    Performs Two-Sample Kolmogorov-Smirnov Test comparing continuous empirical distributions.
    Returns: (ks_statistic, p_value)
    """
    ref = np.asarray(reference, dtype=float)
    curr = np.asarray(current, dtype=float)

    ref = ref[np.isfinite(ref)]
    curr = curr[np.isfinite(curr)]

    if len(ref) < 5 or len(curr) < 5:
        return 0.0, 1.0

    res = stats.ks_2samp(ref, curr)
    return float(res.statistic), float(res.pvalue)


def calculate_categorical_drift(
    reference_counts: Dict[str, int],
    current_counts: Dict[str, int],
    epsilon: float = 1e-4
) -> Tuple[float, Dict[str, Any]]:
    """
    Calculates Jensen-Shannon Divergence across categorical frequencies.
    Returns: (js_divergence [0.0, 1.0], category_breakdown)
    """
    all_categories = sorted(list(set(reference_counts.keys()).union(set(current_counts.keys()))))
    if not all_categories:
        return 0.0, {}

    ref_total = sum(reference_counts.values()) or 1
    curr_total = sum(current_counts.values()) or 1

    p = np.array([reference_counts.get(cat, 0) / ref_total for cat in all_categories])
    q = np.array([current_counts.get(cat, 0) / curr_total for cat in all_categories])

    # Smooth
    p = np.maximum(p, epsilon)
    q = np.maximum(q, epsilon)
    p = p / np.sum(p)
    q = q / np.sum(q)

    # Jensen-Shannon Divergence
    m = 0.5 * (p + q)
    kl_pm = np.sum(p * np.log(p / m))
    kl_qm = np.sum(q * np.log(q / m))
    js_divergence = float(0.5 * (kl_pm + kl_qm))

    details = {
        cat: {
            "ref_pct": round(float(reference_counts.get(cat, 0) / ref_total * 100), 2),
            "curr_pct": round(float(current_counts.get(cat, 0) / curr_total * 100), 2)
        }
        for cat in all_categories
    }

    return max(0.0, js_divergence), details


def evaluate_feature_drift(
    feature_name: str,
    ref_values: List[Any],
    curr_values: List[Any],
    is_categorical: bool = False,
    psi_warning: float = 0.10,
    psi_critical: float = 0.25,
    ks_pvalue_critical: float = 0.01,
    min_sample_size: int = 15
) -> Dict[str, Any]:
    """
    Comprehensive drift evaluation for a single feature between baseline and current data.
    """
    if len(ref_values) < min_sample_size or len(curr_values) < min_sample_size:
        return {
            "feature_name": feature_name,
            "drift_method": "PSI" if not is_categorical else "JENSEN_SHANNON",
            "drift_value": 0.0,
            "p_value": None,
            "threshold": psi_warning,
            "status": "UNKNOWN",
            "reason": f"Insufficient sample size (ref: {len(ref_values)}, curr: {len(curr_values)}, min: {min_sample_size})",
            "reference_statistics": {"count": len(ref_values)},
            "current_statistics": {"count": len(curr_values)}
        }

    if is_categorical:
        from collections import Counter
        ref_counts = dict(Counter(ref_values))
        curr_counts = dict(Counter(curr_values))
        js_val, details = calculate_categorical_drift(ref_counts, curr_counts)

        # Categorical threshold mapping
        if js_val >= 0.20:
            status = "CRITICAL"
        elif js_val >= 0.08:
            status = "WARNING"
        else:
            status = "NORMAL"

        return {
            "feature_name": feature_name,
            "drift_method": "JENSEN_SHANNON",
            "drift_value": round(js_val, 4),
            "p_value": None,
            "threshold": 0.08,
            "status": status,
            "reference_statistics": {"category_counts": ref_counts, "total": len(ref_values)},
            "current_statistics": {"category_counts": curr_counts, "total": len(curr_values), "breakdown": details}
        }

    # Numeric feature: calculate both PSI and KS-test
    ref_arr = np.asarray(ref_values, dtype=float)
    curr_arr = np.asarray(curr_values, dtype=float)

    ref_clean = ref_arr[np.isfinite(ref_arr)]
    curr_clean = curr_arr[np.isfinite(curr_arr)]

    psi_val, psi_meta = calculate_psi(ref_clean, curr_clean)
    ks_stat, ks_pvalue = calculate_ks_test(ref_clean, curr_clean)

    # Determine status based on PSI and KS p-value
    if psi_val >= psi_critical or (ks_pvalue < ks_pvalue_critical and psi_val >= 0.15):
        status = "CRITICAL"
    elif psi_val >= psi_warning or (ks_pvalue < 0.05 and psi_val >= 0.05):
        status = "WARNING"
    else:
        status = "NORMAL"

    ref_stats = {
        "mean": round(float(np.mean(ref_clean)), 4) if len(ref_clean) > 0 else 0.0,
        "std": round(float(np.std(ref_clean)), 4) if len(ref_clean) > 0 else 0.0,
        "median": round(float(np.median(ref_clean)), 4) if len(ref_clean) > 0 else 0.0,
        "p25": round(float(np.percentile(ref_clean, 25)), 4) if len(ref_clean) > 0 else 0.0,
        "p75": round(float(np.percentile(ref_clean, 75)), 4) if len(ref_clean) > 0 else 0.0,
        "count": len(ref_clean)
    }

    curr_stats = {
        "mean": round(float(np.mean(curr_clean)), 4) if len(curr_clean) > 0 else 0.0,
        "std": round(float(np.std(curr_clean)), 4) if len(curr_clean) > 0 else 0.0,
        "median": round(float(np.median(curr_clean)), 4) if len(curr_clean) > 0 else 0.0,
        "p25": round(float(np.percentile(curr_clean, 25)), 4) if len(curr_clean) > 0 else 0.0,
        "p75": round(float(np.percentile(curr_clean, 75)), 4) if len(curr_clean) > 0 else 0.0,
        "count": len(curr_clean),
        "psi_details": psi_meta
    }

    return {
        "feature_name": feature_name,
        "drift_method": "PSI",
        "drift_value": round(psi_val, 4),
        "ks_statistic": round(ks_stat, 4),
        "p_value": round(ks_pvalue, 6),
        "threshold": psi_warning,
        "status": status,
        "reference_statistics": ref_stats,
        "current_statistics": curr_stats
    }
