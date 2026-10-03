import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminFraudRule } from '../types';
import { adminApi, ListRulesFilterParams } from '../services/adminApi';
import { SeverityBadge } from '../components/shared/SeverityBadge';
import { RuleConfigForm } from '../components/admin/RuleConfigForm';
import { RuleVersionHistoryModal } from '../components/admin/RuleVersionHistoryModal';
import { RuleSimulatorModal } from '../components/admin/RuleSimulatorModal';
import { AlertConfigPanel } from '../components/admin/AlertConfigPanel';
import {
  Sliders,
  Edit2,
  Check,
  X,
  ShieldAlert,
  History,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  BellRing,
  Layers,
  Activity,
  Flame,
  Zap,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
} from 'lucide-react';

type AdminTab = 'rules' | 'alerts';

export const FALLBACK_ADMIN_RULES: AdminFraudRule[] = [
  {
    id: 'HIGH_AMOUNT',
    rule_code: 'HIGH_AMOUNT',
    name: 'Large Transaction Amount Spike',
    description: 'Flags transactions exceeding standard account baseline or static monetary threshold ($5,000+).',
    category: 'AMOUNT',
    severity: 'HIGH',
    weight: 30,
    priority: 1,
    is_active: true,
    condition_config: { amount_threshold: 5000.0, comparison: '>' },
    version: '1.0',
    total_executions: 14820,
    total_triggers: 512,
    trigger_rate: 0.0345,
    created_by: 'system',
    updated_by: 'admin@fraudshield.io',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    versions: [
      {
        id: 'VER-HA-1.0',
        rule_id: 'HIGH_AMOUNT',
        version: '1.0',
        configuration: { amount_threshold: 5000.0, comparison: '>' },
        threshold: 5000.0,
        weight: 30,
        is_active: true,
        created_by: 'system',
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
    ],
  },
  {
    id: 'HIGH_VELOCITY',
    rule_code: 'HIGH_VELOCITY',
    name: 'High Frequency Velocity Spike',
    description: 'Flags more than 3 transactions occurring within a rapid 2-minute rolling window.',
    category: 'VELOCITY',
    severity: 'CRITICAL',
    weight: 35,
    priority: 1,
    is_active: true,
    condition_config: { max_transactions_window: 3, window_minutes: 2 },
    version: '1.2',
    total_executions: 14820,
    total_triggers: 341,
    trigger_rate: 0.023,
    created_by: 'system',
    updated_by: 'admin@fraudshield.io',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    versions: [
      {
        id: 'VER-HV-1.2',
        rule_id: 'HIGH_VELOCITY',
        version: '1.2',
        configuration: { max_transactions_window: 3, window_minutes: 2 },
        threshold: 3.0,
        weight: 35,
        is_active: true,
        created_by: 'admin@fraudshield.io',
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
    ],
  },
  {
    id: 'NEW_DEVICE',
    rule_code: 'NEW_DEVICE',
    name: 'Unseen Novel Device Fingerprint',
    description: 'Flags transactions originating from hardware or browser fingerprints never before seen for the user.',
    category: 'DEVICE',
    severity: 'MEDIUM',
    weight: 20,
    priority: 2,
    is_active: true,
    condition_config: {},
    version: '1.0',
    total_executions: 14820,
    total_triggers: 890,
    trigger_rate: 0.0601,
    created_by: 'system',
    updated_by: 'admin@fraudshield.io',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    versions: [
      {
        id: 'VER-ND-1.0',
        rule_id: 'NEW_DEVICE',
        version: '1.0',
        configuration: {},
        threshold: 1.0,
        weight: 20,
        is_active: true,
        created_by: 'system',
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
    ],
  },
  {
    id: 'UNUSUAL_LOCATION',
    rule_code: 'UNUSUAL_LOCATION',
    name: 'Impossible Travel Velocity Hop',
    description: 'Flags geographical location shifts requiring travel speed exceeding 700 km/h from last session.',
    category: 'LOCATION',
    severity: 'HIGH',
    weight: 30,
    priority: 1,
    is_active: true,
    condition_config: { max_geo_speed_kmh: 700.0 },
    version: '1.0',
    total_executions: 14820,
    total_triggers: 215,
    trigger_rate: 0.0145,
    created_by: 'system',
    updated_by: 'admin@fraudshield.io',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    versions: [
      {
        id: 'VER-UL-1.0',
        rule_id: 'UNUSUAL_LOCATION',
        version: '1.0',
        configuration: { max_geo_speed_kmh: 700.0 },
        threshold: 700.0,
        weight: 30,
        is_active: true,
        created_by: 'system',
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
    ],
  },
  {
    id: 'UNUSUAL_TIME',
    rule_code: 'UNUSUAL_TIME',
    name: 'Off-Hours Overnight Activity',
    description: 'Flags high-value payment transactions executing between 01:00 and 05:00 UTC.',
    category: 'TIME',
    severity: 'LOW',
    weight: 15,
    priority: 3,
    is_active: true,
    condition_config: { night_start: 1, night_end: 5 },
    version: '1.0',
    total_executions: 14820,
    total_triggers: 620,
    trigger_rate: 0.0418,
    created_by: 'system',
    updated_by: 'admin@fraudshield.io',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    versions: [
      {
        id: 'VER-UT-1.0',
        rule_id: 'UNUSUAL_TIME',
        version: '1.0',
        configuration: { night_start: 1, night_end: 5 },
        threshold: 1.0,
        weight: 15,
        is_active: true,
        created_by: 'system',
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
    ],
  },
  {
    id: 'FAILED_ATTEMPTS',
    rule_code: 'FAILED_ATTEMPTS',
    name: 'Authentication Attempt Surge',
    description: 'Flags accounts with repeated failed CVV/PIN authorizations preceding transaction execution.',
    category: 'FAILED_ATTEMPTS',
    severity: 'HIGH',
    weight: 25,
    priority: 1,
    is_active: true,
    condition_config: { max_failed_attempts: 2 },
    version: '1.0',
    total_executions: 14820,
    total_triggers: 198,
    trigger_rate: 0.0134,
    created_by: 'system',
    updated_by: 'admin@fraudshield.io',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    versions: [
      {
        id: 'VER-FA-1.0',
        rule_id: 'FAILED_ATTEMPTS',
        version: '1.0',
        configuration: { max_failed_attempts: 2 },
        threshold: 2.0,
        weight: 25,
        is_active: true,
        created_by: 'system',
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
    ],
  },
  {
    id: 'SUDDEN_SPENDING_INCREASE',
    rule_code: 'SUDDEN_SPENDING_INCREASE',
    name: 'Sudden Spending Velocity Surge',
    description: 'Flags sharp 3x surge in hourly spend compared to historic baseline average.',
    category: 'BEHAVIOR',
    severity: 'MEDIUM',
    weight: 20,
    priority: 2,
    is_active: true,
    condition_config: { spending_multiplier: 3.0 },
    version: '1.0',
    total_executions: 14820,
    total_triggers: 245,
    trigger_rate: 0.0165,
    created_by: 'system',
    updated_by: 'admin@fraudshield.io',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    versions: [
      {
        id: 'VER-SSI-1.0',
        rule_id: 'SUDDEN_SPENDING_INCREASE',
        version: '1.0',
        configuration: { spending_multiplier: 3.0 },
        threshold: 3.0,
        weight: 20,
        is_active: true,
        created_by: 'system',
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
    ],
  },
  {
    id: 'MERCHANT_ANOMALY',
    rule_code: 'MERCHANT_ANOMALY',
    name: 'High-Risk Merchant Category Deviation',
    description: 'Elevates composite risk weighting for crypto exchanges, casinos, and high-risk merchants.',
    category: 'MERCHANT',
    severity: 'HIGH',
    weight: 25,
    priority: 2,
    is_active: true,
    condition_config: { high_risk_categories: ['Crypto & Exchange', 'Gambling & Casino'] },
    version: '1.0',
    total_executions: 14820,
    total_triggers: 310,
    trigger_rate: 0.0209,
    created_by: 'system',
    updated_by: 'admin@fraudshield.io',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    versions: [
      {
        id: 'VER-MA-1.0',
        rule_id: 'MERCHANT_ANOMALY',
        version: '1.0',
        configuration: { high_risk_categories: ['Crypto & Exchange', 'Gambling & Casino'] },
        threshold: 1.0,
        weight: 25,
        is_active: true,
        created_by: 'system',
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
    ],
  },
  {
    id: 'BEHAVIOR_DEVIATION',
    rule_code: 'BEHAVIOR_DEVIATION',
    name: 'Compound Behavioral Anomaly',
    description: 'Flags simultaneous novel device fingerprint, geographical hop, and amount surge.',
    category: 'BEHAVIOR',
    severity: 'CRITICAL',
    weight: 35,
    priority: 1,
    is_active: true,
    condition_config: {},
    version: '1.0',
    total_executions: 14820,
    total_triggers: 128,
    trigger_rate: 0.0086,
    created_by: 'system',
    updated_by: 'admin@fraudshield.io',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    versions: [
      {
        id: 'VER-BD-1.0',
        rule_id: 'BEHAVIOR_DEVIATION',
        version: '1.0',
        configuration: {},
        threshold: 1.0,
        weight: 35,
        is_active: true,
        created_by: 'system',
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
    ],
  },
];

export const AdminRules: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('rules');
  const [rules, setRules] = useState<AdminFraudRule[]>(FALLBACK_ADMIN_RULES);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  // Modal Dialog States
  const [editingRule, setEditingRule] = useState<AdminFraudRule | null>(null);
  const [historyRule, setHistoryRule] = useState<AdminFraudRule | null>(null);
  const [simulatingRule, setSimulatingRule] = useState<AdminFraudRule | null>(null);

  const filterFallbackRules = useCallback((params: ListRulesFilterParams) => {
    let result = [...FALLBACK_ADMIN_RULES];
    if (params.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.rule_code.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
      );
    }
    if (params.category) {
      result = result.filter(
        (r) => r.category.toUpperCase() === params.category!.toUpperCase()
      );
    }
    if (params.severity) {
      result = result.filter(
        (r) => r.severity.toUpperCase() === params.severity!.toUpperCase()
      );
    }
    if (params.is_active !== undefined) {
      result = result.filter((r) => r.is_active === params.is_active);
    }
    return result;
  }, []);

  const fetchRules = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);

    const params: ListRulesFilterParams = {
      search: searchQuery.trim() || undefined,
      category: selectedCategory || undefined,
      severity: selectedSeverity || undefined,
      is_active: selectedStatus === 'active' ? true : selectedStatus === 'disabled' ? false : undefined,
    };

    try {
      const data = await adminApi.listRules(params);
      let list: AdminFraudRule[] | null = null;

      if (Array.isArray(data)) {
        list = data;
      } else if (data && typeof data === 'object') {
        if (Array.isArray((data as any).rules)) list = (data as any).rules;
        else if (Array.isArray((data as any).items)) list = (data as any).items;
        else if (Array.isArray((data as any).data)) list = (data as any).data;
      }

      if (Array.isArray(list)) {
        setRules(list);
      } else {
        setRules(filterFallbackRules(params));
      }
    } catch (err) {
      console.error('Failed to load fraud rules:', err);
      setRules(filterFallbackRules(params));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, selectedCategory, selectedSeverity, selectedStatus, filterFallbackRules]);

  useEffect(() => {
    if (activeTab === 'rules') {
      fetchRules();
    }
  }, [fetchRules, activeTab]);

  const handleToggleActiveQuick = async (rule: AdminFraudRule) => {
    try {
      const updated = await adminApi.updateRule(rule.id, {
        is_active: !rule.is_active,
        reason: `Quick toggle state changed to ${!rule.is_active ? 'ACTIVE' : 'DISABLED'}`,
      });
      setRules((prev) => (Array.isArray(prev) ? prev.map((r) => (r.id === rule.id ? updated : r)) : []));
    } catch (err) {
      console.error('Failed to toggle rule active state:', err);
      // Local optimistic update if offline
      setRules((prev) =>
        (Array.isArray(prev) ? prev : FALLBACK_ADMIN_RULES).map((r) =>
          r.id === rule.id ? { ...r, is_active: !r.is_active } : r
        )
      );
    }
  };

  const handleRuleUpdated = (updatedRule: AdminFraudRule) => {
    setRules((prev) =>
      (Array.isArray(prev) ? prev : FALLBACK_ADMIN_RULES).map((r) =>
        r.id === updatedRule.id ? updatedRule : r
      )
    );
    if (editingRule?.id === updatedRule.id) setEditingRule(null);
    if (historyRule?.id === updatedRule.id) setHistoryRule(updatedRule);
  };

  // KPI Calculations with strict null-safety
  const safeRules = useMemo(() => (Array.isArray(rules) ? rules : []), [rules]);
  const totalRules = safeRules.length;
  const activeRulesCount = safeRules.filter((r) => Boolean(r && r.is_active)).length;
  const totalExecutions = safeRules.reduce((acc, r) => acc + (r?.total_executions || 0), 0);
  const totalTriggers = safeRules.reduce((acc, r) => acc + (r?.total_triggers || 0), 0);

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur-md">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-400" />
            <span>Detection Engine & Alert Administration</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable versioned fraud rules, deterministic threshold parameter calibration, and operational alert engine policies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRules(true)}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'rules'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Fraud Rules Registry</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-900 text-[10px] text-blue-300">
            {totalRules}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'alerts'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <BellRing className="w-4 h-4" />
          <span>Alert Engine Calibration</span>
        </button>
      </div>

      {activeTab === 'alerts' && <AlertConfigPanel />}

      {activeTab === 'rules' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Fraud Rules
                </div>
                <div className="text-2xl font-bold text-white mt-0.5">{totalRules}</div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Active in Pipeline
                </div>
                <div className="text-2xl font-bold text-white mt-0.5">{activeRulesCount}</div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Executions
                </div>
                <div className="text-2xl font-bold text-white mt-0.5">
                  {totalExecutions.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Trigger Activations
                </div>
                <div className="text-2xl font-bold text-white mt-0.5">
                  {totalTriggers.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search rule code, name, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Categories</option>
              <option value="AMOUNT">Amount</option>
              <option value="VELOCITY">Velocity</option>
              <option value="DEVICE">Device</option>
              <option value="LOCATION">Location</option>
              <option value="TIME">Time</option>
              <option value="FAILED_ATTEMPTS">Failed Attempts</option>
              <option value="MERCHANT">Merchant</option>
              <option value="BEHAVIOR">Behavior</option>
            </select>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="disabled">Disabled Only</option>
            </select>
          </div>

          {/* Rules Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Rule Name / Code</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Risk Weight</th>
                    <th className="py-3.5 px-4">Severity</th>
                    <th className="py-3.5 px-4">Active Version</th>
                    <th className="py-3.5 px-4">Trigger Rate</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(() => {
                    const totalPages = Math.max(1, Math.ceil(safeRules.length / pageSize));
                    const safePage = Math.min(Math.max(1, page), totalPages);
                    const paginatedRules = safeRules.slice((safePage - 1) * pageSize, safePage * pageSize);
                    return paginatedRules.map((rule) => {
                      if (!rule) return null;
                      const triggerPct = (((rule.trigger_rate ?? 0) * 100)).toFixed(1);
                      return (
                        <tr key={rule.id || rule.rule_code} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 max-w-sm">
                            <div className="font-bold text-white text-xs">{rule.name || rule.rule_code}</div>
                            <div className="text-[10px] text-blue-400 font-mono mt-0.5">{rule.rule_code}</div>
                            <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                              {rule.description || 'Deterministic security policy rule.'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                              {rule.category || 'GENERAL'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-white text-sm font-mono">
                            +{rule.weight ?? 0} pts
                          </td>

                          <td className="py-3.5 px-4">
                            <SeverityBadge severity={rule.severity || 'MEDIUM'} size="sm" />
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              v{rule.version || '1.0'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-xs font-mono text-slate-200">
                              {triggerPct}%
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {(rule.total_triggers || 0).toLocaleString()} of {(rule.total_executions || 0).toLocaleString()}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleActiveQuick(rule)}
                              className="flex items-center gap-1.5 focus:outline-none"
                              title="Click to toggle active status"
                            >
                              {rule.is_active ? (
                                <span className="text-emerald-400 text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                                  <Check className="w-3 h-3" /> ACTIVE
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[10px] font-bold bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
                                  DISABLED
                                </span>
                              )}
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSimulatingRule(rule)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-amber-400 border border-slate-700 transition-colors"
                                title="Simulate rule evaluation on synthetic data"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setHistoryRule(rule)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                                title="View immutable version timeline & diff"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setEditingRule(rule)}
                                className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 hover:border-blue-500 text-blue-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all"
                                title="Configure parameters & deploy new version"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Configure</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {(() => {
              const totalPages = Math.max(1, Math.ceil(safeRules.length / pageSize));
              const safePage = Math.min(Math.max(1, page), totalPages);
              const startItem = safeRules.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
              const endItem = Math.min(safePage * pageSize, safeRules.length);

              const getPageNumbers = () => {
                const pages: (number | string)[] = [];
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  if (safePage <= 3) {
                    pages.push(1, 2, 3, 4, '...', totalPages);
                  } else if (safePage >= totalPages - 2) {
                    pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                  } else {
                    pages.push(1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages);
                  }
                }
                return pages;
              };

              return (
                <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-4">
                    <div className="font-mono text-[11px]">
                      Showing <strong className="text-white">{startItem}</strong> to{' '}
                      <strong className="text-white">{endItem}</strong> of{' '}
                      <strong className="text-white">{safeRules.length}</strong> rules
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Per page:</span>
                      <div className="relative inline-flex items-center">
                        <select
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(parseInt(e.target.value, 10));
                            setPage(1);
                          }}
                          className="appearance-none bg-slate-950 border border-slate-700/80 rounded-lg pl-2.5 pr-7 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono cursor-pointer"
                        >
                          <option value="5">5</option>
                          <option value="10">10</option>
                          <option value="25">25</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setPage(1)}
                      disabled={safePage <= 1}
                      className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="First Page"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPage(safePage - 1)}
                      disabled={safePage <= 1}
                      className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((pNum, idx) => {
                        if (pNum === '...') {
                          return (
                            <span key={`rule-ell-${idx}`} className="px-1.5 text-slate-500 font-mono text-xs select-none">
                              ...
                            </span>
                          );
                        }
                        const num = Number(pNum);
                        const isActive = num === safePage;
                        return (
                          <button
                            key={`rule-page-${num}`}
                            type="button"
                            onClick={() => setPage(num)}
                            className={`min-w-[28px] h-7 px-2 flex items-center justify-center rounded-lg border font-mono text-xs transition-all ${
                              isActive
                                ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-sm shadow-blue-500/20'
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setPage(safePage + 1)}
                      disabled={safePage >= totalPages}
                      className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Next Page"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPage(totalPages)}
                      disabled={safePage >= totalPages}
                      className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Last Page"
                    >
                      <ChevronsRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Configure Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Configure Fraud Rule Version
                </h3>
                <span className="text-xs text-blue-400 font-mono">{editingRule.name}</span>
              </div>
              <button
                onClick={() => setEditingRule(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <RuleConfigForm
              rule={editingRule}
              onSuccess={handleRuleUpdated}
              onCancel={() => setEditingRule(null)}
            />
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {historyRule && (
        <RuleVersionHistoryModal
          rule={historyRule}
          onClose={() => setHistoryRule(null)}
          onRuleUpdated={handleRuleUpdated}
        />
      )}

      {/* Simulator Modal */}
      {simulatingRule && (
        <RuleSimulatorModal
          rule={simulatingRule}
          onClose={() => setSimulatingRule(null)}
        />
      )}
    </div>
  );
};
export default AdminRules;
