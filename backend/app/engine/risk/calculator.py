"""
Pure Deterministic Risk Scoring Calculator.
Section 09 — Risk Engine.

Contains pure scoring functions free of database or I/O side effects,
ensuring 100% deterministic testability, explainability, and auditability.
"""
import time
import math
from typing import List, Dict, Any, Optional, Tuple
from backend.app.engine.risk.types import (
    RiskLevel,
    CalculationStatus,
    RiskExplanationFactor,
    RiskResult
)
from backend.app.engine.risk.config import RiskScoringConfig, default_risk_config


class PureRiskCalculator:
    """
    Stateless calculation engine for multi-factor risk blending and explainability.
    """

    @classmethod
    def aggregate_rule_score(
        cls,
        triggered_rules: List[Dict[str, Any]],
        config: RiskScoringConfig
    ) -> Tuple[float, List[RiskExplanationFactor]]:
        """
        Aggregates rule scores using diminishing contribution to prevent score inflation from correlated rules.
        """
        if not triggered_rules:
            return 0.0, []

        # Sort triggered rules by awarded score/points descending
        sorted_rules = sorted(
            triggered_rules,
            key=lambda r: float(r.get("score") or r.get("points", 0.0)),
            reverse=True
        )

        factors: List[RiskExplanationFactor] = []
        diminishing_factor = config.diminishing_factor
        total_aggregated_score = 0.0

        for idx, rule in enumerate(sorted_rules):
            pts = float(rule.get("score") or rule.get("points", 0.0))
            rule_code = rule.get("rule_code") or rule.get("rule_id", "UNKNOWN_RULE")
            rule_name = rule.get("rule_name") or rule_code
            reason = rule.get("reason") or rule.get("details", {}).get("explanation", f"Rule {rule_name} triggered.")
            evidence = rule.get("details", {}).get("evidence") or rule.get("evidence")

            # Diminishing weight: 1.0 for first, 0.6 for second, 0.36 for third, etc.
            effective_mult = (diminishing_factor ** idx) if config.rule_aggregation_mode == "diminishing_sum" else (1.0 if idx == 0 else 0.0)
            rule_contrib = pts * effective_mult
            total_aggregated_score += rule_contrib

            factors.append(
                RiskExplanationFactor(
                    factor_name=f"Rule: {rule_name}",
                    code=rule_code,
                    weight=round(effective_mult, 3),
                    score=round(pts, 1),
                    contribution=round(rule_contrib, 1),
                    description=reason,
                    evidence=evidence
                )
            )

        # Cap rule score to 100.0
        normalized_rule_score = max(0.0, min(100.0, total_aggregated_score))
        return round(normalized_rule_score, 2), factors

    @classmethod
    def calculate_behavioral_score(
        cls,
        features: Dict[str, Any]
    ) -> Tuple[float, List[RiskExplanationFactor]]:
        """
        Computes behavioral context score [0-100] based on velocity, device novelty, and location changes.
        """
        factors: List[RiskExplanationFactor] = []
        raw_score = 0.0

        # 1. Velocity Burst Component
        v_5m = int(features.get("velocity_5m", 1))
        if v_5m >= 3:
            vel_score = min(40.0, (v_5m - 1) * 10.0)
            raw_score += vel_score
            factors.append(
                RiskExplanationFactor(
                    factor_name="Short-Term Velocity Surge",
                    code="BEHAVIOR_VELOCITY",
                    weight=0.40,
                    score=round(vel_score, 1),
                    contribution=round(vel_score, 1),
                    description=f"Elevated velocity with {v_5m} transactions in 5 minutes.",
                    evidence={"velocity_5m": v_5m}
                )
            )

        # 2. Device & Location Novelty Component
        is_new_dev = int(features.get("is_new_device", 0))
        is_unusual_loc = int(features.get("is_unusual_location", 0))
        is_new_country = int(features.get("is_new_country", 0))

        if is_new_dev == 1 or is_unusual_loc == 1 or is_new_country == 1:
            novelty_score = (is_new_dev * 20.0) + (is_unusual_loc * 20.0) + (is_new_country * 20.0)
            novelty_score = min(40.0, novelty_score)
            raw_score += novelty_score
            factors.append(
                RiskExplanationFactor(
                    factor_name="Novel Device or Location Fingerprint",
                    code="BEHAVIOR_NOVELTY",
                    weight=0.40,
                    score=round(novelty_score, 1),
                    contribution=round(novelty_score, 1),
                    description="Transaction initiated from unfamiliar device fingerprint or geographic location.",
                    evidence={"is_new_device": is_new_dev, "is_unusual_location": is_unusual_loc, "is_new_country": is_new_country}
                )
            )

        # 3. Preceding Authentication Failures Component
        failed_attempts = int(features.get("failed_attempts", 0))
        if failed_attempts > 0:
            auth_score = min(20.0, failed_attempts * 10.0)
            raw_score += auth_score
            factors.append(
                RiskExplanationFactor(
                    factor_name="Prior Authentication Failures",
                    code="BEHAVIOR_FAILED_AUTH",
                    weight=0.20,
                    score=round(auth_score, 1),
                    contribution=round(auth_score, 1),
                    description=f"{failed_attempts} failed authentication attempts directly preceded this transaction.",
                    evidence={"failed_attempts": failed_attempts}
                )
            )

        final_behavior_score = max(0.0, min(100.0, raw_score))
        return round(final_behavior_score, 2), factors

    @classmethod
    def classify_risk_band(cls, score: float, config: RiskScoringConfig) -> RiskLevel:
        """
        Deterministically assigns risk level based on configured score thresholds.
        Exact boundary behaviors:
        0.0 <= score <= threshold_low       -> LOW
        threshold_low < score <= threshold_medium -> MEDIUM
        threshold_medium < score <= threshold_high -> HIGH
        score > threshold_high              -> CRITICAL
        """
        if score <= config.threshold_low:
            return RiskLevel.LOW
        elif score <= config.threshold_medium:
            return RiskLevel.MEDIUM
        elif score <= config.threshold_high:
            return RiskLevel.HIGH
        else:
            return RiskLevel.CRITICAL

    @classmethod
    def calculate_risk(
        cls,
        transaction_dict: Dict[str, Any],
        features: Optional[Dict[str, Any]] = None,
        triggered_rules: Optional[List[Dict[str, Any]]] = None,
        ml_anomaly_score: Optional[float] = None,
        config: Optional[RiskScoringConfig] = None,
        model_version: Optional[str] = None,
        feature_version: Optional[str] = None
    ) -> RiskResult:
        """
        Pure calculation entry point.
        Blends rule scores, ML anomaly score, and behavioral features into a calibrated 0-100 risk result.
        """
        start_time = time.perf_counter()
        cfg = config or default_risk_config
        txn_id = transaction_dict.get("id") or transaction_dict.get("transaction_id", "TXN-UNKNOWN")
        feat = features or {}
        rules_list = triggered_rules or []

        calc_status = CalculationStatus.COMPLETED
        all_factors: List[RiskExplanationFactor] = []

        # 1. Rule Engine Signal Component
        rule_score, rule_factors = cls.aggregate_rule_score(rules_list, cfg)
        all_factors.extend(rule_factors)

        # 2. ML Anomaly Model Signal Component
        has_ml = ml_anomaly_score is not None and not math.isnan(ml_anomaly_score)
        if has_ml:
            norm_ml_score = max(0.0, min(100.0, float(ml_anomaly_score) * 100.0))
            ml_score = norm_ml_score
            ml_factor_desc = f"Isolation Forest multidimensional anomaly probability: {float(ml_anomaly_score):.1%}."
            all_factors.append(
                RiskExplanationFactor(
                    factor_name="ML Anomaly Model",
                    code="ML_ISOLATION_FOREST",
                    weight=cfg.ml_weight,
                    score=round(ml_score, 1),
                    contribution=round(ml_score * cfg.ml_weight, 1),
                    description=ml_factor_desc,
                    evidence={"anomaly_score": float(ml_anomaly_score), "model_version": model_version}
                )
            )
        else:
            ml_score = 0.0
            calc_status = CalculationStatus.PARTIAL

        # 3. Behavioral Vector Component
        behavior_score, behavior_factors = cls.calculate_behavioral_score(feat)
        all_factors.extend(behavior_factors)

        # 4. Weight Normalization & Blending
        if has_ml:
            w_rule = cfg.rule_weight
            w_ml = cfg.ml_weight
            w_beh = cfg.behavior_weight
        else:
            # Fallback weights when ML is unavailable (renormalize rules and behavior)
            total_remaining = cfg.rule_weight + cfg.behavior_weight
            if total_remaining > 0:
                w_rule = cfg.rule_weight / total_remaining
                w_beh = cfg.behavior_weight / total_remaining
            else:
                w_rule = 0.80
                w_beh = 0.20
            w_ml = 0.0

        blended_score = (rule_score * w_rule) + (ml_score * w_ml) + (behavior_score * w_beh)

        # 5. Severity Floor Overrides (Prevents severe fraud indicators from being diluted)
        if cfg.enable_severity_floors and rules_list:
            if any(r.get("severity") == "CRITICAL" for r in rules_list):
                blended_score = max(cfg.critical_severity_floor, blended_score)
            elif any(r.get("severity") == "HIGH" for r in rules_list):
                blended_score = max(cfg.high_severity_floor, blended_score)

        # Strictly clamp 0.0 <= final_score <= 100.0
        final_risk_score = round(max(0.0, min(100.0, blended_score)), 1)
        risk_level = cls.classify_risk_band(final_risk_score, cfg)

        duration_ms = round((time.perf_counter() - start_time) * 1000.0, 3)

        return RiskResult(
            transaction_id=txn_id,
            risk_score=final_risk_score,
            risk_level=risk_level,
            status=calc_status,
            rule_score=round(rule_score, 1),
            ml_score=round(ml_score, 1),
            behavior_score=round(behavior_score, 1),
            triggered_rule_count=len(rules_list),
            signals_evaluated=len(rules_list) + (1 if has_ml else 0) + (1 if behavior_score > 0 else 0),
            factors=all_factors,
            scoring_version=cfg.scoring_version,
            rule_version=rules_list[0].get("version", "v1.0") if rules_list else "v1.0",
            model_version=model_version or "v1.0.0",
            feature_version=feature_version or "v1.0.0",
            calculation_time_ms=duration_ms
        )
