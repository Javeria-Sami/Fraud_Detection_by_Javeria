import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface TransactionPaginationProps {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
  isLoading?: boolean;
}

export const TransactionPagination: React.FC<TransactionPaginationProps> = ({
  page,
  pageSize,
  totalRecords,
  totalPages,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
}) => {
  const startRecord = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalRecords);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-soc-card border border-soc-border rounded-xl text-xs text-soc-muted shadow-md">
      {/* Records Count & Page Size Selector */}
      <div className="flex items-center gap-4">
        <div>
          Showing <span className="font-semibold text-soc-foreground font-mono">{startRecord}</span> to{' '}
          <span className="font-semibold text-soc-foreground font-mono">{endRecord}</span> of{' '}
          <span className="font-semibold text-soc-foreground font-mono">{totalRecords.toLocaleString()}</span> records
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-soc-muted">Per page:</span>
          <select
            value={pageSize}
            disabled={isLoading}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
            className="bg-soc-bg border border-soc-border rounded-lg px-2 py-1 text-xs text-soc-foreground focus:outline-none focus:border-blue-500 font-mono"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Page Navigation Controls */}
      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <button
          type="button"
          disabled={page <= 1 || isLoading}
          onClick={() => onPageChange(1)}
          className="p-1.5 rounded-lg border border-soc-border bg-soc-bg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors"
          title="First Page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          disabled={page <= 1 || isLoading}
          onClick={() => onPageChange(page - 1)}
          className="p-1.5 rounded-lg border border-soc-border bg-soc-bg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <span className="px-3 py-1 font-mono text-xs text-soc-foreground bg-soc-bg border border-soc-border rounded-lg">
          Page {page} of {totalPages || 1}
        </span>

        <button
          type="button"
          disabled={page >= totalPages || isLoading}
          onClick={() => onPageChange(page + 1)}
          className="p-1.5 rounded-lg border border-soc-border bg-soc-bg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors"
          title="Next Page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          disabled={page >= totalPages || isLoading}
          onClick={() => onPageChange(totalPages)}
          className="p-1.5 rounded-lg border border-soc-border bg-soc-bg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors"
          title="Last Page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
