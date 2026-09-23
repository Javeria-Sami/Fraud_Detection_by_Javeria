import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

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
  const startItem = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-soc-card border border-soc-border p-4 rounded-2xl shadow-sm text-xs text-slate-300">
      {/* Range and count */}
      <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
        <span>
          Showing <strong className="text-white">{startItem.toLocaleString()}</strong> to{' '}
          <strong className="text-white">{endItem.toLocaleString()}</strong> of{' '}
          <strong className="text-white">{totalRecords.toLocaleString()}</strong> alerts
        </span>
      </div>

      {/* Page Controls & Size Selector */}
      <div className="flex items-center gap-4">
        {/* Page size dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px]">Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={isLoading}
            className="bg-soc-bg border border-soc-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono disabled:opacity-50"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1 || isLoading}
            className="p-1.5 rounded-lg bg-soc-bg border border-soc-border hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="First Page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isLoading}
            className="p-1.5 rounded-lg bg-soc-bg border border-soc-border hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <span className="px-3 py-1 font-mono text-xs text-slate-300">
            Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages || 1}</strong>
          </span>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isLoading}
            className="p-1.5 rounded-lg bg-soc-bg border border-soc-border hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages || isLoading}
            className="p-1.5 rounded-lg bg-soc-bg border border-soc-border hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Last Page"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
