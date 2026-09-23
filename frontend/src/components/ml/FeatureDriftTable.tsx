import React, { useState } from 'react';
import { FeatureDriftItem } from '../../types';
import { Activity, Search, Filter, ArrowUpDown } from 'lucide-react';
import { ModelHealthBadge } from './ModelHealthBadge';

interface Props {
  driftResults: FeatureDriftItem[];
  isLoading?: boolean;
}

export const FeatureDriftTable: React.FC<Props> = ({ driftResults, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'name' | 'drift' | 'status'>('drift');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = driftResults.filter((item) => {
    const matchSearch = item.feature_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortField === 'name') {
      return sortAsc ? a.feature_name.localeCompare(b.feature_name) : b.feature_name.localeCompare(a.feature_name);
    }
    if (sortField === 'drift') {
      return sortAsc ? a.drift_value - b.drift_value : b.drift_value - a.drift_value;
    }
    if (sortField === 'status') {
      return sortAsc ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
    }
    return 0;
  });

  const toggleSort = (field: 'name' | 'drift' | 'status') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="bg-soc-card border border-soc-border rounded-2xl overflow-hidden shadow-xl">
      {/* Header & Controls */}
      <div className="p-5 border-b border-soc-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <span>Feature Drift Matrix</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Statistical divergence between reference baseline and active monitoring window (PSI / KS-Test)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter feature..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-soc-bg border border-soc-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 w-40 sm:w-48"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-soc-bg border border-soc-border rounded-xl p-1 text-xs">
            <Filter className="w-3 h-3 text-slate-400 ml-1.5 mr-1" />
            {['ALL', 'NORMAL', 'WARNING', 'CRITICAL'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-soc-bg/90 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-soc-border">
            <tr>
              <th
                onClick={() => toggleSort('name')}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Feature</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Method</th>
              <th
                onClick={() => toggleSort('drift')}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Drift Value</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Threshold</th>
              <th className="py-3 px-4">Reference vs Current Mean</th>
              <th className="py-3 px-4">Reference vs Current Null Rate</th>
              <th
                onClick={() => toggleSort('status')}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-soc-border/60 font-mono">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <span>Evaluating feature drift metrics...</span>
                  </div>
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No feature drift records found matching the current criteria.
                </td>
              </tr>
            ) : (
              sorted.map((item, idx) => (
                <tr key={item.id || `${item.feature_name}-${idx}`} className="hover:bg-slate-800/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      <span>{item.feature_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px] font-sans">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">
                      {item.drift_method}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          item.status === 'CRITICAL'
                            ? 'text-rose-400'
                            : item.status === 'WARNING'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }
                      >
                        {item.drift_value.toFixed(4)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    &lt; {item.threshold.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-slate-300 text-[11px]">
                    {item.reference_mean !== undefined && item.current_mean !== undefined ? (
                      <span className="flex items-center gap-1.5 font-sans">
                        <span className="text-slate-400">{item.reference_mean.toFixed(2)}</span>
                        <span className="text-slate-600">→</span>
                        <span className="font-semibold text-white">{item.current_mean.toFixed(2)}</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-300 text-[11px]">
                    {item.reference_null_rate !== undefined && item.current_null_rate !== undefined ? (
                      <span className="flex items-center gap-1.5 font-sans">
                        <span className="text-slate-400">{(item.reference_null_rate * 100).toFixed(1)}%</span>
                        <span className="text-slate-600">→</span>
                        <span
                          className={`font-semibold ${
                            item.current_null_rate > 0.05 ? 'text-amber-400' : 'text-slate-200'
                          }`}
                        >
                          {(item.current_null_rate * 100).toFixed(1)}%
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <ModelHealthBadge status={item.status} size="sm" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
