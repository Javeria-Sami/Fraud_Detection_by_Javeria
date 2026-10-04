import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useRealtime } from '../hooks/useRealtime';
import {
  TransactionInvestigationDetail,
  EventEnvelope,
} from '../types';
import { MOCK_TRANSACTIONS } from '../services/mockData';
import { RiskScoreBadge } from '../components/shared/RiskScoreBadge';
import { SeverityBadge } from '../components/shared/SeverityBadge';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import {
  ArrowLeft,
  ShieldAlert,
  Clock,
  User,
  AlertTriangle,
  FolderPlus,
  RefreshCw,
  Cpu,
  Building2,
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

  const getMockInvestigation = useCallback((txnId: string): TransactionInvestigationDetail | null => {
    const mockTx = MOCK_TRANSACTIONS.find((t) => t.id === txnId);
    if (!mockTx) return null;

    const triggeredRuleNames = (mockTx.rules_triggered || []).map((r: any) =>
      typeof r === 'string' ? r : r.rule_id || r.rule_name || ''
    );
    const simulatedRules = [
      {
        rule_id: 'RUL-VEL-001',
        rule_name: 'High Frequency Velocity Surge',
        category: 'VELOCITY',
        triggered: triggeredRuleNames.includes('VELOCITY_SPIKE') || mockTx.risk_score > 65,
        score: 35,
        severity: 'HIGH',
        reason: 'Multiple rapid authorizations detected across 10-minute sliding window.',
      },
      {
        rule_id: 'RUL-GEO-002',
        rule_name: 'Geographical Impossible Travel',
        category: 'LOCATION',
        triggered: triggeredRuleNames.includes('LOCATION_MISMATCH') || mockTx.risk_score > 80,
        score: 45,
        severity: 'CRITICAL',
        reason: 'Current physical terminal coordinate deviates >1200km from previous session within 15 minutes.',
      },
      {
        rule_id: 'RUL-DEV-003',
        rule_name: 'Unrecognized Device Fingerprint',
        category: 'DEVICE',
        triggered: triggeredRuleNames.includes('NEW_DEVICE') || mockTx.risk_score > 40,
        score: 20,
        severity: 'MEDIUM',
        reason: 'Hardware canvas and WebGL fingerprint hash has no prior baseline association with customer.',
      },
      {
        rule_id: 'RUL-THR-004',
        rule_name: 'High Single-Ticket Transaction Threshold',
        category: 'FINANCIAL',
        triggered: mockTx.amount >= 500,
        score: 25,
        severity: 'MEDIUM',
        reason: `Transaction amount $${mockTx.amount.toFixed(2)} exceeds standard tier velocity threshold.`,
      },
    ];

    return {
      transaction: mockTx,
      risk: {
        score: mockTx.risk_score,
        risk_level: mockTx.risk_level,
        rule_score: Math.round(mockTx.risk_score * 0.6),
        ml_score: Math.round(mockTx.risk_score * 0.4),
        behavior_score: Math.round(mockTx.risk_score * 0.5),
        explanation: mockTx.risk_factors || [],
        scoring_version: 'v1.4.2',
        created_at: mockTx.timestamp || new Date().toISOString(),
      },
      rules: simulatedRules,
      ml_prediction: {
        model_name: 'isolation_forest_v2',
        model_version: '2.1.0',
        anomaly_score: mockTx.ml_anomaly_score || Number((mockTx.risk_score / 100).toFixed(3)),
        prediction: mockTx.risk_score >= 70 ? 'ANOMALOUS' : 'NORMAL',
        confidence: 0.94,
        inference_time_ms: 18.5,
        algorithm: 'Isolation Forest + LightGBM Ensemble',
        contextual_indicators: [
          `Session velocity metric: ${mockTx.amount > 500 ? 'Elevated spike' : 'Nominal baseline'}`,
          `Device fingerprint telemetry: ${mockTx.device_id}`,
          `Origin location: ${mockTx.city || 'Standard'}, ${mockTx.country || 'Global'}`,
        ],
      },
      features: {
        amount: mockTx.amount,
        currency: mockTx.currency,
        user_id: mockTx.user_id,
        device_id: mockTx.device_id,
        merchant_category: mockTx.merchant_category,
        failed_attempts: mockTx.failed_attempts || 0,
        historical_avg_amount: Number((mockTx.amount * 0.72).toFixed(2)),
        velocity_window_10m: mockTx.risk_score > 60 ? 4 : 1,
        geo_distance_km: mockTx.risk_score > 75 ? 1420.5 : 12.3,
      },
      alerts:
        mockTx.risk_level === 'CRITICAL' || mockTx.risk_level === 'HIGH'
          ? [
              {
                id: `ALT-${mockTx.id.replace('TXN-', '')}`,
                title: `Elevated ${mockTx.risk_level} Risk on ${mockTx.merchant_name}`,
                severity: mockTx.risk_level,
                status: 'OPEN',
                alert_reason: `Composite risk threshold exceeded (${mockTx.risk_score}/100)`,
                created_at: mockTx.timestamp || new Date().toISOString(),
              },
            ]
          : [],
      feature_version: 'v2.4_standard_tabular',
      user_context: {
        user_id: mockTx.user_id,
        user_name: mockTx.user_name,
        baseline_spending: Number((mockTx.amount * 0.85).toFixed(2)),
        total_transactions: 142,
        fraud_incident_count: mockTx.risk_level === 'CRITICAL' ? 1 : 0,
        active_risk_level: mockTx.risk_level,
      },
    };
  }, []);

  const loadInvestigation = useCallback(
    async (isManual = false) => {
      if (!id) return;
      if (isManual) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const res = await apiClient.get<TransactionInvestigationDetail>(
          `/transactions/${encodeURIComponent(id)}/investigate`
        );
        if (res.data && res.data.transaction) {
          setDetail({
            ...res.data,
            rules: res.data.rules || [],
            alerts: res.data.alerts || [],
            features: res.data.features || {},
          });
        } else {
          const fallback = getMockInvestigation(id);
          if (fallback) {
            setDetail(fallback);
          } else {
            setError(`Transaction '${id}' was not found or could not be retrieved.`);
          }
        }
      } catch (err: any) {
        console.warn('Backend investigate endpoint fallback to mock intelligence:', err);
        const fallback = getMockInvestigation(id);
        if (fallback) {
          setDetail(fallback);
        } else {
          setError(
            err.response?.data?.detail ||
              `Transaction '${id}' was not found or could not be retrieved.`
          );
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [id, getMockInvestigation]
  );

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
    const currentTx = detail.transaction;
    navigate('/cases', {
      state: {
        prefillUserId: currentTx.user_id,
        prefillTxnId: currentTx.id,
        prefillSeverity: currentTx.risk_level,
        prefillTitle: `Investigate transaction ${currentTx.id} ($${currentTx.amount.toFixed(2)} at ${currentTx.merchant_name})`,
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
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-soc-muted dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Transactions</span>
        </button>

        <div className="bg-white dark:bg-soc-card border border-rose-500/30 rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-lg">
          <AlertTriangle className="w-10 h-10 text-rose-500 dark:text-rose-400 mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Transaction Not Found or Inaccessible</h2>
          <p className="text-xs text-slate-600 dark:text-soc-muted mt-1 max-w-md">{error}</p>
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
  const safeRules = detail.rules || [];
  const safeAlerts = detail.alerts || [];
  const triggeredRulesCount = safeRules.filter((r) => r && r.triggered).length;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Quick Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/transactions')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-soc-muted hover:text-slate-900 dark:hover:text-white transition-colors"
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
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-500 dark:text-blue-400' : ''}`} />
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
      <div className="bg-white dark:bg-soc-card border border-slate-200 dark:border-soc-border rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3.5 rounded-2xl border shrink-0 ${
                t.risk_level === 'CRITICAL'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                  : t.risk_level === 'HIGH'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400'
              }`}
            >
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">{t.id}</h1>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                    t.status === 'BLOCKED'
                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      : t.status === 'REVIEW_REQUIRED'
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {t.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-soc-muted mt-2">
                <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-300">
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

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-200 dark:border-soc-border pt-4 md:pt-0 md:pl-6">
            <div>
              <div className="text-[10px] font-semibold text-slate-500 dark:text-soc-muted uppercase tracking-wider">
                Settlement Amount
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                ${t.amount.toFixed(2)}{' '}
                <span className="text-xs text-slate-500 dark:text-soc-muted font-sans font-normal">{t.currency}</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-soc-muted mt-0.5 font-sans">
                {t.payment_method} • {t.transaction_type || 'PURCHASE'}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold text-slate-500 dark:text-soc-muted uppercase tracking-wider mb-1">
                Risk Assessment
              </div>
              <RiskScoreBadge score={t.risk_score} level={t.risk_level} size="lg" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-1 px-4 border-b border-slate-200 dark:border-soc-border bg-white dark:bg-soc-card rounded-xl text-xs font-medium overflow-x-auto shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-4 border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-soc-muted hover:text-slate-950 dark:hover:text-slate-200'
          }`}
        >
          Overview & Identity
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={`py-3 px-4 border-b-2 transition-colors ${
            activeTab === 'rules'
              ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-soc-muted hover:text-slate-950 dark:hover:text-slate-200'
          }`}
        >
          Rule Engine Signals ({triggeredRulesCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ml')}
          className={`py-3 px-4 border-b-2 transition-colors ${
            activeTab === 'ml'
              ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-soc-muted hover:text-slate-950 dark:hover:text-slate-200'
          }`}
        >
          ML Anomaly Inference
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('features')}
          className={`py-3 px-4 border-b-2 transition-colors ${
            activeTab === 'features'
              ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-soc-muted hover:text-slate-950 dark:hover:text-slate-200'
          }`}
        >
          Feature Store Snapshot
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('alerts')}
          className={`py-3 px-4 border-b-2 transition-colors ${
            activeTab === 'alerts'
              ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-soc-muted hover:text-slate-950 dark:hover:text-slate-200'
          }`}
        >
          Related Alerts ({safeAlerts.length})
        </button>
      </div>

      {/* 4. Tab Content */}
      <div className="space-y-6">
        {/* OVERVIEW & IDENTITY TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Risk Factors & Why this was Flagged */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-soc-card border border-slate-200 dark:border-soc-border rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-soc-border pb-3">
                  <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Risk Assessment & Signal Factors
                  </h3>
                </div>

                {t.risk_factors && t.risk_factors.length > 0 ? (
                  <div className="space-y-3">
                    {t.risk_factors.map((factor, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-slate-50 dark:bg-soc-bg border border-slate-200 dark:border-soc-border rounded-xl flex items-start justify-between gap-4 text-xs"
                      >
                        <div className="space-y-1">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {factor.factor_name.replace(/_/g, ' ')}
                          </span>
                          <p className="text-slate-600 dark:text-soc-muted">{factor.description}</p>
                        </div>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">
                          +{factor.contribution.toFixed(1)} pts
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-soc-muted">
                    No critical risk factors were triggered for this transaction.
                  </p>
                )}
              </div>

              {/* Technical Telemetry */}
              <div className="bg-white dark:bg-soc-card border border-slate-200 dark:border-soc-border rounded-xl p-5 shadow-lg space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-soc-border pb-3">
                  Device & Connection Telemetry
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-soc-bg rounded-lg border border-slate-200 dark:border-soc-border">
                    <span className="text-slate-500 dark:text-soc-muted block mb-1">Device ID</span>
                    <span className="font-mono text-slate-900 dark:text-slate-200">{t.device_id}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-soc-bg rounded-lg border border-slate-200 dark:border-soc-border">
                    <span className="text-slate-500 dark:text-soc-muted block mb-1">IP Address</span>
                    <span className="font-mono text-slate-900 dark:text-slate-200">{t.ip_address || '198.51.100.1'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-soc-bg rounded-lg border border-slate-200 dark:border-soc-border">
                    <span className="text-slate-500 dark:text-soc-muted block mb-1">Geographic Location</span>
                    <span className="text-slate-900 dark:text-slate-200">{t.city ? `${t.city}, ${t.country}` : 'Unknown'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-soc-bg rounded-lg border border-slate-200 dark:border-soc-border">
                    <span className="text-slate-500 dark:text-soc-muted block mb-1">Failed Attempts</span>
                    <span className="font-mono text-slate-900 dark:text-slate-200">{t.failed_attempts || 0}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-soc-bg rounded-lg border border-slate-200 dark:border-soc-border">
                    <span className="text-slate-500 dark:text-soc-muted block mb-1">Ingestion Source</span>
                    <span className="font-mono text-slate-900 dark:text-slate-200">{t.source || 'API'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-soc-bg rounded-lg border border-slate-200 dark:border-soc-border">
                    <span className="text-slate-500 dark:text-soc-muted block mb-1">Coordinates</span>
                    <span className="font-mono text-slate-900 dark:text-slate-200">
                      {t.latitude && t.longitude ? `${t.latitude}, ${t.longitude}` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: User & Account Context */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-soc-card border border-slate-200 dark:border-soc-border rounded-xl p-5 shadow-lg space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-soc-border pb-3">
                  Account Intelligence
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-soc-muted block">Customer Name</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200">{t.user_name || t.user_id}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-soc-muted block">User ID</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{t.user_id}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-soc-muted block">Merchant</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200">{t.merchant_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-soc-muted block">Category</span>
                    <span className="font-mono uppercase text-slate-700 dark:text-slate-300">{t.merchant_category}</span>
                  </div>
                </div>

                {detail.user_context && (
                  <div className="pt-3 border-t border-slate-200 dark:border-soc-border/60 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-soc-muted">Baseline Spending</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        ${detail.user_context.baseline_spending.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-soc-muted">Total Lifetime Transactions</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {detail.user_context.total_transactions}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-soc-muted">Past Fraud Incidents</span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        {detail.user_context.fraud_incident_count}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* RULES TAB */}
        {activeTab === 'rules' && (
          <div className="bg-white dark:bg-soc-card border border-slate-200 dark:border-soc-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-soc-border pb-3">
              Deterministic Rule Evaluations ({safeRules.length} Evaluated)
            </h3>

            {safeRules.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-soc-muted">No rules recorded.</p>
            ) : (
              <div className="space-y-3">
                {safeRules.map((rule, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border text-xs space-y-2 ${
                      rule.triggered
                        ? 'bg-amber-500/5 dark:bg-soc-bg border-amber-500/40'
                        : 'bg-slate-50/60 dark:bg-soc-bg/40 border-slate-200 dark:border-soc-border/60 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            rule.triggered
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {rule.triggered ? 'TRIGGERED' : 'PASSED'}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{rule.rule_name}</span>
                      </div>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        +{rule.score} pts
                      </span>
                    </div>
                    {rule.reason && <p className="text-slate-600 dark:text-slate-300 font-sans">{rule.reason}</p>}
                    <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500 dark:text-soc-muted pt-1 border-t border-slate-200 dark:border-soc-border/40">
                      <span>Category: {rule.category}</span>
                      <span>Severity: {rule.severity}</span>
                      <span>Rule Code: {rule.rule_id}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ML TAB */}
        {activeTab === 'ml' && (
          <div className="bg-white dark:bg-soc-card border border-slate-200 dark:border-soc-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-soc-border pb-3">
              Machine Learning Anomaly Inference
            </h3>

            {ml ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                  <div className="p-3 bg-slate-50 dark:bg-soc-bg border border-slate-200 dark:border-soc-border rounded-lg">
                    <span className="text-[10px] text-slate-500 dark:text-soc-muted block">Anomaly Score</span>
                    <span className="text-xl font-bold text-slate-900 dark:text-white">{ml.anomaly_score.toFixed(3)}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-soc-bg border border-slate-200 dark:border-soc-border rounded-lg">
                    <span className="text-[10px] text-slate-500 dark:text-soc-muted block">Classification</span>
                    <span className={`text-base font-bold uppercase ${
                      ml.prediction === 'ANOMALOUS' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {ml.prediction}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-soc-bg border border-slate-200 dark:border-soc-border rounded-lg">
                    <span className="text-[10px] text-slate-500 dark:text-soc-muted block">Algorithm</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{ml.algorithm}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-soc-bg border border-slate-200 dark:border-soc-border rounded-lg">
                    <span className="text-[10px] text-slate-500 dark:text-soc-muted block">Model Version</span>
                    <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">{ml.model_version}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-soc-bg border border-slate-200 dark:border-soc-border rounded-lg space-y-2">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">Contextual Indicators</h4>
                  {ml.contextual_indicators && ml.contextual_indicators.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-soc-muted">
                      {ml.contextual_indicators.map((c, i) => (
                        <li key={i} className="text-slate-700 dark:text-slate-300">
                          {c}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 dark:text-soc-muted">Multivariate feature metrics within expected boundaries.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-soc-muted">No ML model analysis recorded.</p>
            )}
          </div>
        )}

        {/* FEATURES TAB */}
        {activeTab === 'features' && (
          <div className="bg-white dark:bg-soc-card border border-slate-200 dark:border-soc-border rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-soc-border pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Feature Snapshot Vector
              </h3>
              <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{detail.feature_version || 'v2.4'}</span>
            </div>

            <div className="bg-slate-900 dark:bg-soc-bg border border-slate-800 dark:border-soc-border rounded-xl p-4 overflow-x-auto">
              <pre className="font-mono text-xs text-emerald-400 dark:text-emerald-300 leading-relaxed">
                {JSON.stringify(detail.features || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* ALERTS TAB */}
        {activeTab === 'alerts' && (
          <div className="bg-white dark:bg-soc-card border border-slate-200 dark:border-soc-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-soc-border pb-3">
              Referenced Security Alerts ({safeAlerts.length})
            </h3>

            {safeAlerts.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-soc-muted">No alerts linked to this transaction.</p>
            ) : (
              <div className="space-y-3">
                {safeAlerts.map((al) => (
                  <div
                    key={al.id}
                    className="p-4 bg-slate-50 dark:bg-soc-bg border border-slate-200 dark:border-soc-border rounded-xl space-y-2 text-xs"
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
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{al.title}</p>
                    {al.alert_reason && <p className="text-[11px] text-slate-500 dark:text-soc-muted">{al.alert_reason}</p>}
                    <div className="text-[10px] text-slate-500 dark:text-soc-muted font-mono pt-1">
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
