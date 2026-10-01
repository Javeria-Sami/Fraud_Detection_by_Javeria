"""
Central Fraud Rule Engine Execution Service.
Section 07 — Rule-Based Fraud Engine.

Responsibilities:
1. Fetch active rules and their corresponding active versions from the database.
2. Ensure deterministic execution order and isolated per-rule error boundaries.
3. Validate configuration without arbitrary code execution.
4. Execute rules against transaction context and feature snapshots.
5. Persist audit-ready RuleExecution records linked to exact rule version IDs.
6. Provide explainable natural language reasons and structured evidence.
"""
import time
import uuid
import inspect
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.app.models.rule import FraudRule, FraudRuleVersion, RuleExecution
from backend.app.engine.rules.types import (
    RuleEvaluationResult,
    RuleSeverity,
    RuleCategory,
    TransactionRuleEvaluationResponse
)
from backend.app.engine.rules.registry import RuleRegistry

logger = logging.getLogger("fraud_rule_engine")


class FraudRuleEngineService:
    """
    Centralized execution coordinator for rule-based fraud detection.
    Optimized with high-performance in-memory caching and safe invalidation.
    """
    _cached_rules: Optional[List[Dict[str, Any]]] = None
    _cache_timestamp: float = 0.0
    _CACHE_TTL: float = 5.0  # 5-second TTL prevents DB thrashing under high-throughput ingestion

    @classmethod
    def invalidate_cache(cls) -> None:
        """Invalidates in-memory active rule cache (called on rule config updates/activations)."""
        cls._cached_rules = None
        cls._cache_timestamp = 0.0
        logger.debug("FraudRuleEngineService active rules cache invalidated.")

    @classmethod
    async def _get_active_rule_configs(cls, session: AsyncSession) -> List[Dict[str, Any]]:
        """Fetch active rule configurations, utilizing cache if fresh."""
        now = time.time()
        if cls._cached_rules is not None and (now - cls._cache_timestamp) < cls._CACHE_TTL:
            return cls._cached_rules

        active_rules = []
        try:
            stmt = (
                select(FraudRule)
                .where(FraudRule.is_active == True)
                .options(selectinload(FraudRule.versions))
                .order_by(FraudRule.priority.asc(), FraudRule.id.asc())
            )
            res = await session.execute(stmt)
            if hasattr(res, "scalars"):
                scalars_obj = res.scalars()
                if inspect.iscoroutine(scalars_obj):
                    scalars_obj = await scalars_obj
                if hasattr(scalars_obj, "all"):
                    all_obj = scalars_obj.all()
                    if inspect.iscoroutine(all_obj):
                        all_obj = await all_obj
                    active_rules = all_obj if isinstance(all_obj, (list, tuple)) else []
                else:
                    active_rules = scalars_obj if isinstance(scalars_obj, (list, tuple)) else []
            elif isinstance(res, (list, tuple)):
                active_rules = res
        except Exception as e:
            logger.debug("Active rule query against session encountered: %s", e)
            active_rules = []

        parsed_rules: List[Dict[str, Any]] = []
        if isinstance(active_rules, (list, tuple)):
            for rule_model in active_rules:
                if not hasattr(rule_model, "rule_code") and not hasattr(rule_model, "id"):
                    continue
                rule_code = getattr(rule_model, "rule_code", None) or getattr(rule_model, "id", None)
                if not rule_code:
                    continue
                active_version_obj: Optional[FraudRuleVersion] = None
                versions = getattr(rule_model, "versions", None)
                if versions and isinstance(versions, (list, tuple)):
                    active_versions = [v for v in versions if getattr(v, "is_active", False)]
                    if active_versions:
                        active_version_obj = sorted(active_versions, key=lambda v: str(getattr(v, "version", "1.0")), reverse=True)[0]

                if active_version_obj:
                    config = dict(getattr(active_version_obj, "configuration", {}) or {})
                    ver_str = getattr(active_version_obj, "version", "1.0") or "1.0"
                    ver_id = getattr(active_version_obj, "id", None)
                    rule_weight = float(active_version_obj.weight if getattr(active_version_obj, "weight", None) is not None else getattr(rule_model, "weight", 10.0))
                else:
                    config = dict(getattr(rule_model, "condition_config", {}) or {})
                    ver_str = getattr(rule_model, "version", "1.0") or "1.0"
                    ver_id = None
                    rule_weight = float(getattr(rule_model, "weight", 10.0) or 10.0)

                sev_str = (getattr(rule_model, "severity", None) or getattr(rule_model, "default_severity", None) or "MEDIUM").upper()
                try:
                    rule_sev = RuleSeverity(sev_str)
                except ValueError:
                    rule_sev = RuleSeverity.MEDIUM

                parsed_rules.append({
                    "rule_id": getattr(rule_model, "id", rule_code),
                    "rule_code": rule_code,
                    "name": getattr(rule_model, "name", rule_code),
                    "category": getattr(rule_model, "category", RuleCategory.VELOCITY.value),
                    "config": config,
                    "version": ver_str,
                    "version_id": ver_id,
                    "weight": rule_weight,
                    "severity": rule_sev
                })

        cls._cached_rules = parsed_rules
        cls._cache_timestamp = now
        return parsed_rules

    @classmethod
    async def evaluate_transaction_rules(
        cls,
        session: AsyncSession,
        transaction_dict: Dict[str, Any],
        features: Dict[str, Any],
        persist_executions: bool = True
    ) -> TransactionRuleEvaluationResponse:
        """
        Main evaluation entry point.
        Evaluates all active rules against the transaction and feature snapshot.
        Persists RuleExecution rows in the database if persist_executions is True.
        """
        start_time = time.perf_counter()
        txn_id = transaction_dict.get("id") or transaction_dict.get("transaction_id", f"TXN-{uuid.uuid4().hex[:8].upper()}")

        # 1. Fetch active rule configurations via cache
        active_rules = await cls._get_active_rule_configs(session)

        evaluated_results: List[RuleEvaluationResult] = []
        triggered_results: List[RuleEvaluationResult] = []
        total_score: float = 0.0

        for r_data in active_rules:
            rule_code = r_data["rule_code"]
            rule_id = r_data["rule_id"]
            name = r_data["name"]
            category = r_data["category"]
            config = r_data["config"]
            ver_str = r_data["version"]
            ver_id = r_data["version_id"]
            rule_weight = r_data["weight"]
            rule_sev = r_data["severity"]

            evaluator = RuleRegistry.get(rule_code)
            if not evaluator:
                logger.warning("No registered evaluator found for active rule code '%s'. Skipping.", rule_code)
                continue

            # Safe configuration validation
            try:
                validated_config = RuleRegistry.validate_configuration(rule_code, config)
            except Exception as val_err:
                logger.error("Configuration validation error for rule '%s' (ver: %s): %s", rule_code, ver_str, val_err)
                error_res = RuleEvaluationResult(
                    rule_code=evaluator.code,
                    rule_id=rule_id,
                    rule_version=ver_str,
                    rule_version_id=ver_id,
                    name=name,
                    category=category,
                    severity=rule_sev,
                    triggered=False,
                    score=0.0,
                    weight=rule_weight,
                    reason=f"Invalid rule configuration: {str(val_err)}",
                    error=str(val_err)
                )
                evaluated_results.append(error_res)
                continue

            # Execute rule with isolated error handling
            try:
                eval_res = evaluator.run(
                    transaction=transaction_dict,
                    features=features,
                    configuration=validated_config,
                    version=ver_str,
                    rule_id=rule_id,
                    rule_version_id=ver_id,
                    weight_override=rule_weight,
                    severity_override=rule_sev
                )
            except Exception as rule_err:
                logger.error("Unexpected error executing rule '%s': %s", rule_code, rule_err, exc_info=True)
                eval_res = RuleEvaluationResult(
                    rule_code=evaluator.code,
                    rule_id=rule_id,
                    rule_version=ver_str,
                    rule_version_id=ver_id,
                    name=name,
                    category=category,
                    severity=rule_sev,
                    triggered=False,
                    score=0.0,
                    weight=rule_weight,
                    reason=f"Execution error: {str(rule_err)}",
                    error=str(rule_err)
                )

            evaluated_results.append(eval_res)
            if eval_res.triggered:
                triggered_results.append(eval_res)
                total_score += eval_res.score

        # Persist Rule Executions if requested
        if persist_executions:
            for res_item in evaluated_results:
                # Include structured details for explainability
                detail_dict = {
                    "reason": res_item.reason,
                    "matched_features": res_item.matched_features,
                    "evidence": res_item.evidence.model_dump() if res_item.evidence else None,
                    "error": res_item.error
                }
                exec_record = RuleExecution(
                    id=str(uuid.uuid4()),
                    transaction_id=txn_id,
                    rule_id=res_item.rule_id or res_item.rule_code,
                    rule_version_id=res_item.rule_version_id,
                    triggered=res_item.triggered,
                    score=res_item.score,
                    reason=res_item.reason,
                    execution_time_ms=res_item.execution_time_ms,
                    points_awarded=res_item.score,
                    execution_detail=detail_dict,
                    created_at=datetime.now(timezone.utc)
                )
                session.add(exec_record)

        duration = (time.perf_counter() - start_time) * 1000.0

        return TransactionRuleEvaluationResponse(
            transaction_id=txn_id,
            total_score=round(total_score, 2),
            triggered_count=len(triggered_results),
            total_evaluated_count=len(evaluated_results),
            triggered_rules=triggered_results,
            all_rules=evaluated_results,
            execution_duration_ms=round(duration, 3)
        )

    @classmethod
    async def evaluate_rules_legacy_format(
        cls,
        session: AsyncSession,
        transaction_dict: Dict[str, Any],
        features: Dict[str, Any]
    ) -> Tuple[List[Dict[str, Any]], float]:
        """
        Adapter providing backward-compatibility with the legacy pipeline interface:
        Returns (list_of_triggered_rules, total_rule_points).
        """
        eval_resp = await cls.evaluate_transaction_rules(
            session=session,
            transaction_dict=transaction_dict,
            features=features,
            persist_executions=False # Pipeline persists them or service persists them
        )

        legacy_triggered = []
        for r in eval_resp.triggered_rules:
            detail = {
                "explanation": r.reason,
                "evidence": r.evidence.model_dump() if r.evidence else None,
                "matched_features": r.matched_features
            }
            if r.rule_code in ["HIGH_AMOUNT", "HIGH_TRANSACTION_AMOUNT"]:
                detail["amount"] = r.matched_features.get("amount")
                detail["deviation_ratio"] = r.matched_features.get("amount_deviation")
            elif r.rule_code in ["RAPID_TRANSACTIONS"]:
                detail["velocity_5m"] = r.matched_features.get("velocity_5m", r.matched_features.get("velocity_1m", 1))
            elif r.rule_code in ["NEW_DEVICE"]:
                detail["device_id"] = r.matched_features.get("device_id")
            elif r.rule_code in ["UNUSUAL_LOCATION"]:
                detail["geo_hop_speed_kmh"] = r.matched_features.get("geo_hop_speed_kmh")
            elif r.rule_code in ["UNUSUAL_TIME"]:
                detail["hour_of_day"] = r.matched_features.get("hour_of_day")
            elif r.rule_code in ["FAILED_ATTEMPTS"]:
                detail["failed_attempts"] = r.matched_features.get("failed_attempts")
            elif r.rule_code in ["SUDDEN_SPENDING_INCREASE"]:
                detail["velocity_1h"] = r.matched_features.get("velocity_1h")
            elif r.rule_code in ["MERCHANT_ANOMALY"]:
                detail["merchant_category"] = r.matched_features.get("merchant_category")

            legacy_triggered.append({
                "rule_id": r.rule_id or r.rule_code,
                "rule_code": r.rule_code,
                "rule_name": r.name,
                "severity": r.severity.value if hasattr(r.severity, "value") else str(r.severity),
                "category": r.category,
                "points": r.score,
                "score": r.score,
                "version": r.rule_version,
                "rule_version_id": r.rule_version_id,
                "reason": r.reason,
                "details": detail
            })

        return legacy_triggered, eval_resp.total_score
