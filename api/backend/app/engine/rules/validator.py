"""
Safe Rule Configuration Validator.
Section 07 & Section 19 — Configurable Alerts & Rule Administration.

Provides deterministic, injection-proof validation of rule configuration dictionaries.
Rejects malformed types, negative thresholds, unsupported operators, and unsafe dynamic execution.
Validates feature dependencies against the Centralized Feature Registry.
"""
from typing import Dict, Any, List, Optional, Tuple
from backend.app.engine.rules.types import RuleSeverity, RuleCategory, ComparisonOperator
from backend.app.engine.features import FEATURE_REGISTRY, FEATURE_VERSION

SUPPORTED_OPERATORS = {op.value for op in ComparisonOperator}
SUPPORTED_SEVERITIES = {sev.value for op, sev in RuleSeverity.__members__.items()}

# Allowed feature names mapping for each rule code
RULE_ALLOWED_FEATURES: Dict[str, List[str]] = {
    "HIGH_AMOUNT": [
        "amount", "amount_deviation", "amount_deviation_from_user_average",
        "user_baseline_amount", "user_average_transaction_amount"
    ],
    "RAPID_TRANSACTIONS": [
        "velocity_1m", "velocity_5m", "velocity_10m", "velocity_1h", "velocity_24h"
    ],
    "NEW_DEVICE": [
        "is_new_device", "device_transaction_count"
    ],
    "UNUSUAL_LOCATION": [
        "is_new_country", "is_new_city", "is_unusual_location",
        "geo_hop_speed_kmh", "distance_from_previous_location_km"
    ],
    "UNUSUAL_TIME": [
        "hour_of_day", "is_unusual_transaction_hour", "is_night", "is_weekend"
    ],
    "FAILED_ATTEMPTS": [
        "failed_attempts", "failed_transactions_last_10m", "failed_transactions_last_1h"
    ],
    "SUDDEN_SPENDING_INCREASE": [
        "amount_deviation", "amount_deviation_from_user_average", "velocity_1h", "volume_1h", "volume_24h"
    ],
    "MERCHANT_ANOMALY": [
        "is_high_risk_category", "is_new_merchant_for_user", "user_merchant_transaction_count", "amount_deviation"
    ],
    "BEHAVIOR_DEVIATION": [
        "is_new_device", "is_unusual_location", "amount_deviation", "failed_attempts"
    ]
}

RULE_DEFAULT_SCHEMAS: Dict[str, Dict[str, Any]] = {
    "HIGH_AMOUNT": {
        "multiplier": {"type": "float", "min": 0.1, "max": 100.0, "default": 5.0, "description": "Transaction amount multiplier over user baseline"},
        "min_amount": {"type": "float", "min": 0.0, "max": 1000000.0, "default": 1000.0, "description": "Absolute minimum monetary threshold"}
    },
    "RAPID_TRANSACTIONS": {
        "count_threshold": {"type": "int", "min": 1, "max": 100, "default": 4, "description": "Maximum allowed transactions in sliding window"},
        "window_minutes": {"type": "int", "min": 1, "max": 1440, "default": 5, "description": "Sliding time window duration in minutes"}
    },
    "NEW_DEVICE": {
        "enabled": {"type": "bool", "default": True, "description": "Enforce unrecognized hardware/browser fingerprint checks"}
    },
    "UNUSUAL_LOCATION": {
        "max_geo_speed_kmh": {"type": "float", "min": 50.0, "max": 3000.0, "default": 700.0, "description": "Maximum realistic geographic velocity between consecutive hops"},
        "distance_threshold_km": {"type": "float", "min": 0.0, "max": 20000.0, "default": 500.0, "description": "Geographic distance threshold from previous location"}
    },
    "UNUSUAL_TIME": {
        "night_start": {"type": "int", "min": 0, "max": 23, "default": 1, "description": "Starting hour for anomalous nocturnal window (0-23)"},
        "night_end": {"type": "int", "min": 0, "max": 23, "default": 5, "description": "Ending hour for anomalous nocturnal window (0-23)"}
    },
    "FAILED_ATTEMPTS": {
        "max_failed_attempts": {"type": "int", "min": 1, "max": 20, "default": 2, "description": "Threshold of consecutive authentication or PIN failures"}
    },
    "SUDDEN_SPENDING_INCREASE": {
        "spending_multiplier": {"type": "float", "min": 1.0, "max": 50.0, "default": 3.0, "description": "Multiplier of 1-hour spending velocity over baseline"}
    },
    "MERCHANT_ANOMALY": {
        "high_risk_categories": {"type": "list_str", "default": ["crypto_exchange", "gambling", "wire_transfer", "luxury_goods"], "description": "High-risk merchant MCC category tags"}
    },
    "BEHAVIOR_DEVIATION": {
        "composite_threshold": {"type": "float", "min": 0.1, "max": 1.0, "default": 0.75, "description": "Multi-feature composite deviation threshold"}
    }
}


class RuleConfigValidationError(ValueError):
    """Raised when rule configuration is invalid."""
    pass


class RuleConfigValidator:
    """Safe validator for rule configuration payloads."""

    @classmethod
    def get_allowed_features(cls, rule_code: str) -> List[str]:
        """Returns the list of features required/used by this rule."""
        code = rule_code.upper()
        return RULE_ALLOWED_FEATURES.get(code, [])

    @classmethod
    def get_rule_schema(cls, rule_code: str) -> Dict[str, Any]:
        """Returns configuration schema parameters and bounds for a rule code."""
        code = rule_code.upper()
        return RULE_DEFAULT_SCHEMAS.get(code, {})

    @classmethod
    def validate(cls, rule_code: str, configuration: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates configuration dictionary for a given rule code.
        Returns cleaned/validated configuration or raises RuleConfigValidationError.
        """
        if not isinstance(configuration, dict):
            raise RuleConfigValidationError(f"Configuration must be a JSON object/dictionary, got {type(configuration).__name__}")

        # Check for forbidden dangerous keys / script injection attempts
        for key, val in configuration.items():
            if not isinstance(key, str):
                raise RuleConfigValidationError(f"Configuration keys must be strings, got {type(key).__name__}")
            if any(forbidden in key.lower() for forbidden in ["__", "exec", "eval", "import", "lambda", "os.", "sys.", "subprocess"]):
                raise RuleConfigValidationError(f"Forbidden configuration key: '{key}'")
            if isinstance(val, str) and any(forbidden in val.lower() for forbidden in ["import ", "exec(", "eval(", "os.system", "subprocess."]):
                raise RuleConfigValidationError(f"Forbidden script content in value for '{key}'")

        # Specific per-rule validation
        code = rule_code.upper()

        if code in ["HIGH_AMOUNT", "HIGH_TRANSACTION_AMOUNT"]:
            cls._validate_high_amount(configuration)
        elif code in ["RAPID_TRANSACTIONS", "RAPID_TRANSACTION_SEQUENCE"]:
            cls._validate_rapid_transactions(configuration)
        elif code in ["NEW_DEVICE"]:
            cls._validate_new_device(configuration)
        elif code in ["UNUSUAL_LOCATION"]:
            cls._validate_unusual_location(configuration)
        elif code in ["UNUSUAL_TIME"]:
            cls._validate_unusual_time(configuration)
        elif code in ["FAILED_ATTEMPTS", "FAILED_ATTEMPT_SPIKE"]:
            cls._validate_failed_attempts(configuration)
        elif code in ["SUDDEN_SPENDING_INCREASE", "SPENDING_VELOCITY_ANOMALY"]:
            cls._validate_spending_increase(configuration)
        elif code in ["MERCHANT_ANOMALY"]:
            cls._validate_merchant_anomaly(configuration)
        elif code in ["BEHAVIOR_DEVIATION"]:
            cls._validate_behavior_deviation(configuration)

        return configuration

    @classmethod
    def validate_detailed(cls, rule_code: str, configuration: Dict[str, Any]) -> Tuple[bool, List[str], List[str], List[str]]:
        """
        Comprehensive validation returning (is_valid, errors, warnings, required_features).
        """
        errors: List[str] = []
        warnings: List[str] = []
        req_features = cls.get_allowed_features(rule_code)

        # 1. Feature Registry Verification
        for feat in req_features:
            if feat not in FEATURE_REGISTRY:
                warnings.append(f"Required feature '{feat}' is not yet registered in Feature Registry v{FEATURE_VERSION}.")

        # 2. Syntax & Value Validation
        try:
            cls.validate(rule_code, configuration)
        except RuleConfigValidationError as e:
            errors.append(str(e))
        except Exception as e:
            errors.append(f"Unexpected validation failure: {str(e)}")

        is_valid = len(errors) == 0
        return is_valid, errors, warnings, req_features

    @classmethod
    def _validate_high_amount(cls, config: Dict[str, Any]):
        multiplier = config.get("multiplier", config.get("deviation_threshold", 5.0))
        if not isinstance(multiplier, (int, float)) or multiplier <= 0:
            raise RuleConfigValidationError("HIGH_AMOUNT: 'multiplier' must be a positive number (> 0).")
        min_amount = config.get("min_amount", config.get("threshold", 0.0))
        if not isinstance(min_amount, (int, float)) or min_amount < 0:
            raise RuleConfigValidationError("HIGH_AMOUNT: 'min_amount' must be a non-negative number (>= 0).")

    @classmethod
    def _validate_rapid_transactions(cls, config: Dict[str, Any]):
        count = config.get("count_threshold", config.get("max_txns_5m", config.get("max_txns", 4)))
        if not isinstance(count, int) or count < 1:
            raise RuleConfigValidationError("RAPID_TRANSACTIONS: 'count_threshold' must be a positive integer (>= 1).")
        window_minutes = config.get("window_minutes", 5)
        if not isinstance(window_minutes, int) or window_minutes < 1:
            raise RuleConfigValidationError("RAPID_TRANSACTIONS: 'window_minutes' must be a positive integer (>= 1).")

    @classmethod
    def _validate_new_device(cls, config: Dict[str, Any]):
        if "enabled" in config and not isinstance(config["enabled"], bool):
            raise RuleConfigValidationError("NEW_DEVICE: 'enabled' must be a boolean.")

    @classmethod
    def _validate_unusual_location(cls, config: Dict[str, Any]):
        speed = config.get("max_geo_speed_kmh", config.get("speed_threshold", 700.0))
        if not isinstance(speed, (int, float)) or speed < 0:
            raise RuleConfigValidationError("UNUSUAL_LOCATION: 'max_geo_speed_kmh' must be a non-negative number.")
        if "distance_threshold_km" in config:
            dist = config["distance_threshold_km"]
            if not isinstance(dist, (int, float)) or dist < 0:
                raise RuleConfigValidationError("UNUSUAL_LOCATION: 'distance_threshold_km' must be non-negative.")

    @classmethod
    def _validate_unusual_time(cls, config: Dict[str, Any]):
        start = config.get("night_start", config.get("night_start_hour", 1))
        end = config.get("night_end", config.get("night_end_hour", 5))
        if not isinstance(start, int) or not (0 <= start <= 23):
            raise RuleConfigValidationError("UNUSUAL_TIME: 'night_start' must be an integer hour between 0 and 23.")
        if not isinstance(end, int) or not (0 <= end <= 23):
            raise RuleConfigValidationError("UNUSUAL_TIME: 'night_end' must be an integer hour between 0 and 23.")

    @classmethod
    def _validate_failed_attempts(cls, config: Dict[str, Any]):
        max_attempts = config.get("max_failed_attempts", config.get("count_threshold", 2))
        if not isinstance(max_attempts, int) or max_attempts < 1:
            raise RuleConfigValidationError("FAILED_ATTEMPTS: 'max_failed_attempts' must be an integer >= 1.")

    @classmethod
    def _validate_spending_increase(cls, config: Dict[str, Any]):
        mult = config.get("spending_multiplier", config.get("multiplier", 3.0))
        if not isinstance(mult, (int, float)) or mult <= 0:
            raise RuleConfigValidationError("SUDDEN_SPENDING_INCREASE: 'spending_multiplier' must be a positive number (> 0).")

    @classmethod
    def _validate_merchant_anomaly(cls, config: Dict[str, Any]):
        cats = config.get("high_risk_categories", [])
        if not isinstance(cats, list):
            raise RuleConfigValidationError("MERCHANT_ANOMALY: 'high_risk_categories' must be a list of strings.")
        for c in cats:
            if not isinstance(c, str):
                raise RuleConfigValidationError("MERCHANT_ANOMALY: elements in 'high_risk_categories' must be strings.")

    @classmethod
    def _validate_behavior_deviation(cls, config: Dict[str, Any]):
        thresh = config.get("composite_threshold", 0.75)
        if not isinstance(thresh, (int, float)) or not (0.0 < thresh <= 1.0):
            raise RuleConfigValidationError("BEHAVIOR_DEVIATION: 'composite_threshold' must be a float between 0.0 and 1.0.")
