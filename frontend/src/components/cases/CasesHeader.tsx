import React from 'react';
import { FolderLock, Plus, RefreshCw, Radio } from 'lucide-react';

interface CasesHeaderProps {
  onRefresh: () => void;
  onCreateCase: () => void;
  isLoading: boolean;
  totalCount: number;
}

export const CasesHeader: React.FC<CasesHeaderProps> = ({
  onRefresh,
  onCreateCase,
  isLoading,
  totalCount,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-soc-card border border-soc-border p-5 rounded-2xl shadow-lg relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none" />

      <div className="flex items-center gap-4">
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
          <FolderLock className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Case Management Workspace
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>LIVE SOC</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Formal fraud investigation lifecycles, linked security alerts, transaction evidence, and verified outcome adjudication.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors border border-slate-700/60 disabled:opacity-50"
          title="Refresh Cases"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh</span>
        </button>

        <button
          onClick={onCreateCase}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Investigation</span>
        </button>
      </div>
    </div>
  );
};
