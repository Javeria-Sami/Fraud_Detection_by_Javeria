import React from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';

export interface FilterOption {
  key: string;
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}

export interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  onResetFilters?: () => void;
  activeFilterCount?: number;
  rightContent?: React.ReactNode;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filters = [],
  onResetFilters,
  activeFilterCount = 0,
  rightContent,
  className = '',
}) => {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 p-3 bg-soc-surface/60 border border-soc-border rounded-xl ${className}`}>
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
        {/* Search input */}
        {onSearchChange && (
          <div className="w-full sm:w-64">
            <Input
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              leftIcon={<Search className="w-3.5 h-3.5" />}
              className="py-1.5"
            />
          </div>
        )}

        {/* Dropdown Filters */}
        {filters.map((f) => (
          <select
            key={f.key}
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            className="rounded-lg border border-soc-border bg-soc-surface text-xs text-soc-foreground px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {f.options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-soc-card text-soc-foreground">
                {opt.label}
              </option>
            ))}
          </select>
        ))}

        {/* Clear filters button */}
        {onResetFilters && activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            leftIcon={<X className="w-3 h-3" />}
            className="text-xs text-soc-muted hover:text-rose-400"
          >
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {rightContent && (
        <div className="flex items-center gap-2 shrink-0">
          {rightContent}
        </div>
      )}
    </div>
  );
};
