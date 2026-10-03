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
  const safePerf = performance || { available: false };

  return (
    <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-soc-border pb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <h3 className="text-sm font-bold text-soc-foreground uppercase tracking-wider">
            Supervised Ground-Truth Performance
          </h3>
        </div>
        <div>
          {safePerf.available ? (
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{safePerf.sample_size ?? 0} Verified Labels</span>
            </span>
          ) : (
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              No Labeled Baseline
            </span>
          )}
        </div>
      </div>

      {!safePerf.available ? (
        <div className="p-5 bg-soc-bg border border-soc-border rounded-xl text-center space-y-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-500 dark:text-slate-400">
            <Info className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-soc-foreground">
            Ground-Truth Performance Unavailable
          </h4>
          <p className="text-[11px] text-soc-muted max-w-md mx-auto">
            {safePerf.reason ||
              'Real-time unsupervised anomaly scoring operates without immediate ground-truth labels. Metrics will compute automatically once case investigations & fraud dispute outcomes are confirmed.'}
          </p>
          <div className="text-[10px] font-mono text-soc-muted">
            Strict MLOps Integrity: Metrics are never fabricated from synthetic or unverified assumptions.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
              <span className="text-soc-muted font-sans text-[11px] font-semibold uppercase tracking-wider">Precision</span>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {((performance.precision || 0) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
              <span className="text-soc-muted font-sans text-[11px] font-semibold uppercase tracking-wider">Recall</span>
              <div className="text-xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                {((performance.recall || 0) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
              <span className="text-soc-muted font-sans text-[11px] font-semibold uppercase tracking-wider">F1-Score</span>
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {((performance.f1_score || 0) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
              <span className="text-soc-muted font-sans text-[11px] font-semibold uppercase tracking-wider">ROC-AUC</span>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {(performance.roc_auc || 0).toFixed(4)}
              </div>
            </div>
          </div>

          {performance.confusion_matrix && (
            <div className="p-4 bg-soc-bg border border-soc-border rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-soc-foreground font-sans uppercase tracking-wider">
                  Confusion Matrix
                </span>
                <span className="text-[10px] text-soc-muted font-mono">
                  Ground-Truth vs Predicted Class
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-center font-mono">
                {/* 1. True Positives */}
                <div className="p-3.5 bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/25 dark:border-emerald-500/40 rounded-xl transition-all duration-150 hover:border-emerald-500/50 shadow-sm flex flex-col justify-between">
                  <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 font-sans tracking-wide">
                    True Positives (Fraud)
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 my-1">
                    {performance.confusion_matrix.true_positive}
                  </div>
                  <div className="text-[10px] text-emerald-700/70 dark:text-emerald-400/70 font-sans">
                    Correctly Detected Fraud
                  </div>
                </div>

                {/* 2. False Positives */}
                <div className="p-3.5 bg-rose-500/10 dark:bg-rose-950/30 border border-rose-500/25 dark:border-rose-500/40 rounded-xl transition-all duration-150 hover:border-rose-500/50 shadow-sm flex flex-col justify-between">
                  <div className="text-xs font-semibold text-rose-800 dark:text-rose-300 font-sans tracking-wide">
                    False Positives (False Alarm)
                  </div>
                  <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 my-1">
                    {performance.confusion_matrix.false_positive}
                  </div>
                  <div className="text-[10px] text-rose-700/70 dark:text-rose-400/70 font-sans">
                    Legitimate Flagged as Fraud
                  </div>
                </div>

                {/* 3. False Negatives */}
                <div className="p-3.5 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/25 dark:border-amber-500/40 rounded-xl transition-all duration-150 hover:border-amber-500/50 shadow-sm flex flex-col justify-between">
                  <div className="text-xs font-semibold text-amber-800 dark:text-amber-300 font-sans tracking-wide">
                    False Negatives (Missed)
                  </div>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 my-1">
                    {performance.confusion_matrix.false_negative}
                  </div>
                  <div className="text-[10px] text-amber-700/70 dark:text-amber-400/70 font-sans">
                    Fraud Missed / Undetected
                  </div>
                </div>

                {/* 4. True Negatives */}
                <div className="p-3.5 bg-blue-500/10 dark:bg-blue-950/30 border border-blue-500/25 dark:border-blue-500/40 rounded-xl transition-all duration-150 hover:border-blue-500/50 shadow-sm flex flex-col justify-between">
                  <div className="text-xs font-semibold text-blue-800 dark:text-blue-300 font-sans tracking-wide">
                    True Negatives (Legit)
                  </div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 my-1">
                    {performance.confusion_matrix.true_negative}
                  </div>
                  <div className="text-[10px] text-blue-700/70 dark:text-blue-400/70 font-sans">
                    Correctly Approved Transactions
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
