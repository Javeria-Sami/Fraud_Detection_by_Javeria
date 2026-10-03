import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown } from 'lucide-react';

interface AlertsPaginationProps {
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading: boolean;
}

export const AlertsPagination: React.FC<AlertsPaginationProps> = ({
  currentPage,
  pageSize,
  totalRecords,
  totalPages,
  onPageChange,
  onPageSizeChange,
  isLoading,
}) => {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, currentPage), safeTotalPages);

  const startItem = totalRecords === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalRecords);

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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-soc-card border border-soc-border p-4 rounded-xl shadow-sm text-xs text-slate-300">
      {/* Range and count */}
      <div className="flex items-center gap-4">
        <div className="font-mono text-[11px] text-slate-400">
          Showing <strong className="text-white">{startItem.toLocaleString()}</strong> to{' '}
          <strong className="text-white">{endItem.toLocaleString()}</strong> of{' '}
          <strong className="text-white">{totalRecords.toLocaleString()}</strong> alerts
        </div>

        {/* Page size dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px]">Per page:</span>
          <div className="relative inline-flex items-center">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={isLoading}
              className="appearance-none bg-soc-bg border border-soc-border rounded-lg pl-2.5 pr-7 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono cursor-pointer disabled:opacity-50"
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

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safePage <= 1 || isLoading}
          className="p-1.5 rounded-lg bg-soc-surface border border-soc-border hover:bg-soc-cardHover text-soc-muted hover:text-soc-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="First Page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1 || isLoading}
          className="p-1.5 rounded-lg bg-soc-surface border border-soc-border hover:bg-soc-cardHover text-soc-muted hover:text-soc-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Numbered Page Buttons */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`alerts-ell-${idx}`} className="px-1.5 text-slate-400 font-mono text-xs select-none">
                  ...
                </span>
              );
            }
            const pageNum = Number(p);
            const isActive = pageNum === safePage;
            return (
              <button
                key={`alerts-page-${pageNum}`}
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
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= safeTotalPages || isLoading}
          className="p-1.5 rounded-lg bg-soc-surface border border-soc-border hover:bg-soc-cardHover text-soc-muted hover:text-soc-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Next Page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={safePage >= safeTotalPages || isLoading}
          className="p-1.5 rounded-lg bg-soc-surface border border-soc-border hover:bg-soc-cardHover text-soc-muted hover:text-soc-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Last Page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
