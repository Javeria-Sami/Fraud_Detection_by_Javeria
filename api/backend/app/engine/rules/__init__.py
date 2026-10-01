"""
Rule-Based Fraud Engine Package.
Section 07 — Rule-Based Fraud Engine.
"""
from backend.app.engine.rules.types import (
    RuleSeverity,
    RuleCategory,
    ComparisonOperator,
    RuleEvidence,
    RuleEvaluationResult,
    TransactionRuleEvaluationResponse
)
from backend.app.engine.rules.validator import (
    RuleConfigValidator,
    RuleConfigValidationError
)
from backend.app.engine.rules.base import BaseRule
from backend.app.engine.rules.high_amount import HighAmountRule
from backend.app.engine.rules.rapid_transactions import RapidTransactionsRule
from backend.app.engine.rules.new_device import NewDeviceRule
from backend.app.engine.rules.unusual_location import UnusualLocationRule
from backend.app.engine.rules.unusual_time import UnusualTimeRule
from backend.app.engine.rules.failed_attempts import FailedAttemptsRule
from backend.app.engine.rules.spending_increase import SuddenSpendingIncreaseRule
from backend.app.engine.rules.merchant_anomaly import MerchantAnomalyRule
from backend.app.engine.rules.behavior_deviation import BehaviorDeviationRule
from backend.app.engine.rules.registry import RuleRegistry
from backend.app.engine.rules.service import FraudRuleEngineService

__all__ = [
    "RuleSeverity",
    "RuleCategory",
    "ComparisonOperator",
    "RuleEvidence",
    "RuleEvaluationResult",
    "TransactionRuleEvaluationResponse",
    "RuleConfigValidator",
    "RuleConfigValidationError",
    "BaseRule",
    "HighAmountRule",
    "RapidTransactionsRule",
    "NewDeviceRule",
    "UnusualLocationRule",
    "UnusualTimeRule",
    "FailedAttemptsRule",
    "SuddenSpendingIncreaseRule",
    "MerchantAnomalyRule",
    "BehaviorDeviationRule",
    "RuleRegistry",
    "FraudRuleEngineService"
]
