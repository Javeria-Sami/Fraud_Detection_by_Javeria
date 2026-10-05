import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  className = '',
}) => {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, currentPage), safeTotalPages);

  if (safeTotalPages <= 1 && (!totalItems || totalItems <= pageSize)) {
    return null;
  }

  const startItem = totalItems ? Math.min((safePage - 1) * pageSize + 1, totalItems) : 0;
  const endItem = totalItems ? Math.min(safePage * pageSize, totalItems) : 0;

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
    <div className={`flex flex-wrap items-center justify-between gap-4 py-3 px-4 border-t border-soc-border text-xs text-soc-muted ${className}`}>
      {/* Items info */}
      <div className="flex items-center gap-2 font-mono text-[11px]">
        {totalItems !== undefined ? (
          <span>
            Showing <strong className="text-soc-foreground font-semibold">{startItem}–{endItem}</strong> of{' '}
            <strong className="text-soc-foreground font-semibold">{totalItems}</strong> records
          </span>
        ) : (
          <span>Page {safePage} of {safeTotalPages}</span>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          disabled={safePage <= 1}
          onClick={() => onPageChange(1)}
          aria-label="First page"
          className="p-1.5 h-8 w-8"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="Previous page"
          className="p-1.5 h-8 w-8"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>

        {/* Numbered Page Buttons */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`gen-ell-${idx}`} className="px-1.5 text-slate-400 font-mono text-xs select-none">
                  ...
                </span>
              );
            }
            const pageNum = Number(p);
            const isActive = pageNum === safePage;
            return (
              <button
                key={`gen-page-${pageNum}`}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[28px] h-8 px-2 flex items-center justify-center rounded-lg border font-mono text-xs transition-all ${
                  isActive
                    ? 'bg-soc-deepGreen border-emerald-800 text-white font-bold shadow-sm shadow-emerald-950/20'
                    : 'bg-soc-surface border-soc-border text-soc-foreground hover:bg-soc-lightGreen hover:border-emerald-600/40'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={safePage >= safeTotalPages}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="Next page"
          className="p-1.5 h-8 w-8"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={safePage >= safeTotalPages}
          onClick={() => onPageChange(safeTotalPages)}
          aria-label="Last page"
          className="p-1.5 h-8 w-8"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
