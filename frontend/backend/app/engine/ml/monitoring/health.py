"""
Authoritative Model Operational Health Evaluator.
Section 20 — Model Monitoring & MLOps.

Assigns overall health state:
- NORMAL: All statistical, latency, and data quality metrics within bounds.
- WARNING: Moderate feature drift or elevated latency/missingness observed.
- CRITICAL: Severe drift, high inference failure rate, or significant data corruption detected.
- UNKNOWN: Insufficient observations or missing monitoring window data.
"""
from typing import Dict, Any, List


def evaluate_model_health(
    drift_results: List[Dict[str, Any]],
    latency_metrics: Dict[str, Any],
    data_quality: Dict[str, Any],
    prediction_metrics: Dict[str, Any],
    latency_p95_warning_ms: float = 100.0,
    latency_p95_critical_ms: float = 250.0,
    failure_rate_critical_pct: float = 5.0,
    min_sample_size: int = 15
) -> Dict[str, Any]:
    """
    Combines modular monitoring outputs into an authoritative overall health assessment.
    """
    sample_count = prediction_metrics.get("total_predictions", 0)
    if sample_count < min_sample_size:
        return {
            "health_status": "UNKNOWN",
            "reason": f"Insufficient sample size ({sample_count} observations < minimum {min_sample_size})",
            "checks_summary": {
                "drift_check": "UNKNOWN",
                "latency_check": "UNKNOWN",
                "data_quality_check": "UNKNOWN",
                "prediction_check": "UNKNOWN"
            }
        }

    critical_reasons = []
    warning_reasons = []

    # 1. Feature Drift Evaluation
    critical_drift_features = [d["feature_name"] for d in drift_results if d.get("status") == "CRITICAL"]
    warning_drift_features = [d["feature_name"] for d in drift_results if d.get("status") == "WARNING"]

    drift_check = "NORMAL"
    if critical_drift_features:
        drift_check = "CRITICAL"
        critical_reasons.append(f"Significant feature drift on: {', '.join(critical_drift_features[:3])}")
    elif warning_drift_features:
        drift_check = "WARNING"
        warning_reasons.append(f"Moderate feature drift on: {', '.join(warning_drift_features[:3])}")

    # 2. Latency & Failure Evaluation
    p95_lat = latency_metrics.get("p95_latency_ms", 0.0)
    fail_rate = latency_metrics.get("failure_rate_pct", 0.0)

    latency_check = "NORMAL"
    if fail_rate >= failure_rate_critical_pct:
        latency_check = "CRITICAL"
        critical_reasons.append(f"High inference failure rate ({fail_rate}%)")
    elif p95_lat >= latency_p95_critical_ms:
        latency_check = "CRITICAL"
        critical_reasons.append(f"Severe inference latency spike (p95: {p95_lat}ms >= {latency_p95_critical_ms}ms)")
    elif p95_lat >= latency_p95_warning_ms:
        latency_check = "WARNING"
        warning_reasons.append(f"Elevated inference latency (p95: {p95_lat}ms >= {latency_p95_warning_ms}ms)")

    # 3. Data Quality Evaluation
    dq_status = data_quality.get("status", "NORMAL")
    dq_check = dq_status
    if dq_status == "CRITICAL":
        critical_reasons.append(data_quality.get("reason", "Critical data quality degradation"))
    elif dq_status == "WARNING":
        warning_reasons.append(data_quality.get("reason", "Data quality warning"))

    # 4. Prediction Volume & Anomaly Rate Check
    pred_check = "NORMAL"
    anomaly_rate = prediction_metrics.get("anomaly_rate_pct", 0.0)
    if anomaly_rate > 50.0:
        pred_check = "WARNING"
        warning_reasons.append(f"Unusually high anomaly prediction rate ({anomaly_rate}%)")

    # Overall Synthesis
    if critical_reasons:
        final_status = "CRITICAL"
        final_reason = "; ".join(critical_reasons)
    elif warning_reasons:
        final_status = "WARNING"
        final_reason = "; ".join(warning_reasons)
    else:
        final_status = "NORMAL"
        final_reason = "All model monitoring and feature telemetry metrics within nominal operating parameters"

    return {
        "health_status": final_status,
        "reason": final_reason,
        "critical_count": len(critical_reasons),
        "warning_count": len(warning_reasons),
        "checks_summary": {
            "drift_check": drift_check,
            "latency_check": latency_check,
            "data_quality_check": dq_check,
            "prediction_check": pred_check
        }
    }
