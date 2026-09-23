import React from 'react';
import { Target, Info, CheckCircle2 } from 'lucide-react';

interface Props {
  performance: {
    available: boolean;
    reason?: string;
    sample_size?: number;
    precision?: number;
    recall?: number;
    f1_score?: number;
    pr_auc?: number;
    roc_auc?: number;
    confusion_matrix?: {
      true_positive: number;
      false_positive: number;
      true_negative: number;
      false_negative: number;
    };
  };
}

export const GroundTruthPerformanceCard: React.FC<Props> = ({ performance }) => {
  return (
    <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-soc-border pb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Supervised Ground-Truth Performance
          </h3>
        </div>
        <div>
          {performance.available ? (
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{performance.sample_size} Verified Labels</span>
            </span>
          ) : (
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700">
              No Labeled Baseline
            </span>
          )}
        </div>
      </div>

      {!performance.available ? (
        <div className="p-5 bg-soc-bg border border-soc-border rounded-xl text-center space-y-2">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Info className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-200">
            Ground-Truth Performance Unavailable
          </h4>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
            {performance.reason ||
              'Real-time unsupervised anomaly scoring operates without immediate ground-truth labels. Metrics will compute automatically once case investigations & fraud dispute outcomes are confirmed.'}
          </p>
          <div className="text-[10px] font-mono text-slate-500">
            Strict MLOps Integrity: Metrics are never fabricated from synthetic or unverified assumptions.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
              <span className="text-slate-400 font-sans text-[11px]">Precision</span>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">
                {((performance.precision || 0) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
              <span className="text-slate-400 font-sans text-[11px]">Recall</span>
              <div className="text-lg font-bold text-cyan-400 mt-0.5">
                {((performance.recall || 0) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
              <span className="text-slate-400 font-sans text-[11px]">F1-Score</span>
              <div className="text-lg font-bold text-purple-400 mt-0.5">
                {((performance.f1_score || 0) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
              <span className="text-slate-400 font-sans text-[11px]">ROC-AUC</span>
              <div className="text-lg font-bold text-blue-400 mt-0.5">
                {(performance.roc_auc || 0).toFixed(4)}
              </div>
            </div>
          </div>

          {performance.confusion_matrix && (
            <div className="p-3 bg-soc-bg border border-soc-border rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-slate-300 font-sans uppercase tracking-wider">
                Confusion Matrix
              </span>
              <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                <div className="p-2 bg-emerald-950/40 border border-emerald-500/30 rounded-lg">
                  <div className="text-[10px] text-slate-400 font-sans">True Positives (Fraud)</div>
                  <div className="text-sm font-bold text-emerald-400">
                    {performance.confusion_matrix.true_positive}
                  </div>
                </div>
                <div className="p-2 bg-rose-950/40 border border-rose-500/30 rounded-lg">
                  <div className="text-[10px] text-slate-400 font-sans">False Positives (False Alarm)</div>
                  <div className="text-sm font-bold text-rose-400">
                    {performance.confusion_matrix.false_positive}
                  </div>
                </div>
                <div className="p-2 bg-amber-950/40 border border-amber-500/30 rounded-lg">
                  <div className="text-[10px] text-slate-400 font-sans">False Negatives (Missed)</div>
                  <div className="text-sm font-bold text-amber-400">
                    {performance.confusion_matrix.false_negative}
                  </div>
                </div>
                <div className="p-2 bg-blue-950/40 border border-blue-500/30 rounded-lg">
                  <div className="text-[10px] text-slate-400 font-sans">True Negatives (Legit)</div>
                  <div className="text-sm font-bold text-blue-400">
                    {performance.confusion_matrix.true_negative}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
