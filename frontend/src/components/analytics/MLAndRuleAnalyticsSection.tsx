import React from 'react';
import {
  MLAnomalyAnalyticsResponse,
  RuleAnalyticsResponse,
} from '../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  BrainCircuit,
  Cpu,
  ShieldCheck,
  Zap,
  Activity,
  Award,
} from 'lucide-react';

interface MLAndRuleAnalyticsSectionProps {
  mlData: MLAnomalyAnalyticsResponse;
  ruleData: RuleAnalyticsResponse;
  isLoading?: boolean;
}

const SEVERITY_BADGES: Record<string, string> = {
  LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  CRITICAL: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export const MLAndRuleAnalyticsSection: React.FC<MLAndRuleAnalyticsSectionProps> = ({
  mlData,
  ruleData,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-soc-card border border-soc-border rounded-2xl h-80 p-5 shadow-sm" />
          <div className="bg-soc-card border border-soc-border rounded-2xl h-80 p-5 shadow-sm" />
        </div>
        <div className="bg-soc-card border border-soc-border rounded-2xl h-80 p-5 shadow-sm" />
      </div>
    );
  }

  const customTooltipStyle = {
    backgroundColor: 'var(--soc-card, #FFFFFF)',
    borderColor: 'var(--soc-border, #E2E8F0)',
    borderRadius: '0.75rem',
    color: 'var(--soc-foreground, #0F172A)',
    fontSize: '0.75rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  };

  const anomalyRate = mlData?.anomaly_rate ?? 0;
  const anomalyCount = mlData?.anomaly_count ?? 0;
  const totalPredictions = mlData?.total_predictions ?? 0;
  const avgAnomalyScore = mlData?.avg_anomaly_score ?? 0;
  const totalExecutions = ruleData?.total_executions ?? 0;
  const totalRules = ruleData?.total_rules ?? 0;
  const totalTriggers = ruleData?.total_triggers ?? 0;
  const overallTriggerRate = ruleData?.overall_trigger_rate ?? 0;

  return (
    <div className="space-y-6">
      {/* ML & Rules Top Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-soc-card border border-soc-border rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:border-blue-500/30 transition-all">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-600 dark:text-purple-400">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-soc-muted uppercase tracking-wider">
              ML Anomaly Rate
            </div>
            <div className="text-2xl font-bold text-soc-foreground mt-1 font-mono">
              {(anomalyRate * 100).toFixed(2)}%
            </div>
            <div className="text-[11px] text-soc-muted">
              {anomalyCount} of {totalPredictions} scored
            </div>
          </div>
        </div>

        <div className="bg-soc-card border border-soc-border rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:border-blue-500/30 transition-all">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-soc-muted uppercase tracking-wider">
              Avg Anomaly Score
            </div>
            <div className="text-2xl font-bold text-soc-foreground mt-1 font-mono">
              {avgAnomalyScore.toFixed(3)}
            </div>
            <div className="text-[11px] text-soc-muted">Isolation Forest Output</div>
          </div>
        </div>

        <div className="bg-soc-card border border-soc-border rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:border-blue-500/30 transition-all">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-soc-muted uppercase tracking-wider">
              Rule Executions
            </div>
            <div className="text-2xl font-bold text-soc-foreground mt-1 font-mono">
              {totalExecutions.toLocaleString()}
            </div>
            <div className="text-[11px] text-soc-muted">{totalRules} Active rules</div>
          </div>
        </div>

        <div className="bg-soc-card border border-soc-border rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:border-blue-500/30 transition-all">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-soc-muted uppercase tracking-wider">
              Overall Rule Triggers
            </div>
            <div className="text-2xl font-bold text-soc-foreground mt-1 font-mono">
              {totalTriggers.toLocaleString()}
            </div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              {(overallTriggerRate * 100).toFixed(2)}% trigger rate
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ML Score Histogram */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-soc-foreground flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>ML Anomaly Score Distribution</span>
              </h3>
              <p className="text-xs text-soc-muted mt-0.5">
                Isolation Forest decision function distribution
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            {mlData.score_histogram && mlData.score_histogram.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={mlData.score_histogram}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" vertical={false} />
                  <XAxis dataKey="bucket" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Bar dataKey="count" name="Count" fill="#8B5CF6" radius={[4, 4, 0, 0]}>
                    {mlData.score_histogram.map((bucket, index) => (
                      <Cell
                        key={`ml-cell-${index}`}
                        fill={bucket.max_score <= 0 ? '#EF4444' : '#8B5CF6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-soc-muted">
                No ML score histogram data available
              </div>
            )}
          </div>
        </div>

        {/* Model Version Performance */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-soc-foreground flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-500" />
                <span>Active Model Versions</span>
              </h3>
              <p className="text-xs text-soc-muted mt-0.5">
                Model inference load and anomaly detection rate
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {mlData?.model_versions && mlData.model_versions.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-soc-border text-soc-muted">
                    <th className="pb-2 font-semibold">Model Version</th>
                    <th className="pb-2 font-semibold">Predictions</th>
                    <th className="pb-2 font-semibold">Anomalies</th>
                    <th className="pb-2 font-semibold">Anomaly Rate</th>
                    <th className="pb-2 font-semibold">Avg Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soc-border">
                  {mlData.model_versions.map((ver) => (
                    <tr key={ver.model_version} className="hover:bg-blue-50/60 dark:hover:bg-soc-hover/40 transition-colors">
                      <td className="py-2.5 font-medium text-soc-foreground flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-mono">{ver.model_version}</span>
                      </td>
                      <td className="py-2.5 text-soc-text-secondary font-mono">
                        {(ver.prediction_count ?? 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 text-soc-text-secondary font-mono">
                        {(ver.anomaly_count ?? 0).toLocaleString()}
                      </td>
                      <td className="py-2.5">
                        <span className="text-rose-600 dark:text-rose-400 font-semibold font-mono">
                          {((ver.anomaly_rate ?? 0) * 100).toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-2.5 text-soc-muted font-mono">
                        {(ver.avg_anomaly_score ?? 0).toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-48 text-xs text-soc-muted">
                No model version telemetry available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Triggered Fraud Rules Ranking */}
      <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-soc-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Top Triggered Fraud Rules</span>
            </h3>
            <p className="text-xs text-soc-muted mt-0.5">
              Rules with highest activation volume and efficiency
            </p>
          </div>
          <span className="text-xs text-soc-muted bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-soc-border font-medium">
            {(ruleData?.top_triggered_rules || (ruleData as any)?.top_rules || []).length} Rules
          </span>
        </div>

        <div className="overflow-x-auto">
          {(ruleData?.top_triggered_rules || (ruleData as any)?.top_rules) && (ruleData.top_triggered_rules || (ruleData as any).top_rules).length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-soc-border text-soc-muted">
                  <th className="pb-2 font-semibold">Rule Name</th>
                  <th className="pb-2 font-semibold">Category</th>
                  <th className="pb-2 font-semibold">Severity</th>
                  <th className="pb-2 font-semibold">Executions</th>
                  <th className="pb-2 font-semibold">Triggers</th>
                  <th className="pb-2 font-semibold">Trigger Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soc-border">
                {(ruleData.top_triggered_rules || (ruleData as any).top_rules).map((rule: any) => (
                  <tr key={rule.rule_id} className="hover:bg-blue-50/60 dark:hover:bg-soc-hover/40 transition-colors">
                    <td className="py-3 font-semibold text-soc-foreground max-w-xs truncate">
                      {rule.rule_name}
                    </td>
                    <td className="py-3 text-soc-muted">{rule.category}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                          SEVERITY_BADGES[rule.severity] ||
                          'bg-slate-100 dark:bg-slate-800 text-soc-muted border-soc-border'
                        }`}
                      >
                        {rule.severity}
                      </span>
                    </td>
                    <td className="py-3 text-soc-text-secondary font-mono">
                      {(rule.execution_count ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 font-semibold font-mono text-amber-600 dark:text-amber-400">
                      {(rule.trigger_count ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (rule.trigger_rate ?? 0) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-soc-foreground font-semibold font-mono">
                          {((rule.trigger_rate ?? 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center h-32 text-xs text-soc-muted">
              No rule trigger records found for selected period
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
