import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';
import { useRealtime } from '../../hooks/useRealtime';
import {
  TransactionInvestigationDetail,
  EventEnvelope,
} from '../../types';
import { RiskScoreBadge } from '../shared/RiskScoreBadge';
import { SeverityBadge } from '../shared/SeverityBadge';
import { Skeleton } from '../ui/Skeleton';
import {
  X,
  RefreshCw,
  FolderPlus,
  ShieldAlert,
  Cpu,
  Activity,
  Smartphone,
  MapPin,
  Clock,
  User,
  AlertTriangle,
  FileCheck2,
  ExternalLink,
  Layers,
} from 'lucide-react';

export interface TransactionDetailDrawerProps {
  transactionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TransactionDetailDrawer: React.FC<TransactionDetailDrawerProps> = ({
  transactionId,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<TransactionInvestigationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'ml' | 'features' | 'alerts'>('overview');

  const { subscribeEvent } = useRealtime();

  const fetchInvestigationDetail = useCallback(async (isManual = false) => {
    if (!transactionId) return;
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const res = await apiClient.get<TransactionInvestigationDetail>(
        `/transactions/${encodeURIComponent(transactionId)}/investigate`
      );
      setDetail(res.data);
    } catch (err: any) {
      console.error('Failed to load transaction investigation detail:', err);
      setError(
        err.response?.data?.detail ||
          `Unable to retrieve investigation intelligence for transaction '${transactionId}'.`
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [transactionId]);

  useEffect(() => {
    if (isOpen && transactionId) {
      fetchInvestigationDetail();
    } else {
      setDetail(null);
      setError(null);
    }
  }, [isOpen, transactionId, fetchInvestigationDetail]);

  // Real-time WebSocket event reconciliation for viewed transaction
  useEffect(() => {
    if (!transactionId || !isOpen) return;

    const unsubRisk = subscribeEvent<any>('risk.calculated', (env: EventEnvelope<any>) => {
      const p = env.payload;
      if (p && (p.transaction_id === transactionId || env.entity_id === transactionId)) {
        fetchInvestigationDetail(true);
      }
    });

    const unsubAlert = subscribeEvent<any>('alert.created', (env: EventEnvelope<any>) => {
      const p = env.payload;
      if (p && (p.transaction_id === transactionId || env.entity_id === transactionId)) {
        fetchInvestigationDetail(true);
      }
    });

    return () => {
      unsubRisk();
      unsubAlert();
    };
  }, [transactionId, isOpen, subscribeEvent, fetchInvestigationDetail]);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleEscalateToCase = () => {
    if (!detail) return;
    const t = detail.transaction;
    navigate('/cases', {
      state: {
        prefillUserId: t.user_id,
        prefillTxnId: t.id,
        prefillSeverity: t.risk_level,
        prefillTitle: `Investigate high-risk transaction ${t.id} ($${t.amount.toFixed(2)} at ${t.merchant_name})`,
      },
    });
  };

  const t = detail?.transaction;
  const risk = detail?.risk;
  const ml = detail?.ml_prediction;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-2xl bg-soc-card border-l border-soc-border h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-soc-border bg-soc-bg/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-xl border shrink-0 ${
              t?.risk_level === 'CRITICAL'
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                : t?.risk_level === 'HIGH'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white truncate">
                  {transactionId}
                </span>
                {t?.status && (
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {t.status}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-soc-muted truncate">
                Transaction Investigation & Decision Intelligence Trace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fetchInvestigationDetail(true)}
              disabled={isLoading || isRefreshing}
              className="p-2 rounded-lg bg-soc-bg border border-soc-border hover:bg-slate-800 text-slate-300 transition-colors"
              title="Refresh Transaction Intelligence"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleEscalateToCase}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Escalate</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Panel (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-soc-border bg-soc-bg/40 text-xs font-medium overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-soc-muted hover:text-slate-200'
            }`}
          >
            Overview & Risk
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'rules'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-soc-muted hover:text-slate-200'
            }`}
          >
            Rules ({detail?.rules.filter((r) => r.triggered).length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ml')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'ml'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-soc-muted hover:text-slate-200'
            }`}
          >
            ML Anomaly
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'features'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-soc-muted hover:text-slate-200'
            }`}
          >
            Feature Store
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'alerts'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-soc-muted hover:text-slate-200'
            }`}
          >
            Alerts ({detail?.alerts.length || 0})
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading && !detail ? (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-950/20 border border-rose-500/30 rounded-xl text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
              <h4 className="text-sm font-semibold text-rose-300">Investigation Retrieval Error</h4>
              <p className="text-xs text-soc-muted">{error}</p>
              <button
                type="button"
                onClick={() => fetchInvestigationDetail(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg border border-slate-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : detail && t ? (
            <>
              {/* TAB 1: OVERVIEW & RISK */}
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  {/* Financial Settlement & Risk Score Hero */}
                  <div className="grid grid-cols-2 gap-3 p-4 bg-soc-bg border border-soc-border rounded-xl">
                    <div>
                      <div className="text-[10px] font-semibold text-soc-muted uppercase tracking-wider">
                        Settlement Amount
                      </div>
                      <div className="text-2xl font-bold font-mono text-white mt-0.5">
                        ${t.amount.toFixed(2)}{' '}
                        <span className="text-xs text-soc-muted font-sans font-normal">{t.currency}</span>
                      </div>
                      <div className="text-[11px] text-soc-muted mt-1 font-sans">
                        {t.payment_method} • {t.transaction_type || 'PURCHASE'}
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between">
                      <div className="text-[10px] font-semibold text-soc-muted uppercase tracking-wider">
                        Calibrated Risk
                      </div>
                      <RiskScoreBadge score={t.risk_score} level={t.risk_level} size="lg" />
                      <div className="text-[10px] text-soc-muted font-mono">
                        Engine {risk?.scoring_version || 'v1.0'}
                      </div>
                    </div>
                  </div>

                  {/* Why this was flagged (Risk Explainability Factors) */}
                  <div className="p-4 bg-soc-bg border border-soc-border rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-blue-400" />
                      <h4 className="text-xs font-bold text-soc-foreground uppercase tracking-wider">
                        Risk Attribution & Signal Factors
                      </h4>
                    </div>

                    {t.risk_factors && t.risk_factors.length > 0 ? (
                      <div className="space-y-2">
                        {t.risk_factors.map((factor, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 bg-soc-card border border-soc-border/70 rounded-lg flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="space-y-0.5">
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
                        No critical risk factors elevated for this transaction.
                      </p>
                    )}
                  </div>

                  {/* Identity, Device & Telemetry Context */}
                  <div className="p-4 bg-soc-bg border border-soc-border rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-soc-foreground uppercase tracking-wider border-b border-soc-border/60 pb-2">
                      Identity & Environment Telemetry
                    </h4>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-soc-muted block">User / Customer</span>
                        <span className="font-semibold text-slate-200">{t.user_name || t.user_id}</span>
                        <span className="text-[10px] text-soc-muted block font-mono">{t.user_id}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-soc-muted block">Merchant & Category</span>
                        <span className="font-semibold text-slate-200">{t.merchant_name}</span>
                        <span className="text-[10px] text-soc-muted uppercase block font-mono">{t.merchant_category}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-soc-muted block">Device Identifier</span>
                        <span className="font-mono text-slate-200 text-[11px] truncate block">{t.device_id}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-soc-muted block">IP & Location</span>
                        <span className="text-slate-200 text-[11px] block">
                          {t.city ? `${t.city}, ${t.country}` : 'Unknown'}
                        </span>
                        <span className="text-[10px] font-mono text-soc-muted block">{t.ip_address || '198.51.100.1'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: RULES */}
              {activeTab === 'rules' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-soc-muted mb-1">
                    <span>Deterministic AST Rule Evaluator Signals</span>
                    <span>{detail.rules.length} Evaluated</span>
                  </div>

                  {detail.rules.length === 0 ? (
                    <div className="p-6 text-center text-xs text-soc-muted bg-soc-bg border border-soc-border rounded-xl">
                      No rule executions recorded for this transaction.
                    </div>
                  ) : (
                    detail.rules.map((rule, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition-all text-xs space-y-2 ${
                          rule.triggered
                            ? 'bg-soc-bg border-amber-500/40 shadow-sm'
                            : 'bg-soc-bg/50 border-soc-border/60 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                rule.triggered
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {rule.triggered ? 'TRIGGERED' : 'PASSED'}
                            </span>
                            <span className="font-semibold text-slate-200">{rule.rule_name}</span>
                          </div>

                          <span className="font-mono font-bold text-amber-400">
                            {rule.triggered ? `+${rule.score} pts` : '0 pts'}
                          </span>
                        </div>

                        {rule.reason && (
                          <p className="text-[11px] text-slate-300 font-sans">{rule.reason}</p>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-soc-border/40 text-[10px] font-mono text-soc-muted">
                          <span>Category: {rule.category}</span>
                          <span>Severity: {rule.severity}</span>
                          <span>Rule Code: {rule.rule_id}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: ML ANOMALY */}
              {activeTab === 'ml' && (
                <div className="space-y-4">
                  {ml ? (
                    <>
                      <div className="p-4 bg-soc-bg border border-soc-border rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-purple-400" />
                            <h4 className="text-xs font-bold text-soc-foreground uppercase tracking-wider">
                              {ml.model_name} Inference
                            </h4>
                          </div>
                          <span className="text-[10px] font-mono text-purple-400 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30">
                            Model: {ml.model_version}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono">
                          <div className="p-3 bg-soc-card border border-soc-border/60 rounded-lg">
                            <span className="text-[10px] text-soc-muted block">Anomaly Score</span>
                            <span className="text-xl font-bold text-white">
                              {ml.anomaly_score.toFixed(3)}
                            </span>
                          </div>

                          <div className="p-3 bg-soc-card border border-soc-border/60 rounded-lg">
                            <span className="text-[10px] text-soc-muted block">Prediction Classification</span>
                            <span className={`text-base font-bold uppercase ${
                              ml.prediction === 'ANOMALOUS' ? 'text-rose-400' : 'text-emerald-400'
                            }`}>
                              {ml.prediction}
                            </span>
                          </div>
                        </div>

                        <div className="text-[11px] text-soc-muted pt-1">
                          Algorithm: <span className="text-slate-300">{ml.algorithm}</span> • Feature Version:{' '}
                          <span className="text-slate-300">{detail.feature_version}</span>
                        </div>
                      </div>

                      {/* Contextual Indicators */}
                      <div className="p-4 bg-soc-bg border border-soc-border rounded-xl space-y-2 text-xs">
                        <h5 className="font-bold text-slate-200">Contextual Behavioral Indicators</h5>
                        {ml.contextual_indicators && ml.contextual_indicators.length > 0 ? (
                          <ul className="space-y-1.5 list-disc list-inside text-soc-muted text-[11px]">
                            {ml.contextual_indicators.map((ind, i) => (
                              <li key={i} className="text-slate-300">
                                {ind}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-soc-muted text-[11px]">
                            Features aligned within normal multivariate distributions.
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="p-6 text-center text-xs text-soc-muted bg-soc-bg border border-soc-border rounded-xl">
                      No ML prediction model inference recorded.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: FEATURE STORE */}
              {activeTab === 'features' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-soc-muted">
                    <span>Feature Snapshot at Evaluation Timestamp</span>
                    <span className="font-mono text-blue-400">{detail.feature_version}</span>
                  </div>

                  <div className="bg-soc-bg border border-soc-border rounded-xl p-4 overflow-x-auto">
                    <pre className="font-mono text-[11px] text-slate-300 leading-relaxed">
                      {JSON.stringify(detail.features, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 5: ALERTS */}
              {activeTab === 'alerts' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-soc-muted">
                    <span>Referenced Security Alerts</span>
                    <span>{detail.alerts.length} Incident(s)</span>
                  </div>

                  {detail.alerts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-soc-muted bg-soc-bg border border-soc-border rounded-xl">
                      No security alerts were triggered by this transaction.
                    </div>
                  ) : (
                    detail.alerts.map((al) => (
                      <div
                        key={al.id}
                        className="p-3.5 bg-soc-bg border border-soc-border rounded-xl space-y-2 text-xs"
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
                        {al.alert_reason && (
                          <p className="text-[11px] text-soc-muted">{al.alert_reason}</p>
                        )}
                        <div className="text-[10px] text-soc-muted font-mono pt-1">
                          Triggered: {al.created_at ? new Date(al.created_at).toLocaleString() : '-'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
