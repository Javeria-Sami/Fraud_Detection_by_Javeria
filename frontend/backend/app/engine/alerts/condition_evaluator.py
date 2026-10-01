"""
Pure Deterministic Alert Condition Evaluator.
Section 10 — Alert Engine.

Stateless evaluation layer that consumes RiskResult and Transaction context,
evaluating condition chains to produce an explainable AlertDecision.
"""
from typing import Dict, Any, List, Optional
from backend.app.engine.risk.types import RiskResult, RiskLevel
from backend.app.engine.alerts.types import (
    AlertType,
    AlertSeverity,
    AlertPriority,
    AlertDecision
)
from backend.app.engine.alerts.config import AlertEngineConfig, default_alert_config


class AlertConditionEvaluator:
    """
    Stateless rule & threshold condition evaluator for operational alert decisions.
    """

    @classmethod
    def evaluate(
        cls,
        risk_result: RiskResult,
        transaction_dict: Dict[str, Any],
        config: Optional[AlertEngineConfig] = None
    ) -> AlertDecision:
        """
        Pure evaluation entry point.
        Evaluates risk score, rule patterns, ML anomalies, and behavioral context against alert thresholds.
        """
        cfg = config or default_alert_config
        txn_id = risk_result.transaction_id or transaction_dict.get("id") or transaction_dict.get("transaction_id", "UNKNOWN_TXN")
        user_id = transaction_dict.get("user_id", "UNKNOWN_USER")
        score = risk_result.risk_score
        rules = [f for f in risk_result.factors if "Rule:" in f.factor_name or f.code.startswith("RULE")]
        ml_score = risk_result.ml_score
        
        # 1. Check CRITICAL Risk Condition
        is_critical_score = score >= cfg.critical_risk_threshold or risk_result.risk_level == RiskLevel.CRITICAL
        has_critical_rule = any(
            (f.evidence and f.evidence.get("severity") == "CRITICAL")
            or "CRITICAL" in f.description.upper()
            or f.score >= 90.0
            for f in rules
        )
        
        if is_critical_score or has_critical_rule:
            alert_type = AlertType.CRITICAL_RISK_TRANSACTION
            sev = AlertSeverity.CRITICAL
            prio = AlertPriority(cfg.severity_priority_map.get(sev.value, AlertPriority.P1.value))
            title = "Critical Risk Transaction Detected"
            reason = f"Transaction risk score ({score:.1f}/100) exceeded critical threshold ({cfg.critical_risk_threshold:.1f}) or critical rule pattern triggered."
            
            return cls._build_decision(
                should_create=True,
                alert_type=alert_type,
                severity=sev,
                priority=prio,
                title=title,
                reason=reason,
                risk_result=risk_result,
                transaction_dict=transaction_dict,
                cfg=cfg,
                txn_id=txn_id
            )

        # 2. Check HIGH Risk Condition
        is_high_score = score >= cfg.high_risk_threshold or risk_result.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL)
        has_high_rule = any(
            (f.evidence and f.evidence.get("severity") in ("HIGH", "CRITICAL"))
            or "HIGH" in f.description.upper()
            or f.score >= 50.0
            for f in rules
        )
        
        if is_high_score or has_high_rule:
            alert_type = AlertType.HIGH_RISK_TRANSACTION
            sev = AlertSeverity.HIGH
            prio = AlertPriority(cfg.severity_priority_map.get(sev.value, AlertPriority.P2.value))
            title = "High Risk Transaction Detected"
            reason = f"Transaction risk score ({score:.1f}/100) or high-priority rule signal triggered."

            return cls._build_decision(
                should_create=True,
                alert_type=alert_type,
                severity=sev,
                priority=prio,
                title=title,
                reason=reason,
                risk_result=risk_result,
                transaction_dict=transaction_dict,
                cfg=cfg,
                txn_id=txn_id
            )

        # 3. Check Standalone ML Anomaly Condition
        if ml_score >= (cfg.ml_anomaly_threshold * 100.0) and AlertType.ML_ANOMALY.value in cfg.enabled_alert_types:
            alert_type = AlertType.ML_ANOMALY
            sev = AlertSeverity.HIGH
            prio = AlertPriority(cfg.severity_priority_map.get(sev.value, AlertPriority.P2.value))
            title = "Machine Learning Anomaly Detected"
            reason = f"Isolation Forest anomaly model flagged transaction with {ml_score:.1f}% anomaly probability."

            return cls._build_decision(
                should_create=True,
                alert_type=alert_type,
                severity=sev,
                priority=prio,
                title=title,
                reason=reason,
                risk_result=risk_result,
                transaction_dict=transaction_dict,
                cfg=cfg,
                txn_id=txn_id
            )

        # 4. Check Specific Behavioral / Rule Pattern Conditions
        for factor in risk_result.factors:
            if factor.code == "BEHAVIOR_VELOCITY" and AlertType.RAPID_TRANSACTION_ACTIVITY.value in cfg.enabled_alert_types:
                return cls._build_decision(
                    should_create=True,
                    alert_type=AlertType.RAPID_TRANSACTION_ACTIVITY,
                    severity=AlertSeverity.MEDIUM,
                    priority=AlertPriority.P3,
                    title="Rapid Transaction Activity Detected",
                    reason=factor.description,
                    risk_result=risk_result,
                    transaction_dict=transaction_dict,
                    cfg=cfg,
                    txn_id=txn_id
                )
            if factor.code == "BEHAVIOR_NOVELTY" and AlertType.NEW_DEVICE_RISK.value in cfg.enabled_alert_types:
                return cls._build_decision(
                    should_create=True,
                    alert_type=AlertType.NEW_DEVICE_RISK,
                    severity=AlertSeverity.MEDIUM,
                    priority=AlertPriority.P3,
                    title="New Device or Location Fingerprint Detected",
                    reason=factor.description,
                    risk_result=risk_result,
                    transaction_dict=transaction_dict,
                    cfg=cfg,
                    txn_id=txn_id
                )

        # 5. Default: No alert conditions satisfied (Normal operational condition)
        return AlertDecision(
            should_create_alert=False,
            reason="Transaction risk score and anomaly signals are below configured alert thresholds.",
            configuration_version=cfg.alert_config_version,
            deduplication_key=f"{txn_id}:NONE"
        )

    @classmethod
    def _build_decision(
        cls,
        should_create: bool,
        alert_type: AlertType,
        severity: AlertSeverity,
        priority: AlertPriority,
        title: str,
        reason: str,
        risk_result: RiskResult,
        transaction_dict: Dict[str, Any],
        cfg: AlertEngineConfig,
        txn_id: str
    ) -> AlertDecision:
        """Constructs evidence-based description and structured evidence payload."""
        factor_summaries = [f.description for f in risk_result.factors if f.description]
        desc_narrative = (
            f"An operational alert was generated for transaction {txn_id} (Amount: {transaction_dict.get('amount', 0.0)} {transaction_dict.get('currency', 'USD')}). "
            f"Evaluated Risk Score: {risk_result.risk_score:.1f}/100 ({risk_result.risk_level.value}). "
            f"Contributing factors: {'; '.join(factor_summaries[:3]) if factor_summaries else 'Elevated multi-signal deviation.'}"
        )

        evidence_payload = {
            "transaction_id": txn_id,
            "risk_score": risk_result.risk_score,
            "risk_level": risk_result.risk_level.value,
            "rule_score": risk_result.rule_score,
            "ml_score": risk_result.ml_score,
            "behavior_score": risk_result.behavior_score,
            "factors": [f.model_dump() for f in risk_result.factors],
            "transaction_amount": transaction_dict.get("amount"),
            "currency": transaction_dict.get("currency", "USD"),
            "merchant_name": transaction_dict.get("merchant_name"),
            "device_id": transaction_dict.get("device_id"),
            "user_id": transaction_dict.get("user_id")
        }

        return AlertDecision(
            should_create_alert=should_create,
            alert_type=alert_type,
            severity=severity,
            priority=priority,
            title=title,
            description=desc_narrative,
            reason=reason,
            evidence=evidence_payload,
            deduplication_key=f"{txn_id}:{alert_type.value}",
            configuration_version=cfg.alert_config_version
        )
