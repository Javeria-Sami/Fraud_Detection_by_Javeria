"""
Risk Scoring Adapter & Pure Scoring Computation.
Section 09 — Risk Engine.
"""
from typing import Tuple, List, Dict, Any, Optional
import math
from backend.app.engine.risk.types import RiskLevel, RiskResult
from backend.app.engine.risk.config import default_risk_config
from backend.app.engine.risk.calculator import PureRiskCalculator


def calculate_risk_score(
    rule_points: float = 0.0,
    ml_anomaly_score: Optional[float] = 0.0,
    user_risk_score: float = 0.0,
    device_risk_score: float = 0.0,
    merchant_risk_score: float = 0.0,
    features: Optional[Dict[str, Any]] = None
) -> Tuple[float, RiskLevel, List[str], Dict[str, Any]]:
    """
    Computes a composite risk score (0-100), risk level tier, explanation reasons,
    and a score component breakdown dictionary.
    """
    # Sanitize inputs
    r_pts = 0.0 if (rule_points is None or math.isnan(rule_points)) else float(rule_points)
    u_score = 0.0 if (user_risk_score is None or math.isnan(user_risk_score)) else float(user_risk_score)
    d_score = 0.0 if (device_risk_score is None or math.isnan(device_risk_score)) else float(device_risk_score)
    m_score = 0.0 if (merchant_risk_score is None or math.isnan(merchant_risk_score)) else float(merchant_risk_score)

    has_ml = ml_anomaly_score is not None and not math.isnan(ml_anomaly_score)
    ml_val = float(ml_anomaly_score) if has_ml else 0.0
    ml_component = max(0.0, min(100.0, ml_val * 100.0))

    # Weight components
    if has_ml:
        w_rule = 0.50
        w_ml = 0.35
        w_hist = 0.15
    else:
        w_rule = 0.75
        w_ml = 0.00
        w_hist = 0.25

    hist_score = (u_score * 0.5) + (d_score * 0.3) + (m_score * 0.2)
    raw_score = (r_pts * w_rule) + (ml_component * w_ml) + (hist_score * w_hist)

    # Floor overrides for high confidence fraud
    if r_pts >= 70.0 and ml_val >= 0.80:
        raw_score = max(raw_score, 88.0)
    elif r_pts >= 50.0 and ml_val >= 0.60:
        raw_score = max(raw_score, 70.0)

    final_score = round(max(0.0, min(100.0, raw_score)), 1)

    # Classify Risk Level
    if final_score <= 30.0:
        level = RiskLevel.LOW
    elif final_score <= 60.0:
        level = RiskLevel.MEDIUM
    elif final_score <= 85.0:
        level = RiskLevel.HIGH
    else:
        level = RiskLevel.CRITICAL

    reasons: List[str] = []
    if r_pts > 0:
        reasons.append(f"Rule score contribution: {r_pts:.1f} pts")
    if has_ml and ml_val > 0.40:
        reasons.append(f"ML anomaly score elevated ({ml_val:.1%})")
    if hist_score > 30:
        reasons.append(f"Historical entity risk score elevated ({hist_score:.1f})")

    breakdown = {
        "rule_score": r_pts,
        "ml_score": ml_component,
        "historical_risk": hist_score,
        "final_score": final_score
    }

    return final_score, level, reasons, breakdown
