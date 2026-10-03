import React from 'react';
import { Database, AlertTriangle, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

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
  const safeDq = dataQuality || {
    total_records: 0,
    features_monitored: 0,
    missing_rates: {},
    nan_counts: {},
    inf_counts: {},
    out_of_bounds_counts: {},
    freshness_lag_seconds: 0,
    data_freshness_status: 'FRESH',
    has_schema_issues: false,
  };

  const missingEntries = Object.entries(safeDq.missing_rates || {}).filter(
    ([, rate]) => rate > 0
  );
  const nanCount = Object.values(safeDq.nan_counts || {}).reduce((acc, c) => acc + c, 0);
  const infCount = Object.values(safeDq.inf_counts || {}).reduce((acc, c) => acc + c, 0);
  const oobCount = Object.values(safeDq.out_of_bounds_counts || {}).reduce((acc, c) => acc + c, 0);
  const totalInvalid = nanCount + infCount + oobCount;

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
          <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 whitespace-nowrap">
            {(safeDq.total_records ?? 0).toLocaleString()} Records Evaluated
          </span>
        </div>
      </div>

      {/* Grid of Key Quality Signals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* 1. Data Freshness */}
        <div className="p-3.5 bg-soc-bg border border-soc-border rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-slate-400 font-semibold text-xs flex items-center gap-1.5 truncate">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">Data Freshness</span>
            </span>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 whitespace-nowrap border ${
                safeDq.data_freshness_status === 'FRESH'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}
            >
              {safeDq.data_freshness_status || 'FRESH'}
            </span>
          </div>
          <div className="my-2.5">
            <div className="text-base font-bold font-mono text-white tracking-tight">
              {formatLag(safeDq.freshness_lag_seconds ?? 0)}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">Time since latest transaction event</p>
          </div>
        </div>

        {/* 2. Schema Version */}
        <div className="p-3.5 bg-soc-bg border border-soc-border rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-slate-400 font-semibold text-xs flex items-center gap-1.5 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">Schema Version</span>
            </span>
            {!safeDq.has_schema_issues ? (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 whitespace-nowrap">
                COMPATIBLE
              </span>
            ) : (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0 whitespace-nowrap">
                MISMATCH
              </span>
            )}
          </div>
          <div className="my-2.5">
            <div className="text-base font-bold font-mono text-cyan-300 tracking-tight">
              {modelFeatureVersion || '1.0.0'}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">Expected feature schema & transforms</p>
          </div>
        </div>

        {/* 3. Invalid Values Counter */}
        <div className="p-3.5 bg-soc-bg border border-soc-border rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-slate-400 font-semibold text-xs flex items-center gap-1.5 truncate">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">Invalid Values</span>
            </span>
            {totalInvalid === 0 ? (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 whitespace-nowrap">
                CLEAN (0)
              </span>
            ) : (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0 whitespace-nowrap">
                {totalInvalid} DETECTED
              </span>
            )}
          </div>
          <div className="my-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-soc-card border border-soc-border font-mono text-[11px] font-semibold text-slate-300">
                NaN: <strong className={nanCount > 0 ? "text-rose-400" : "text-emerald-400"}>{nanCount}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-soc-card border border-soc-border font-mono text-[11px] font-semibold text-slate-300">
                Inf: <strong className={infCount > 0 ? "text-rose-400" : "text-emerald-400"}>{infCount}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-soc-card border border-soc-border font-mono text-[11px] font-semibold text-slate-300">
                OOB: <strong className={oobCount > 0 ? "text-rose-400" : "text-emerald-400"}>{oobCount}</strong>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-snug">Numeric integrity violations</p>
          </div>
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

