import React from 'react';
import { X, ArrowRightLeft, ShieldCheck, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { RetrainingRunItem } from '../../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  run: RetrainingRunItem | null;
}

export const ModelComparisonModal: React.FC<Props> = ({ isOpen, onClose, run }) => {
  if (!isOpen || !run) return null;

  const comp = run.model_comparison || {};
  const candDist = comp.score_distribution_comparison?.candidate || {};
  const actDist = comp.score_distribution_comparison?.active || {};
  const candMetrics = comp.metrics_comparison?.candidate || {};
  const actMetrics = comp.metrics_comparison?.active || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-soc-card border border-soc-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-soc-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ArrowRightLeft className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                Candidate vs Active Model Comparison
              </h3>
              <p className="text-[11px] text-slate-400">
                Objective statistical comparison on identical test data partition
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Comparison Table */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs font-sans">
          <div className="overflow-x-auto rounded-xl border border-soc-border">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-soc-bg text-slate-400 uppercase text-[10px] tracking-wider border-b border-soc-border">
                <tr>
                  <th className="py-3 px-4 font-sans font-semibold">Evaluation Dimension</th>
                  <th className="py-3 px-4 text-emerald-400">Active Production Model</th>
                  <th className="py-3 px-4 text-purple-400">Candidate Model</th>
                  <th className="py-3 px-4 text-right">Delta / Stability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soc-border/60">
                <tr>
                  <td className="py-3 px-4 font-sans text-slate-300 font-bold">Model Version</td>
                  <td className="py-3 px-4 text-emerald-400 font-semibold">{comp.active_version || 'None'}</td>
                  <td className="py-3 px-4 text-purple-400 font-semibold">{comp.candidate_version || run.candidate_version}</td>
                  <td className="py-3 px-4 text-right text-slate-400 font-sans text-[11px]">New Candidate</td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-sans text-slate-300">Feature Store Version</td>
                  <td className="py-3 px-4 text-slate-300">{comp.feature_version || 'features-v1'}</td>
                  <td className="py-3 px-4 text-slate-300">{comp.feature_version || 'features-v1'}</td>
                  <td className="py-3 px-4 text-right text-emerald-400 text-[11px]">Identical</td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-sans text-slate-300">Anomaly Flag Rate</td>
                  <td className="py-3 px-4 text-slate-200">
                    {comp.anomaly_rate_active !== null && comp.anomaly_rate_active !== undefined
                      ? `${(comp.anomaly_rate_active * 100).toFixed(2)}%`
                      : '—'}
                  </td>
                  <td className="py-3 px-4 text-purple-300 font-bold">
                    {(comp.anomaly_rate_candidate * 100).toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400">
                    {comp.anomaly_rate_active !== null && comp.anomaly_rate_active !== undefined
                      ? `${((comp.anomaly_rate_candidate - comp.anomaly_rate_active) * 100).toFixed(2)}%`
                      : '—'}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-sans text-slate-300">Score Median (p50)</td>
                  <td className="py-3 px-4 text-slate-200">{actDist.p50 !== undefined ? actDist.p50.toFixed(3) : '—'}</td>
                  <td className="py-3 px-4 text-purple-300 font-bold">{candDist.p50 !== undefined ? candDist.p50.toFixed(3) : '—'}</td>
                  <td className="py-3 px-4 text-right text-slate-400">
                    {actDist.p50 !== undefined && candDist.p50 !== undefined
                      ? (candDist.p50 - actDist.p50).toFixed(3)
                      : '—'}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-sans text-slate-300">Score Tail (p95)</td>
                  <td className="py-3 px-4 text-slate-200">{actDist.p95 !== undefined ? actDist.p95.toFixed(3) : '—'}</td>
                  <td className="py-3 px-4 text-rose-400 font-bold">{candDist.p95 !== undefined ? candDist.p95.toFixed(3) : '—'}</td>
                  <td className="py-3 px-4 text-right text-slate-400">
                    {actDist.p95 !== undefined && candDist.p95 !== undefined
                      ? (candDist.p95 - actDist.p95).toFixed(3)
                      : '—'}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-sans text-slate-300">Score Distribution PSI</td>
                  <td className="py-3 px-4 text-slate-400">0.0000 (Baseline)</td>
                  <td className="py-3 px-4 text-cyan-400 font-bold">{comp.score_psi_shift?.toFixed(4) || '0.0000'}</td>
                  <td className="py-3 px-4 text-right font-sans text-[11px]">
                    {(comp.score_psi_shift || 0) < 0.10 ? (
                      <span className="text-emerald-400">● Stable (&lt;0.10)</span>
                    ) : (
                      <span className="text-amber-400">▲ Shift (&gt;0.10)</span>
                    )}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-sans text-slate-300">F1-Score (If Labeled)</td>
                  <td className="py-3 px-4 text-slate-400">
                    {actMetrics.f1_score ? `${(actMetrics.f1_score * 100).toFixed(1)}%` : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-purple-300">
                    {candMetrics.f1_score ? `${(candMetrics.f1_score * 100).toFixed(1)}%` : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-right font-sans text-[11px] text-slate-500">
                    {comp.supervised_metrics_available ? 'Calculated' : 'Unsupervised (N/A)'}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-sans text-slate-300">ROC-AUC (If Labeled)</td>
                  <td className="py-3 px-4 text-slate-400">
                    {actMetrics.roc_auc ? actMetrics.roc_auc.toFixed(4) : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-purple-300">
                    {candMetrics.roc_auc ? candMetrics.roc_auc.toFixed(4) : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-right font-sans text-[11px] text-slate-500">
                    {comp.supervised_metrics_available ? 'Calculated' : 'Unsupervised (N/A)'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {comp.verdict && (
            <div className="p-4 bg-soc-bg border border-soc-border rounded-xl space-y-1">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Statistical Decision Verdict
              </span>
              <p className="text-slate-300 text-xs font-mono">{comp.verdict}</p>
            </div>
          )}

          <div className="p-4 bg-soc-bg border border-soc-border rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-400">Lifecycle Action:</span>
            <span className="text-purple-300 font-bold font-mono">
              CANDIDATE REGISTERED (STATUS: EVALUATED)
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-soc-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
