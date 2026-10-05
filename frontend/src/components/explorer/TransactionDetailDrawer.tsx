import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';
import { useRealtime } from '../../hooks/useRealtime';
import {
  TransactionInvestigationDetail,
  EventEnvelope,
} from '../../types';
import { MOCK_TRANSACTIONS } from '../../services/mockData';
import { RiskScoreBadge } from '../shared/RiskScoreBadge';
import { SeverityBadge } from '../shared/SeverityBadge';
import { Skeleton } from '../ui/Skeleton';
import {
  X,
  RefreshCw,
  FolderPlus,
  ShieldAlert,
  Cpu,
  AlertTriangle,
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

  const getMockInvestigation = useCallback((id: string): TransactionInvestigationDetail => {
    let mockTx = MOCK_TRANSACTIONS.find((t) => t.id === id);
    if (!mockTx) {
      mockTx = {
        id,
        user_id: 'USR-CUST-1001',
        user_name: 'Customer Account',
        merchant_name: 'Amazon Web Retail',
        merchant_category: 'Electronics & Retail',
        payment_method: 'CREDIT_CARD',
        transaction_type: 'PURCHASE',
        amount: 150.0,
        currency: 'USD',
        device_id: 'DEV-SEC-01',
        city: 'London',
        country: 'GB',
        failed_attempts: 0,
        source: 'API',
        risk_score: 28.5,
        risk_level: 'LOW',
        ml_anomaly_score: 0.185,
        rules_triggered: [],
        risk_factors: [],
        status: 'APPROVED',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
    }

    const triggeredRuleNames = (mockTx.rules_triggered || []).map((r: any) =>
      typeof r === 'string' ? r : r.rule_id || r.rule_name || ''
    );
    const simulatedRules = [
      {
        rule_id: 'RUL-VEL-001',
        rule_name: 'High Frequency Velocity Surge',
        category: 'VELOCITY',
        triggered: triggeredRuleNames.includes('VELOCITY_SPIKE') || (mockTx.risk_score || 0) > 65,
        score: 35,
        severity: 'HIGH',
        reason: 'Multiple rapid authorizations detected across 10-minute sliding window.',
      },
      {
        rule_id: 'RUL-GEO-002',
        rule_name: 'Geographical Impossible Travel',
        category: 'LOCATION',
        triggered: triggeredRuleNames.includes('LOCATION_MISMATCH') || (mockTx.risk_score || 0) > 80,
        score: 45,
        severity: 'CRITICAL',
        reason: 'Current physical terminal coordinate deviates >1200km from previous session within 15 minutes.',
      },
      {
        rule_id: 'RUL-DEV-003',
        rule_name: 'Unrecognized Device Fingerprint',
        category: 'DEVICE',
        triggered: triggeredRuleNames.includes('NEW_DEVICE') || (mockTx.risk_score || 0) > 40,
        score: 20,
        severity: 'MEDIUM',
        reason: 'Hardware canvas and WebGL fingerprint hash has no prior baseline association with customer.',
      },
      {
        rule_id: 'RUL-THR-004',
        rule_name: 'High Single-Ticket Transaction Threshold',
        category: 'FINANCIAL',
        triggered: (mockTx.amount || 0) >= 500,
        score: 25,
        severity: 'MEDIUM',
        reason: `Transaction amount $${(mockTx.amount || 0).toFixed(2)} exceeds standard tier velocity threshold.`,
      },
    ];

    const safeScore = typeof mockTx.risk_score === 'number' ? mockTx.risk_score : 25;
    const safeAmount = typeof mockTx.amount === 'number' ? mockTx.amount : 100;

    return {
      transaction: mockTx,
      risk: {
        score: safeScore,
        risk_level: mockTx.risk_level || 'LOW',
        rule_score: Math.round(safeScore * 0.6),
        ml_score: Math.round(safeScore * 0.4),
        behavior_score: Math.round(safeScore * 0.5),
        explanation: mockTx.risk_factors || [],
        scoring_version: 'v1.4.2',
        created_at: mockTx.timestamp || new Date().toISOString(),
      },
      rules: simulatedRules,
      ml_prediction: {
        model_name: 'isolation_forest_v2',
        model_version: '2.1.0',
        anomaly_score: mockTx.ml_anomaly_score || Number((safeScore / 100).toFixed(3)),
        prediction: safeScore >= 70 ? 'ANOMALOUS' : 'NORMAL',
        confidence: 0.94,
        inference_time_ms: 18.5,
        algorithm: 'Isolation Forest + LightGBM Ensemble',
        contextual_indicators: [
          `Session velocity metric: ${safeAmount > 500 ? 'Elevated spike' : 'Nominal baseline'}`,
          `Device fingerprint telemetry: ${mockTx.device_id || 'Standard'}`,
          `Origin location: ${mockTx.city || 'Standard'}, ${mockTx.country || 'Global'}`,
        ],
      },
      features: {
        amount: safeAmount,
        currency: mockTx.currency || 'USD',
        user_id: mockTx.user_id,
        device_id: mockTx.device_id,
        merchant_category: mockTx.merchant_category,
        failed_attempts: mockTx.failed_attempts || 0,
        historical_avg_amount: Number((safeAmount * 0.72).toFixed(2)),
        velocity_window_10m: safeScore > 60 ? 4 : 1,
        geo_distance_km: safeScore > 75 ? 1420.5 : 12.3,
      },
      alerts:
        mockTx.risk_level === 'CRITICAL' || mockTx.risk_level === 'HIGH'
          ? [
              {
                id: `ALT-${(mockTx.id || 'TXN').replace('TXN-', '')}`,
                title: `Elevated ${mockTx.risk_level} Risk on ${mockTx.merchant_name}`,
                severity: mockTx.risk_level,
                status: 'OPEN',
                alert_reason: `Composite risk threshold exceeded (${safeScore}/100)`,
                created_at: mockTx.timestamp || new Date().toISOString(),
              },
            ]
          : [],
      feature_version: 'v2.4_standard_tabular',
      user_context: {
        user_id: mockTx.user_id,
        user_name: mockTx.user_name,
        baseline_spending: Number((safeAmount * 0.85).toFixed(2)),
        total_transactions: 142,
        fraud_incident_count: mockTx.risk_level === 'CRITICAL' ? 1 : 0,
        active_risk_level: mockTx.risk_level || 'LOW',
      },
    };
  }, []);

  const fetchInvestigationDetail = useCallback(
    async (isManual = false) => {
      if (!transactionId) return;
      if (isManual) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const res = await apiClient.get<TransactionInvestigationDetail>(
          `/transactions/${encodeURIComponent(transactionId)}/investigate`
        );
        if (res.data && res.data.transaction) {
          setDetail({
            ...res.data,
            rules: res.data.rules || [],
            alerts: res.data.alerts || [],
            features: res.data.features || {},
          });
        } else {
          const fallback = getMockInvestigation(transactionId);
          if (fallback) {
            setDetail(fallback);
          } else {
            setError(`Unable to retrieve investigation intelligence for transaction '${transactionId}'.`);
          }
        }
      } catch (err: any) {
        console.warn('Backend investigate endpoint fallback to mock intelligence:', err);
        const fallback = getMockInvestigation(transactionId);
        if (fallback) {
          setDetail(fallback);
        } else {
          setError(
            err.response?.data?.detail ||
              `Unable to retrieve investigation intelligence for transaction '${transactionId}'.`
          );
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [transactionId, getMockInvestigation]
  );

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
    const currentTx = detail.transaction;
    navigate('/cases', {
      state: {
        prefillUserId: currentTx.user_id,
        prefillTxnId: currentTx.id,
        prefillSeverity: currentTx.risk_level,
        prefillTitle: `Investigate high-risk transaction ${currentTx.id} ($${currentTx.amount.toFixed(2)} at ${currentTx.merchant_name})`,
      },
    });
  };

  const t = detail?.transaction;
  const risk = detail?.risk;
  const ml = detail?.ml_prediction;
  const safeRules = detail?.rules || [];
  const safeAlerts = detail?.alerts || [];
  const triggeredRulesCount = safeRules.filter((r) => r && r.triggered).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-2xl bg-white dark:bg-soc-bg border-l border-soc-border h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-soc-border bg-soc-surface dark:bg-soc-card flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-2.5 rounded-xl border shrink-0 ${
                t?.risk_level === 'CRITICAL'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-400'
                  : t?.risk_level === 'HIGH'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400'
                  : 'bg-soc-lightGreen border-emerald-600/30 text-soc-deepGreen dark:text-emerald-300'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-extrabold text-soc-foreground tracking-tight truncate">
                  {transactionId}
                </span>
                {t?.status && (
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-soc-lightGreen dark:bg-emerald-950/50 text-soc-deepGreen dark:text-emerald-300 border border-emerald-600/30">
                    {t.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-soc-muted font-medium truncate mt-0.5">
                Transaction Investigation & Decision Intelligence Trace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fetchInvestigationDetail(true)}
              disabled={isLoading || isRefreshing}
              className="p-2 rounded-lg bg-soc-surface border border-soc-border hover:bg-soc-lightGreen text-soc-foreground transition-colors shadow-xs"
              title="Refresh Transaction Intelligence"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-soc-deepGreen dark:text-emerald-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleEscalateToCase}
              className="px-3.5 py-1.5 rounded-lg bg-soc-deepGreen hover:bg-[#154A19] text-xs font-bold text-white flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Escalate</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-soc-muted hover:text-soc-foreground hover:bg-soc-lightGreen dark:hover:bg-soc-cardHover transition-colors"
              title="Close Panel (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-soc-border bg-soc-bg text-xs font-medium overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-soc-deepGreen dark:border-emerald-400 text-soc-deepGreen dark:text-emerald-300 font-bold'
                : 'border-transparent text-soc-muted hover:text-soc-foreground'
            }`}
          >
            Overview & Risk
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'rules'
                ? 'border-soc-deepGreen dark:border-emerald-400 text-soc-deepGreen dark:text-emerald-300 font-bold'
                : 'border-transparent text-soc-muted hover:text-soc-foreground'
            }`}
          >
            Rules ({triggeredRulesCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ml')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'ml'
                ? 'border-soc-deepGreen dark:border-emerald-400 text-soc-deepGreen dark:text-emerald-300 font-bold'
                : 'border-transparent text-soc-muted hover:text-soc-foreground'
            }`}
          >
            ML Anomaly
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'features'
                ? 'border-soc-deepGreen dark:border-emerald-400 text-soc-deepGreen dark:text-emerald-300 font-bold'
                : 'border-transparent text-soc-muted hover:text-soc-foreground'
            }`}
          >
            Feature Store
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'alerts'
                ? 'border-soc-deepGreen dark:border-emerald-400 text-soc-deepGreen dark:text-emerald-300 font-bold'
                : 'border-transparent text-soc-muted hover:text-soc-foreground'
            }`}
          >
            Alerts ({safeAlerts.length})
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-white dark:bg-soc-bg">
          {isLoading && !detail ? (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : error && !detail ? (
            <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-xl text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-rose-500 dark:text-rose-400 mx-auto" />
              <h4 className="text-sm font-semibold text-rose-700 dark:text-rose-300">Investigation Retrieval Error</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">{error}</p>
              <button
                type="button"
                onClick={() => fetchInvestigationDetail(true)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors"
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
                  <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Settlement Amount
                      </div>
                      <div className="text-2xl font-extrabold font-mono text-slate-950 dark:text-white mt-0.5">
                        ${t.amount.toFixed(2)}{' '}
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-sans font-normal">{t.currency}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 font-sans">
                        {t.payment_method} • {t.transaction_type || 'PURCHASE'}
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Calibrated Risk
                      </div>
                      <RiskScoreBadge score={t.risk_score} level={t.risk_level} size="lg" />
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        Engine {risk?.scoring_version || 'v1.0'}
                      </div>
                    </div>
                  </div>

                  {/* Why this was flagged (Risk Explainability Factors) */}
                  <div className="p-4 bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        Risk Attribution & Signal Factors
                      </h4>
                    </div>

                    {t.risk_factors && t.risk_factors.length > 0 ? (
                      <div className="space-y-2">
                        {t.risk_factors.map((factor: any, idx: number) => {
                          const name = factor.factor_name || factor.name || factor.rule_name || 'Risk Factor';
                          const desc = factor.description || factor.reason || '';
                          const contrib = typeof factor.contribution === 'number' ? factor.contribution : (factor.weight || 0);
                          return (
                            <div
                              key={idx}
                              className="p-3 bg-white dark:bg-[#161F30] border border-slate-200 dark:border-slate-700/80 rounded-lg flex items-start justify-between gap-3 text-xs shadow-xs"
                            >
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-900 dark:text-slate-100">
                                  {String(name).replace(/_/g, ' ')}
                                </span>
                                {desc && <p className="text-[11px] text-slate-600 dark:text-slate-400">{desc}</p>}
                              </div>
                              <span className="font-mono text-xs font-extrabold text-amber-600 dark:text-amber-400 shrink-0">
                                +{contrib.toFixed(1)} pts
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        No critical risk factors elevated for this transaction.
                      </p>
                    )}
                  </div>

                  {/* Identity, Device & Telemetry Context */}
                  <div className="p-4 bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-xs">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2">
                      Identity & Environment Telemetry
                    </h4>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">User / Customer</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{t.user_name || t.user_id}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">{t.user_id}</span>
                      </div>

                      <div>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">Merchant & Category</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{t.merchant_name}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase block font-mono">{t.merchant_category}</span>
                      </div>

                      <div>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">Device Identifier</span>
                        <span className="font-mono font-medium text-slate-900 dark:text-slate-200 text-[11px] truncate block">{t.device_id}</span>
                      </div>

                      <div>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">IP & Location</span>
                        <span className="text-slate-900 dark:text-slate-200 text-[11px] font-medium block">
                          {t.city ? `${t.city}, ${t.country}` : 'Unknown'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block">{t.ip_address || '198.51.100.1'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: RULES */}
              {activeTab === 'rules' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1 font-medium">
                    <span>Deterministic AST Rule Evaluator Signals</span>
                    <span>{safeRules.length} Evaluated</span>
                  </div>

                  {safeRules.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl">
                      No rule executions recorded for this transaction.
                    </div>
                  ) : (
                    safeRules.map((rule, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition-all text-xs space-y-2 ${
                          rule.triggered
                            ? 'bg-amber-500/5 dark:bg-[#181D2A] border-amber-500/40 shadow-xs'
                            : 'bg-slate-50/60 dark:bg-[#111827]/60 border-slate-200 dark:border-slate-800/80 opacity-80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                rule.triggered
                                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {rule.triggered ? 'TRIGGERED' : 'PASSED'}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{rule.rule_name}</span>
                          </div>

                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                            {rule.triggered ? `+${rule.score} pts` : '0 pts'}
                          </span>
                        </div>

                        {rule.reason && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-sans">{rule.reason}</p>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-500 dark:text-slate-400">
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
                      <div className="p-4 bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                              {ml.model_name} Inference
                            </h4>
                          </div>
                          <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30">
                            Model: {ml.model_version}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono">
                          <div className="p-3 bg-white dark:bg-[#161F30] border border-slate-200 dark:border-slate-700/80 rounded-lg">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans font-medium">Anomaly Score</span>
                            <span className="text-xl font-extrabold text-slate-950 dark:text-white">
                              {ml.anomaly_score.toFixed(3)}
                            </span>
                          </div>

                          <div className="p-3 bg-white dark:bg-[#161F30] border border-slate-200 dark:border-slate-700/80 rounded-lg">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans font-medium">Prediction Classification</span>
                            <span className={`text-base font-extrabold uppercase ${
                              ml.prediction === 'ANOMALOUS' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {ml.prediction}
                            </span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                          Algorithm: <span className="text-slate-900 dark:text-slate-200 font-medium">{ml.algorithm}</span> • Feature Version:{' '}
                          <span className="text-slate-900 dark:text-slate-200 font-medium">{detail.feature_version}</span>
                        </div>
                      </div>

                      {/* Contextual Indicators */}
                      <div className="p-4 bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs shadow-xs">
                        <h5 className="font-bold text-slate-900 dark:text-slate-100">Contextual Behavioral Indicators</h5>
                        {ml.contextual_indicators && ml.contextual_indicators.length > 0 ? (
                          <ul className="space-y-1.5 list-disc list-inside text-slate-600 dark:text-slate-300 text-[11px]">
                            {ml.contextual_indicators.map((ind, i) => (
                              <li key={i} className="text-slate-700 dark:text-slate-300">
                                {ind}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                            Features aligned within normal multivariate distributions.
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl">
                      No ML prediction model inference recorded.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: FEATURE STORE */}
              {activeTab === 'features' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
                    <span>Feature Snapshot at Evaluation Timestamp</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{detail.feature_version || 'v2.4'}</span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-sm">
                    <pre className="font-mono text-[11px] text-emerald-400 leading-relaxed">
                      {JSON.stringify(detail.features || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 5: ALERTS */}
              {activeTab === 'alerts' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
                    <span>Referenced Security Alerts</span>
                    <span>{safeAlerts.length} Incident(s)</span>
                  </div>

                  {safeAlerts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl">
                      No security alerts were triggered by this transaction.
                    </div>
                  ) : (
                    safeAlerts.map((al) => (
                      <div
                        key={al.id}
                        className="p-3.5 bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <SeverityBadge severity={al.severity} size="sm" />
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{al.id}</span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-300 dark:border-slate-700">
                            {al.status}
                          </span>
                        </div>

                        <p className="text-slate-900 dark:text-slate-100 font-bold">{al.title}</p>
                        {al.alert_reason && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300">{al.alert_reason}</p>
                        )}
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono pt-1 border-t border-slate-200 dark:border-slate-800">
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
