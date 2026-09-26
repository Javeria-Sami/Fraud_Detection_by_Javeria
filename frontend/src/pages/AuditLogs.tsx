import React, { useState, useEffect } from 'react';
import { auditApi } from '../services/auditApi';
import { AuditLog, AuditStatsResponse } from '../types';
import {
  History,
  Search,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  User as UserIcon,
  Server,
  Layers,
  FileText,
  Calendar,
  Lock,
  ArrowUpDown,
  Hash,
  Copy,
  Check,
} from 'lucide-react';

export const AuditLogs: React.FC = () => {
  // Main Data States
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [stats, setStats] = useState<AuditStatsResponse | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // UI & Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await auditApi.listLogs({
        query: searchQuery.trim() || undefined,
        action: selectedAction || undefined,
        resource_type: selectedResourceType || undefined,
        severity: selectedSeverity || undefined,
        outcome: selectedOutcome || undefined,
        date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        date_to: dateTo ? new Date(dateTo).toISOString() : undefined,
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      setLogs(res.items || []);
      setTotalCount(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      setError(err?.response?.data?.detail || 'Failed to fetch audit log trail.');
      setLogs([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const statsData = await auditApi.getStats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load audit statistics:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, pageSize, selectedAction, selectedResourceType, selectedSeverity, selectedOutcome, sortBy, sortOrder]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedAction('');
    setSelectedResourceType('');
    setSelectedSeverity('');
    setSelectedOutcome('');
    setDateFrom('');
    setDateTo('');
    setSortBy('timestamp');
    setSortOrder('desc');
    setPage(1);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getSeverityBadge = (severity: string) => {
    const s = severity?.toUpperCase();
    if (s === 'CRITICAL') {
      return (
        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1">
          <ShieldAlert className="w-3 h-3" /> CRITICAL
        </span>
      );
    }
    if (s === 'HIGH') {
      return (
        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/40 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> HIGH
        </span>
      );
    }
    if (s === 'WARNING') {
      return (
        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40">
          WARNING
        </span>
      );
    }
    return (
      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30">
        INFO
      </span>
    );
  };

  const getOutcomeBadge = (outcome: string) => {
    const o = outcome?.toUpperCase();
    if (o === 'SUCCESS') {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Success</span>
        </span>
      );
    }
    if (o === 'DENIED' || o === 'BLOCKED') {
      return (
        <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-semibold">
          <Lock className="w-3.5 h-3.5" />
          <span>Denied</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-rose-400 text-xs font-semibold">
        <XCircle className="w-3.5 h-3.5" />
        <span>Failed</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-soc-card border border-soc-border p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Security Audit Trail & Compliance Workspace</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Tamper-Resistant
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Immutable, attributed record of administrative operations, security events, fraud rule lifecycle, and model retraining.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              fetchLogs();
              fetchStats();
            }}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-soc-bg hover:bg-slate-800 border border-soc-border text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Total Events */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Total Audit Events</span>
            <div className="text-xl font-extrabold text-white">{stats?.total_events ?? totalCount}</div>
          </div>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        {/* 2. Events Today */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Events Today</span>
            <div className="text-xl font-extrabold text-emerald-400">{stats?.events_today ?? 0}</div>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {/* 3. High / Critical Events */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">High / Critical Events</span>
            <div className="text-xl font-extrabold text-amber-400">{stats?.high_critical_count ?? 0}</div>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        {/* 4. Failed / Denied Actions */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Failed / Denied</span>
            <div className="text-xl font-extrabold text-rose-400">{stats?.failed_denied_count ?? 0}</div>
          </div>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
            <XCircle className="w-4 h-4" />
          </div>
        </div>

        {/* 5. Admin Policy Mutations */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Admin Mutations</span>
            <div className="text-xl font-extrabold text-purple-400">{stats?.admin_actions_count ?? 0}</div>
          </div>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <Layers className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-soc-card border border-soc-border p-4 rounded-2xl shadow-lg space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Action, Actor Email, Resource ID, Request ID, or Details text..."
              className="w-full bg-soc-bg border border-soc-border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 rounded-xl bg-soc-bg hover:bg-slate-800 border border-soc-border text-slate-400 hover:text-white text-xs font-semibold"
            >
              Reset
            </button>
          </div>
        </form>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1 text-xs">
          {/* Action Filter */}
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setPage(1);
            }}
            className="bg-soc-bg border border-soc-border rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="USER_CREATE">USER_CREATE</option>
            <option value="USER_STATUS_CHANGE">USER_STATUS_CHANGE</option>
            <option value="USER_ROLE_CHANGE">USER_ROLE_CHANGE</option>
            <option value="SETTING_UPDATE">SETTING_UPDATE</option>
            <option value="RULE_UPDATE">RULE_UPDATE</option>
            <option value="RULE_VERSION_ACTIVATE">RULE_VERSION_ACTIVATE</option>
            <option value="ALERT_CONFIG_UPDATE">ALERT_CONFIG_UPDATE</option>
            <option value="CASE_RESOLVED">CASE_RESOLVED</option>
            <option value="MODEL_DEPLOYED">MODEL_DEPLOYED</option>
            <option value="MODEL_RETRAINING_STARTED">MODEL_RETRAINING_STARTED</option>
          </select>

          {/* Resource Type */}
          <select
            value={selectedResourceType}
            onChange={(e) => {
              setSelectedResourceType(e.target.value);
              setPage(1);
            }}
            className="bg-soc-bg border border-soc-border rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Resources</option>
            <option value="User">User</option>
            <option value="FraudRule">FraudRule</option>
            <option value="Alert">Alert</option>
            <option value="Case">Case</option>
            <option value="MLModel">MLModel</option>
            <option value="SystemSetting">SystemSetting</option>
            <option value="Authentication">Authentication</option>
          </select>

          {/* Severity */}
          <select
            value={selectedSeverity}
            onChange={(e) => {
              setSelectedSeverity(e.target.value);
              setPage(1);
            }}
            className="bg-soc-bg border border-soc-border rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Severities</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>

          {/* Outcome */}
          <select
            value={selectedOutcome}
            onChange={(e) => {
              setSelectedOutcome(e.target.value);
              setPage(1);
            }}
            className="bg-soc-bg border border-soc-border rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Outcomes</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
            <option value="DENIED">DENIED</option>
          </select>

          {/* Date From */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="bg-soc-bg border border-soc-border rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            title="Date From"
          />

          {/* Date To */}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="bg-soc-bg border border-soc-border rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            title="Date To"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Audit Data Table */}
      <div className="bg-soc-card border border-soc-border rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-soc-bg/85 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-soc-border select-none">
              <tr>
                <th className="py-3.5 px-4">
                  <div
                    onClick={() => {
                      if (sortBy === 'timestamp') {
                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                      } else {
                        setSortBy('timestamp');
                        setSortOrder('desc');
                      }
                    }}
                    className="flex items-center gap-1 cursor-pointer hover:text-white"
                  >
                    <span>Timestamp (UTC)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Resource Target</th>
                <th className="py-3.5 px-4">Outcome</th>
                <th className="py-3.5 px-4">Severity</th>
                <th className="py-3.5 px-4">Request Trace</th>
                <th className="py-3.5 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soc-border/60 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-400 mx-auto mb-2" />
                    <span>Querying immutable security audit logs...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="space-y-1">
                      <History className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                      <div className="font-semibold text-white">No audit records found</div>
                      <p className="text-xs text-slate-500">Try broadening your search query or date range filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-4 max-w-[200px] truncate">
                      <div className="font-bold text-white truncate" title={log.actor_email}>
                        {log.actor_email}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 uppercase">
                        <span>{log.actor_role}</span>
                        {log.actor_type && log.actor_type !== 'USER' && (
                          <span className="px-1 py-0.2 rounded bg-slate-800 text-blue-400 border border-slate-700">
                            {log.actor_type}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-white text-[11px] bg-slate-800/90 px-2 py-1 rounded border border-slate-700/60">
                        {log.action}
                      </span>
                    </td>

                    {/* Resource Target */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-300 font-semibold">{log.target_entity}</div>
                      <div className="text-[11px] font-mono text-blue-400 truncate max-w-[140px]" title={log.target_id}>
                        {log.target_id}
                      </div>
                    </td>

                    {/* Outcome */}
                    <td className="py-3.5 px-4">
                      {getOutcomeBadge(log.outcome || log.status)}
                    </td>

                    {/* Severity */}
                    <td className="py-3.5 px-4">
                      {getSeverityBadge(log.severity)}
                    </td>

                    {/* Request Trace */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 truncate max-w-[120px]">
                      {log.request_id ? (
                        <span title={log.request_id}>#{log.request_id.slice(-8)}</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="p-1.5 rounded-lg bg-soc-bg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Inspect Complete Audit Event"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-soc-border flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing Page <strong className="text-white font-mono">{page}</strong> of{' '}
            <strong className="text-white font-mono">{totalPages}</strong> ({totalCount} total audit records)
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="bg-soc-bg border border-soc-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 mr-2 font-mono"
            >
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>

            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="px-3 py-1.5 rounded-lg bg-soc-bg hover:bg-slate-800 border border-soc-border text-slate-300 disabled:opacity-40 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="px-3 py-1.5 rounded-lg bg-soc-bg hover:bg-slate-800 border border-soc-border text-slate-300 disabled:opacity-40 flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* AUDIT DETAIL INSPECTION DRAWER */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-end z-50 animate-in fade-in duration-150">
          <div className="bg-soc-card border-l border-soc-border w-full max-w-2xl p-6 overflow-y-auto space-y-6 shadow-2xl">
            {/* Drawer Header */}
            <div className="flex justify-between items-start border-b border-soc-border pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base text-white">{selectedLog.action}</span>
                  {getSeverityBadge(selectedLog.severity)}
                  {getOutcomeBadge(selectedLog.outcome || selectedLog.status)}
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span>ID: {selectedLog.id}</span>
                  <button
                    onClick={() => handleCopy(selectedLog.id, 'log-id')}
                    className="p-1 hover:text-white text-slate-500"
                    title="Copy Event ID"
                  >
                    {copiedId === 'log-id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description / Summary Details */}
            {selectedLog.details && (
              <div className="p-3.5 rounded-xl bg-soc-bg border border-soc-border space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Event Summary</span>
                <p className="text-xs text-slate-200 leading-relaxed">{selectedLog.details}</p>
              </div>
            )}

            {/* Error Message If Any */}
            {selectedLog.error_message && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 space-y-1">
                <span className="text-[10px] uppercase font-bold font-mono">Error Diagnostics</span>
                <p className="text-xs font-mono">{selectedLog.error_message}</p>
              </div>
            )}

            {/* Core Attribution Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              {/* Actor & Auth Context */}
              <div className="bg-soc-bg border border-soc-border rounded-xl p-4 space-y-2.5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-soc-border/40 pb-2">
                  <UserIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Actor & Identity</span>
                </h3>
                <div className="flex justify-between">
                  <span className="text-slate-400">Actor Email:</span>
                  <strong className="text-white font-mono">{selectedLog.actor_email}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Actor Role:</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-blue-500/20 text-blue-400">
                    {selectedLog.actor_role}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Actor Type:</span>
                  <span className="font-mono text-slate-200">{selectedLog.actor_type || 'USER'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Client IP Address:</span>
                  <span className="font-mono text-slate-200">{selectedLog.ip_address || '127.0.0.1'}</span>
                </div>
              </div>

              {/* Resource Target & Tracing */}
              <div className="bg-soc-bg border border-soc-border rounded-xl p-4 space-y-2.5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-soc-border/40 pb-2">
                  <Server className="w-3.5 h-3.5 text-purple-400" />
                  <span>Resource & Trace</span>
                </h3>
                <div className="flex justify-between">
                  <span className="text-slate-400">Resource Entity:</span>
                  <strong className="text-white">{selectedLog.target_entity}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Resource ID:</span>
                  <span className="font-mono text-blue-400 text-[11px]">{selectedLog.target_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Originating Source:</span>
                  <span className="font-mono text-slate-200">{selectedLog.source || 'API'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Request Correlation ID:</span>
                  <span className="font-mono text-slate-300 text-[11px]">{selectedLog.request_id || '—'}</span>
                </div>
              </div>
            </div>

            {/* Before / After State Diffs */}
            {(selectedLog.diff_old || selectedLog.diff_new) && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>State Change Delta (Before / After Diffs)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  {/* Previous State */}
                  <div className="p-3.5 bg-black/50 border border-soc-border rounded-xl space-y-1.5">
                    <div className="text-[10px] uppercase font-bold text-rose-400 mb-1 flex items-center justify-between">
                      <span>Previous State (diff_old)</span>
                      <span className="text-slate-500">Before</span>
                    </div>
                    <pre className="text-rose-300 text-[11px] overflow-x-auto whitespace-pre-wrap max-h-48">
                      {JSON.stringify(selectedLog.diff_old || {}, null, 2)}
                    </pre>
                  </div>

                  {/* Applied State */}
                  <div className="p-3.5 bg-black/50 border border-soc-border rounded-xl space-y-1.5">
                    <div className="text-[10px] uppercase font-bold text-emerald-400 mb-1 flex items-center justify-between">
                      <span>Applied State (diff_new)</span>
                      <span className="text-slate-500">After</span>
                    </div>
                    <pre className="text-emerald-300 text-[11px] overflow-x-auto whitespace-pre-wrap max-h-48">
                      {JSON.stringify(selectedLog.diff_new || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Structured Metadata Payload */}
            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sanitized Event Metadata</span>
                </h3>
                <div className="p-3.5 bg-black/50 border border-soc-border rounded-xl">
                  <pre className="text-slate-300 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap max-h-40">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Timestamps & Immutability Attestation */}
            <div className="p-4 rounded-xl bg-soc-bg border border-soc-border/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-slate-400">
              <div>
                Recorded at: <strong className="text-slate-200">{selectedLog.timestamp || selectedLog.created_at}</strong>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                <ShieldCheck className="w-4 h-4" />
                <span>Cryptographically Immutable Log</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
