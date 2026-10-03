import React, { useState } from 'react';
import { Calendar, Filter, RotateCcw, RefreshCw, DollarSign, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { AnalyticsFilterParams } from '../../types';

interface AnalyticsFiltersProps {
  filters: AnalyticsFilterParams;
  onChange: (updated: Partial<AnalyticsFilterParams>) => void;
  onRefresh: () => void;
  isLoading: boolean;
  lastUpdated: string;
}

const RANGE_PRESETS: { key: string; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: '90d', label: 'Last 90 Days' },
  { key: 'this_month', label: 'This Month' },
  { key: 'previous_month', label: 'Previous Month' },
  { key: 'custom', label: 'Custom Range' },
];

const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES = ['COMPLETED', 'PENDING', 'FAILED', 'DECLINED', 'BLOCKED'];

export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  filters,
  onChange,
  onRefresh,
  isLoading,
  lastUpdated,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const activeRange = filters.range || '30d';

  const handleRangeClick = (rangeKey: string) => {
    if (rangeKey === 'custom') {
      setIsExpanded(true);
      onChange({ range: 'custom' });
    } else {
      onChange({ range: rangeKey, date_from: undefined, date_to: undefined });
    }
  };

  const hasAdvancedFilters = !!(
    filters.currency ||
    filters.status ||
    filters.risk_level ||
    filters.severity ||
    filters.merchant ||
    filters.device_id ||
    filters.user_id ||
    filters.range === 'custom'
  );

  const handleReset = () => {
    onChange({
      range: '30d',
      date_from: undefined,
      date_to: undefined,
      currency: undefined,
      status: undefined,
      risk_level: undefined,
      severity: undefined,
      merchant: undefined,
      device_id: undefined,
      user_id: undefined,
    });
  };

  return (
    <div className="bg-soc-card border border-soc-border rounded-2xl p-4 shadow-sm space-y-3">
      {/* Top Presets & Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 text-xs font-bold text-soc-muted uppercase tracking-wider mr-1">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>Range:</span>
          </div>
          {RANGE_PRESETS.map((p) => {
            const isActive = activeRange === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => handleRangeClick(p.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-soc-surface text-soc-muted hover:text-soc-foreground hover:bg-soc-card border border-soc-border'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 shadow-sm ${
              isExpanded || hasAdvancedFilters
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                : 'bg-soc-surface text-soc-foreground border-soc-border hover:border-blue-400'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {hasAdvancedFilters && (
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            )}
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {hasAdvancedFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl transition-colors shadow-sm"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="px-3.5 py-1.5 bg-soc-surface hover:bg-soc-card disabled:opacity-50 text-soc-foreground border border-soc-border hover:border-blue-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-500' : 'text-blue-500'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Advanced Filter Collapse */}
      {isExpanded && (
        <div className="pt-3 border-t border-soc-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 animate-fadeIn text-xs">
          {/* Custom Date Bounds */}
          <div className="space-y-1 bg-soc-surface p-2.5 rounded-xl border border-soc-border">
            <span className="text-[11px] font-bold text-soc-foreground">Custom Date Boundaries</span>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <div>
                <span className="text-[10px] text-soc-muted block">Start (UTC)</span>
                <input
                  type="datetime-local"
                  value={filters.date_from ? filters.date_from.slice(0, 16) : ''}
                  onChange={(e) =>
                    onChange({
                      range: 'custom',
                      date_from: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                    })
                  }
                  className="w-full px-2 py-1 bg-soc-bg border border-soc-border rounded text-xs text-soc-foreground focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-soc-muted block">End (UTC)</span>
                <input
                  type="datetime-local"
                  value={filters.date_to ? filters.date_to.slice(0, 16) : ''}
                  onChange={(e) =>
                    onChange({
                      range: 'custom',
                      date_to: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                    })
                  }
                  className="w-full px-2 py-1 bg-soc-bg border border-soc-border rounded text-xs text-soc-foreground focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Currency & Status */}
          <div className="space-y-1 bg-soc-surface p-2.5 rounded-xl border border-soc-border">
            <span className="text-[11px] font-bold text-soc-foreground">Currency & Status</span>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <div>
                <span className="text-[10px] text-soc-muted block">Currency</span>
                <select
                  value={filters.currency || 'ALL'}
                  onChange={(e) => onChange({ currency: e.target.value === 'ALL' ? undefined : e.target.value })}
                  className="w-full px-2 py-1 bg-soc-bg border border-soc-border rounded text-xs text-soc-foreground focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Currencies</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="PKR">PKR (₨)</option>
                </select>
              </div>
              <div>
                <span className="text-[10px] text-soc-muted block">Txn Status</span>
                <select
                  value={filters.status || 'ALL'}
                  onChange={(e) => onChange({ status: e.target.value === 'ALL' ? undefined : e.target.value })}
                  className="w-full px-2 py-1 bg-soc-bg border border-soc-border rounded text-xs text-soc-foreground focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Statuses</option>
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Risk Level & Severity */}
          <div className="space-y-1 bg-soc-surface p-2.5 rounded-xl border border-soc-border">
            <span className="text-[11px] font-bold text-soc-foreground">Risk & Severity</span>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <div>
                <span className="text-[10px] text-soc-muted block">Risk Tier</span>
                <select
                  value={filters.risk_level || 'ALL'}
                  onChange={(e) => onChange({ risk_level: e.target.value === 'ALL' ? undefined : e.target.value })}
                  className="w-full px-2 py-1 bg-soc-bg border border-soc-border rounded text-xs text-soc-foreground focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Risk Tiers</option>
                  {RISK_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
              <div>
                <span className="text-[10px] text-soc-muted block">Severity</span>
                <select
                  value={filters.severity || 'ALL'}
                  onChange={(e) => onChange({ severity: e.target.value === 'ALL' ? undefined : e.target.value })}
                  className="w-full px-2 py-1 bg-soc-bg border border-soc-border rounded text-xs text-soc-foreground focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Severities</option>
                  {RISK_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Merchant / Identifier Filter */}
          <div className="space-y-1 bg-soc-surface p-2.5 rounded-xl border border-soc-border">
            <span className="text-[11px] font-bold text-soc-foreground">Entity Substrings</span>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <div>
                <span className="text-[10px] text-soc-muted block">Merchant Name</span>
                <input
                  type="text"
                  placeholder="Filter merchant..."
                  value={filters.merchant || ''}
                  onChange={(e) => onChange({ merchant: e.target.value || undefined })}
                  className="w-full px-2 py-1 bg-soc-bg border border-soc-border rounded text-xs text-soc-foreground focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-soc-muted block">User / Device ID</span>
                <input
                  type="text"
                  placeholder="ID filter..."
                  value={filters.user_id || filters.device_id || ''}
                  onChange={(e) => onChange({ user_id: e.target.value || undefined })}
                  className="w-full px-2 py-1 bg-soc-bg border border-soc-border rounded text-xs text-soc-foreground focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Freshness Timestamp */}
      <div className="flex items-center justify-between text-[11px] text-soc-muted font-mono pt-1">
        <span>Active Scope: <strong className="text-soc-foreground">{RANGE_PRESETS.find(p => p.key === activeRange)?.label || activeRange}</strong></span>
        <span>Last Refreshed: <strong className="text-blue-600 dark:text-blue-400">{lastUpdated || 'Just now'}</strong></span>
      </div>
    </div>
  );
};
