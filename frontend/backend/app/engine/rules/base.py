"""
Base Fraud Rule Abstract Class.
Section 07 — Rule-Based Fraud Engine.
"""
from abc import ABC, abstractmethod
import time
from typing import Dict, Any, Optional
from backend.app.engine.rules.types import (
    RuleEvaluationResult,
    RuleSeverity,
    RuleCategory,
    RuleEvidence
)


class BaseRule(ABC):
    """
    Abstract Base Class for all fraud detection rules.
    Every rule must be deterministic, explainable, and produce a structured RuleEvaluationResult.
    """
    code: str
    name: str
    description: str
    category: RuleCategory
    default_severity: RuleSeverity
    default_weight: float

    def __init__(self):
        if not hasattr(self, "code"):
            raise ValueError(f"Rule class {self.__class__.__name__} must define a 'code' attribute.")

    def run(
        self,
        transaction: Dict[str, Any],
        features: Dict[str, Any],
        configuration: Optional[Dict[str, Any]] = None,
        version: str = "1.0",
        rule_id: Optional[str] = None,
        rule_version_id: Optional[str] = None,
        weight_override: Optional[float] = None,
        severity_override: Optional[RuleSeverity] = None
    ) -> RuleEvaluationResult:
        """
        Executes the rule evaluation and measures execution latency in milliseconds.
        Safely catches and wraps any rule-specific execution exceptions.
        """
        start_time = time.perf_counter()
        config = configuration or {}
        assigned_weight = float(weight_override if weight_override is not None else self.default_weight)
        assigned_severity = severity_override or self.default_severity

        try:
            result = self.evaluate(transaction, features, config, version)
            duration_ms = (time.perf_counter() - start_time) * 1000.0

            result.rule_code = self.code
            result.rule_id = rule_id or self.code
            result.rule_version = version
            result.rule_version_id = rule_version_id
            result.name = self.name
            result.category = self.category.value
            result.severity = assigned_severity
            result.weight = assigned_weight
            result.execution_time_ms = round(duration_ms, 3)

            if result.triggered:
                result.score = assigned_weight
            else:
                result.score = 0.0

            return result
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            return RuleEvaluationResult(
                rule_code=self.code,
                rule_id=rule_id or self.code,
                rule_version=version,
                rule_version_id=rule_version_id,
                name=self.name,
                category=self.category.value,
                severity=assigned_severity,
                triggered=False,
                score=0.0,
                weight=assigned_weight,
                reason=f"Rule evaluation failed with error: {str(exc)}",
                execution_time_ms=round(duration_ms, 3),
                error=str(exc)
            )

    @abstractmethod
    def evaluate(
        self,
        transaction: Dict[str, Any],
        features: Dict[str, Any],
        configuration: Dict[str, Any],
        version: str
    ) -> RuleEvaluationResult:
        """
        Subclasses must implement deterministic evaluation logic against features & transaction data.
        Must return a RuleEvaluationResult with triggered status, reason, and structured evidence.
        """
        pass
