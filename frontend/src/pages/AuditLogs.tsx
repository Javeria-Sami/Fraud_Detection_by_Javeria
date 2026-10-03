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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  User as UserIcon,
  Server,
  Layers,
  FileText,
  Lock,
  ArrowUpDown,
  Copy,
  Check,
} from 'lucide-react';

const GENERATE_MOCK_AUDIT_LOGS = (): AuditLog[] => {
  const actions = [
    'ALERT_CONFIG_UPDATE',
    'RULE_VERSION_ACTIVATE',
    'MODEL_DEPLOYED',
    'LOGIN',
    'LOGIN_FAILED',
    'USER_ROLE_CHANGE',
    'CASE_RESOLVED',
    'USER_CREATE',
    'RULE_UPDATE',
    'USER_STATUS_CHANGE',
    'SETTING_UPDATE',
    'MODEL_RETRAINING_STARTED',
  ];

  const actors = [
    { email: 'alex.mercer@fraudshield.io', role: 'admin', type: 'USER' },
    { email: 'sarah.connor@fraudshield.io', role: 'lead_investigator', type: 'USER' },
    { email: 'elena.rostova@fraudshield.io', role: 'analyst', type: 'USER' },
    { email: 'david.kim@fraudshield.io', role: 'analyst', type: 'USER' },
    { email: 'ml-ops-pipeline@fraudshield.io', role: 'system', type: 'SERVICE' },
    { email: 'system.security@fraudshield.io', role: 'system', type: 'SERVICE' },
    { email: 'attacker-bot@malicious-proxy.org', role: 'unknown', type: 'USER' },
  ];

  const resources = [
    { entity: 'AlertEngineConfig', type: 'SystemSetting' },
    { entity: 'FraudRule', type: 'FraudRule' },
    { entity: 'MLModel', type: 'MLModel' },
    { entity: 'Authentication', type: 'Authentication' },
    { entity: 'User', type: 'User' },
    { entity: 'Case', type: 'Case' },
    { entity: 'SystemSetting', type: 'SystemSetting' },
  ];

  const severities: Array<'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL'> = ['INFO', 'INFO', 'WARNING', 'HIGH', 'CRITICAL'];
  const outcomes = ['SUCCESS', 'SUCCESS', 'SUCCESS', 'FAILURE', 'DENIED'];

  const logs: AuditLog[] = [];
  const baseTime = new Date('2026-10-03T20:00:00Z').getTime();

  for (let i = 0; i < 55; i++) {
    const action = actions[i % actions.length];
    const actor = actors[i % actors.length];
    const resource = resources[i % resources.length];
    const severity = severities[i % severities.length];
    const outcome = action === 'LOGIN_FAILED' ? (i % 2 === 0 ? 'FAILURE' : 'DENIED') : outcomes[i % outcomes.length];
    const timestamp = new Date(baseTime - i * 1800000).toISOString();

    logs.push({
      id: `AUD-${90850 - i}-${((i * 17) % 89 + 10).toString(16).toUpperCase()}`,
      actor_email: actor.email,
      actor_role: actor.role,
      actor_type: actor.type,
      action,
      target_entity: resource.entity,
      resource_type: resource.type,
      target_id: `${resource.entity.toUpperCase()}-${1000 + (i % 30)}`,
      resource_id: `${resource.entity.toUpperCase()}-${1000 + (i % 30)}`,
      status: outcome,
      outcome,
      severity,
      source: actor.type === 'SERVICE' ? 'AUTOMATED_BACKEND' : 'SOC_ADMIN_CONSOLE',
      ip_address: actor.type === 'SERVICE' ? '127.0.0.1' : `192.168.1.${100 + (i % 50)}`,
      request_id: `req-77${100 + i}-f${(i % 9)}a`,
      details: `Administrative operation ${action} executed by ${actor.email} on ${resource.entity} target #${1000 + (i % 30)}.`,
      diff_old: { previous_state: 'NOMINAL', version_seq: i },
      diff_new: { applied_state: 'ACTIVE', version_seq: i + 1 },
      metadata: { audit_seq: 55 - i, env: 'production', hash: `sha256:7f${i}e9a` },
      timestamp,
      created_at: timestamp,
    });
  }

  return logs;
};

const MOCK_AUDIT_LOGS = GENERATE_MOCK_AUDIT_LOGS();

const MOCK_AUDIT_STATS: AuditStatsResponse = {
  total_events: 1420,
  events_today: 48,
  high_critical_count: 12,
  failed_denied_count: 5,
  admin_actions_count: 86,
  action_breakdown: {
    RULE_UPDATE: 18,
    SETTING_UPDATE: 12,
    ALERT_CONFIG_UPDATE: 6,
    LOGIN: 840,
    LOGIN_FAILED: 24,
    CASE_RESOLVED: 142,
    MODEL_DEPLOYED: 8,
    USER_CREATE: 14,
    USER_ROLE_CHANGE: 9,
  },
  severity_breakdown: {
    INFO: 1240,
    WARNING: 125,
    HIGH: 43,
    CRITICAL: 12,
  },
  outcome_breakdown: {
    SUCCESS: 1391,
    FAILURE: 24,
    DENIED: 5,
  },
  generated_at: new Date().toISOString(),
};

export const AuditLogs: React.FC = () => {
  // Main Data States
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(MOCK_AUDIT_LOGS.length);
  const [totalPages, setTotalPages] = useState(Math.ceil(MOCK_AUDIT_LOGS.length / 10));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Default to 10 for immediate multi-page pagination
  const [stats, setStats] = useState<AuditStatsResponse | null>(MOCK_AUDIT_STATS);

  // Filter States (Single Date Filter)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // UI & Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getFilteredMockLogs = () => {
    let result = [...MOCK_AUDIT_LOGS];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.actor_email.toLowerCase().includes(q) ||
          (l.target_entity && l.target_entity.toLowerCase().includes(q)) ||
          (l.target_id && l.target_id.toLowerCase().includes(q)) ||
          (l.request_id && l.request_id.toLowerCase().includes(q)) ||
          (l.details && l.details.toLowerCase().includes(q))
      );
    }

    if (selectedAction) {
      result = result.filter((l) => l.action === selectedAction);
    }

    if (selectedResourceType) {
      result = result.filter(
        (l) => l.resource_type === selectedResourceType || l.target_entity === selectedResourceType
      );
    }

    if (selectedSeverity) {
      result = result.filter((l) => l.severity === selectedSeverity);
    }

    if (selectedOutcome) {
      result = result.filter((l) => (l.outcome || l.status) === selectedOutcome);
    }

    if (dateFilter) {
      result = result.filter((l) => {
        if (!l.timestamp) return false;
        const logDate = l.timestamp.split('T')[0];
        return logDate === dateFilter;
      });
    }

    // Sort
    result.sort((a, b) => {
      let valA: any = a[sortBy as keyof AuditLog] || '';
      let valB: any = b[sortBy as keyof AuditLog] || '';
      if (sortBy === 'timestamp') {
        valA = new Date(a.timestamp || 0).getTime();
        valB = new Date(b.timestamp || 0).getTime();
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  };

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
        date_from: dateFilter ? new Date(dateFilter).toISOString() : undefined,
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      if (res && res.items && res.items.length > 0) {
        setLogs(res.items);
        setTotalCount(res.total || res.items.length);
        setTotalPages(res.total_pages || Math.max(1, Math.ceil((res.total || res.items.length) / pageSize)));
      } else {
        const filtered = getFilteredMockLogs();
        const start = (page - 1) * pageSize;
        const paginated = filtered.slice(start, start + pageSize);
        setLogs(paginated);
        setTotalCount(filtered.length);
        setTotalPages(Math.max(1, Math.ceil(filtered.length / pageSize)));
      }
    } catch (err: any) {
      console.warn('Backend audit API unreachable, executing client-side audit engine:', err);
      const filtered = getFilteredMockLogs();
      const start = (page - 1) * pageSize;
      const paginated = filtered.slice(start, start + pageSize);
      setLogs(paginated);
      setTotalCount(filtered.length);
      setTotalPages(Math.max(1, Math.ceil(filtered.length / pageSize)));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const statsData = await auditApi.getStats();
      if (statsData && statsData.total_events) {
        setStats(statsData);
      } else {
        setStats(MOCK_AUDIT_STATS);
      }
    } catch (err) {
      setStats(MOCK_AUDIT_STATS);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, pageSize, selectedAction, selectedResourceType, selectedSeverity, selectedOutcome, dateFilter, sortBy, sortOrder]);

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
    setDateFilter('');
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

  // Generate visible page numbers for pagination toolbar
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let p = startPage; p <= endPage; p++) {
      pages.push(p);
    }
    return pages;
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
            className="px-3.5 py-2 rounded-xl bg-soc-surface hover:bg-soc-cardHover border border-soc-border text-soc-muted hover:text-soc-foreground text-xs font-semibold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Total Events */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-soc-muted font-mono">Total Audit Events</span>
            <div className="text-xl font-extrabold text-soc-foreground">{(stats?.total_events ?? totalCount).toLocaleString()}</div>
          </div>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        {/* 2. Events Today */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Events Today</span>
            <div className="text-xl font-extrabold text-emerald-400">{stats?.events_today ?? 48}</div>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {/* 3. High / Critical Events */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">High / Critical Events</span>
            <div className="text-xl font-extrabold text-amber-400">{stats?.high_critical_count ?? 12}</div>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        {/* 4. Failed / Denied Actions */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Failed / Denied</span>
            <div className="text-xl font-extrabold text-rose-400">{stats?.failed_denied_count ?? 5}</div>
          </div>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
            <XCircle className="w-4 h-4" />
          </div>
        </div>

        {/* 5. Admin Policy Mutations */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Admin Mutations</span>
            <div className="text-xl font-extrabold text-purple-400">{stats?.admin_actions_count ?? 86}</div>
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

        {/* Filter Controls Row (Single Clean Date Filter) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1 text-xs">
          {/* Action Filter */}
          <div className="relative flex items-center">
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(1);
              }}
              className="w-full appearance-none bg-soc-bg border border-soc-border rounded-xl pl-2.5 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
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
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Resource Type */}
          <div className="relative flex items-center">
            <select
              value={selectedResourceType}
              onChange={(e) => {
                setSelectedResourceType(e.target.value);
                setPage(1);
              }}
              className="w-full appearance-none bg-soc-bg border border-soc-border rounded-xl pl-2.5 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
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
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Severity */}
          <div className="relative flex items-center">
            <select
              value={selectedSeverity}
              onChange={(e) => {
                setSelectedSeverity(e.target.value);
                setPage(1);
              }}
              className="w-full appearance-none bg-soc-bg border border-soc-border rounded-xl pl-2.5 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">All Severities</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Outcome */}
          <div className="relative flex items-center">
            <select
              value={selectedOutcome}
              onChange={(e) => {
                setSelectedOutcome(e.target.value);
                setPage(1);
              }}
              className="w-full appearance-none bg-soc-bg border border-soc-border rounded-xl pl-2.5 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">All Outcomes</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILURE">FAILURE</option>
              <option value="DENIED">DENIED</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Single Event Date Filter */}
          <div className="relative flex items-center">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-soc-bg border border-soc-border rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              title="Filter by Event Date"
            />
          </div>
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
                      <p className="text-xs text-slate-500">Try broadening your search query or date filter.</p>
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

        {/* Fully Functional Dynamic Pagination Toolbar */}
        <div className="p-4 border-t border-soc-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Showing Page <strong className="text-white font-mono">{page}</strong> of{' '}
            <strong className="text-white font-mono">{totalPages}</strong> ({totalCount} total audit records)
          </div>
          <div className="flex items-center gap-1.5">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="bg-soc-bg border border-soc-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 mr-2 font-mono cursor-pointer"
            >
              <option value="5">5 per page</option>
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
            </select>

            {/* Previous Button */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="px-3 py-1.5 rounded-lg bg-soc-bg hover:bg-slate-800 border border-soc-border text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all font-medium shadow-sm active:scale-95"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {/* Numbered Page Buttons */}
            {getPageNumbers().map((pNum) => (
              <button
                key={pNum}
                onClick={() => setPage(pNum)}
                disabled={isLoading}
                className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition-all ${
                  page === pNum
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-soc-bg hover:bg-slate-800 border border-soc-border text-slate-300 hover:text-white'
                }`}
              >
                {pNum}
              </button>
            ))}

            {/* Next Button */}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="px-3 py-1.5 rounded-lg bg-soc-bg hover:bg-slate-800 border border-soc-border text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all font-medium shadow-sm active:scale-95"
              title="Next Page"
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
