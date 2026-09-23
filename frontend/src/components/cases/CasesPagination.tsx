import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CasesPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
}

export const CasesPagination: React.FC<CasesPaginationProps> = ({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}) => {
  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 bg-soc-card border border-soc-border p-3.5 rounded-xl">
      <div className="flex items-center gap-3">
        <span>
          Showing <span className="font-mono font-semibold text-white">{startIdx}</span> to{' '}
          <span className="font-mono font-semibold text-white">{endIdx}</span> of{' '}
          <span className="font-mono font-semibold text-white">{total.toLocaleString()}</span> cases
        </span>

        <div className="flex items-center gap-1.5 pl-3 border-l border-slate-700">
          <span>Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-indigo-500 font-mono text-xs cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 font-medium transition-colors border border-slate-700"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <span className="px-2 font-mono font-medium text-white">
          Page {page} of {totalPages || 1}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || totalPages === 0}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 font-medium transition-colors border border-slate-700"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
