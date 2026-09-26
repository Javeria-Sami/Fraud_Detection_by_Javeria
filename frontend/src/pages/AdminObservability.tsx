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

export const AdminObservability: React.FC = () => {
  const [statusData, setStatusData] = useState<ObservabilityStatusResponse | null>(null);
  const [metricsData, setMetricsData] = useState<ObservabilityMetricsResponse | null>(null);
  const [tracesData, setTracesData] = useState<ObservabilityTracesResponse | null>(null);
  const [alertsData, setAlertsData] = useState<ObservabilityAlertsResponse | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<SampledTrace | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'traces' | 'alarms'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const fetchTelemetry = async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const [sRes, mRes, tRes, aRes] = await Promise.all([
        observabilityApi.getStatus(),
        observabilityApi.getMetrics(),
        observabilityApi.getTraces(30),
        observabilityApi.getAlerts(),
      ]);
      setStatusData(sRes);
      setMetricsData(mRes);
      setTracesData(tRes);
      setAlertsData(aRes);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error('Failed to load observability telemetry:', err);
      setError(err?.response?.data?.detail || 'Failed to fetch platform operational telemetry.');
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
          {alertsData && alertsData.active_alarms_count > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
              {alertsData.active_alarms_count}
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
                Recent Sampled Spans ({tracesData?.traces.length ?? 0})
              </h3>
              <span className="text-xs text-soc-muted font-mono">Auto-sampled requests</span>
            </div>

            <div className="divide-y divide-soc-border max-h-[600px] overflow-y-auto">
              {tracesData?.traces.map((trace) => (
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

          {alertsData && alertsData.alarms.length > 0 ? (
            <div className="space-y-3">
              {alertsData.alarms.map((alarm) => (
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
