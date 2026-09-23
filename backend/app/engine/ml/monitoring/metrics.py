"""
ML Model Operational Telemetry, Latency, and Ground-Truth Evaluation Metrics.
Section 20 — Model Monitoring & MLOps.
"""
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score, average_precision_score, confusion_matrix


def calculate_prediction_and_score_metrics(
    predictions: List[Dict[str, Any]],
    threshold: float = 0.65
) -> Dict[str, Any]:
    """
    Computes volume, anomaly rate, and comprehensive score distribution percentiles.
    """
    total = len(predictions)
    if total == 0:
        return {
            "total_predictions": 0,
            "anomaly_count": 0,
            "anomaly_rate_pct": 0.0,
            "score_statistics": {
                "mean": 0.0, "median": 0.0, "min": 0.0, "max": 0.0, "std": 0.0,
                "p10": 0.0, "p25": 0.0, "p50": 0.0, "p75": 0.0, "p90": 0.0, "p95": 0.0, "p99": 0.0
            },
            "score_histogram": []
        }

    scores = np.array([p.get("anomaly_score", 0.0) for p in predictions], dtype=float)
    scores = scores[np.isfinite(scores)]

    if len(scores) == 0:
        scores = np.array([0.0])

    anomalies = np.sum(scores >= threshold)
    anomaly_rate = float((anomalies / total) * 100)

    # Calculate percentiles
    p10, p25, p50, p75, p90, p95, p99 = np.percentile(scores, [10, 25, 50, 75, 90, 95, 99])

    # 10-bin histogram for distribution rendering [0.0, 1.0]
    hist_counts, bin_edges = np.histogram(scores, bins=10, range=(0.0, 1.0))
    histogram = []
    for i in range(len(hist_counts)):
        histogram.append({
            "bin_start": round(float(bin_edges[i]), 2),
            "bin_end": round(float(bin_edges[i+1]), 2),
            "count": int(hist_counts[i]),
            "pct": round(float((hist_counts[i] / total) * 100), 2)
        })

    return {
        "total_predictions": total,
        "anomaly_count": int(anomalies),
        "anomaly_rate_pct": round(anomaly_rate, 2),
        "score_statistics": {
            "mean": round(float(np.mean(scores)), 4),
            "median": round(float(p50), 4),
            "min": round(float(np.min(scores)), 4),
            "max": round(float(np.max(scores)), 4),
            "std": round(float(np.std(scores)), 4),
            "p10": round(float(p10), 4),
            "p25": round(float(p25), 4),
            "p50": round(float(p50), 4),
            "p75": round(float(p75), 4),
            "p90": round(float(p90), 4),
            "p95": round(float(p95), 4),
            "p99": round(float(p99), 4)
        },
        "score_histogram": histogram
    }


def calculate_latency_metrics(
    predictions: List[Dict[str, Any]],
    window_duration_sec: Optional[float] = None
) -> Dict[str, Any]:
    """
    Computes inference latency percentiles (p50, p95, p99) and estimated throughput.
    """
    total = len(predictions)
    if total == 0:
        return {
            "sample_count": 0,
            "mean_latency_ms": 0.0,
            "p50_latency_ms": 0.0,
            "p95_latency_ms": 0.0,
            "p99_latency_ms": 0.0,
            "max_latency_ms": 0.0,
            "failure_rate_pct": 0.0,
            "throughput_req_per_sec": 0.0
        }

    latencies = []
    failures = 0

    for p in predictions:
        lat = p.get("inference_time_ms")
        if lat is not None and not np.isnan(lat) and lat >= 0:
            latencies.append(float(lat))
        if p.get("error") is not None or p.get("prediction") == "ERROR":
            failures += 1

    if not latencies:
        latencies = [0.0]

    lat_arr = np.array(latencies, dtype=float)
    p50, p95, p99 = np.percentile(lat_arr, [50, 95, 99])
    mean_lat = float(np.mean(lat_arr))
    max_lat = float(np.max(lat_arr))
    fail_rate = float((failures / total) * 100) if total > 0 else 0.0

    throughput = 0.0
    if window_duration_sec and window_duration_sec > 0:
        throughput = round(total / window_duration_sec, 2)
    elif mean_lat > 0:
        throughput = round(1000.0 / mean_lat, 2)

    return {
        "sample_count": total,
        "mean_latency_ms": round(mean_lat, 2),
        "p50_latency_ms": round(float(p50), 2),
        "p95_latency_ms": round(float(p95), 2),
        "p99_latency_ms": round(float(p99), 2),
        "max_latency_ms": round(max_lat, 2),
        "failure_rate_pct": round(fail_rate, 2),
        "throughput_req_per_sec": throughput
    }


def evaluate_ground_truth_performance(
    predictions_with_labels: List[Tuple[float, int]],  # (score, label in {0, 1})
    threshold: float = 0.65
) -> Dict[str, Any]:
    """
    Evaluates supervised metrics IF verified ground-truth labels exist.
    Strictly reports 'unavailable' if zero labeled samples exist.
    """
    if not predictions_with_labels or len(predictions_with_labels) < 5:
        return {
            "available": False,
            "reason": "Ground-truth performance unavailable (insufficient verified outcome labels)",
            "evaluated_samples": len(predictions_with_labels) if predictions_with_labels else 0,
            "metrics": {}
        }

    y_scores = np.array([pair[0] for pair in predictions_with_labels], dtype=float)
    y_true = np.array([pair[1] for pair in predictions_with_labels], dtype=int)
    y_pred = (y_scores >= threshold).astype(int)

    unique_classes = np.unique(y_true)
    if len(unique_classes) < 2:
        return {
            "available": False,
            "reason": "Ground-truth dataset lacks both positive and negative fraud classes",
            "evaluated_samples": len(predictions_with_labels),
            "metrics": {}
        }

    try:
        prec = float(precision_score(y_true, y_pred, zero_division=0))
        rec = float(recall_score(y_true, y_pred, zero_division=0))
        f1 = float(f1_score(y_true, y_pred, zero_division=0))
        roc_auc = float(roc_auc_score(y_true, y_scores))
        pr_auc = float(average_precision_score(y_true, y_scores))
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()

        return {
            "available": True,
            "evaluated_samples": len(predictions_with_labels),
            "metrics": {
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "f1_score": round(f1, 4),
                "roc_auc": round(roc_auc, 4),
                "pr_auc": round(pr_auc, 4),
                "confusion_matrix": {
                    "tp": int(tp),
                    "fp": int(fp),
                    "tn": int(tn),
                    "fn": int(fn)
                }
            }
        }
    except Exception as e:
        return {
            "available": False,
            "reason": f"Failed to compute performance metrics: {str(e)}",
            "evaluated_samples": len(predictions_with_labels),
            "metrics": {}
        }
