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

      {/* Structured Telemetry Signal Rows */}
      <div className="space-y-3 text-xs">
        {/* 1. Data Freshness */}
        <div className="p-3.5 bg-soc-bg border border-soc-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                <span>Data Freshness</span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    safeDq.data_freshness_status === 'FRESH'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {safeDq.data_freshness_status || 'FRESH'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Time since latest transaction event</p>
            </div>
          </div>

          <div className="text-left sm:text-right pl-11 sm:pl-0 shrink-0">
            <div className="text-base font-bold font-mono text-white">
              {formatLag(safeDq.freshness_lag_seconds ?? 0)}
            </div>
            <span className="text-[10px] text-emerald-400 font-mono">Stream Synchronized</span>
          </div>
        </div>

        {/* 2. Schema Compatibility */}
        <div className="p-3.5 bg-soc-bg border border-soc-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                <span>Schema Compatibility</span>
                {!safeDq.has_schema_issues ? (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    COMPATIBLE
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    MISMATCH
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Expected feature schema & transformations</p>
            </div>
          </div>

          <div className="text-left sm:text-right pl-11 sm:pl-0 shrink-0">
            <div className="text-base font-bold font-mono text-cyan-300">
              {modelFeatureVersion || '1.0.0'}
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Registry Match</span>
          </div>
        </div>

        {/* 3. Numeric Integrity & Invalid Values */}
        <div className="p-3.5 bg-soc-bg border border-soc-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                <span>Numeric Integrity</span>
                {totalInvalid === 0 ? (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    CLEAN (0)
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    {totalInvalid} VIOLATIONS
                  </span>
                )}
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>NaN: <strong className={nanCount > 0 ? 'text-rose-400' : 'text-emerald-400'}>{nanCount}</strong></span>
                <span>·</span>
                <span>Inf: <strong className={infCount > 0 ? 'text-rose-400' : 'text-emerald-400'}>{infCount}</strong></span>
                <span>·</span>
                <span>Out-of-Bounds: <strong className={oobCount > 0 ? 'text-rose-400' : 'text-emerald-400'}>{oobCount}</strong></span>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right pl-11 sm:pl-0 shrink-0">
            <div className={`text-base font-bold font-mono ${totalInvalid === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalInvalid === 0 ? '0 Errors' : `${totalInvalid} Errors`}
            </div>
            <span className="text-[10px] text-slate-400">Integrity Check</span>
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

