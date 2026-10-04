import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Calendar, RotateCcw, Shield, Layers, ChevronDown } from 'lucide-react';

export interface AlertFilterValues {
  search: string;
  severity: string;
  status: string;
  minRiskScore: string;
  maxRiskScore: string;
  startDate: string;
  endDate: string;
  assignedTo: string;
}

interface AlertFilterBarProps {
  filters: AlertFilterValues;
  onFilterChange: (newFilters: Partial<AlertFilterValues>) => void;
  onReset: () => void;
}

export const AlertFilterBar: React.FC<AlertFilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
}) => {
  const [searchInput, setSearchInput] = useState(filters.search);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Debounce search input by 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFilterChange({ search: searchInput });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  // Compute active filter chips count
  const activeChips: { key: keyof AlertFilterValues; label: string; value: string }[] = [];
  if (filters.search) activeChips.push({ key: 'search', label: 'Search', value: filters.search });
  if (filters.severity) activeChips.push({ key: 'severity', label: 'Severity', value: filters.severity });
  if (filters.status) activeChips.push({ key: 'status', label: 'Status', value: filters.status });
  if (filters.minRiskScore) activeChips.push({ key: 'minRiskScore', label: 'Min Risk', value: `${filters.minRiskScore}+` });
  if (filters.maxRiskScore) activeChips.push({ key: 'maxRiskScore', label: 'Max Risk', value: `≤${filters.maxRiskScore}` });
  if (filters.startDate) activeChips.push({ key: 'startDate', label: 'From', value: filters.startDate });
  if (filters.endDate) activeChips.push({ key: 'endDate', label: 'To', value: filters.endDate });
  if (filters.assignedTo) activeChips.push({ key: 'assignedTo', label: 'Assigned', value: filters.assignedTo });

  return (
    <div className="bg-soc-card border border-soc-border rounded-2xl p-4 space-y-3 shadow-sm">
      {/* Primary Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search Bar */}
        <div className="lg:col-span-2 relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search Alert ID, Txn ID, User, Reason..."
            className="w-full bg-soc-bg border border-soc-border rounded-xl pl-9 pr-8 py-2 text-xs text-soc-foreground placeholder:text-soc-muted focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                onFilterChange({ search: '' });
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-soc-foreground p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Severity Selector */}
        <div className="relative flex items-center">
          <select
            value={filters.severity}
            onChange={(e) => onFilterChange({ severity: e.target.value })}
            className="w-full appearance-none bg-soc-bg border border-soc-border rounded-xl pl-3 pr-9 py-2 text-xs text-soc-foreground focus:outline-none focus:border-blue-500 transition-colors cursor-pointer font-semibold"
          >
            <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Severities</option>
            <option value="CRITICAL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Critical Severity</option>
            <option value="HIGH" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">High Severity</option>
            <option value="MEDIUM" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Medium Severity</option>
            <option value="LOW" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Low Severity</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Status Selector */}
        <div className="relative flex items-center">
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            className="w-full appearance-none bg-soc-bg border border-soc-border rounded-xl pl-3 pr-9 py-2 text-xs text-soc-foreground focus:outline-none focus:border-blue-500 transition-colors cursor-pointer font-semibold"
          >
            <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Statuses</option>
            <option value="OPEN" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Open (New & Active)</option>
            <option value="NEW" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">New (Unassigned)</option>
            <option value="ACKNOWLEDGED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Acknowledged</option>
            <option value="INVESTIGATING" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Investigating</option>
            <option value="ESCALATED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Escalated</option>
            <option value="RESOLVED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Resolved</option>
            <option value="DISMISSED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Dismissed (False Positive)</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Advanced Filters Toggle & Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
              showAdvanced || activeChips.length > 2
                ? 'bg-blue-600/15 border-blue-500/40 text-blue-600 dark:text-blue-400'
                : 'bg-soc-surface border-soc-border text-soc-muted hover:text-soc-foreground hover:bg-soc-cardHover shadow-sm'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters {activeChips.length > 0 && `(${activeChips.length})`}</span>
          </button>

          {activeChips.length > 0 && (
            <button
              onClick={onReset}
              className="p-2 rounded-xl bg-soc-surface border border-soc-border hover:bg-soc-cardHover text-soc-muted hover:text-rose-500 transition-colors shadow-sm"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Collapse */}
      {showAdvanced && (
        <div className="pt-3 border-t border-soc-border/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Min Risk Score */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">Min Risk Score (0-100)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={filters.minRiskScore}
              onChange={(e) => onFilterChange({ minRiskScore: e.target.value })}
              placeholder="e.g. 70"
              className="w-full bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Max Risk Score */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">Max Risk Score (0-100)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={filters.maxRiskScore}
              onChange={(e) => onFilterChange({ maxRiskScore: e.target.value })}
              placeholder="e.g. 100"
              className="w-full bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">From Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => onFilterChange({ startDate: e.target.value })}
              className="w-full bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">To Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => onFilterChange({ endDate: e.target.value })}
              className="w-full bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-mono text-slate-400">Active Filters:</span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-soc-bg border border-soc-border text-xs font-medium text-slate-200"
            >
              <span className="text-slate-400">{chip.label}:</span>
              <span className="font-semibold text-blue-400">{chip.value}</span>
              <button
                onClick={() => onFilterChange({ [chip.key]: '' })}
                className="text-slate-400 hover:text-white ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={onReset}
            className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 ml-1 underline cursor-pointer"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
};
