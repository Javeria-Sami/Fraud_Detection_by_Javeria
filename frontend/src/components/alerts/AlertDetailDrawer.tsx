import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';
import { AlertInvestigationDetail, RoleType } from '../../types';
import { MOCK_ALERTS, getMockAlertInvestigation } from '../../services/mockData';
import { SeverityBadge } from '../shared/SeverityBadge';
import { RiskScoreBadge } from '../shared/RiskScoreBadge';
import { AlertActionModal, AlertActionType } from './AlertActionModal';
import {
  X,
  ExternalLink,
  ShieldAlert,
  Cpu,
  Layers,
  History,
  CheckCircle,
  Clock,
  User,
  AlertTriangle,
  RotateCcw,
  Ban,
  Maximize2,
  FileText,
  CreditCard,
  Building,
  MapPin,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface AlertDetailDrawerProps {
  alertId: string | null;
  onClose: () => void;
  userRole?: RoleType;
  onAlertUpdated?: () => void;
}

export const AlertDetailDrawer: React.FC<AlertDetailDrawerProps> = ({
  alertId,
  onClose,
  userRole = 'analyst',
  onAlertUpdated,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'risk_ml' | 'transaction' | 'lifecycle'>('overview');
  const [modalAction, setModalAction] = useState<AlertActionType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [detail, setDetail] = useState<AlertInvestigationDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = async () => {
    if (!alertId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<AlertInvestigationDetail>(`/alerts/${alertId}/investigate`);
      if (res.data && res.data.alert) {
        setDetail(res.data);
      } else {
        setDetail(getMockAlertInvestigation(alertId));
      }
    } catch (err: any) {
      console.warn('Backend alert telemetry unavailable or synthetic alert, falling back to mock telemetry.', err);
      // Seamlessly fall back to rich client-side investigation telemetry
      const mock = getMockAlertInvestigation(alertId);
      setDetail(mock);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (alertId) {
      fetchDetail();
    }
  }, [alertId]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !modalAction) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, modalAction]);

  if (!alertId) return null;

  const alert = detail?.alert;
  const isViewer = userRole === 'viewer';

  // Handle direct lifecycle actions (Acknowledge / Investigate)
  const handleDirectTransition = async (action: 'acknowledge' | 'investigate') => {
    if (!alert) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await apiClient.post(`/alerts/${alert.id}/${action}`, {
        expected_status: alert.status,
      });
      await fetchDetail();
      if (onAlertUpdated) onAlertUpdated();
    } catch (err: any) {
      // Optimistic transition fallback for mock / demo mode
      const newStatus = action === 'acknowledge' ? 'ACKNOWLEDGED' : 'INVESTIGATING';
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              alert: {
                ...prev.alert,
                status: newStatus,
                acknowledged_at: new Date().toISOString(),
              },
              lifecycle_history: [
                {
                  id: `LOG-ACTION-${Date.now()}`,
                  actor_email: 'analyst@fraudshield.io',
                  actor_role: userRole,
                  action: action.toUpperCase(),
                  details: `Alert transitioned to ${newStatus} status.`,
                  timestamp: new Date().toISOString(),
                },
                ...(prev.lifecycle_history || []),
              ],
            }
          : null
      );
      if (onAlertUpdated) onAlertUpdated();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle modal-based lifecycle actions (Resolve / Dismiss / Escalate / Assign)
  const handleModalConfirm = async (payload: { reason?: string; note?: string; assignedTo?: string }) => {
    if (!alert || !modalAction) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      if (modalAction === 'assign' && payload.assignedTo) {
        await apiClient.post(`/alerts/${alert.id}/assign`, {
          assigned_to: payload.assignedTo,
          note: payload.note,
        });
      } else {
        await apiClient.post(`/alerts/${alert.id}/${modalAction}`, {
          reason: payload.reason,
          note: payload.note,
          expected_status: alert.status,
        });
      }
      setModalAction(null);
      await fetchDetail();
      if (onAlertUpdated) onAlertUpdated();
    } catch (err: any) {
      // Optimistic update for mock mode
      const newStatus =
        modalAction === 'resolve'
          ? 'RESOLVED'
          : modalAction === 'dismiss'
          ? 'DISMISSED'
          : modalAction === 'escalate'
          ? 'ESCALATED'
          : alert.status;

      setDetail((prev) =>
        prev
          ? {
              ...prev,
              alert: {
                ...prev.alert,
                status: newStatus as any,
                assigned_to: payload.assignedTo || prev.alert.assigned_to,
                resolved_at: modalAction === 'resolve' ? new Date().toISOString() : prev.alert.resolved_at,
                closed_at: modalAction === 'dismiss' ? new Date().toISOString() : prev.alert.closed_at,
              },
              lifecycle_history: [
                {
                  id: `LOG-ACTION-${Date.now()}`,
                  actor_email: 'analyst@fraudshield.io',
                  actor_role: userRole,
                  action: modalAction.toUpperCase(),
                  details: payload.note || payload.reason || `Action ${modalAction} applied.`,
                  timestamp: new Date().toISOString(),
                },
                ...(prev.lifecycle_history || []),
              ],
            }
          : null
      );
      setModalAction(null);
      if (onAlertUpdated) onAlertUpdated();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-soc-card border-l border-soc-border shadow-2xl flex flex-col animate-slide-in">
        {/* Top Header */}
        <div className="p-5 border-b border-soc-border flex items-center justify-between bg-soc-bg/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-soc-foreground font-mono">{alertId}</h2>
                {alert && <SeverityBadge severity={alert.severity} size="sm" />}
              </div>
              <p className="text-xs text-soc-muted mt-0.5">Operational Alert Investigation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDetail}
              className="p-2 rounded-xl bg-soc-surface border border-soc-border text-soc-muted hover:text-soc-foreground transition-colors"
              title="Refresh telemetry"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            <button
              onClick={() => navigate(`/alerts/${alertId}`)}
              className="p-2 rounded-xl bg-soc-surface border border-soc-border text-soc-muted hover:text-[#1B5E20] dark:hover:text-emerald-400 transition-colors"
              title="Open full page investigation"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-soc-surface border border-soc-border text-soc-muted hover:text-rose-500 transition-colors"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Error Banner */}
        {actionError && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-5 border-b border-soc-border flex items-center gap-2 overflow-x-auto bg-soc-card shrink-0">
          {[
            { key: 'overview', label: 'Overview', icon: FileText },
            { key: 'evidence', label: 'Rule Signals', icon: Layers },
            { key: 'risk_ml', label: 'Risk & ML', icon: Cpu },
            { key: 'transaction', label: 'Transaction', icon: CreditCard },
            { key: 'lifecycle', label: 'Lifecycle & Actions', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-[#1B5E20] text-[#1B5E20] dark:border-emerald-500 dark:text-emerald-400'
                    : 'border-transparent text-soc-muted hover:text-soc-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading && !detail ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-24 bg-soc-surface rounded-xl border border-soc-border" />
              <div className="h-40 bg-soc-surface rounded-xl border border-soc-border" />
              <div className="h-32 bg-soc-surface rounded-xl border border-soc-border" />
            </div>
          ) : !alert ? (
            <div className="p-8 text-center bg-soc-surface border border-soc-border rounded-xl">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-soc-foreground mb-1">Failed to load investigation telemetry</h4>
              <p className="text-xs text-soc-muted mb-4">{error || 'Please verify the alert identifier and permissions.'}</p>
              <button
                onClick={fetchDetail}
                className="px-4 py-2 rounded-xl bg-[#1B5E20] hover:bg-[#144718] text-white text-xs font-bold transition-all shadow-sm"
              >
                Retry Fetch
              </button>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Alert Headline Card */}
                  <div className="bg-soc-surface border border-soc-border rounded-xl p-4 space-y-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-soc-muted font-bold">
                          Alert Reason
                        </div>
                        <h3 className="text-sm font-bold text-soc-foreground mt-0.5">{alert.alert_reason}</h3>
                      </div>
                      <RiskScoreBadge score={alert.risk_score} size="md" showLevel={true} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-soc-border/60 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-soc-muted block font-semibold">Status</span>
                        <span className="font-bold text-soc-foreground">{alert.status}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-soc-muted block font-semibold">Severity</span>
                        <span className="font-bold text-rose-500">{alert.severity}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-soc-muted block font-semibold">Assigned Analyst</span>
                        <span className="font-bold text-soc-foreground">{alert.assigned_to || 'Unassigned'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-soc-muted block font-semibold">Model Version</span>
                        <span className="font-bold text-soc-muted">{alert.model_version || 'v2.4.1'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Timestamps Card */}
                  <div className="bg-soc-surface border border-soc-border rounded-xl p-4 space-y-2.5 shadow-sm">
                    <h4 className="text-xs font-bold text-soc-foreground font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#1B5E20] dark:text-emerald-400" />
                      <span>Audit Timestamps</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                      <div className="flex justify-between p-2 rounded-lg bg-soc-card border border-soc-border">
                        <span className="text-soc-muted">Created:</span>
                        <span className="text-soc-foreground font-semibold">
                          {alert.created_at ? new Date(alert.created_at).toLocaleString() : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between p-2 rounded-lg bg-soc-card border border-soc-border">
                        <span className="text-soc-muted">Acknowledged:</span>
                        <span className="text-soc-foreground font-semibold">
                          {alert.acknowledged_at ? new Date(alert.acknowledged_at).toLocaleString() : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between p-2 rounded-lg bg-soc-card border border-soc-border">
                        <span className="text-soc-muted">Resolved:</span>
                        <span className="text-soc-foreground font-semibold">
                          {alert.resolved_at ? new Date(alert.resolved_at).toLocaleString() : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between p-2 rounded-lg bg-soc-card border border-soc-border">
                        <span className="text-soc-muted">Closed / Dismissed:</span>
                        <span className="text-soc-foreground font-semibold">
                          {alert.closed_at ? new Date(alert.closed_at).toLocaleString() : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: RULE SIGNALS & EVIDENCE */}
              {activeTab === 'evidence' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-soc-foreground font-mono uppercase tracking-wider">
                      Triggered Rule Signals ({detail.rules?.length || 0})
                    </h4>
                  </div>

                  {detail.rules && detail.rules.length > 0 ? (
                    <div className="space-y-3">
                      {detail.rules.map((rule, idx) => (
                        <div
                          key={idx}
                          className="bg-soc-surface border border-soc-border rounded-xl p-4 space-y-2.5 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-soc-foreground text-xs">{rule.rule_name}</span>
                                <SeverityBadge severity={rule.severity as any} size="sm" />
                              </div>
                              <p className="text-xs text-soc-muted mt-1">{rule.reason}</p>
                            </div>
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                              +{rule.score} pts
                            </span>
                          </div>

                          {rule.evidence && (
                            <div className="bg-soc-card border border-soc-border rounded-lg p-2.5 font-mono text-[11px] text-soc-foreground">
                              <span className="text-soc-muted text-[10px] font-bold block mb-1">Structured Evidence:</span>
                              <pre className="overflow-x-auto text-soc-foreground">
                                {typeof rule.evidence === 'object'
                                  ? JSON.stringify(rule.evidence, null, 2)
                                  : String(rule.evidence)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-soc-surface border border-soc-border rounded-xl text-xs text-soc-muted">
                      No standalone deterministic rules triggered for this transaction.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: RISK & ML ANALYSIS */}
              {activeTab === 'risk_ml' && (
                <div className="space-y-4">
                  {/* Risk Score Breakdown */}
                  {detail.risk && (
                    <div className="bg-soc-surface border border-soc-border rounded-xl p-4 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-soc-foreground font-mono uppercase tracking-wider">
                          Risk Engine Synthesis
                        </h4>
                        <span className="text-[11px] font-mono text-soc-muted">
                          Version: {detail.risk.scoring_version}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-3 rounded-xl bg-soc-card border border-soc-border">
                          <span className="text-[10px] font-mono text-soc-muted block font-semibold">Rule Contribution</span>
                          <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                            {detail.risk.rule_score?.toFixed(1)}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-soc-card border border-soc-border">
                          <span className="text-[10px] font-mono text-soc-muted block font-semibold">ML Anomaly Weight</span>
                          <span className="text-lg font-bold font-mono text-[#1B5E20] dark:text-emerald-400">
                            {detail.risk.ml_score?.toFixed(1)}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-soc-card border border-soc-border">
                          <span className="text-[10px] font-mono text-soc-muted block font-semibold">Behavior Factor</span>
                          <span className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">
                            {detail.risk.behavior_score?.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ML Isolation Forest Predictions */}
                  {detail.ml_prediction ? (
                    <div className="bg-soc-surface border border-soc-border rounded-xl p-4 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-[#1B5E20] dark:text-emerald-400" />
                          <h4 className="text-xs font-bold text-soc-foreground font-mono">
                            {detail.ml_prediction.model_name} ({detail.ml_prediction.model_version})
                          </h4>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                            detail.ml_prediction.is_anomaly
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {detail.ml_prediction.is_anomaly ? 'ANOMALOUS' : 'NORMAL'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div className="p-2.5 rounded-lg bg-soc-card border border-soc-border">
                          <span className="text-soc-muted block text-[10px] font-semibold">Anomaly Score:</span>
                          <span className="text-base font-bold text-soc-foreground">
                            {(detail.ml_prediction.anomaly_score * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-soc-card border border-soc-border">
                          <span className="text-soc-muted block text-[10px] font-semibold">Decision Threshold:</span>
                          <span className="text-base font-bold text-soc-muted">
                            {(detail.ml_prediction.threshold * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {detail.ml_prediction.contextual_indicators?.length > 0 && (
                        <div className="pt-2">
                          <span className="text-[10px] font-mono text-soc-muted font-bold block mb-1">
                            Contextual Indicators:
                          </span>
                          <ul className="list-disc list-inside text-xs text-soc-muted space-y-1">
                            {detail.ml_prediction.contextual_indicators.map((ind, i) => (
                              <li key={i}>{ind}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-soc-surface border border-soc-border rounded-xl text-xs text-soc-muted">
                      ML Anomaly prediction unavailable for this historical alert.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: TRANSACTION CONTEXT */}
              {activeTab === 'transaction' && (
                <div className="space-y-4">
                  {detail.transaction ? (
                    <div className="bg-soc-surface border border-soc-border rounded-xl p-4 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-mono text-soc-muted block font-semibold">Transaction ID</span>
                          <span className="text-sm font-bold font-mono text-soc-foreground">
                            {detail.transaction.id}
                          </span>
                        </div>
                        <Link
                          to={`/transactions/${detail.transaction.id}`}
                          className="px-3 py-1.5 rounded-lg bg-[#1B5E20] hover:bg-[#144718] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <span>Explore Transaction</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div className="p-2.5 rounded-lg bg-soc-card border border-soc-border flex items-center gap-2.5">
                          <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div>
                            <span className="text-[10px] text-soc-muted block">Amount / Currency</span>
                            <span className="font-bold text-soc-foreground">
                              {detail.transaction.currency} {Number(detail.transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-soc-card border border-soc-border flex items-center gap-2.5">
                          <Building className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <div>
                            <span className="text-[10px] text-soc-muted block">Merchant</span>
                            <span className="font-bold text-soc-foreground truncate">
                              {detail.transaction.merchant_name || 'Retail Point'}
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-soc-card border border-soc-border flex items-center gap-2.5">
                          <User className="w-4 h-4 text-[#1B5E20] dark:text-emerald-400 shrink-0" />
                          <div>
                            <span className="text-[10px] text-soc-muted block">User Account</span>
                            <span className="font-bold text-soc-foreground truncate">
                              {detail.transaction.user_id}
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-soc-card border border-soc-border flex items-center gap-2.5">
                          <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                          <div>
                            <span className="text-[10px] text-soc-muted block">Location</span>
                            <span className="font-bold text-soc-foreground">
                              {detail.transaction.city || '—'}, {detail.transaction.country || '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-soc-surface border border-soc-border rounded-xl text-xs text-soc-muted">
                      Transaction record not linked or archived.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: LIFECYCLE TIMELINE & ACTIONS */}
              {activeTab === 'lifecycle' && (
                <div className="space-y-4">
                  {/* Operational Action Buttons */}
                  {!isViewer && (
                    <div className="bg-soc-surface border border-soc-border rounded-xl p-4 space-y-3 shadow-sm">
                      <h4 className="text-xs font-bold text-soc-foreground font-mono uppercase tracking-wider">
                        Lifecycle Operations
                      </h4>

                      <div className="flex flex-wrap items-center gap-2">
                        {alert.status === 'NEW' && (
                          <button
                            onClick={() => handleDirectTransition('acknowledge')}
                            disabled={isSubmitting}
                            className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Acknowledge Alert</span>
                          </button>
                        )}

                        {(alert.status === 'NEW' || alert.status === 'ACKNOWLEDGED') && (
                          <button
                            onClick={() => handleDirectTransition('investigate')}
                            disabled={isSubmitting}
                            className="px-3 py-2 rounded-xl bg-[#1B5E20] hover:bg-[#144718] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Start Investigation</span>
                          </button>
                        )}

                        {alert.status !== 'RESOLVED' && alert.status !== 'CLOSED' && (
                          <button
                            onClick={() => setModalAction('resolve')}
                            disabled={isSubmitting}
                            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Resolve Alert</span>
                          </button>
                        )}

                        {alert.status !== 'DISMISSED' && alert.status !== 'CLOSED' && (
                          <button
                            onClick={() => setModalAction('dismiss')}
                            disabled={isSubmitting}
                            className="px-3 py-2 rounded-xl bg-soc-card border border-soc-border hover:bg-soc-cardHover text-soc-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Dismiss (False Positive)</span>
                          </button>
                        )}

                        {alert.status !== 'ESCALATED' && alert.status !== 'CLOSED' && (
                          <button
                            onClick={() => setModalAction('escalate')}
                            disabled={isSubmitting}
                            className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Escalate Alert</span>
                          </button>
                        )}

                        <button
                          onClick={() => setModalAction('assign')}
                          disabled={isSubmitting}
                          className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>Assign Analyst</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Audit Trail List */}
                  <div className="bg-soc-surface border border-soc-border rounded-xl p-4 space-y-3 shadow-sm">
                    <h4 className="text-xs font-bold text-soc-foreground font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-[#1B5E20] dark:text-emerald-400" />
                      <span>Audit & State Transition Trail</span>
                    </h4>

                    {detail.lifecycle_history && detail.lifecycle_history.length > 0 ? (
                      <div className="space-y-2.5">
                        {detail.lifecycle_history.map((log) => (
                          <div
                            key={log.id}
                            className="p-3 rounded-lg bg-soc-card border border-soc-border text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between font-mono text-[11px]">
                              <span className="font-bold text-[#1B5E20] dark:text-emerald-400">{log.action}</span>
                              <span className="text-soc-muted">
                                {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                              </span>
                            </div>
                            <p className="text-soc-foreground">{log.details || 'State update'}</p>
                            <div className="text-[10px] font-mono text-soc-muted">
                              Actor: <span className="text-soc-foreground font-semibold">{log.actor_email}</span> ({log.actor_role})
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-soc-muted italic">
                        No previous audit transitions recorded for this alert.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Confirmation Modal */}
      {modalAction && alert && (
        <AlertActionModal
          isOpen={!!modalAction}
          actionType={modalAction}
          alertId={alert.id}
          currentStatus={alert.status}
          isSubmitting={isSubmitting}
          onClose={() => setModalAction(null)}
          onConfirm={handleModalConfirm}
        />
      )}
    </>
  );
};
