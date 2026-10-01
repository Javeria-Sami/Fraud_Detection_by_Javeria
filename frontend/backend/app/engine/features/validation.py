"""
Feature Validation and Data Quality Diagnostics.
Section 06 — Feature Engineering.
Ensures features do not contain NaN, Infinity, negative counts, or invalid types.
"""
import math
from typing import Dict, Any, List, Tuple

def validate_feature_dict(features: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validates feature dictionary for mathematical correctness and data integrity.
    Returns: (is_valid, list_of_error_messages)
    """
    errors = []

    for k, v in features.items():
        if isinstance(v, float):
            if math.isnan(v):
                errors.append(f"Feature '{k}' is NaN.")
            elif math.isinf(v):
                errors.append(f"Feature '{k}' is Infinity.")
        
        # Velocity and count non-negative checks
        if k.startswith("velocity_") or k.startswith("count_") or k.startswith("failed_transactions_"):
            if isinstance(v, (int, float)) and v < 0:
                errors.append(f"Feature '{k}' has invalid negative count: {v}")

        # Amount non-negative checks
        if k in ["amount", "transaction_amount", "volume_1m", "volume_5m", "volume_10m", "volume_1h", "volume_24h"]:
            if isinstance(v, (int, float)) and v < 0:
                errors.append(f"Feature '{k}' has invalid negative volume: {v}")

        # Boolean flags must be 0 or 1
        if k.startswith("is_") or k.startswith("has_"):
            if v not in [0, 1, True, False]:
                errors.append(f"Boolean feature '{k}' has unexpected non-binary value: {v}")

    return len(errors) == 0, errors

def generate_feature_quality_report(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates a diagnostics summary of feature values for testing and telemetry.
    """
    total = len(features)
    numeric_count = sum(1 for v in features.values() if isinstance(v, (int, float)) and not isinstance(v, bool))
    boolean_count = sum(1 for v in features.values() if isinstance(v, bool) or (isinstance(v, int) and v in [0, 1]))
    nan_count = sum(1 for v in features.values() if isinstance(v, float) and math.isnan(v))
    inf_count = sum(1 for v in features.values() if isinstance(v, float) and math.isinf(v))

    is_valid, error_list = validate_feature_dict(features)

    return {
        "total_features": total,
        "numeric_features": numeric_count,
        "boolean_features": boolean_count,
        "nan_count": nan_count,
        "infinity_count": inf_count,
        "is_valid": is_valid,
        "validation_errors": error_list,
        "feature_version": features.get("feature_version", "unknown")
    }
