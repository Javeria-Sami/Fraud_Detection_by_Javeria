import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../services/adminApi';
import {
  AdminOverviewResponse,
  PlatformStatusResponse,
} from '../types';
import {
  ShieldCheck,
  Activity,
  Users,
  Sliders,
  Cpu,
  RefreshCw,
  Server,
  Database,
  Radio,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Settings,
  History,
  Lock,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

export const AdminOverview: React.FC = () => {
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [diagnostics, setDiagnostics] = useState<PlatformStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const [overviewData, diagData] = await Promise.all([
        adminApi.getOverview(),
        adminApi.getPlatformStatus(),
      ]);
      setOverview(overviewData);
      setDiagnostics(diagData);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error('Failed to load admin overview:', err);
      setError(err?.response?.data?.detail || 'Failed to load platform administrative telemetry.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => {
      fetchData(true);
    }, 30000); // 30s auto-refresh
    return () => clearInterval(timer);
  }, []);

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'HEALTHY' || s === 'NORMAL' || s === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          HEALTHY
        </span>
      );
    }
    if (s === 'DEGRADED' || s === 'WARNING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          DEGRADED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        UNAVAILABLE
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-soc-card border border-soc-border p-6 rounded-2xl flex items-center justify-between animate-pulse">
          <div className="h-6 w-48 bg-slate-800 rounded" />
          <div className="h-8 w-24 bg-slate-800 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-soc-card border border-soc-border rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-soc-card border border-soc-border rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-soc-card border border-soc-border p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Platform Governance & Health Overview</span>
                {overview?.platform?.overall_status && getStatusBadge(overview.platform.overall_status)}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time operational diagnostics, RBAC user summary, fraud detection engine metrics, and MLOps health.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="text-right hidden md:block font-mono text-[11px] text-soc-muted">
            <div>Auto-refresh: 30s</div>
            <div className="text-soc-muted">Updated: {lastRefreshed.toLocaleTimeString()}</div>
          </div>

          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-soc-surface hover:bg-soc-card border border-soc-border hover:border-blue-400 text-soc-foreground text-xs font-semibold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-500' : 'text-blue-500'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Platform Health */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-bold text-soc-muted font-mono">
                Platform State
              </span>
              <div className="text-2xl font-extrabold text-soc-foreground">
                {overview?.platform?.overall_status || 'HEALTHY'}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-soc-border/60 flex items-center justify-between text-xs text-soc-muted">
            <span>Database: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{overview?.platform?.database_status || 'HEALTHY'}</strong></span>
            <span>API: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{overview?.platform?.api_status || 'ONLINE'}</strong></span>
          </div>
        </div>

        {/* 2. User & Access Summary */}
        <Link
          to="/admin/users"
          className="bg-soc-card hover:bg-soc-surface border border-soc-border hover:border-blue-500/40 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between transition-all group"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-bold text-soc-muted font-mono">
                Operator Accounts
              </span>
              <div className="text-2xl font-extrabold text-soc-foreground flex items-center gap-2">
                <span>{overview?.users?.total_users ?? 0}</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                  ({overview?.users?.active_users ?? 0} active)
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 group-hover:bg-blue-500/20 transition-colors">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-soc-border/60 flex items-center justify-between text-xs text-soc-muted">
            <span>{overview?.users?.admin_count ?? 0} Admins · {overview?.users?.analyst_count ?? 0} Analysts</span>
            <ArrowUpRight className="w-4 h-4 text-soc-muted group-hover:text-blue-500 transition-colors" />
          </div>
        </Link>

        {/* 3. Fraud Rules & Alert Engine */}
        <Link
          to="/admin/rules"
          className="bg-soc-card hover:bg-soc-surface border border-soc-border hover:border-purple-500/40 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between transition-all group"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-bold text-soc-muted font-mono">
                Fraud Rules Engine
              </span>
              <div className="text-2xl font-extrabold text-soc-foreground flex items-center gap-2">
                <span>{overview?.detection?.active_fraud_rules ?? 0}</span>
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 font-mono">
                  / {overview?.detection?.total_fraud_rules ?? 0} rules
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500 group-hover:bg-purple-500/20 transition-colors">
              <Sliders className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-soc-border/60 flex items-center justify-between text-xs text-soc-muted">
            <span>{overview?.detection?.active_alert_configs ?? 0} Alert Types Enabled</span>
            <ArrowUpRight className="w-4 h-4 text-soc-muted group-hover:text-purple-500 transition-colors" />
          </div>
        </Link>

        {/* 4. Active ML Model */}
        <Link
          to="/models"
          className="bg-soc-card hover:bg-soc-surface border border-soc-border hover:border-amber-500/40 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between transition-all group"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-bold text-soc-muted font-mono">
                Production ML Model
              </span>
              <div className="text-lg font-bold text-soc-foreground font-mono truncate max-w-[170px]" title={overview?.ml?.deployed_model_version}>
                {overview?.ml?.deployed_model_version || 'v1.0.0-prod'}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 group-hover:bg-amber-500/20 transition-colors">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-soc-border/60 flex items-center justify-between text-xs text-slate-400">
            <span>{overview?.ml?.total_model_versions ?? 0} Versions in Registry</span>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
          </div>
        </Link>
      </div>

      {/* Platform Subsystems Diagnostics Table */}
      <div className="bg-soc-card border border-soc-border rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-soc-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Live Platform Health & Component Telemetry
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {diagnostics?.components?.length ?? 0} Services Monitored
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-soc-bg/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-soc-border">
              <tr>
                <th className="py-3 px-4">Subsystem Component</th>
                <th className="py-3 px-4">Health Status</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Diagnostic Details</th>
                <th className="py-3 px-4">Last Checked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soc-border/60 font-sans">
              {(diagnostics?.components || []).map((comp, idx) => (
                <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span>{comp.name}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    {getStatusBadge(comp.status)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {comp.latency_ms !== null && comp.latency_ms !== undefined ? (
                      <span className={`${comp.latency_ms > 100 ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                        {comp.latency_ms.toFixed(1)} ms
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 max-w-md truncate" title={comp.details || ''}>
                    {comp.details || 'Subsystem operational'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                    {comp.last_checked ? new Date(comp.last_checked).toLocaleTimeString() : 'Just now'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Information & Administrative Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Environment Specs */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 border-b border-soc-border pb-3">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              System Environment & Runtime
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-soc-border/40">
              <span className="text-slate-400">Environment</span>
              <span className="font-mono font-bold text-emerald-400">{overview?.system?.environment || 'DEVELOPMENT'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-soc-border/40">
              <span className="text-slate-400">Application Name</span>
              <span className="font-medium text-white">{overview?.system?.application_name || 'FraudShield AI Platform'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-soc-border/40">
              <span className="text-slate-400">Backend Gateway</span>
              <span className="font-mono text-slate-300">FastAPI v{overview?.system?.backend_version || '1.0.0'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-soc-border/40">
              <span className="text-slate-400">Frontend Client</span>
              <span className="font-mono text-slate-300">React v{overview?.system?.frontend_version || '1.0.0'} (Vite)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-soc-border/40">
              <span className="text-slate-400">Database Layer</span>
              <span className="font-mono text-slate-300">{overview?.system?.database_version || 'PostgreSQL 15 (Async)'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Security / RBAC</span>
              <span className="font-bold text-blue-400">Enforced & Active</span>
            </div>
          </div>
        </div>

        {/* Administrative Quick Actions */}
        <div className="lg:col-span-2 bg-soc-card border border-soc-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-soc-border pb-3">
            <Sliders className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-bold text-soc-foreground uppercase tracking-wider">
              Administrative Control Centers
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Link
              to="/admin/users"
              className="p-4 rounded-xl bg-soc-surface hover:bg-blue-50/40 dark:hover:bg-slate-800/80 border border-soc-border hover:border-blue-400 transition-all flex items-start gap-3.5 group shadow-sm"
            >
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20">
                <Users className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-soc-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  <span>User & Role Access</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-soc-muted group-hover:text-blue-500" />
                </div>
                <p className="text-[11px] text-soc-muted leading-relaxed">
                  Provision operators, configure RBAC roles, inspect effective permissions, and manage account statuses.
                </p>
              </div>
            </Link>

            <Link
              to="/admin/rules"
              className="p-4 rounded-xl bg-soc-surface hover:bg-purple-50/40 dark:hover:bg-slate-800/80 border border-soc-border hover:border-purple-400 transition-all flex items-start gap-3.5 group shadow-sm"
            >
              <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-500 group-hover:bg-purple-500/20">
                <Sliders className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-soc-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors flex items-center gap-1.5">
                  <span>Fraud Rules & Policies</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-soc-muted group-hover:text-purple-500" />
                </div>
                <p className="text-[11px] text-soc-muted leading-relaxed">
                  Calibrate rule weights, manage immutable version history, simulate dry-runs, and tune alert policies.
                </p>
              </div>
            </Link>

            <Link
              to="/admin/settings"
              className="p-4 rounded-xl bg-soc-surface hover:bg-emerald-50/40 dark:hover:bg-slate-800/80 border border-soc-border hover:border-emerald-400 transition-all flex items-start gap-3.5 group shadow-sm"
            >
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20">
                <Settings className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-soc-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <span>System Policies & Thresholds</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-soc-muted group-hover:text-emerald-500" />
                </div>
                <p className="text-[11px] text-soc-muted leading-relaxed">
                  Adjust multi-tier risk score boundaries, auto-block ceilings, alert cooldown intervals, and timeouts.
                </p>
              </div>
            </Link>

            <Link
              to="/admin/audit-logs"
              className="p-4 rounded-xl bg-soc-surface hover:bg-amber-50/40 dark:hover:bg-slate-800/80 border border-soc-border hover:border-amber-400 transition-all flex items-start gap-3.5 group shadow-sm"
            >
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20">
                <History className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-soc-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <span>Audit Trail & Activity</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-soc-muted group-hover:text-amber-500" />
                </div>
                <p className="text-[11px] text-soc-muted leading-relaxed">
                  Review tamper-evident audit logs of all administrative actions, rule modifications, and status changes.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
