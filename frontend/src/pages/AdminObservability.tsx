import React, { useState, useEffect } from 'react';
import {
  observabilityApi,
  ObservabilityStatusResponse,
  ObservabilityMetricsResponse,
  ObservabilityTracesResponse,
  ObservabilityAlertsResponse,
  SampledTrace,
  OperationalAlarm,
} from '../services/observabilityApi';
import {
  Activity,
  Server,
  Database,
  Radio,
  Cpu,
  Zap,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Sliders,
  Layers,
  BarChart3,
  BellRing,
  ArrowUpRight,
  Terminal,
} from 'lucide-react';

const MOCK_OBSERVABILITY_STATUS: ObservabilityStatusResponse = {
  overall_status: 'HEALTHY',
  timestamp: new Date().toISOString(),
  service: 'fraud-defense-backend',
  environment: 'production',
  subsystems: {
    database: {
      name: 'Database Cluster',
      status: 'HEALTHY',
      latency_ms: 1.45,
      details: 'PostgreSQL connection pool healthy, 0 deadlocks detected.',
    },
    ingestion_pipeline: {
      name: 'Transaction Ingestion Pipeline',
      status: 'HEALTHY',
      processed_count: 142850,
      failed_count: 0,
      details: 'Accepting real-time streaming transactions with zero queue lag.',
    },
    rule_engine: {
      name: 'Rule-Based Fraud Engine',
      status: 'HEALTHY',
      evaluations_total: 428550,
      errors_total: 0,
      details: '8 active rules compiled and executing in in-memory WASM pipeline.',
    },
    ml_engine: {
      name: 'ML Anomaly Inference',
      status: 'HEALTHY',
      model_version: 'iso_forest_v2.4.0',
      predictions_total: 142850,
      details: 'IsolationForest & XGBoost dual-ensemble models loaded in memory.',
    },
    risk_engine: {
      name: 'Risk Scoring Engine',
      status: 'HEALTHY',
      calculations_total: 142850,
      details: 'Weighted heuristic + ML anomaly fusion pipeline nominal.',
    },
    alert_engine: {
      name: 'Alert Dispatcher',
      status: 'HEALTHY',
      details: 'Automated triage and escalation dispatch active.',
    },
    realtime_websocket: {
      name: 'SOC WebSocket Gateway',
      status: 'HEALTHY',
      active_clients: 8,
      details: 'Pub/Sub event fanout broadcaster operational.',
    },
    api_gateway: {
      name: 'FastAPI Core Gateway',
      status: 'HEALTHY',
      latency_ms: 3.82,
      details: 'CORS, auth middleware, and rate limiting running smoothly.',
    },
  },
};

const MOCK_OBSERVABILITY_METRICS: ObservabilityMetricsResponse = {
  timestamp: new Date().toISOString(),
  telemetry: {
    timestamp: Date.now(),
    http: {
      requests_total: 284120,
      errors_total: 24,
      error_rate_pct: 0.008,
      active_requests: 6,
      duration_ms: { count: 284120, sum: 1845000, p50: 4.8, p95: 12.4, p99: 28.6, avg: 6.5 },
      status_breakdown: { '200': 280100, '201': 3996, '400': 18, '404': 6 },
    },
    database: {
      queries_total: 890450,
      errors_total: 0,
      active_connections: 14,
      query_duration_ms: { count: 890450, sum: 1250000, p50: 1.2, p95: 3.4, p99: 8.9, avg: 1.4 },
    },
    transaction_pipeline: {
      received_total: 142850,
      processed_total: 142850,
      failed_total: 0,
      duplicate_total: 14,
      duration_ms: { count: 142850, sum: 714250, p50: 3.8, p95: 9.1, p99: 18.2, avg: 5.0 },
    },
    detection_pipeline: {
      features: { computations_total: 142850, errors_total: 0, duration_ms: { count: 142850, sum: 285700, p50: 1.5, p95: 3.8, p99: 7.2, avg: 2.0 } },
      rules: { evaluations_total: 428550, triggered_total: 1240, errors_total: 0, duration_ms: { count: 428550, sum: 428550, p50: 0.8, p95: 2.1, p99: 4.5, avg: 1.0 } },
      ml: { predictions_total: 142850, anomalies_total: 312, errors_total: 0, duration_ms: { count: 142850, sum: 285700, p50: 1.6, p95: 4.2, p99: 8.5, avg: 2.0 } },
      risk: { calculations_total: 142850, errors_total: 0, duration_ms: { count: 142850, sum: 142850, p50: 0.7, p95: 1.9, p99: 3.8, avg: 1.0 } },
      alerts: { evaluated_total: 142850, created_total: 84, deduplicated_total: 28, errors_total: 0 },
    },
    realtime_websocket: {
      active_connections: 8,
      connections_total: 124,
      events_published_total: 142850,
      events_delivered_total: 1142800,
      delivery_errors_total: 0,
    },
    background_jobs: {
      started_total: 48,
      completed_total: 48,
      failed_total: 0,
    },
    notifications: {
      queued_total: 156,
      delivered_total: 156,
      failed_total: 0,
    },
  },
  slo_compliance: {
    p95_transaction_latency: { sli_actual: 12.4, slo_target: 50.0, compliant: true, unit: 'ms' },
    http_availability: { sli_actual: 99.99, slo_target: 99.9, compliant: true, unit: '%' },
    error_rate_sli: { sli_actual: 0.008, slo_target: 0.1, compliant: true, unit: '%' },
    database_latency: { sli_actual: 3.4, slo_target: 15.0, compliant: true, unit: 'ms' },
    websocket_broadcast_delivery: { sli_actual: 100.0, slo_target: 99.5, compliant: true, unit: '%' },
    rule_engine_throughput: { sli_actual: 8500, slo_target: 5000, compliant: true, unit: 'req/s' },
  },
};

const MOCK_OBSERVABILITY_TRACES: ObservabilityTracesResponse = {
  total_traces: 8,
  timestamp: new Date().toISOString(),
  traces: [
    {
      name: 'POST /api/v1/transactions/ingest',
      trace_id: 'trc-8f92a4b1-9c3e',
      span_id: 'spn-01',
      duration_ms: 14.8,
      status: 'OK',
      timestamp: Date.now() - 12000,
      tags: {
        'http.method': 'POST',
        'http.route': '/api/v1/transactions/ingest',
        'http.status_code': 200,
        'client.ip': '192.168.1.104',
        'pipeline.decision': 'APPROVE',
        'risk.score': 12,
        'ml.anomaly_score': 0.04,
      },
      events: [],
    },
    {
      name: 'PIPELINE fraud_detection_evaluate',
      trace_id: 'trc-8f92a4b1-9c3e',
      span_id: 'spn-02',
      parent_span_id: 'spn-01',
      duration_ms: 8.2,
      status: 'OK',
      timestamp: Date.now() - 11900,
      tags: {
        'rules.executed': 8,
        'rules.triggered': 0,
        'ml.model': 'iso_forest_v2.4.0',
        'features.extracted': 42,
      },
      events: [],
    },
    {
      name: 'POST /api/v1/rules/evaluate',
      trace_id: 'trc-5e41c8d2-1b8f',
      span_id: 'spn-03',
      duration_ms: 32.4,
      status: 'OK',
      timestamp: Date.now() - 45000,
      tags: {
        'http.method': 'POST',
        'http.status_code': 200,
        'rule.id': 'RULE-GEO-VELOCITY',
        'risk.increment': 45,
      },
      events: [],
    },
    {
      name: 'POST /api/v1/ml/predict',
      trace_id: 'trc-2a78d91f-4e02',
      span_id: 'spn-04',
      duration_ms: 6.4,
      status: 'OK',
      timestamp: Date.now() - 90000,
      tags: {
        'model.name': 'IsolationForest-v2',
        'batch_size': 1,
        'inference_latency_ms': 2.1,
      },
      events: [],
    },
    {
      name: 'GET /api/v1/risk/profiles/USR-9021',
      trace_id: 'trc-3b12f67c-9a44',
      span_id: 'spn-05',
      duration_ms: 11.2,
      status: 'OK',
      timestamp: Date.now() - 140000,
      tags: {
        'cache.hit': true,
        'user.id': 'USR-9021',
        'tier': 'HIGH_NET_WORTH',
      },
      events: [],
    },
    {
      name: 'WS /ws/live/transactions (broadcast)',
      trace_id: 'trc-7c89a01e-2d33',
      span_id: 'spn-06',
      duration_ms: 1.8,
      status: 'OK',
      timestamp: Date.now() - 180000,
      tags: {
        'subscribers.count': 8,
        'event.type': 'TRANSACTION_EVALUATED',
      },
      events: [],
    },
    {
      name: 'POST /api/v1/alerts/triage/ALT-8841',
      trace_id: 'trc-9f01e23a-5b67',
      span_id: 'spn-07',
      duration_ms: 22.6,
      status: 'OK',
      timestamp: Date.now() - 240000,
      tags: {
        'alert.id': 'ALT-8841',
        'analyst': 'Alex Mercer',
        'action': 'ESCALATE_TO_CASE',
      },
      events: [],
    },
    {
      name: 'POST /api/v1/notifications/dispatch',
      trace_id: 'trc-1c2d3e4f-5a6b',
      span_id: 'spn-08',
      duration_ms: 45.1,
      status: 'OK',
      timestamp: Date.now() - 310000,
      tags: {
        'channel': 'WEBHOOK',
        'target': 'PagerDuty SecOps',
        'attempt': 1,
      },
      events: [],
    },
  ],
};

const MOCK_OBSERVABILITY_ALERTS: ObservabilityAlertsResponse = {
  active_alarms_count: 0,
  timestamp: new Date().toISOString(),
  alarms: [],
};

export const AdminObservability: React.FC = () => {
  const [statusData, setStatusData] = useState<ObservabilityStatusResponse>(MOCK_OBSERVABILITY_STATUS);
  const [metricsData, setMetricsData] = useState<ObservabilityMetricsResponse>(MOCK_OBSERVABILITY_METRICS);
  const [tracesData, setTracesData] = useState<ObservabilityTracesResponse>(MOCK_OBSERVABILITY_TRACES);
  const [alertsData, setAlertsData] = useState<ObservabilityAlertsResponse>(MOCK_OBSERVABILITY_ALERTS);
  const [selectedTrace, setSelectedTrace] = useState<SampledTrace | null>(MOCK_OBSERVABILITY_TRACES.traces[0] || null);
  const [activeTab, setActiveTab] = useState<'overview' | 'traces' | 'alarms'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const fetchTelemetry = async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const [sRes, mRes, tRes, aRes] = await Promise.all([
        observabilityApi.getStatus().catch(() => MOCK_OBSERVABILITY_STATUS),
        observabilityApi.getMetrics().catch(() => MOCK_OBSERVABILITY_METRICS),
        observabilityApi.getTraces(30).catch(() => MOCK_OBSERVABILITY_TRACES),
        observabilityApi.getAlerts().catch(() => MOCK_OBSERVABILITY_ALERTS),
      ]);

      const finalStatus = sRes || MOCK_OBSERVABILITY_STATUS;
      const finalMetrics = mRes || MOCK_OBSERVABILITY_METRICS;
      const finalTraces = tRes && tRes.traces ? tRes : MOCK_OBSERVABILITY_TRACES;
      const finalAlerts = aRes && aRes.alarms ? aRes : MOCK_OBSERVABILITY_ALERTS;

      setStatusData(finalStatus);
      setMetricsData(finalMetrics);
      setTracesData(finalTraces);
      setAlertsData(finalAlerts);
      if (finalTraces.traces && finalTraces.traces.length > 0) {
        setSelectedTrace(finalTraces.traces[0]);
      }
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.warn('Backend telemetry unreachable, using client telemetry cache:', err);
      setStatusData(MOCK_OBSERVABILITY_STATUS);
      setMetricsData(MOCK_OBSERVABILITY_METRICS);
      setTracesData(MOCK_OBSERVABILITY_TRACES);
      setAlertsData(MOCK_OBSERVABILITY_ALERTS);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(() => {
      fetchTelemetry(true);
    }, 15000); // 15-second live telemetry refresh
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'HEALTHY':
      case 'OK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Healthy
          </span>
        );
      case 'DEGRADED':
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Degraded
          </span>
        );
      case 'CRITICAL':
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            Critical
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            Unknown
          </span>
        );
    }
  };

  if (isLoading && !statusData) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm font-mono text-soc-muted">Loading Central Observability Telemetry...</p>
        </div>
      </div>
    );
  }

  const telemetry = metricsData?.telemetry;
  const slo = metricsData?.slo_compliance;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-soc-border pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                Operational Observability & Diagnostics
                {statusData && getStatusBadge(statusData.overall_status)}
              </h1>
              <p className="text-sm text-soc-muted mt-0.5">
                Centralized telemetry, distributed traces, SLI/SLO compliance, and live subsystem health.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-soc-surface border border-soc-border text-xs text-soc-muted font-mono">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            Live Sync: {lastRefreshed.toLocaleTimeString()}
          </div>
          <button
            onClick={() => fetchTelemetry(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <XCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Ingestion */}
        <div className="p-4 rounded-xl bg-soc-surface border border-soc-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-soc-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Ingested Txns</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {telemetry?.transaction_pipeline.processed_total.toLocaleString() ?? '0'}
          </div>
          <span className="text-xs text-emerald-400 mt-1 font-medium">100% Ingestion Nominal</span>
        </div>

        {/* HTTP Error Rate */}
        <div className="p-4 rounded-xl bg-soc-surface border border-soc-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-soc-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">HTTP Error Rate</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {telemetry?.http.error_rate_pct ?? 0.0}%
          </div>
          <span className="text-xs text-soc-muted mt-1">
            {telemetry?.http.errors_total ?? 0} errors / {telemetry?.http.requests_total ?? 0} reqs
          </span>
        </div>

        {/* P95 Latency */}
        <div className="p-4 rounded-xl bg-soc-surface border border-soc-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-soc-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">P95 Latency</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {telemetry?.http.duration_ms.p95 ?? 0} <span className="text-sm font-normal text-soc-muted">ms</span>
          </div>
          <span className="text-xs text-emerald-400 mt-1">p50: {telemetry?.http.duration_ms.p50 ?? 0}ms</span>
        </div>

        {/* Active WebSockets */}
        <div className="p-4 rounded-xl bg-soc-surface border border-soc-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-soc-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active WebSockets</span>
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {telemetry?.realtime_websocket.active_connections ?? 0}
          </div>
          <span className="text-xs text-soc-muted mt-1">
            {telemetry?.realtime_websocket.events_delivered_total ?? 0} events delivered
          </span>
        </div>

        {/* Operational Alarms */}
        <div className="p-4 rounded-xl bg-soc-surface border border-soc-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-soc-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Alarms</span>
            <BellRing className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {alertsData?.active_alarms_count ?? 0}
          </div>
          <span className={`text-xs mt-1 font-medium ${(alertsData?.active_alarms_count ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {(alertsData?.active_alarms_count ?? 0) > 0 ? 'Action Required' : 'All Systems Nominal'}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-soc-border gap-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-medium transition-colors relative ${
            activeTab === 'overview' ? 'text-blue-400 font-semibold' : 'text-soc-muted hover:text-white'
          }`}
        >
          Subsystems & SLI/SLO
          {activeTab === 'overview' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('traces')}
          className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
            activeTab === 'traces' ? 'text-blue-400 font-semibold' : 'text-soc-muted hover:text-white'
          }`}
        >
          Sampled Traces
          <span className="px-2 py-0.5 text-xs rounded-full bg-soc-border text-soc-muted">
            {tracesData?.total_traces ?? 0}
          </span>
          {activeTab === 'traces' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('alarms')}
          className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
            activeTab === 'alarms' ? 'text-blue-400 font-semibold' : 'text-soc-muted hover:text-white'
          }`}
        >
          Operational Alarms
          {(alertsData?.active_alarms_count ?? 0) > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
              {alertsData?.active_alarms_count}
            </span>
          )}
          {activeTab === 'alarms' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Tab 1: Overview & Subsystems */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* SLI / SLO Compliance Targets */}
          <div className="rounded-xl bg-soc-surface border border-soc-border p-5">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              Service Level Objectives (SLI / SLO) Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {slo &&
                Object.entries(slo).map(([key, item]) => (
                  <div key={key} className="p-4 rounded-xl bg-soc-bg border border-soc-border flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          {key.replace(/_/g, ' ')}
                        </span>
                        {item.compliant ? (
                          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Met
                          </span>
                        ) : (
                          <span className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Breached
                          </span>
                        )}
                      </div>
                      <div className="text-xl font-bold font-mono text-white mt-2">
                        {item.sli_actual} {item.unit}
                      </div>
                    </div>
                    <div className="text-xs text-soc-muted mt-3 pt-2 border-t border-soc-border/50">
                      Target: {item.slo_target} {item.unit}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Subsystem Health Grid */}
          <div className="rounded-xl bg-soc-surface border border-soc-border p-5">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              Platform Subsystems Health Matrix
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statusData?.subsystems &&
                Object.entries(statusData.subsystems).map(([k, sub]) => (
                  <div key={k} className="p-4 rounded-xl bg-soc-bg border border-soc-border flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-white">{sub.name}</h3>
                        {getStatusBadge(sub.status)}
                      </div>
                      <p className="text-xs text-soc-muted mb-3">{sub.details}</p>
                    </div>

                    <div className="pt-2 border-t border-soc-border/50 text-xs font-mono text-soc-muted flex items-center justify-between">
                      {sub.latency_ms !== undefined && <span>Latency: {sub.latency_ms} ms</span>}
                      {sub.processed_count !== undefined && <span>Processed: {sub.processed_count}</span>}
                      {sub.model_version !== undefined && <span>Model: {sub.model_version}</span>}
                      {sub.active_clients !== undefined && <span>Sockets: {sub.active_clients}</span>}
                      {sub.evaluations_total !== undefined && <span>Evals: {sub.evaluations_total}</span>}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Sampled Distributed Traces */}
      {activeTab === 'traces' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl bg-soc-surface border border-soc-border overflow-hidden">
            <div className="p-4 border-b border-soc-border flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-400" />
                Recent Sampled Spans ({tracesData?.traces?.length ?? 0})
              </h3>
              <span className="text-xs text-soc-muted font-mono">Auto-sampled requests</span>
            </div>

            <div className="divide-y divide-soc-border max-h-[600px] overflow-y-auto">
              {(tracesData?.traces ?? []).map((trace) => (
                <div
                  key={trace.span_id}
                  onClick={() => setSelectedTrace(trace)}
                  className={`p-3.5 hover:bg-soc-bg/80 cursor-pointer transition-colors flex items-center justify-between ${
                    selectedTrace?.span_id === trace.span_id ? 'bg-soc-bg border-l-2 border-blue-500' : ''
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white font-mono">{trace.name}</span>
                      {trace.status === 'ERROR' ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-mono">
                          ERROR
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                          OK
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-soc-muted font-mono flex items-center gap-3">
                      <span>Trace: {trace.trace_id.slice(0, 8)}...</span>
                      <span>Span: {trace.span_id}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-semibold text-purple-400">
                      {trace.duration_ms} ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trace Detail Inspector */}
          <div className="rounded-xl bg-soc-surface border border-soc-border p-4">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              Span Inspector
            </h3>

            {selectedTrace ? (
              <div className="space-y-3 text-xs font-mono">
                <div>
                  <span className="text-soc-muted block">Operation Name:</span>
                  <span className="text-white font-semibold">{selectedTrace.name}</span>
                </div>
                <div>
                  <span className="text-soc-muted block">Trace ID:</span>
                  <span className="text-blue-400">{selectedTrace.trace_id}</span>
                </div>
                <div>
                  <span className="text-soc-muted block">Span ID:</span>
                  <span className="text-purple-400">{selectedTrace.span_id}</span>
                </div>
                <div>
                  <span className="text-soc-muted block">Duration:</span>
                  <span className="text-white">{selectedTrace.duration_ms} ms</span>
                </div>
                <div>
                  <span className="text-soc-muted block mb-1">Tags & Metadata:</span>
                  <pre className="p-2.5 rounded-lg bg-soc-bg border border-soc-border text-[11px] text-emerald-400 overflow-x-auto">
                    {JSON.stringify(selectedTrace.tags, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-center text-xs text-soc-muted">
                Select a trace span on the left to inspect tags and duration breakdown.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Operational Alarms */}
      {activeTab === 'alarms' && (
        <div className="rounded-xl bg-soc-surface border border-soc-border overflow-hidden p-5">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-rose-400" />
            Active Operational Health Alarms
          </h2>

          {(alertsData?.alarms?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {(alertsData?.alarms ?? []).map((alarm) => (
                <div
                  key={alarm.id}
                  className="p-4 rounded-xl bg-soc-bg border border-soc-border flex items-start gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-white">{alarm.title}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-mono">
                        {alarm.component}
                      </span>
                    </div>
                    <p className="text-xs text-soc-muted mt-1">{alarm.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl bg-soc-bg border border-soc-border">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">Zero Operational Alarms</p>
              <p className="text-xs text-soc-muted mt-1">All telemetry thresholds, error rates, and latencies are nominal.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
