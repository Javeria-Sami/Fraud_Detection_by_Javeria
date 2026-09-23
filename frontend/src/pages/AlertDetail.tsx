import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AlertInvestigationDetail } from '../types';
import { SeverityBadge } from '../components/shared/SeverityBadge';
import { RiskScoreBadge } from '../components/shared/RiskScoreBadge';
import { AlertActionModal, AlertActionType } from '../components/alerts/AlertActionModal';
import {
  ArrowLeft,
  ShieldAlert,
  Clock,
  User,
  CreditCard,
  Building,
  MapPin,
  ExternalLink,
  RotateCcw,
  Cpu,
  Layers,
  History,
  CheckCircle,
  Ban,
  AlertTriangle,
} from 'lucide-react';

export const AlertDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [modalAction, setModalAction] = useState<AlertActionType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [detail, setDetail] = useState<AlertInvestigationDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<AlertInvestigationDetail>(`/alerts/${id}/investigate`);
      setDetail(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load alert investigation telemetry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDetail();
    }
  }, [id]);

  const alert = detail?.alert;
  const isViewer = user?.role === 'viewer';

  const handleDirectTransition = async (action: 'acknowledge' | 'investigate') => {
    if (!alert) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await apiClient.post(`/alerts/${alert.id}/${action}`, {
        expected_status: alert.status,
      });
      await fetchDetail();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Failed to update alert status.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Failed to execute action.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-48 bg-soc-card rounded-xl" />
        <div className="h-32 bg-soc-card rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 bg-soc-card rounded-2xl" />
          <div className="h-64 bg-soc-card rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div className="bg-soc-card border border-soc-border rounded-2xl p-12 text-center max-w-lg mx-auto mt-10">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <h2 className="text-base font-bold text-white mb-1">Alert Not Found</h2>
        <p className="text-xs text-slate-400 mb-6">
          The requested alert identifier "{id}" does not exist or you lack sufficient clearance.
        </p>
        <button
          onClick={() => navigate('/alerts')}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Alert Center</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-12">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/alerts')}
            className="p-2.5 rounded-xl bg-soc-card border border-soc-border hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-white font-mono">{alert.id}</h1>
              <SeverityBadge severity={alert.severity} size="md" />
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                {alert.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Deep Security Investigation Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDetail}
            className="px-3 py-2 rounded-xl bg-soc-card border border-soc-border hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Top Hero Banner */}
      <div className="bg-soc-card border border-soc-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Primary Detection Rationale</span>
            <h2 className="text-lg font-bold text-white">{alert.alert_reason}</h2>
            <p className="text-xs text-slate-400">
              Generated by pipeline model version <strong className="text-slate-300">{alert.model_version || 'v1.0.0'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-4 self-start md:self-auto">
            <RiskScoreBadge score={alert.risk_score} size="lg" showLevel={true} />
          </div>
        </div>

        {/* Action Toolbar */}
        {!isViewer && (
          <div className="pt-4 border-t border-soc-border/60 flex flex-wrap items-center gap-2.5">
            {alert.status === 'NEW' && (
              <button
                onClick={() => handleDirectTransition('acknowledge')}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Acknowledge Alert</span>
              </button>
            )}

            {(alert.status === 'NEW' || alert.status === 'ACKNOWLEDGED') && (
              <button
                onClick={() => handleDirectTransition('investigate')}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Start Investigation</span>
              </button>
            )}

            {alert.status !== 'RESOLVED' && alert.status !== 'CLOSED' && (
              <button
                onClick={() => setModalAction('resolve')}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Resolve Alert</span>
              </button>
            )}

            {alert.status !== 'DISMISSED' && alert.status !== 'CLOSED' && (
              <button
                onClick={() => setModalAction('dismiss')}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-soc-bg border border-soc-border hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Dismiss (False Positive)</span>
              </button>
            )}

            {alert.status !== 'ESCALATED' && alert.status !== 'CLOSED' && (
              <button
                onClick={() => setModalAction('escalate')}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Escalate Alert</span>
              </button>
            )}

            <button
              onClick={() => setModalAction('assign')}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 hover:bg-blue-600/30 text-xs font-semibold flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>Assign Analyst</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Transaction & Rules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Related Transaction Card */}
          {detail.transaction ? (
            <div className="bg-soc-card border border-soc-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  <span>Linked Financial Transaction</span>
                </h3>
                <Link
                  to={`/transactions/${detail.transaction.id}`}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                >
                  <span>Open Explorer</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-soc-bg border border-soc-border">
                  <span className="text-[10px] text-slate-400 block">Amount</span>
                  <span className="text-sm font-bold text-white">
                    {detail.transaction.currency} {Number(detail.transaction.amount).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-soc-bg border border-soc-border">
                  <span className="text-[10px] text-slate-400 block">User Account</span>
                  <span className="text-sm font-bold text-slate-200">{detail.transaction.user_id}</span>
                </div>
                <div className="p-3 rounded-xl bg-soc-bg border border-soc-border">
                  <span className="text-[10px] text-slate-400 block">Merchant</span>
                  <span className="text-sm font-bold text-slate-200 truncate">{detail.transaction.merchant_name || 'Retail Point'}</span>
                </div>
                <div className="p-3 rounded-xl bg-soc-bg border border-soc-border">
                  <span className="text-[10px] text-slate-400 block">Settlement Status</span>
                  <span className="text-sm font-bold text-emerald-400">{detail.transaction.status}</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Triggered Rule Signals */}
          <div className="bg-soc-card border border-soc-border rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Triggered Fraud Rules ({detail.rules?.length || 0})</span>
            </h3>

            {detail.rules && detail.rules.length > 0 ? (
              <div className="space-y-3">
                {detail.rules.map((rule, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-soc-bg border border-soc-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white text-xs">{rule.rule_name}</span>
                      <span className="font-mono font-bold text-amber-400 text-xs">+{rule.score} pts</span>
                    </div>
                    <p className="text-xs text-slate-300">{rule.reason}</p>
                    {rule.evidence && (
                      <pre className="p-2.5 rounded-lg bg-soc-card border border-soc-border font-mono text-[11px] text-slate-300 overflow-x-auto">
                        {typeof rule.evidence === 'object' ? JSON.stringify(rule.evidence, null, 2) : String(rule.evidence)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No discrete rule triggers on record.</p>
            )}
          </div>
        </div>

        {/* Right Column: ML & Lifecycle Audit */}
        <div className="space-y-6">
          {/* ML Anomaly Card */}
          {detail.ml_prediction && (
            <div className="bg-soc-card border border-soc-border rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span>ML Anomaly Analysis</span>
              </h3>

              <div className="p-3 rounded-xl bg-soc-bg border border-soc-border space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Anomaly Score:</span>
                  <span className="font-bold text-white">{(detail.ml_prediction.anomaly_score * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Decision Threshold:</span>
                  <span className="font-bold text-slate-300">{(detail.ml_prediction.threshold * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Classification:</span>
                  <span className={detail.ml_prediction.is_anomaly ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {detail.ml_prediction.is_anomaly ? 'ANOMALY DETECTED' : 'NORMAL'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Audit History Card */}
          <div className="bg-soc-card border border-soc-border rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400" />
              <span>Lifecycle History</span>
            </h3>

            {detail.lifecycle_history && detail.lifecycle_history.length > 0 ? (
              <div className="space-y-2.5">
                {detail.lifecycle_history.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-soc-bg border border-soc-border text-xs space-y-1">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="font-bold text-blue-400">{log.action}</span>
                      <span className="text-slate-400">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                      </span>
                    </div>
                    <p className="text-slate-300">{log.details || 'Updated'}</p>
                    <div className="text-[10px] font-mono text-slate-400">
                      By: <span className="text-slate-300">{log.actor_email}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No transition history logged yet.</p>
            )}
          </div>
        </div>
      </div>

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
    </div>
  );
};
