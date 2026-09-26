import { apiClient } from './api';

export interface ObservabilitySubsystem {
  name: string;
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  latency_ms?: number;
  processed_count?: number;
  failed_count?: number;
  evaluations_total?: number;
  errors_total?: number;
  model_version?: string;
  predictions_total?: number;
  calculations_total?: number;
  active_clients?: number;
  events_delivered?: number;
  queued?: number;
  delivered?: number;
  details?: string;
}

export interface ObservabilityStatusResponse {
  overall_status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  timestamp: string;
  service: string;
  environment: string;
  subsystems: Record<string, ObservabilitySubsystem>;
}

export interface MetricStatistics {
  count: number;
  sum: number;
  p50: number;
  p95: number;
  p99: number;
  avg: number;
}

export interface TelemetrySnapshot {
  timestamp: number;
  http: {
    requests_total: number;
    errors_total: number;
    error_rate_pct: number;
    active_requests: number;
    duration_ms: MetricStatistics;
    status_breakdown: Record<string, number>;
  };
  database: {
    queries_total: number;
    errors_total: number;
    active_connections: number;
    query_duration_ms: MetricStatistics;
  };
  transaction_pipeline: {
    received_total: number;
    processed_total: number;
    failed_total: number;
    duplicate_total: number;
    duration_ms: MetricStatistics;
  };
  detection_pipeline: {
    features: { computations_total: number; errors_total: number; duration_ms: MetricStatistics };
    rules: { evaluations_total: number; triggered_total: number; errors_total: number; duration_ms: MetricStatistics };
    ml: { predictions_total: number; anomalies_total: number; errors_total: number; duration_ms: MetricStatistics };
    risk: { calculations_total: number; errors_total: number; duration_ms: MetricStatistics };
    alerts: { evaluated_total: number; created_total: number; deduplicated_total: number; errors_total: number };
  };
  realtime_websocket: {
    active_connections: number;
    connections_total: number;
    events_published_total: number;
    events_delivered_total: number;
    delivery_errors_total: number;
  };
  background_jobs: {
    started_total: number;
    completed_total: number;
    failed_total: number;
  };
  notifications: {
    queued_total: number;
    delivered_total: number;
    failed_total: number;
  };
}

export interface SLOComplianceItem {
  sli_actual: number;
  slo_target: number;
  compliant: boolean;
  unit: string;
}

export interface ObservabilityMetricsResponse {
  telemetry: TelemetrySnapshot;
  slo_compliance: Record<string, SLOComplianceItem>;
  timestamp: string;
}

export interface SampledTrace {
  name: string;
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  duration_ms: number;
  status: 'OK' | 'ERROR';
  tags: Record<string, any>;
  events: any[];
  timestamp: number;
}

export interface ObservabilityTracesResponse {
  total_traces: number;
  traces: SampledTrace[];
  timestamp: string;
}

export interface OperationalAlarm {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  component: string;
}

export interface ObservabilityAlertsResponse {
  active_alarms_count: number;
  alarms: OperationalAlarm[];
  timestamp: string;
}

export const observabilityApi = {
  getStatus: async (): Promise<ObservabilityStatusResponse> => {
    const res = await apiClient.get<ObservabilityStatusResponse>('/admin/observability/status');
    return res.data;
  },

  getMetrics: async (): Promise<ObservabilityMetricsResponse> => {
    const res = await apiClient.get<ObservabilityMetricsResponse>('/admin/observability/metrics');
    return res.data;
  },

  getTraces: async (limit: number = 50): Promise<ObservabilityTracesResponse> => {
    const res = await apiClient.get<ObservabilityTracesResponse>('/admin/observability/traces', {
      params: { limit },
    });
    return res.data;
  },

  getAlerts: async (): Promise<ObservabilityAlertsResponse> => {
    const res = await apiClient.get<ObservabilityAlertsResponse>('/admin/observability/alerts');
    return res.data;
  },
};
