import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown } from 'lucide-react';

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
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);

  const startRecord = totalRecords === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endRecord = Math.min(safePage * pageSize, totalRecords);

  // Generate page numbers for direct click navigation
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (safeTotalPages <= 7) {
      for (let i = 1; i <= safeTotalPages; i++) pages.push(i);
    } else {
      if (safePage <= 3) {
        pages.push(1, 2, 3, 4, '...', safeTotalPages);
      } else if (safePage >= safeTotalPages - 2) {
        pages.push(1, '...', safeTotalPages - 3, safeTotalPages - 2, safeTotalPages - 1, safeTotalPages);
      } else {
        pages.push(1, '...', safePage - 1, safePage, safePage + 1, '...', safeTotalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-soc-card border border-soc-border rounded-xl text-xs text-soc-muted shadow-md">
      {/* Records Count & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-4">
        <div>
          Showing <span className="font-semibold text-soc-foreground font-mono">{startRecord}</span> to{' '}
          <span className="font-semibold text-soc-foreground font-mono">{endRecord}</span> of{' '}
          <span className="font-semibold text-soc-foreground font-mono">{totalRecords.toLocaleString()}</span> records
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-soc-muted">Per page:</span>
          <div className="relative inline-flex items-center">
            <select
              value={pageSize}
              disabled={isLoading}
              onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
              className="appearance-none bg-soc-bg border border-soc-border rounded-lg pl-2.5 pr-7 py-1 text-xs text-soc-foreground focus:outline-none focus:border-blue-500 font-mono transition-colors cursor-pointer disabled:opacity-50"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Page Navigation Controls */}
      <div className="flex items-center gap-1.5 self-end md:self-auto flex-wrap">
        {/* First Page */}
        <button
          type="button"
          disabled={safePage <= 1 || isLoading}
          onClick={() => onPageChange(1)}
          className="p-1.5 rounded-lg border border-soc-border bg-soc-surface hover:bg-soc-cardHover disabled:opacity-40 disabled:cursor-not-allowed text-soc-muted hover:text-soc-foreground transition-colors"
          title="First Page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          disabled={safePage <= 1 || isLoading}
          onClick={() => onPageChange(safePage - 1)}
          className="p-1.5 rounded-lg border border-soc-border bg-soc-surface hover:bg-soc-cardHover disabled:opacity-40 disabled:cursor-not-allowed text-soc-muted hover:text-soc-foreground transition-colors"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Numbered Page Buttons */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400 font-mono text-xs select-none">
                  ...
                </span>
              );
            }
            const pageNum = Number(p);
            const isActive = pageNum === safePage;
            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                disabled={isLoading}
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[28px] h-7 px-2 flex items-center justify-center rounded-lg border font-mono text-xs transition-all ${
                  isActive
                    ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-sm shadow-blue-500/20'
                    : 'bg-soc-surface border-soc-border text-soc-foreground hover:bg-soc-cardHover hover:border-slate-400 dark:hover:border-slate-600'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          disabled={safePage >= safeTotalPages || isLoading}
          onClick={() => onPageChange(safePage + 1)}
          className="p-1.5 rounded-lg border border-soc-border bg-soc-surface hover:bg-soc-cardHover disabled:opacity-40 disabled:cursor-not-allowed text-soc-muted hover:text-soc-foreground transition-colors"
          title="Next Page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          disabled={safePage >= safeTotalPages || isLoading}
          onClick={() => onPageChange(safeTotalPages)}
          className="p-1.5 rounded-lg border border-soc-border bg-soc-surface hover:bg-soc-cardHover disabled:opacity-40 disabled:cursor-not-allowed text-soc-muted hover:text-soc-foreground transition-colors"
          title="Last Page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
