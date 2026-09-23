import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';

type AdminTab = 'rules' | 'alerts';

export const AdminRules: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('rules');
  const [rules, setRules] = useState<AdminFraudRule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Modal Dialog States
  const [editingRule, setEditingRule] = useState<AdminFraudRule | null>(null);
  const [historyRule, setHistoryRule] = useState<AdminFraudRule | null>(null);
  const [simulatingRule, setSimulatingRule] = useState<AdminFraudRule | null>(null);

  const fetchRules = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const params: ListRulesFilterParams = {
        search: searchQuery.trim() || undefined,
        category: selectedCategory || undefined,
        severity: selectedSeverity || undefined,
        is_active: selectedStatus === 'active' ? true : selectedStatus === 'disabled' ? false : undefined,
      };
      const data = await adminApi.listRules(params);
      setRules(data);
    } catch (err) {
      console.error('Failed to load fraud rules:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, selectedCategory, selectedSeverity, selectedStatus]);

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
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    } catch (err) {
      console.error('Failed to toggle rule active state:', err);
    }
  };

  const handleRuleUpdated = (updatedRule: AdminFraudRule) => {
    setRules((prev) => prev.map((r) => (r.id === updatedRule.id ? updatedRule : r)));
    if (editingRule?.id === updatedRule.id) setEditingRule(null);
    if (historyRule?.id === updatedRule.id) setHistoryRule(updatedRule);
  };

  // KPI Calculations
  const totalRules = rules.length;
  const activeRulesCount = rules.filter((r) => r.is_active).length;
  const totalExecutions = rules.reduce((acc, r) => acc + (r.total_executions || 0), 0);
  const totalTriggers = rules.reduce((acc, r) => acc + (r.total_triggers || 0), 0);

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
            {rules.length}
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
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="font-bold text-white text-xs">{rule.name}</div>
                        <div className="text-[10px] text-blue-400 font-mono mt-0.5">{rule.rule_code}</div>
                        <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                          {rule.description}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                          {rule.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-white text-sm font-mono">
                        +{rule.weight} pts
                      </td>

                      <td className="py-3.5 px-4">
                        <SeverityBadge severity={rule.severity} size="sm" />
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          v{rule.version || '1.0'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-xs font-mono text-slate-200">
                          {(rule.trigger_rate * 100).toFixed(1)}%
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {rule.total_triggers} of {rule.total_executions}
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
                  ))}
                </tbody>
              </table>
            </div>
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
