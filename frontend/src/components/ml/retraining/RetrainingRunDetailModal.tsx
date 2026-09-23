import React from 'react';
import { X, CheckCircle2, Clock, AlertOctagon, Cpu, Database, Target, ShieldCheck, FileText } from 'lucide-react';
import { RetrainingRunItem } from '../../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  run: RetrainingRunItem | null;
}

export const RetrainingRunDetailModal: React.FC<Props> = ({ isOpen, onClose, run }) => {
  if (!isOpen || !run) return null;

  const evalReport = run.evaluation_report || {};
  const quality = run.data_quality_summary || {};
  const comp = run.model_comparison || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-soc-card border border-soc-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-soc-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-base font-bold text-white font-mono">{run.id}</h3>
              <p className="text-[11px] text-slate-400 font-sans">
                Retraining Execution & Candidate Evaluation Report
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300 font-sans">
          {/* Status & Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
              <span className="text-[10px] text-slate-500 font-sans">Execution Status</span>
              <div className="mt-1">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    run.status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : run.status === 'FAILED'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  }`}
                >
                  {run.status}
                </span>
              </div>
            </div>

            <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
              <span className="text-[10px] text-slate-500 font-sans">Candidate Version</span>
              <div className="text-sm font-bold text-purple-400 mt-1 truncate">
                {run.candidate_version || 'In Progress'}
              </div>
            </div>

            <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
              <span className="text-[10px] text-slate-500 font-sans">Records Used</span>
              <div className="text-sm font-bold text-white mt-1">{run.records_used}</div>
            </div>

            <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
              <span className="text-[10px] text-slate-500 font-sans">Duration</span>
              <div className="text-sm font-bold text-cyan-400 mt-1">{run.duration_ms} ms</div>
            </div>
          </div>

          {/* Artifact Integrity & Checksum */}
          {run.artifact_checksum && (
            <div className="p-3 bg-soc-bg border border-soc-border rounded-xl flex items-center justify-between font-mono text-[11px]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-400 font-sans">SHA256 Checksum:</span>
                <span className="text-slate-200 truncate max-w-md">{run.artifact_checksum}</span>
              </div>
              <span className="text-emerald-400 font-sans text-[10px] font-semibold">VERIFIED</span>
            </div>
          )}

          {/* Evaluation Statistics */}
          {evalReport.evaluated_samples && (
            <div className="space-y-3 border-t border-soc-border pt-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-4 h-4 text-purple-400" />
                <span>Test Split Evaluation Metrics ({evalReport.evaluated_samples} Samples)</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
                  <span className="text-[10px] text-slate-400 font-sans">Anomaly Rate</span>
                  <div className="text-base font-bold text-purple-400 mt-0.5">
                    {evalReport.anomaly_percentage}%
                  </div>
                </div>

                <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
                  <span className="text-[10px] text-slate-400 font-sans">Calibrated Threshold</span>
                  <div className="text-base font-bold text-white mt-0.5">
                    {evalReport.calibrated_threshold}
                  </div>
                </div>

                <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
                  <span className="text-[10px] text-slate-400 font-sans">Median Score</span>
                  <div className="text-base font-bold text-blue-400 mt-0.5">
                    {evalReport.score_p50}
                  </div>
                </div>

                <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
                  <span className="text-[10px] text-slate-400 font-sans">p95 Score</span>
                  <div className="text-base font-bold text-rose-400 mt-0.5">
                    {evalReport.score_p95}
                  </div>
                </div>
              </div>

              {/* Supervised metrics if available */}
              {evalReport.labeled_metrics ? (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                    Supervised Performance ({evalReport.labeled_metrics.labeled_samples} Labels)
                  </span>
                  <div className="grid grid-cols-4 gap-2 font-mono text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Precision</span>
                      <span className="text-sm font-bold text-emerald-300">
                        {((evalReport.labeled_metrics.precision || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Recall</span>
                      <span className="text-sm font-bold text-emerald-300">
                        {((evalReport.labeled_metrics.recall || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">F1-Score</span>
                      <span className="text-sm font-bold text-emerald-300">
                        {((evalReport.labeled_metrics.f1_score || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">ROC-AUC</span>
                      <span className="text-sm font-bold text-emerald-300">
                        {evalReport.labeled_metrics.roc_auc}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-soc-bg border border-soc-border rounded-xl text-slate-400 text-[11px]">
                  Supervised performance metrics unavailable (Unsupervised anomaly scoring partition).
                </div>
              )}
            </div>
          )}

          {/* Model Comparison Verdict */}
          {comp.verdict && (
            <div className="p-3.5 bg-soc-bg border border-soc-border rounded-xl space-y-1">
              <span className="text-xs font-bold text-slate-200">Comparison with Active Production Baseline:</span>
              <p className="font-mono text-[11px] text-purple-300">{comp.verdict}</p>
            </div>
          )}

          {/* Next Operational Step Notice */}
          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white text-xs block">Next Operational Step</span>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Candidate model is available for controlled review. Model deployment must be manually authorized via the Model Registry lifecycle controls.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-soc-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
