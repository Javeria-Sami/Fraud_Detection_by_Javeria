import React from 'react';
import { RiskFactor, TriggeredRule } from '../../types';
import { AlertCircle, ShieldAlert, Cpu, Activity } from 'lucide-react';

interface ExplainabilityCardProps {
  riskScore: number;
  riskLevel: string;
  mlAnomalyScore: number;
  riskFactors: RiskFactor[];
  triggeredRules: TriggeredRule[];
}

export const ExplainabilityCard: React.FC<ExplainabilityCardProps> = ({
  riskScore,
  riskLevel,
  mlAnomalyScore,
  riskFactors,
  triggeredRules,
}) => {
  return (
    <div className="bg-soc-card border border-soc-border rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between border-b border-soc-border pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Detection Explainability</h3>
            <p className="text-xs text-slate-400">Multi-Factor Risk Breakdown & Contributing Signals</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Calibrated Score</div>
          <div className="text-xl font-bold font-mono text-white">
            {riskScore.toFixed(1)} <span className="text-xs text-slate-400">/100</span>
          </div>
        </div>
      </div>

      {/* Factor Breakdown Bars */}
      <div className="space-y-3.5 mb-5">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Contributing Risk Vectors</div>
        {riskFactors.length === 0 ? (
          <p className="text-xs text-slate-400">No abnormal risk factors detected for this transaction.</p>
        ) : (
          riskFactors.map((factor, idx) => (
            <div key={idx} className="bg-soc-bg/60 border border-soc-border/70 rounded-lg p-3">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-medium text-slate-200">{factor.factor_name}</span>
                <span className="font-mono font-semibold text-blue-400">+{factor.contribution.toFixed(1)} pts</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-rose-500 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, (factor.score || factor.contribution * 2))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{factor.description}</p>
            </div>
          ))
        )}
      </div>

      {/* Triggered Rules Summary */}
      {triggeredRules.length > 0 && (
        <div className="border-t border-soc-border pt-4">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
            Deterministic Rules Fired ({triggeredRules.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {triggeredRules.map((r, i) => (
              <span
                key={i}
                className="text-[11px] px-2.5 py-1 rounded bg-orange-500/10 border border-orange-500/30 text-orange-300 font-mono"
              >
                {r.rule_name} (+{r.points} pts)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ML Engine Badge */}
      <div className="mt-4 pt-3 border-t border-soc-border flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span>Isolation Forest ML Pipeline</span>
        </div>
        <span className="font-mono text-purple-300 font-medium">
          Anomaly Prob: {(mlAnomalyScore * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
};
