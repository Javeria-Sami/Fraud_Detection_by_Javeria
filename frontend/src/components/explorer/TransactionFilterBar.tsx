import React, { useState, useEffect } from 'react';
import { Search, Calendar, Filter, X, RotateCcw, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';

export interface FilterValues {
  search: string;
  risk_level: string;
  status: string;
  currency: string;
  min_amount: string;
  max_amount: string;
  start_date: string;
  end_date: string;
}

export interface TransactionFilterBarProps {
  filters: FilterValues;
  onFilterChange: (newFilters: Partial<FilterValues>) => void;
  onReset: () => void;
  isLoading?: boolean;
}

export const TransactionFilterBar: React.FC<TransactionFilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  isLoading = false,
}) => {
  const [searchInput, setSearchInput] = useState(filters.search);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFilterChange({ search: searchInput });
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput, filters.search, onFilterChange]);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  // Active filters list
  const activeChips: { key: keyof FilterValues; label: string; value: string }[] = [];
  if (filters.search) activeChips.push({ key: 'search', label: 'Search', value: filters.search });
  if (filters.risk_level) activeChips.push({ key: 'risk_level', label: 'Risk Tier', value: filters.risk_level });
  if (filters.status) activeChips.push({ key: 'status', label: 'Status', value: filters.status });
  if (filters.currency) activeChips.push({ key: 'currency', label: 'Currency', value: filters.currency });
  if (filters.min_amount) activeChips.push({ key: 'min_amount', label: 'Min Amount', value: `$${filters.min_amount}` });
  if (filters.max_amount) activeChips.push({ key: 'max_amount', label: 'Max Amount', value: `$${filters.max_amount}` });
  if (filters.start_date) activeChips.push({ key: 'start_date', label: 'From', value: filters.start_date });
  if (filters.end_date) activeChips.push({ key: 'end_date', label: 'To', value: filters.end_date });

  return (
    <div className="space-y-3 bg-soc-card border border-soc-border p-4 rounded-xl shadow-md">
      {/* Primary Bar: Search + Quick Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        {/* Search */}
        <div className="lg:col-span-5 relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by Transaction ID, User, Merchant, Device..."
            className="w-full bg-soc-bg border border-soc-border rounded-lg pl-9 pr-8 py-2 text-xs text-soc-foreground placeholder:text-soc-muted focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                onFilterChange({ search: '' });
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Risk Level */}
        <div className="lg:col-span-3 relative flex items-center">
          <select
            value={filters.risk_level}
            onChange={(e) => onFilterChange({ risk_level: e.target.value })}
            className="w-full appearance-none bg-soc-bg border border-soc-border rounded-lg pl-3 pr-9 py-2 text-xs text-soc-foreground focus:outline-none focus:border-blue-500 font-sans cursor-pointer"
          >
            <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Risk Tiers</option>
            <option value="CRITICAL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Critical Risk (90–100)</option>
            <option value="HIGH" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">High Risk (70–89)</option>
            <option value="MEDIUM" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Medium Risk (40–69)</option>
            <option value="LOW" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Low Risk (0–39)</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Status */}
        <div className="lg:col-span-2 relative flex items-center">
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            className="w-full appearance-none bg-soc-bg border border-soc-border rounded-lg pl-3 pr-9 py-2 text-xs text-soc-foreground focus:outline-none focus:border-blue-500 font-sans cursor-pointer"
          >
            <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Statuses</option>
            <option value="APPROVED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Approved</option>
            <option value="REVIEW_REQUIRED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Review Required</option>
            <option value="FLAGGED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Flagged</option>
            <option value="BLOCKED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Blocked</option>
            <option value="PENDING" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Pending</option>
            <option value="COMPLETED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Completed</option>
            <option value="FAILED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Failed</option>
            <option value="DECLINED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Declined</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Advanced Filters Toggle */}
        <div className="lg:col-span-2 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`w-full text-xs flex items-center justify-center gap-1.5 ${
              showAdvanced || activeChips.length > 2 ? 'border-blue-500/40 text-blue-400 bg-blue-500/10' : ''
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters {activeChips.length > 0 && `(${activeChips.length})`}</span>
          </Button>
        </div>
      </div>

      {/* Advanced Expandable Filters Panel */}
      {showAdvanced && (
        <div className="pt-3 mt-3 border-t border-soc-border/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Date Start */}
          <div>
            <label className="text-[11px] font-semibold text-soc-muted block mb-1">From Date</label>
            <div className="relative">
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => onFilterChange({ start_date: e.target.value })}
                className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-1.5 text-xs text-soc-foreground focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Date End */}
          <div>
            <label className="text-[11px] font-semibold text-soc-muted block mb-1">To Date</label>
            <div className="relative">
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => onFilterChange({ end_date: e.target.value })}
                className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-1.5 text-xs text-soc-foreground focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Amount Range */}
          <div>
            <label className="text-[11px] font-semibold text-soc-muted block mb-1">Amount Range ($)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                min="0"
                value={filters.min_amount}
                onChange={(e) => onFilterChange({ min_amount: e.target.value })}
                className="w-1/2 bg-soc-bg border border-soc-border rounded-lg px-2.5 py-1.5 text-xs text-soc-foreground focus:outline-none focus:border-blue-500"
              />
              <span className="text-slate-500">-</span>
              <input
                type="number"
                placeholder="Max"
                min="0"
                value={filters.max_amount}
                onChange={(e) => onFilterChange({ max_amount: e.target.value })}
                className="w-1/2 bg-soc-bg border border-soc-border rounded-lg px-2.5 py-1.5 text-xs text-soc-foreground focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="text-[11px] font-semibold text-soc-muted block mb-1">Currency</label>
            <div className="relative flex items-center">
              <select
                value={filters.currency}
                onChange={(e) => onFilterChange({ currency: e.target.value })}
                className="w-full appearance-none bg-soc-bg border border-soc-border rounded-lg pl-3 pr-8 py-1.5 text-xs text-soc-foreground focus:outline-none focus:border-blue-500 font-mono cursor-pointer"
              >
                <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Currencies</option>
                <option value="USD" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">USD ($)</option>
                <option value="EUR" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">EUR (€)</option>
                <option value="GBP" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">GBP (£)</option>
                <option value="CAD" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">CAD ($)</option>
                <option value="AUD" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">AUD ($)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Chips Bar */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-soc-border/40 text-xs">
          <span className="text-[11px] font-semibold text-soc-muted">Active Filters:</span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-mono"
            >
              <span>{chip.label}: {chip.value}</span>
              <button
                type="button"
                onClick={() => onFilterChange({ [chip.key]: '' })}
                className="hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          <button
            type="button"
            onClick={onReset}
            className="text-[11px] text-slate-400 hover:text-rose-400 font-semibold ml-auto flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
        </div>
      )}
    </div>
  );
};
