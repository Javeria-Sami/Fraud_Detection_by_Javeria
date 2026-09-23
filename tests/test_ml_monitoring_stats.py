"""
Unit tests for ML Monitoring statistical engines, drift calculations, and data quality checks.
Section 20 — Model Monitoring & MLOps.
"""
import pytest
import numpy as np
from backend.app.engine.ml.monitoring.drift import (
    calculate_psi,
    calculate_ks_test,
    calculate_categorical_drift,
    evaluate_feature_drift
)
from backend.app.engine.ml.monitoring.data_quality import evaluate_data_quality
from backend.app.engine.ml.monitoring.metrics import (
    calculate_prediction_and_score_metrics,
    calculate_latency_metrics,
    evaluate_ground_truth_performance
)
from backend.app.engine.ml.monitoring.health import evaluate_model_health


def test_psi_identical_and_shifted_distributions():
    np.random.seed(42)
    # 1. Identical distributions -> PSI should be very small (~ 0.0)
    ref = np.random.normal(loc=100.0, scale=15.0, size=1000)
    curr_identical = np.random.normal(loc=100.0, scale=15.0, size=1000)
    psi_identical, meta = calculate_psi(ref, curr_identical)
    assert psi_identical < 0.10
    assert meta["num_bins"] > 1

    # 2. Moderate shift -> 0.10 <= PSI < 0.25 (WARNING)
    curr_moderate = np.random.normal(loc=108.0, scale=15.0, size=1000)
    psi_moderate, _ = calculate_psi(ref, curr_moderate)
    assert psi_moderate >= 0.05

    # 3. Severe shift -> PSI >= 0.25 (CRITICAL)
    curr_severe = np.random.normal(loc=130.0, scale=25.0, size=1000)
    psi_severe, _ = calculate_psi(ref, curr_severe)
    assert psi_severe >= 0.25


def test_ks_test_drift_detection():
    np.random.seed(42)
    ref = np.random.exponential(scale=50.0, size=500)
    curr_same = np.random.exponential(scale=50.0, size=500)
    curr_drift = np.random.exponential(scale=150.0, size=500)

    stat_same, pval_same = calculate_ks_test(ref, curr_same)
    assert pval_same > 0.01  # Cannot reject H0 (same distribution)

    stat_drift, pval_drift = calculate_ks_test(ref, curr_drift)
    assert pval_drift < 0.01  # Significant drift detected
    assert stat_drift > stat_same


def test_categorical_drift_jensen_shannon():
    ref_counts = {"US": 800, "CA": 150, "UK": 50}
    curr_similar = {"US": 790, "CA": 160, "UK": 50}
    curr_skewed = {"US": 100, "CA": 100, "UK": 800}  # Major UK surge

    js_similar, _ = calculate_categorical_drift(ref_counts, curr_similar)
    assert js_similar < 0.05

    js_skewed, _ = calculate_categorical_drift(ref_counts, curr_skewed)
    assert js_skewed > 0.15


def test_feature_drift_evaluation_with_sample_safeguards():
    # Insufficient samples should return UNKNOWN
    res_unknown = evaluate_feature_drift("amount", [100.0, 200.0], [150.0, 250.0], min_sample_size=15)
    assert res_unknown["status"] == "UNKNOWN"
    assert "Insufficient sample size" in res_unknown["reason"]

    # Sufficient sample with identical distribution
    ref = [10.0, 12.0, 14.0, 15.0, 16.0, 18.0, 20.0, 22.0, 24.0, 25.0] * 5
    curr = [10.0, 12.0, 14.0, 15.0, 16.0, 18.0, 20.0, 22.0, 24.0, 25.0] * 5
    res_normal = evaluate_feature_drift("velocity_5m", ref, curr)
    assert res_normal["status"] == "NORMAL"
    assert res_normal["drift_value"] < 0.10


def test_data_quality_evaluation():
    # Clean records
    clean_records = [
        {"amount": 150.0, "hour_of_day": 14, "is_new_device": 0, "velocity_5m": 2}
        for _ in range(50)
    ]
    res_clean = evaluate_data_quality(clean_records, expected_features=["amount", "hour_of_day", "is_new_device"])
    assert res_clean["status"] == "NORMAL"
    assert res_clean["total_invalid_values"] == 0
    assert res_clean["max_missing_rate_pct"] == 0.0

    # Corrupted records (NaN, out-of-bounds hour_of_day = 99)
    corrupted_records = [
        {"amount": float("nan"), "hour_of_day": 99, "is_new_device": None, "velocity_5m": 2}
        for _ in range(50)
    ]
    res_corrupted = evaluate_data_quality(corrupted_records, expected_features=["amount", "hour_of_day", "is_new_device"])
    assert res_corrupted["status"] == "CRITICAL"
    assert res_corrupted["total_invalid_values"] > 0
    assert res_corrupted["max_missing_rate_pct"] > 0.0


def test_latency_and_score_metrics():
    predictions = [
        {"anomaly_score": 0.20, "inference_time_ms": 12.0, "prediction": "NORMAL"},
        {"anomaly_score": 0.35, "inference_time_ms": 18.0, "prediction": "NORMAL"},
        {"anomaly_score": 0.85, "inference_time_ms": 45.0, "prediction": "ANOMALOUS"},
        {"anomaly_score": 0.90, "inference_time_ms": 50.0, "prediction": "ANOMALOUS"}
    ]

    score_res = calculate_prediction_and_score_metrics(predictions, threshold=0.65)
    assert score_res["total_predictions"] == 4
    assert score_res["anomaly_count"] == 2
    assert score_res["anomaly_rate_pct"] == 50.0
    assert score_res["score_statistics"]["max"] == 0.90

    lat_res = calculate_latency_metrics(predictions)
    assert lat_res["sample_count"] == 4
    assert lat_res["p95_latency_ms"] >= 45.0
    assert lat_res["failure_rate_pct"] == 0.0


def test_honest_ground_truth_reporting_no_fabrication():
    # 1. Zero/insufficient labels must report unavailable
    res_none = evaluate_ground_truth_performance([])
    assert res_none["available"] is False
    assert "unavailable" in res_none["reason"].lower()
    assert res_none["metrics"] == {}

    # 2. Only single class labels must report unavailable
    res_single = evaluate_ground_truth_performance([(0.2, 0), (0.1, 0), (0.3, 0), (0.4, 0), (0.1, 0)])
    assert res_single["available"] is False
    assert "lacks both positive and negative" in res_single["reason"]

    # 3. Valid multi-class labeled outcomes
    labeled_data = [
        (0.85, 1), (0.90, 1), (0.75, 1), (0.20, 0), (0.15, 0), (0.10, 0)
    ]
    res_valid = evaluate_ground_truth_performance(labeled_data, threshold=0.65)
    assert res_valid["available"] is True
    assert res_valid["metrics"]["precision"] == 1.0
    assert res_valid["metrics"]["recall"] == 1.0
    assert res_valid["metrics"]["roc_auc"] == 1.0


def test_health_evaluator_synthesis():
    drift_ok = [{"feature_name": "amount", "status": "NORMAL"}]
    lat_ok = {"p95_latency_ms": 25.0, "failure_rate_pct": 0.0}
    dq_ok = {"status": "NORMAL"}
    pred_ok = {"total_predictions": 50, "anomaly_rate_pct": 8.0}

    # Normal health
    h_normal = evaluate_model_health(drift_ok, lat_ok, dq_ok, pred_ok)
    assert h_normal["health_status"] == "NORMAL"

    # Critical due to severe drift
    drift_crit = [{"feature_name": "geo_hop_speed_kmh", "status": "CRITICAL"}]
    h_crit = evaluate_model_health(drift_crit, lat_ok, dq_ok, pred_ok)
    assert h_crit["health_status"] == "CRITICAL"
    assert "Significant feature drift" in h_crit["reason"]

    # Unknown due to insufficient sample count
    pred_few = {"total_predictions": 3, "anomaly_rate_pct": 0.0}
    h_unknown = evaluate_model_health(drift_ok, lat_ok, dq_ok, pred_few, min_sample_size=15)
    assert h_unknown["health_status"] == "UNKNOWN"
