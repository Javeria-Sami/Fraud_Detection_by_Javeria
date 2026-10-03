import React from 'react';
import { Search, Filter, X, RotateCcw } from 'lucide-react';

interface CaseFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  severityFilter: string;
  onSeverityChange: (val: string) => void;
  analystFilter: string;
  onAnalystChange: (val: string) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export const CaseFilterBar: React.FC<CaseFilterBarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  severityFilter,
  onSeverityChange,
  analystFilter,
  onAnalystChange,
  onResetFilters,
  hasActiveFilters,
}) => {
  return (
    <div className="bg-soc-card border border-soc-border p-4 rounded-xl space-y-3">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Case ID, Title, User ID, Description, or Analyst..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-soc-bg border border-soc-border rounded-xl text-xs text-soc-foreground placeholder:text-soc-muted focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-soc-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 bg-soc-bg border border-soc-border rounded-xl px-3 py-1.5 text-xs">
            <span className="text-soc-muted text-[11px] font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              className="bg-transparent text-soc-foreground focus:outline-none text-xs cursor-pointer font-semibold"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="PENDING">PENDING</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          {/* Severity filter */}
          <div className="flex items-center gap-1.5 bg-soc-bg border border-soc-border rounded-xl px-3 py-1.5 text-xs">
            <span className="text-soc-muted text-[11px] font-medium">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => onSeverityChange(e.target.value)}
              className="bg-transparent text-soc-foreground focus:outline-none text-xs cursor-pointer font-semibold"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          {/* Analyst filter */}
          <div className="flex items-center gap-1.5 bg-soc-bg border border-soc-border rounded-xl px-3 py-1.5 text-xs">
            <span className="text-soc-muted text-[11px] font-medium">Analyst:</span>
            <select
              value={analystFilter}
              onChange={(e) => onAnalystChange(e.target.value)}
              className="bg-transparent text-soc-foreground focus:outline-none text-xs cursor-pointer font-semibold max-w-[130px] truncate"
            >
              <option value="">All Analysts</option>
              <option value="UNASSIGNED">Unassigned</option>
              <option value="analyst@fraudshield.io">analyst@fraudshield.io</option>
              <option value="admin@fraudshield.io">admin@fraudshield.io</option>
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-soc-surface hover:bg-soc-cardHover text-soc-muted hover:text-soc-foreground text-xs font-semibold transition-colors border border-soc-border shadow-sm"
              title="Reset all active filters"
            >
              <RotateCcw className="w-3.5 h-3.5 text-soc-muted" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800 text-xs">
          <span className="text-[11px] text-slate-400 font-medium">Active Filters:</span>
          {search && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs">
              Search: "{search}"
              <button onClick={() => onSearchChange('')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {statusFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs">
              Status: {statusFilter}
              <button onClick={() => onStatusChange('')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {severityFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              Severity: {severityFilter}
              <button onClick={() => onSeverityChange('')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {analystFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs">
              Analyst: {analystFilter}
              <button onClick={() => onAnalystChange('')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
