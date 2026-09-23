import React from 'react';
import { Database, AlertTriangle, CheckCircle, Clock, ShieldCheck } from 'lucide-react';

interface Props {
  dataQuality: {
    total_records: number;
    features_monitored: number;
    missing_rates: Record<string, number>;
    nan_counts: Record<string, number>;
    inf_counts: Record<string, number>;
    out_of_bounds_counts: Record<string, number>;
    freshness_lag_seconds: number;
    data_freshness_status: string;
    has_schema_issues: boolean;
  };
  modelFeatureVersion: string;
}

export const DataQualityCard: React.FC<Props> = ({ dataQuality, modelFeatureVersion }) => {
  const missingEntries = Object.entries(dataQuality.missing_rates || {}).filter(
    ([, rate]) => rate > 0
  );
  const nanEntries = Object.entries(dataQuality.nan_counts || {}).filter(
    ([, count]) => count > 0
  );
  const infEntries = Object.entries(dataQuality.inf_counts || {}).filter(
    ([, count]) => count > 0
  );
  const oobEntries = Object.entries(dataQuality.out_of_bounds_counts || {}).filter(
    ([, count]) => count > 0
  );

  const formatLag = (secs: number) => {
    if (secs < 60) return `${secs.toFixed(0)}s lag`;
    if (secs < 3600) return `${(secs / 60).toFixed(0)}m lag`;
    return `${(secs / 3600).toFixed(1)}h lag`;
  };

  return (
    <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-soc-border pb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Feature & Data Quality Guardrails
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            {dataQuality.total_records} Records Evaluated
          </span>
        </div>
      </div>

      {/* Grid of Key Quality Signals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* Freshness */}
        <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Data Freshness</span>
            </span>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                dataQuality.data_freshness_status === 'FRESH'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {dataQuality.data_freshness_status}
            </span>
          </div>
          <div className="mt-2 text-base font-bold font-mono text-white">
            {formatLag(dataQuality.freshness_lag_seconds)}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Time since latest transaction event</p>
        </div>

        {/* Feature Store Compatibility */}
        <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Schema Version</span>
            </span>
            {!dataQuality.has_schema_issues ? (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                COMPATIBLE
              </span>
            ) : (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400">
                MISMATCH
              </span>
            )}
          </div>
          <div className="mt-2 text-sm font-bold font-mono text-cyan-300">
            {modelFeatureVersion || 'features-v1'}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Expected feature schema & transformations</p>
        </div>

        {/* Anomaly / Invalid Values Counter */}
        <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Invalid Values</span>
            </span>
            {nanEntries.length === 0 && infEntries.length === 0 && oobEntries.length === 0 ? (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                CLEAN (0)
              </span>
            ) : (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400">
                ISSUES DETECTED
              </span>
            )}
          </div>
          <div className="mt-2 text-sm font-bold font-mono text-slate-200">
            NaN: {nanEntries.reduce((acc, [, c]) => acc + c, 0)} | Inf: {infEntries.reduce((acc, [, c]) => acc + c, 0)} | Out-of-Bounds: {oobEntries.reduce((acc, [, c]) => acc + c, 0)}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Numeric integrity violations</p>
        </div>
      </div>

      {/* Missing Values Breakdown if any */}
      {missingEntries.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Missing Feature Rates (Above 0%)</span>
          </div>
          <div className="flex flex-wrap gap-2 font-mono text-xs">
            {missingEntries.map(([feat, rate]) => (
              <span
                key={feat}
                className="px-2 py-1 bg-amber-950/60 border border-amber-500/40 rounded-lg text-amber-300 text-[11px]"
              >
                {feat}: {(rate * 100).toFixed(1)}% null
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
