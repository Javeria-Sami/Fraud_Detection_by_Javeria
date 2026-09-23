import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useRealtime } from '../hooks/useRealtime';
import {
  TransactionInvestigationDetail,
  EventEnvelope,
} from '../types';
import { RiskScoreBadge } from '../components/shared/RiskScoreBadge';
import { SeverityBadge } from '../components/shared/SeverityBadge';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import {
  ArrowLeft,
  ShieldAlert,
  CreditCard,
  Smartphone,
  MapPin,
  Clock,
  User,
  AlertTriangle,
  FolderPlus,
  RefreshCw,
  Cpu,
  Layers,
  FileText,
  Building2,
  CheckCircle2,
} from 'lucide-react';

export const TransactionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<TransactionInvestigationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'ml' | 'features' | 'alerts'>('overview');

  const { subscribeEvent } = useRealtime();

  const loadInvestigation = useCallback(async (isManual = false) => {
    if (!id) return;
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const res = await apiClient.get<TransactionInvestigationDetail>(
        `/transactions/${encodeURIComponent(id)}/investigate`
      );
      setDetail(res.data);
    } catch (err: any) {
      console.error('Failed to load transaction investigation detail:', err);
      setError(
        err.response?.data?.detail ||
          `Transaction '${id}' was not found or could not be retrieved.`
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadInvestigation();
  }, [loadInvestigation]);

  // Real-time updates for viewed transaction
  useEffect(() => {
    if (!id) return;

    const unsubRisk = subscribeEvent<any>('risk.calculated', (env: EventEnvelope<any>) => {
      const p = env.payload;
      if (p && (p.transaction_id === id || env.entity_id === id)) {
        loadInvestigation(true);
      }
    });

    const unsubAlert = subscribeEvent<any>('alert.created', (env: EventEnvelope<any>) => {
      const p = env.payload;
      if (p && (p.transaction_id === id || env.entity_id === id)) {
        loadInvestigation(true);
      }
    });

    return () => {
      unsubRisk();
      unsubAlert();
    };
  }, [id, subscribeEvent, loadInvestigation]);

  const handleCreateCase = () => {
    if (!detail) return;
    const t = detail.transaction;
    navigate('/cases', {
      state: {
        prefillUserId: t.user_id,
        prefillTxnId: t.id,
        prefillSeverity: t.risk_level,
        prefillTitle: `Investigate transaction ${t.id} ($${t.amount.toFixed(2)} at ${t.merchant_name})`,
      },
    });
  };

  if (isLoading && !detail) {
    return (
      <div className="space-y-6 pb-12">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-6 pb-12">
        <button
          onClick={() => navigate('/transactions')}
          className="flex items-center gap-2 text-xs font-semibold text-soc-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Transactions</span>
        </button>

        <div className="bg-soc-card border border-rose-500/30 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-10 h-10 text-rose-400 mb-3" />
          <h2 className="text-base font-bold text-white">Transaction Not Found or Inaccessible</h2>
          <p className="text-xs text-soc-muted mt-1 max-w-md">{error}</p>
          <div className="flex items-center gap-3 mt-5">
            <Button variant="outline" size="sm" onClick={() => loadInvestigation(true)}>
              Retry
            </Button>
            <Button size="sm" onClick={() => navigate('/transactions')}>
              Return to Explorer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const t = detail.transaction;
  const risk = detail.risk;
  const ml = detail.ml_prediction;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Quick Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/transactions')}
          className="flex items-center gap-2 text-xs font-semibold text-soc-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Transaction Explorer</span>
        </button>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadInvestigation(true)}
            disabled={isRefreshing}
            className="text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={handleCreateCase}
            className="text-xs flex items-center gap-1.5"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Escalate to Case</span>
          </Button>
        </div>
      </div>

      {/* 2. Primary Overview Hero Banner */}
      <div className="bg-soc-card border border-soc-border rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3.5 rounded-2xl border shrink-0 ${
                t.risk_level === 'CRITICAL'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  : t.risk_level === 'HIGH'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
              }`}
            >
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold font-mono text-white tracking-tight">{t.id}</h1>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                    t.status === 'BLOCKED'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : t.status === 'REVIEW_REQUIRED'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {t.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-soc-muted mt-2">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {t.user_name || t.user_id} ({t.user_id})
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {t.timestamp ? new Date(t.timestamp).toLocaleString() : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {t.merchant_name} ({t.merchant_category})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-soc-border pt-4 md:pt-0 md:pl-6">
            <div>
              <div className="text-[10px] font-semibold text-soc-muted uppercase tracking-wider">
                Settlement Amount
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-0.5">
                ${t.amount.toFixed(2)}{' '}
                <span className="text-xs text-soc-muted font-sans font-normal">{t.currency}</span>
              </div>
              <div className="text-[11px] text-soc-muted mt-0.5 font-sans">
                {t.payment_method} • {t.transaction_type || 'PURCHASE'}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold text-soc-muted uppercase tracking-wider mb-1">
                Risk Assessment
              </div>
              <RiskScoreBadge score={t.risk_score} level={t.risk_level} size="lg" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-1 px-4 border-b border-soc-border bg-soc-card rounded-xl text-xs font-medium overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-4 border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-soc-muted hover:text-slate-200'
          }`}
        >
          Overview & Identity
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={`py-3 px-4 border-b-2 transition-colors ${
            activeTab === 'rules'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-soc-muted hover:text-slate-200'
          }`}
        >
          Rule Engine Signals ({detail.rules.filter((r) => r.triggered).length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ml')}
          className={`py-3 px-4 border-b-2 transition-colors ${
            activeTab === 'ml'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-soc-muted hover:text-slate-200'
          }`}
        >
          ML Anomaly Inference
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('features')}
          className={`py-3 px-4 border-b-2 transition-colors ${
            activeTab === 'features'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-soc-muted hover:text-slate-200'
          }`}
        >
          Feature Store Snapshot
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('alerts')}
          className={`py-3 px-4 border-b-2 transition-colors ${
            activeTab === 'alerts'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-soc-muted hover:text-slate-200'
          }`}
        >
          Related Alerts ({detail.alerts.length})
        </button>
      </div>

      {/* 4. Tab Content */}
      <div className="space-y-6">
        {/* OVERVIEW & IDENTITY TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Risk Factors & Why this was Flagged */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-soc-card border border-soc-border rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center gap-2 border-b border-soc-border pb-3">
                  <ShieldAlert className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Why this transaction received score {t.risk_score}/100
                  </h3>
                </div>

                {t.risk_factors && t.risk_factors.length > 0 ? (
                  <div className="space-y-2.5">
                    {t.risk_factors.map((factor, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-soc-bg border border-soc-border rounded-lg flex items-start justify-between gap-4 text-xs"
                      >
                        <div className="space-y-1">
                          <span className="font-semibold text-slate-200">
                            {factor.factor_name.replace(/_/g, ' ')}
                          </span>
                          <p className="text-[11px] text-soc-muted">{factor.description}</p>
                        </div>
                        <span className="font-mono text-xs font-bold text-amber-400 shrink-0">
                          +{factor.contribution.toFixed(1)} pts
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-soc-muted">
                    No critical risk signals elevated for this transaction record.
                  </p>
                )}
              </div>

              {/* Sub-Score Breakdown */}
              {risk && (
                <div className="bg-soc-card border border-soc-border rounded-xl p-5 shadow-lg space-y-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-soc-border pb-3">
                    Engine Sub-Score Contribution Breakdown
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-xs font-mono text-center">
                    <div className="p-3 bg-soc-bg border border-soc-border rounded-lg">
                      <span className="text-[10px] text-soc-muted block">Rule Engine Score</span>
                      <span className="text-lg font-bold text-white mt-1 block">{risk.rule_score}</span>
                    </div>
                    <div className="p-3 bg-soc-bg border border-soc-border rounded-lg">
                      <span className="text-[10px] text-soc-muted block">ML Anomaly Score</span>
                      <span className="text-lg font-bold text-purple-400 mt-1 block">{risk.ml_score.toFixed(1)}</span>
                    </div>
                    <div className="p-3 bg-soc-bg border border-soc-border rounded-lg">
                      <span className="text-[10px] text-soc-muted block">Behavioral Deviation</span>
                      <span className="text-lg font-bold text-blue-400 mt-1 block">{risk.behavior_score}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right 1 Col: Telemetry, Device & User Context */}
            <div className="space-y-6">
              <div className="bg-soc-card border border-soc-border rounded-xl p-5 shadow-lg space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-soc-border pb-3">
                  Telemetry & Device Metadata
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] text-soc-muted block">Device Identifier</span>
                    <span className="font-mono text-slate-200">{t.device_id}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-soc-muted block">IP Address & Network</span>
                    <span className="font-mono text-slate-200">{t.ip_address || '198.51.100.42'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-soc-muted block">Geographic Location</span>
                    <span className="text-slate-200">
                      {t.city ? `${t.city}, ${t.country}` : 'Unknown'}
                    </span>
                    {t.latitude && t.longitude && (
                      <span className="text-[10px] font-mono text-soc-muted block mt-0.5">
                        Lat: {t.latitude.toFixed(4)}, Lon: {t.longitude.toFixed(4)}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-soc-muted block">Failed Auth Attempts</span>
                    <span className="font-mono font-bold text-rose-400">{t.failed_attempts}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-soc-muted block">Ingestion Source</span>
                    <span className="font-mono text-slate-300">{t.source}</span>
                  </div>
                </div>
              </div>

              {/* User Context */}
              {detail.user_context && (
                <div className="bg-soc-card border border-soc-border rounded-xl p-5 shadow-lg space-y-3 text-xs">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-soc-border pb-3">
                    Customer Spending Baseline
                  </h3>
                  <div className="flex justify-between">
                    <span className="text-soc-muted">Historical Average</span>
                    <span className="font-mono font-bold text-white">
                      ${detail.user_context.baseline_spending.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-soc-muted">Lifetime Transactions</span>
                    <span className="font-mono text-slate-200">
                      {detail.user_context.total_transactions}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-soc-muted">Past Fraud Incidents</span>
                    <span className="font-mono font-bold text-rose-400">
                      {detail.user_context.fraud_incident_count}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RULES TAB */}
        {activeTab === 'rules' && (
          <div className="bg-soc-card border border-soc-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-soc-border pb-3">
              Deterministic Rule Evaluations ({detail.rules.length} Evaluated)
            </h3>

            {detail.rules.length === 0 ? (
              <p className="text-xs text-soc-muted">No rules recorded.</p>
            ) : (
              <div className="space-y-3">
                {detail.rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border text-xs space-y-2 ${
                      rule.triggered
                        ? 'bg-soc-bg border-amber-500/40'
                        : 'bg-soc-bg/40 border-soc-border/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            rule.triggered
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {rule.triggered ? 'TRIGGERED' : 'PASSED'}
                        </span>
                        <span className="font-bold text-slate-200">{rule.rule_name}</span>
                      </div>
                      <span className="font-mono font-bold text-amber-400">
                        +{rule.score} pts
                      </span>
                    </div>
                    {rule.reason && <p className="text-slate-300 font-sans">{rule.reason}</p>}
                    <div className="flex items-center gap-4 text-[10px] font-mono text-soc-muted pt-1 border-t border-soc-border/40">
                      <span>Category: {rule.category}</span>
                      <span>Severity: {rule.severity}</span>
                      <span>Version: {rule.version || 'v1.0'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ML TAB */}
        {activeTab === 'ml' && (
          <div className="bg-soc-card border border-soc-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-soc-border pb-3">
              Machine Learning Anomaly Inference
            </h3>

            {ml ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                  <div className="p-3 bg-soc-bg border border-soc-border rounded-lg">
                    <span className="text-[10px] text-soc-muted block">Anomaly Score</span>
                    <span className="text-xl font-bold text-white">{ml.anomaly_score.toFixed(3)}</span>
                  </div>
                  <div className="p-3 bg-soc-bg border border-soc-border rounded-lg">
                    <span className="text-[10px] text-soc-muted block">Classification</span>
                    <span className={`text-base font-bold uppercase ${
                      ml.prediction === 'ANOMALOUS' ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {ml.prediction}
                    </span>
                  </div>
                  <div className="p-3 bg-soc-bg border border-soc-border rounded-lg">
                    <span className="text-[10px] text-soc-muted block">Algorithm</span>
                    <span className="text-sm font-semibold text-slate-200">{ml.algorithm}</span>
                  </div>
                  <div className="p-3 bg-soc-bg border border-soc-border rounded-lg">
                    <span className="text-[10px] text-soc-muted block">Model Version</span>
                    <span className="text-sm font-semibold text-purple-400">{ml.model_version}</span>
                  </div>
                </div>

                <div className="p-4 bg-soc-bg border border-soc-border rounded-lg space-y-2">
                  <h4 className="font-bold text-slate-200">Contextual Indicators</h4>
                  {ml.contextual_indicators && ml.contextual_indicators.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-soc-muted">
                      {ml.contextual_indicators.map((c, i) => (
                        <li key={i} className="text-slate-300">
                          {c}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-soc-muted">Multivariate feature metrics within expected boundaries.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-soc-muted">No ML model analysis recorded.</p>
            )}
          </div>
        )}

        {/* FEATURES TAB */}
        {activeTab === 'features' && (
          <div className="bg-soc-card border border-soc-border rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-soc-border pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Feature Snapshot Vector
              </h3>
              <span className="font-mono text-xs text-blue-400">{detail.feature_version}</span>
            </div>

            <div className="bg-soc-bg border border-soc-border rounded-xl p-4 overflow-x-auto">
              <pre className="font-mono text-xs text-slate-300 leading-relaxed">
                {JSON.stringify(detail.features, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* ALERTS TAB */}
        {activeTab === 'alerts' && (
          <div className="bg-soc-card border border-soc-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-soc-border pb-3">
              Referenced Security Alerts ({detail.alerts.length})
            </h3>

            {detail.alerts.length === 0 ? (
              <p className="text-xs text-soc-muted">No alerts linked to this transaction.</p>
            ) : (
              <div className="space-y-3">
                {detail.alerts.map((al) => (
                  <div
                    key={al.id}
                    className="p-4 bg-soc-bg border border-soc-border rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={al.severity} size="sm" />
                        <span className="font-mono font-bold text-white">{al.id}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700">
                        {al.status}
                      </span>
                    </div>
                    <p className="text-slate-200 font-semibold">{al.title}</p>
                    {al.alert_reason && <p className="text-[11px] text-soc-muted">{al.alert_reason}</p>}
                    <div className="text-[10px] text-soc-muted font-mono pt-1">
                      Triggered: {al.created_at ? new Date(al.created_at).toLocaleString() : '-'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
