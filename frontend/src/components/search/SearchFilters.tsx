import React, { useState } from 'react';
import { Filter, RotateCcw, ChevronDown, ChevronUp, Calendar, ShieldAlert, DollarSign, Globe, SlidersHorizontal } from 'lucide-react';
import { SearchQueryRequest } from '../../types';

interface SearchFiltersProps {
  filters: SearchQueryRequest;
  onChange: (updated: Partial<SearchQueryRequest>) => void;
  onReset: () => void;
  onApply: () => void;
  countsByCategory?: {
    transactions: number;
    alerts: number;
    cases: number;
    users: number;
    devices: number;
    merchants: number;
    total: number;
  };
}

const ENTITY_OPTIONS: { key: 'transaction' | 'alert' | 'case' | 'user' | 'device' | 'merchant'; label: string; countKey: keyof NonNullable<SearchFiltersProps['countsByCategory']> }[] = [
  { key: 'transaction', label: 'Transactions', countKey: 'transactions' },
  { key: 'alert', label: 'Alerts', countKey: 'alerts' },
  { key: 'case', label: 'Cases', countKey: 'cases' },
  { key: 'user', label: 'Users', countKey: 'users' },
  { key: 'device', label: 'Devices', countKey: 'devices' },
  { key: 'merchant', label: 'Merchants', countKey: 'merchants' },
];

const RISK_LEVELS: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES = ['COMPLETED', 'FAILED', 'DECLINED', 'BLOCKED', 'PENDING', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onChange,
  onReset,
  onApply,
  countsByCategory,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedEntities = filters.entity_types || [];

  const handleToggleEntity = (entity: 'transaction' | 'alert' | 'case' | 'user' | 'device' | 'merchant') => {
    let next: ('transaction' | 'alert' | 'case' | 'user' | 'device' | 'merchant')[];
    if (selectedEntities.includes(entity)) {
      next = selectedEntities.filter((e) => e !== entity);
    } else {
      next = [...selectedEntities, entity];
    }
    onChange({ entity_types: next.length > 0 ? next : undefined, page: 1 });
  };

  const handleDatePreset = (preset: 'today' | '7d' | '30d' | '90d' | 'all') => {
    const now = new Date();
    let from: Date | null = null;

    if (preset === 'today') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (preset === '7d') {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (preset === '30d') {
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (preset === '90d') {
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    onChange({
      date_from: from ? from.toISOString() : undefined,
      date_to: preset !== 'all' ? now.toISOString() : undefined,
      page: 1,
    });
  };

  const handleToggleRiskLevel = (level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => {
    const current = filters.risk_levels || [];
    const next = current.includes(level)
      ? current.filter((l) => l !== level)
      : [...current, level];
    onChange({ risk_levels: next.length > 0 ? next : undefined, page: 1 });
  };

  const handleToggleStatus = (st: string) => {
    const current = filters.statuses || [];
    const next = current.includes(st)
      ? current.filter((s) => s !== st)
      : [...current, st];
    onChange({ statuses: next.length > 0 ? next : undefined, page: 1 });
  };

  const handleToggleSeverity = (sev: string) => {
    const current = filters.severities || [];
    const next = current.includes(sev)
      ? current.filter((s) => s !== sev)
      : [...current, sev];
    onChange({ severities: next.length > 0 ? next : undefined, page: 1 });
  };

  const countActiveFilters = () => {
    let count = 0;
    if (filters.entity_types && filters.entity_types.length > 0) count += 1;
    if (filters.date_from || filters.date_to) count += 1;
    if (filters.risk_min !== undefined || filters.risk_max !== undefined) count += 1;
    if (filters.risk_levels && filters.risk_levels.length > 0) count += 1;
    if (filters.statuses && filters.statuses.length > 0) count += 1;
    if (filters.severities && filters.severities.length > 0) count += 1;
    if (filters.min_amount !== undefined || filters.max_amount !== undefined) count += 1;
    if (filters.country || filters.city) count += 1;
    if (filters.sort_by && filters.sort_by !== 'relevance') count += 1;
    return count;
  };

  const activeCount = countActiveFilters();

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-md">
      {/* Top Entity Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Entities:
          </span>
          {ENTITY_OPTIONS.map(({ key, label, countKey }) => {
            const isSelected = selectedEntities.length === 0 || selectedEntities.includes(key);
            const count = countsByCategory ? countsByCategory[countKey] : null;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleToggleEntity(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  isSelected && selectedEntities.includes(key)
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                    : selectedEntities.length === 0
                    ? 'bg-slate-800/80 text-slate-300 border border-slate-700/60 hover:border-slate-600'
                    : 'bg-slate-800/40 text-slate-500 border border-slate-800 hover:text-slate-400'
                }`}
              >
                <span>{label}</span>
                {count !== null && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-slate-900/80 rounded-full font-mono font-bold text-slate-400">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-rose-400 bg-slate-800/60 hover:bg-rose-950/30 border border-slate-700/60 hover:border-rose-800/50 rounded-lg transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset ({activeCount})
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              isExpanded || activeCount > 0
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Advanced Filters</span>
            {activeCount > 0 && (
              <span className="px-1.5 py-0.2 bg-cyan-500 text-slate-950 text-[10px] font-bold rounded-full">
                {activeCount}
              </span>
            )}
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Advanced Filter Panel */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 mt-2 animate-fadeIn">
          {/* Date Range Filter */}
          <div className="space-y-2 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                Date Range
              </label>
            </div>
            <div className="flex flex-wrap gap-1">
              {(['today', '7d', '30d', '90d', 'all'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleDatePreset(preset)}
                  className="px-2 py-0.5 text-[11px] font-medium uppercase bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                >
                  {preset}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] text-slate-400">From</span>
                <input
                  type="datetime-local"
                  value={filters.date_from ? filters.date_from.slice(0, 16) : ''}
                  onChange={(e) =>
                    onChange({
                      date_from: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                      page: 1,
                    })
                  }
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">To</span>
                <input
                  type="datetime-local"
                  value={filters.date_to ? filters.date_to.slice(0, 16) : ''}
                  onChange={(e) =>
                    onChange({
                      date_to: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                      page: 1,
                    })
                  }
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Risk Level & Score */}
          <div className="space-y-2 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Risk Band & Score
            </label>
            <div className="flex flex-wrap gap-1">
              {RISK_LEVELS.map((lvl) => {
                const isSelected = (filters.risk_levels || []).includes(lvl);
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleToggleRiskLevel(lvl)}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded border transition-colors ${
                      isSelected
                        ? lvl === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : lvl === 'HIGH'
                          ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                          : lvl === 'MEDIUM'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] text-slate-400">Min Risk (0-100)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.risk_min ?? ''}
                  onChange={(e) =>
                    onChange({
                      risk_min: e.target.value ? Math.max(0, Math.min(100, Number(e.target.value))) : undefined,
                      page: 1,
                    })
                  }
                  placeholder="0"
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Max Risk (0-100)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.risk_max ?? ''}
                  onChange={(e) =>
                    onChange({
                      risk_max: e.target.value ? Math.max(0, Math.min(100, Number(e.target.value))) : undefined,
                      page: 1,
                    })
                  }
                  placeholder="100"
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Amount & Location */}
          <div className="space-y-2 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Amount & Geography
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400">Min Amount</span>
                <input
                  type="number"
                  value={filters.min_amount ?? ''}
                  onChange={(e) =>
                    onChange({
                      min_amount: e.target.value ? Number(e.target.value) : undefined,
                      page: 1,
                    })
                  }
                  placeholder="0"
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Max Amount</span>
                <input
                  type="number"
                  value={filters.max_amount ?? ''}
                  onChange={(e) =>
                    onChange({
                      max_amount: e.target.value ? Number(e.target.value) : undefined,
                      page: 1,
                    })
                  }
                  placeholder="Max"
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] text-slate-400">Country</span>
                <input
                  type="text"
                  value={filters.country ?? ''}
                  onChange={(e) => onChange({ country: e.target.value || undefined, page: 1 })}
                  placeholder="e.g. PK, US"
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">City</span>
                <input
                  type="text"
                  value={filters.city ?? ''}
                  onChange={(e) => onChange({ city: e.target.value || undefined, page: 1 })}
                  placeholder="e.g. Lahore"
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Status, Severity & Sort By */}
          <div className="space-y-2 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
              Sorting & Lifecycle
            </label>
            <div>
              <span className="text-[10px] text-slate-400">Sort By</span>
              <select
                value={filters.sort_by || 'relevance'}
                onChange={(e) => onChange({ sort_by: e.target.value as any, page: 1 })}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 focus:ring-1 focus:ring-cyan-500"
              >
                <option value="relevance">Most Relevant (Score / Exact Match)</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="risk_desc">Highest Risk Score</option>
                <option value="amount_desc">Highest Transaction Amount</option>
              </select>
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Status Filter</span>
              <div className="flex flex-wrap gap-1 mt-1 max-h-16 overflow-y-auto">
                {STATUSES.map((st) => {
                  const isSelected = (filters.statuses || []).includes(st);
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleToggleStatus(st)}
                      className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
