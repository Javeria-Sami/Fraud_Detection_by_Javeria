"""
Centralized Observability Metrics Registry and Telemetry Collector.
Section 28 — Observability.

Maintains thread-safe and async-safe operational metrics:
- HTTP Request Rates, Latency, Error Rates, Active In-Flight Requests
- Database Query Counts, Connection Pool Usage, Latency
- Transaction Ingestion Pipeline Throughput & Latencies
- Feature Engineering, Rule Engine, ML Anomaly, Risk, Alert Engine Metrics
- WebSocket Connection Lifecycle, Event Delivery Rates, Slow Clients
- Background Jobs & Notification Deliveries
- Strict Cardinality Control (Zero unbounded user/transaction ID labels)
"""
import time
import threading
from typing import Dict, List, Any, Optional
from collections import defaultdict, deque


class MetricCounter:
    """Thread-safe monotonic counter."""
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self._values: Dict[str, float] = defaultdict(float)
        self._lock = threading.Lock()

    def inc(self, amount: float = 1.0, labels: Optional[Dict[str, str]] = None) -> None:
        key = self._format_labels(labels)
        with self._lock:
            self._values[key] += amount

    def get_total(self) -> float:
        with self._lock:
            return sum(self._values.values())

    def get_by_labels(self) -> Dict[str, float]:
        with self._lock:
            return dict(self._values)

    @staticmethod
    def _format_labels(labels: Optional[Dict[str, str]]) -> str:
        if not labels:
            return "all"
        return ",".join(f"{k}={v}" for k, v in sorted(labels.items()))


class MetricGauge:
    """Thread-safe gauge for point-in-time values."""
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self._values: Dict[str, float] = defaultdict(float)
        self._lock = threading.Lock()

    def set(self, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        key = MetricCounter._format_labels(labels)
        with self._lock:
            self._values[key] = value

    def inc(self, amount: float = 1.0, labels: Optional[Dict[str, str]] = None) -> None:
        key = MetricCounter._format_labels(labels)
        with self._lock:
            self._values[key] += amount

    def dec(self, amount: float = 1.0, labels: Optional[Dict[str, str]] = None) -> None:
        key = MetricCounter._format_labels(labels)
        with self._lock:
            self._values[key] -= amount

    def get_value(self, labels: Optional[Dict[str, str]] = None) -> float:
        key = MetricCounter._format_labels(labels)
        with self._lock:
            return self._values.get(key, 0.0)

    def get_all(self) -> Dict[str, float]:
        with self._lock:
            return dict(self._values)


class MetricHistogram:
    """Calculates percentiles and execution distributions over a sliding sample buffer."""
    def __init__(self, name: str, description: str, max_samples: int = 1000):
        self.name = name
        self.description = description
        self._samples: deque = deque(maxlen=max_samples)
        self._count = 0
        self._sum = 0.0
        self._lock = threading.Lock()

    def observe(self, value: float) -> None:
        with self._lock:
            self._samples.append(value)
            self._count += 1
            self._sum += value

    def get_statistics(self) -> Dict[str, float]:
        with self._lock:
            if not self._samples:
                return {"count": 0, "sum": 0.0, "p50": 0.0, "p95": 0.0, "p99": 0.0, "avg": 0.0}
            sorted_s = sorted(self._samples)
            n = len(sorted_s)
            return {
                "count": self._count,
                "sum": round(self._sum, 3),
                "p50": round(sorted_s[int(n * 0.50)], 3),
                "p95": round(sorted_s[min(int(n * 0.95), n - 1)], 3),
                "p99": round(sorted_s[min(int(n * 0.99), n - 1)], 3),
                "avg": round(sum(sorted_s) / n, 3)
            }


class MetricsRegistry:
    """Central repository of all system operational metrics."""
    def __init__(self):
        # 1. HTTP Metrics
        self.http_requests_total = MetricCounter("http_requests_total", "Total incoming HTTP requests")
        self.http_request_errors_total = MetricCounter("http_request_errors_total", "Total HTTP 4xx and 5xx responses")
        self.http_active_requests = MetricGauge("http_active_requests", "Currently in-flight HTTP requests")
        self.http_request_duration_ms = MetricHistogram("http_request_duration_ms", "HTTP Request Duration in ms")

        # 2. Database Metrics
        self.db_queries_total = MetricCounter("db_queries_total", "Total database queries executed")
        self.db_query_errors_total = MetricCounter("db_query_errors_total", "Total database query errors")
        self.db_connections_active = MetricGauge("db_connections_active", "Estimated active DB connections")
        self.db_query_duration_ms = MetricHistogram("db_query_duration_ms", "Database query duration in ms")

        # 3. Transaction Ingestion Pipeline Metrics
        self.transactions_received_total = MetricCounter("transactions_received_total", "Transactions received via ingestion")
        self.transactions_processed_total = MetricCounter("transactions_processed_total", "Transactions successfully processed")
        self.transactions_failed_total = MetricCounter("transactions_failed_total", "Transactions failed during ingestion")
        self.transactions_duplicate_total = MetricCounter("transactions_duplicate_total", "Duplicate idempotent transaction submissions")
        self.transaction_pipeline_duration_ms = MetricHistogram("transaction_pipeline_duration_ms", "End-to-end transaction pipeline duration in ms")

        # 4. Detection Pipeline Subsystems
        self.feature_computation_total = MetricCounter("feature_computation_total", "Feature computations executed")
        self.feature_computation_errors_total = MetricCounter("feature_computation_errors_total", "Feature computation errors")
        self.feature_computation_duration_ms = MetricHistogram("feature_computation_duration_ms", "Feature computation duration in ms")

        self.rule_evaluations_total = MetricCounter("rule_evaluations_total", "Fraud rule evaluations performed")
        self.rule_triggered_total = MetricCounter("rule_triggered_total", "Fraud rules triggered")
        self.rule_execution_errors_total = MetricCounter("rule_execution_errors_total", "Fraud rule execution errors")
        self.rule_execution_duration_ms = MetricHistogram("rule_execution_duration_ms", "Rule engine execution duration in ms")

        self.ml_predictions_total = MetricCounter("ml_predictions_total", "ML anomaly inferences performed")
        self.ml_anomalies_total = MetricCounter("ml_anomalies_total", "ML anomalies detected")
        self.ml_inference_errors_total = MetricCounter("ml_inference_errors_total", "ML inference errors")
        self.ml_inference_duration_ms = MetricHistogram("ml_inference_duration_ms", "ML inference duration in ms")

        self.risk_calculations_total = MetricCounter("risk_calculations_total", "Risk scoring calculations performed")
        self.risk_calculation_errors_total = MetricCounter("risk_calculation_errors_total", "Risk calculation errors")
        self.risk_calculation_duration_ms = MetricHistogram("risk_calculation_duration_ms", "Risk calculation duration in ms")

        self.alerts_evaluated_total = MetricCounter("alerts_evaluated_total", "Alert engine evaluations performed")
        self.alerts_created_total = MetricCounter("alerts_created_total", "Operational and fraud alerts created")
        self.alert_deduplicated_total = MetricCounter("alert_deduplicated_total", "Alerts deduplicated via cooldown/fingerprint")
        self.alert_processing_errors_total = MetricCounter("alert_processing_errors_total", "Alert creation/evaluation errors")

        # 5. Real-Time WebSocket Metrics
        self.websocket_connections_active = MetricGauge("websocket_connections_active", "Active WebSocket connections")
        self.websocket_connections_total = MetricCounter("websocket_connections_total", "Cumulative WebSocket connections opened")
        self.websocket_events_published_total = MetricCounter("websocket_events_published_total", "Events published to event stream")
        self.websocket_events_delivered_total = MetricCounter("websocket_events_delivered_total", "Events delivered to clients")
        self.websocket_delivery_errors_total = MetricCounter("websocket_delivery_errors_total", "WebSocket client delivery failures")

        # 6. Background Jobs & Notifications
        self.jobs_started_total = MetricCounter("jobs_started_total", "Background jobs started")
        self.jobs_completed_total = MetricCounter("jobs_completed_total", "Background jobs completed")
        self.jobs_failed_total = MetricCounter("jobs_failed_total", "Background jobs failed")

        self.notifications_queued_total = MetricCounter("notifications_queued_total", "Notifications queued")
        self.notifications_delivered_total = MetricCounter("notifications_delivered_total", "Notifications delivered")
        self.notifications_failed_total = MetricCounter("notifications_failed_total", "Notification delivery failures")

    def get_snapshot(self) -> Dict[str, Any]:
        """Returns comprehensive point-in-time metrics snapshot for the dashboard."""
        http_total = self.http_requests_total.get_total()
        http_errors = self.http_request_errors_total.get_total()
        error_rate_pct = round((http_errors / http_total * 100.0), 2) if http_total > 0 else 0.0

        return {
            "timestamp": round(time.time(), 3),
            "http": {
                "requests_total": http_total,
                "errors_total": http_errors,
                "error_rate_pct": error_rate_pct,
                "active_requests": self.http_active_requests.get_value(),
                "duration_ms": self.http_request_duration_ms.get_statistics(),
                "status_breakdown": self.http_requests_total.get_by_labels()
            },
            "database": {
                "queries_total": self.db_queries_total.get_total(),
                "errors_total": self.db_query_errors_total.get_total(),
                "active_connections": self.db_connections_active.get_value(),
                "query_duration_ms": self.db_query_duration_ms.get_statistics()
            },
            "transaction_pipeline": {
                "received_total": self.transactions_received_total.get_total(),
                "processed_total": self.transactions_processed_total.get_total(),
                "failed_total": self.transactions_failed_total.get_total(),
                "duplicate_total": self.transactions_duplicate_total.get_total(),
                "duration_ms": self.transaction_pipeline_duration_ms.get_statistics()
            },
            "detection_pipeline": {
                "features": {
                    "computations_total": self.feature_computation_total.get_total(),
                    "errors_total": self.feature_computation_errors_total.get_total(),
                    "duration_ms": self.feature_computation_duration_ms.get_statistics()
                },
                "rules": {
                    "evaluations_total": self.rule_evaluations_total.get_total(),
                    "triggered_total": self.rule_triggered_total.get_total(),
                    "errors_total": self.rule_execution_errors_total.get_total(),
                    "duration_ms": self.rule_execution_duration_ms.get_statistics()
                },
                "ml": {
                    "predictions_total": self.ml_predictions_total.get_total(),
                    "anomalies_total": self.ml_anomalies_total.get_total(),
                    "errors_total": self.ml_inference_errors_total.get_total(),
                    "duration_ms": self.ml_inference_duration_ms.get_statistics()
                },
                "risk": {
                    "calculations_total": self.risk_calculations_total.get_total(),
                    "errors_total": self.risk_calculation_errors_total.get_total(),
                    "duration_ms": self.risk_calculation_duration_ms.get_statistics()
                },
                "alerts": {
                    "evaluated_total": self.alerts_evaluated_total.get_total(),
                    "created_total": self.alerts_created_total.get_total(),
                    "deduplicated_total": self.alert_deduplicated_total.get_total(),
                    "errors_total": self.alert_processing_errors_total.get_total()
                }
            },
            "realtime_websocket": {
                "active_connections": self.websocket_connections_active.get_value(),
                "connections_total": self.websocket_connections_total.get_total(),
                "events_published_total": self.websocket_events_published_total.get_total(),
                "events_delivered_total": self.websocket_events_delivered_total.get_total(),
                "delivery_errors_total": self.websocket_delivery_errors_total.get_total()
            },
            "background_jobs": {
                "started_total": self.jobs_started_total.get_total(),
                "completed_total": self.jobs_completed_total.get_total(),
                "failed_total": self.jobs_failed_total.get_total()
            },
            "notifications": {
                "queued_total": self.notifications_queued_total.get_total(),
                "delivered_total": self.notifications_delivered_total.get_total(),
                "failed_total": self.notifications_failed_total.get_total()
            }
        }


# Global Metrics Registry Instance
metrics = MetricsRegistry()
