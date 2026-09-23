"""
Centralized Fraud Rule Registry.
Section 07 — Rule-Based Fraud Engine.
"""
from typing import Dict, Type, List, Optional, Any
from backend.app.engine.rules.base import BaseRule
from backend.app.engine.rules.types import RuleCategory, RuleSeverity
from backend.app.engine.rules.validator import RuleConfigValidator
from backend.app.engine.rules.high_amount import HighAmountRule
from backend.app.engine.rules.rapid_transactions import RapidTransactionsRule
from backend.app.engine.rules.new_device import NewDeviceRule
from backend.app.engine.rules.unusual_location import UnusualLocationRule
from backend.app.engine.rules.unusual_time import UnusualTimeRule
from backend.app.engine.rules.failed_attempts import FailedAttemptsRule
from backend.app.engine.rules.spending_increase import SuddenSpendingIncreaseRule
from backend.app.engine.rules.merchant_anomaly import MerchantAnomalyRule
from backend.app.engine.rules.behavior_deviation import BehaviorDeviationRule


class RuleRegistry:
    """
    Registry for discoverability, validation, and evaluation of fraud rules.
    Maintains code-to-implementation mappings with deterministic execution order.
    """
    _registry: Dict[str, BaseRule] = {}
    _aliases: Dict[str, str] = {
        "HIGH_TRANSACTION_AMOUNT": "HIGH_AMOUNT",
        "RAPID_TRANSACTION_SEQUENCE": "RAPID_TRANSACTIONS",
        "FAILED_ATTEMPT_SPIKE": "FAILED_ATTEMPTS",
        "SPENDING_VELOCITY_ANOMALY": "SUDDEN_SPENDING_INCREASE"
    }

    # Deterministic priority evaluation order
    DEFAULT_EVALUATION_ORDER: List[str] = [
        "HIGH_AMOUNT",
        "RAPID_TRANSACTIONS",
        "NEW_DEVICE",
        "UNUSUAL_LOCATION",
        "UNUSUAL_TIME",
        "FAILED_ATTEMPTS",
        "SUDDEN_SPENDING_INCREASE",
        "MERCHANT_ANOMALY",
        "BEHAVIOR_DEVIATION"
    ]

    @classmethod
    def register(cls, rule_instance: BaseRule) -> None:
        """Registers a rule instance into the centralized registry."""
        cls._registry[rule_instance.code.upper()] = rule_instance

    @classmethod
    def get(cls, rule_code: str) -> Optional[BaseRule]:
        """Retrieves a rule instance by code or alias."""
        norm_code = rule_code.upper()
        target_code = cls._aliases.get(norm_code, norm_code)
        return cls._registry.get(target_code)

    @classmethod
    def list_rules(cls) -> List[Dict[str, Any]]:
        """Lists metadata of all registered fraud rules."""
        result = []
        for code in cls.DEFAULT_EVALUATION_ORDER:
            rule = cls._registry.get(code)
            if rule:
                result.append({
                    "rule_code": rule.code,
                    "name": rule.name,
                    "description": rule.description,
                    "category": rule.category.value,
                    "default_severity": rule.default_severity.value,
                    "default_weight": rule.default_weight
                })
        return result

    @classmethod
    def validate_configuration(cls, rule_code: str, configuration: Dict[str, Any]) -> Dict[str, Any]:
        """Validates configuration for a given rule code."""
        norm_code = rule_code.upper()
        target_code = cls._aliases.get(norm_code, norm_code)
        return RuleConfigValidator.validate(target_code, configuration)


# Initialize default rule registrations
RuleRegistry.register(HighAmountRule())
RuleRegistry.register(RapidTransactionsRule())
RuleRegistry.register(NewDeviceRule())
RuleRegistry.register(UnusualLocationRule())
RuleRegistry.register(UnusualTimeRule())
RuleRegistry.register(FailedAttemptsRule())
RuleRegistry.register(SuddenSpendingIncreaseRule())
RuleRegistry.register(MerchantAnomalyRule())
RuleRegistry.register(BehaviorDeviationRule())
