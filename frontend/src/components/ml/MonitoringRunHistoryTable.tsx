import React from 'react';
import { MonitoringRunItem } from '../../types';
import { Clock, Eye, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';

interface Props {
  runs: MonitoringRunItem[];
  onSelectRun: (runId: string) => void;
  isLoading?: boolean;
}

export const MonitoringRunHistoryTable: React.FC<Props> = ({ runs, onSelectRun, isLoading }) => {
  return (
    <div className="bg-soc-card border border-soc-border rounded-2xl overflow-hidden shadow-xl">
      <div className="p-5 border-b border-soc-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <span>Auditable Monitoring Run History</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable snapshots of historical drift evaluations, data quality audits, and operational health verdicts
          </p>
        </div>
        <span className="text-xs text-slate-400 font-mono">{runs.length} Runs Recorded</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-soc-bg/90 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-soc-border">
            <tr>
              <th className="py-3 px-4">Run ID</th>
              <th className="py-3 px-4">Model & Feature Version</th>
              <th className="py-3 px-4">Monitoring Window</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Records</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-soc-border/60 font-mono">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading monitoring runs...</span>
                  </div>
                </td>
              </tr>
            ) : runs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                  No monitoring runs recorded yet. Trigger a manual run to evaluate operational health.
                </td>
              </tr>
            ) : (
              runs.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-purple-400 font-mono text-[11px]">
                    {r.id.slice(0, 14)}...
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <div className="flex items-center gap-1.5 font-sans">
                      <span className="font-mono text-purple-300 font-semibold">{r.model_version || 'Active Model'}</span>
                      <span className="text-slate-500">•</span>
                      <span className="font-mono text-slate-400 text-[11px]">{r.feature_version}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px] font-sans">
                    {r.monitoring_window_start && r.monitoring_window_end ? (
                      <span>
                        {new Date(r.monitoring_window_start).toLocaleDateString()} -{' '}
                        {new Date(r.monitoring_window_end).toLocaleDateString()}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        r.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : r.status === 'PARTIAL'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : r.status === 'RUNNING'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white font-bold">{r.records_evaluated}</td>
                  <td className="py-3 px-4 text-cyan-400">{r.duration_ms ? `${r.duration_ms} ms` : '—'}</td>
                  <td className="py-3 px-4 text-slate-400 font-sans text-[11px]">
                    {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onSelectRun(r.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Inspect</span>
                    </button>
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
