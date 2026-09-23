import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useWebSocket } from '../context/WebSocketContext';
import { CaseDetail as CaseDetailType, Case } from '../types';
import { SeverityBadge } from '../components/shared/SeverityBadge';
import { CaseActionModal, CaseActionType } from '../components/cases/CaseActionModal';
import { LinkEntityModal } from '../components/cases/LinkEntityModal';
import {
  ArrowLeft,
  FolderLock,
  MessageSquare,
  FileCheck,
  ShieldCheck,
  Clock,
  User,
  Plus,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  ShieldAlert,
  Bell,
  CreditCard,
  History,
  Trash2,
  FileText,
  Radio,
  Send,
  UserCheck,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

export const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { subscribe } = useWebSocket();

  const [caseData, setCaseData] = useState<CaseDetailType | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'transactions' | 'notes' | 'evidence' | 'timeline'>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Note composer state
  const [newNoteContent, setNewNoteContent] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);

  // Modals state
  const [actionModalOpen, setActionModalOpen] = useState<boolean>(false);
  const [actionModalType, setActionModalType] = useState<CaseActionType>('STATUS');
  const [linkModalOpen, setLinkModalOpen] = useState<boolean>(false);
  const [linkEntityType, setLinkEntityType] = useState<'ALERT' | 'TRANSACTION'>('ALERT');

  const fetchCase = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiClient.get<CaseDetailType>(`/cases/${id}`);
      setCaseData(res.data);
      setErrorMsg('');
    } catch (err: any) {
      console.error('Failed to load case detail:', err);
      setErrorMsg(err.response?.data?.detail || 'Case not found or access denied.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  // WebSocket live updates
  useEffect(() => {
    const unsub = subscribe('case.updated', (payload: any) => {
      if (payload && (payload.id === id || payload.entity_id === id)) {
        fetchCase();
      }
    });
    return () => {
      unsub();
    };
  }, [subscribe, id, fetchCase]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !id) return;

    setIsSubmittingNote(true);
    try {
      await apiClient.post(`/cases/${id}/notes`, {
        content: newNoteContent.trim(),
      });
      setNewNoteContent('');
      await fetchCase();
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleUnlinkAlert = async (alertId: string) => {
    if (!id) return;
    if (!window.confirm(`Are you sure you want to unlink alert ${alertId} from this case?`)) return;

    try {
      await apiClient.delete(`/cases/${id}/alerts/${alertId}`);
      await fetchCase();
    } catch (err) {
      console.error('Failed to unlink alert:', err);
    }
  };

  const handleUnlinkTransaction = async (txnId: string) => {
    if (!id) return;
    if (!window.confirm(`Are you sure you want to unlink transaction ${txnId} from this case?`)) return;

    try {
      await apiClient.delete(`/cases/${id}/transactions/${txnId}`);
      await fetchCase();
    } catch (err) {
      console.error('Failed to unlink transaction:', err);
    }
  };

  const openActionModal = (type: CaseActionType) => {
    setActionModalType(type);
    setActionModalOpen(true);
  };

  const openLinkModal = (type: 'ALERT' | 'TRANSACTION') => {
    setLinkEntityType(type);
    setLinkModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            OPEN
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            INVESTIGATING
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            PENDING
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            RESOLVED
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            CLOSED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-32 bg-slate-800/60 rounded-xl" />
        <div className="h-32 bg-slate-800/40 rounded-2xl" />
        <div className="h-20 bg-slate-800/30 rounded-xl" />
        <div className="h-96 bg-slate-800/40 rounded-2xl" />
      </div>
    );
  }

  if (errorMsg || !caseData) {
    return (
      <div className="bg-soc-card border border-soc-border rounded-2xl p-12 text-center space-y-4 max-w-lg mx-auto mt-10">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Investigation Case Unavailable</h2>
        <p className="text-xs text-slate-400">{errorMsg || 'Could not retrieve case information.'}</p>
        <button
          onClick={() => navigate('/cases')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Cases</span>
        </button>
      </div>
    );
  }

  const alerts = caseData.alerts || [];
  const transactions = caseData.transactions || [];
  const notes = caseData.notes || [];
  const evidence = caseData.evidence || [];
  const history = caseData.history || [];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Breadcrumb / Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/cases')}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Case Management</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-mono">{caseData.id}</span>
          <span>•</span>
          <span className="flex items-center gap-1 text-emerald-400 font-mono">
            <Radio className="w-3 h-3 animate-pulse" /> Live Workspace
          </span>
        </div>
      </div>

      {/* Case Header Card */}
      <div className="bg-soc-card border border-soc-border p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-xl">
                {caseData.id}
              </span>
              <SeverityBadge severity={caseData.severity} />
              {getStatusBadge(caseData.status)}
            </div>

            <h1 className="text-xl font-bold text-white tracking-tight">
              {caseData.title}
            </h1>

            {caseData.description && (
              <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
                {caseData.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Subject:</span>
                <span className="font-mono text-white">{caseData.user_id || 'N/A'}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Assigned:</span>
                <span className="font-mono text-indigo-300">
                  {caseData.assigned_analyst || 'Unassigned'}
                </span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Opened:</span>
                <span>{formatDateTime(caseData.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => openActionModal('STATUS')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>Change Status</span>
            </button>

            <button
              onClick={() => openActionModal('ASSIGN')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700"
            >
              <UserCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Reassign</span>
            </button>

            {caseData.status !== 'RESOLVED' && caseData.status !== 'CLOSED' && (
              <button
                onClick={() => openActionModal('RESOLVE')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Resolve Case</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-soc-card border border-soc-border p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Risk Assessment</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {caseData.risk_score?.toFixed(1) || '0.0'}
            <span className="text-xs text-slate-400 font-normal"> / 100</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Composite Threat Score</div>
        </div>

        <div className="bg-soc-card border border-soc-border p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Linked Alerts</span>
            <Bell className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {alerts.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Associated security events</div>
        </div>

        <div className="bg-soc-card border border-soc-border p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Linked Transactions</span>
            <CreditCard className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {transactions.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Monitored financial orders</div>
        </div>

        <div className="bg-soc-card border border-soc-border p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Adjudication</span>
            <FileCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-white truncate">
            {caseData.resolution || 'Pending Review'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {caseData.resolved_by ? `By ${caseData.resolved_by}` : 'Active investigation'}
          </div>
        </div>
      </div>

      {/* Investigation Workspace Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Overview & Summary', icon: Layers },
          { id: 'alerts', label: `Linked Alerts (${alerts.length})`, icon: Bell },
          { id: 'transactions', label: `Linked Transactions (${transactions.length})`, icon: CreditCard },
          { id: 'notes', label: `Analyst Notes (${notes.length})`, icon: MessageSquare },
          { id: 'evidence', label: `Evidence Binder (${evidence.length})`, icon: FileText },
          { id: 'timeline', label: `Audit Timeline (${history.length})`, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
                isActive
                  ? 'border-indigo-500 text-white bg-indigo-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2 space-y-6">
            {/* Description & Hypothesis */}
            <div className="bg-soc-card border border-soc-border p-5 rounded-xl space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Investigation Description & Context</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                {caseData.description || 'No detailed investigation description recorded.'}
              </p>
            </div>

            {/* Resolution Findings (if resolved) */}
            {caseData.resolution && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Resolution Outcome: {caseData.resolution}</span>
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-300/80">
                    {formatDateTime(caseData.resolved_at)}
                  </span>
                </div>
                <p className="text-xs text-slate-300 bg-slate-900/60 p-4 rounded-xl border border-emerald-500/20 leading-relaxed">
                  {caseData.resolution_notes || 'No notes documented.'}
                </p>
                <div className="text-[11px] text-slate-400">
                  Adjudicated by: <span className="font-mono text-slate-200">{caseData.resolved_by}</span>
                </div>
              </div>
            )}

            {/* Quick Actions Panel */}
            <div className="bg-soc-card border border-soc-border p-5 rounded-xl space-y-3">
              <h3 className="text-sm font-bold text-white">Investigation Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => openLinkModal('ALERT')}
                  className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700/80 transition-all"
                >
                  <Bell className="w-4 h-4 text-rose-400" />
                  <span>Attach Alert</span>
                </button>

                <button
                  onClick={() => openLinkModal('TRANSACTION')}
                  className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700/80 transition-all"
                >
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  <span>Attach Transaction</span>
                </button>

                <button
                  onClick={() => openActionModal('EVIDENCE')}
                  className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700/80 transition-all"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Add Evidence</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Subject Customer Context */}
          <div className="space-y-6">
            <div className="bg-soc-card border border-soc-border p-5 rounded-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-purple-400" />
                <span>Subject Customer Context</span>
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">User ID:</span>
                  <span className="font-mono text-white font-semibold">{caseData.user_id || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Investigation Status:</span>
                  <span className="font-mono text-indigo-300">{caseData.status}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Severity Tier:</span>
                  <span className="font-mono text-amber-400">{caseData.severity}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Case Created:</span>
                  <span className="text-slate-300">{formatDateTime(caseData.created_at)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Last Modified:</span>
                  <span className="text-slate-300">{formatDateTime(caseData.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Linked Alerts */}
      {activeTab === 'alerts' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-rose-400" />
              <span>Security Alerts Associated with Case ({alerts.length})</span>
            </h3>
            <button
              onClick={() => openLinkModal('ALERT')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Link Alert</span>
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="bg-soc-card border border-soc-border rounded-xl p-8 text-center text-slate-400 text-xs">
              No security alerts are currently associated with this case.
            </div>
          ) : (
            <div className="bg-soc-card border border-soc-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold">
                    <th className="py-3 px-4">Alert ID</th>
                    <th className="py-3 px-4">Detection Reason / Title</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Risk Score</th>
                    <th className="py-3 px-4">Triggered At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {alerts.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-indigo-400 font-medium">
                        {a.alert_id || a.id}
                      </td>
                      <td className="py-3 px-4 text-white font-medium">
                        {a.title || a.alert_reason || 'Security Alert'}
                      </td>
                      <td className="py-3 px-4">
                        <SeverityBadge severity={a.severity} />
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {a.status}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {a.risk_score?.toFixed(1) || '0.0'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {formatDateTime(a.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/alerts/${a.id}`)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Inspect Alert in Alert Center"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleUnlinkAlert(a.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Unlink Alert"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Linked Transactions */}
      {activeTab === 'transactions' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-400" />
              <span>Financial Transactions Associated with Case ({transactions.length})</span>
            </h3>
            <button
              onClick={() => openLinkModal('TRANSACTION')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Link Transaction</span>
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="bg-soc-card border border-soc-border rounded-xl p-8 text-center text-slate-400 text-xs">
              No financial transactions are currently attached to this case.
            </div>
          ) : (
            <div className="bg-soc-card border border-soc-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold">
                    <th className="py-3 px-4">Transaction ID</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Merchant</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Risk Score</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-indigo-400 font-medium">
                        {t.id}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {t.currency}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {t.merchant_name || 'Unknown'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {t.payment_method}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-white">
                          {t.risk_score?.toFixed(1) || '0.0'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {t.status}
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {formatDateTime(t.timestamp)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/transactions/${t.id}`)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Inspect Transaction in Explorer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleUnlinkTransaction(t.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Unlink Transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Investigation Notes */}
      {activeTab === 'notes' && (
        <div className="space-y-6 animate-fade-in max-w-4xl">
          {/* Note Composer */}
          <form onSubmit={handleAddNote} className="bg-soc-card border border-soc-border p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>Add Investigation Note</span>
            </h3>
            <textarea
              rows={3}
              required
              placeholder="Record investigative findings, customer interviews, device analysis, or decision rationale..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingNote || !newNoteContent.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post Note</span>
              </button>
            </div>
          </form>

          {/* Notes Feed */}
          <div className="space-y-3">
            {notes.length === 0 ? (
              <div className="bg-soc-card border border-soc-border rounded-xl p-8 text-center text-slate-400 text-xs">
                No investigation notes have been recorded for this case yet.
              </div>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="bg-soc-card border border-soc-border p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                        {note.author.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-semibold text-white">{note.author}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{formatDateTime(note.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap pl-8">
                    {note.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Evidence Binder */}
      {activeTab === 'evidence' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Structured Evidence Artifacts ({evidence.length})</span>
            </h3>
            <button
              onClick={() => openActionModal('EVIDENCE')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Attach Evidence</span>
            </button>
          </div>

          {evidence.length === 0 ? (
            <div className="bg-soc-card border border-soc-border rounded-xl p-8 text-center text-slate-400 text-xs">
              No evidence artifacts attached to this case.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {evidence.map((ev) => (
                <div key={ev.id} className="bg-soc-card border border-soc-border p-4 rounded-xl space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-white">{ev.title}</h4>
                      {ev.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{ev.description}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {ev.evidence_type}
                    </span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-48">
                    <pre className="text-[11px]">{JSON.stringify(ev.payload || ev.metadata_json, null, 2)}</pre>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                    <span>Uploaded by: <span className="text-slate-200">{ev.uploaded_by}</span></span>
                    <span>{formatDateTime(ev.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Audit Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-4 animate-fade-in max-w-3xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-purple-400" />
            <span>Case Lifecycle & Audit History ({history.length} events)</span>
          </h3>

          {history.length === 0 ? (
            <div className="bg-soc-card border border-soc-border rounded-xl p-8 text-center text-slate-400 text-xs">
              No timeline history recorded for this case.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {history.map((h) => (
                <div key={h.id} className="relative group">
                  <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-slate-900" />
                  <div className="bg-soc-card border border-soc-border p-4 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-300 font-mono">
                        {h.action}
                      </span>
                      <span className="text-[11px] text-slate-400">{formatDateTime(h.created_at)}</span>
                    </div>

                    {h.from_status && h.to_status && (
                      <div className="text-xs text-slate-300 font-mono">
                        <span className="text-slate-400">{h.from_status}</span> &rarr;{' '}
                        <span className="text-indigo-400 font-semibold">{h.to_status}</span>
                      </div>
                    )}

                    {h.note && (
                      <p className="text-xs text-slate-300">{h.note}</p>
                    )}

                    <div className="text-[11px] text-slate-400 pt-1">
                      Actor: <span className="text-slate-200 font-mono">{h.actor_name || 'System'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Modal */}
      <CaseActionModal
        isOpen={actionModalOpen}
        actionType={actionModalType}
        caseData={caseData}
        onClose={() => setActionModalOpen(false)}
        onSuccess={() => fetchCase()}
      />

      {/* Link Entity Modal */}
      <LinkEntityModal
        isOpen={linkModalOpen}
        entityType={linkEntityType}
        caseId={caseData.id}
        onClose={() => setLinkModalOpen(false)}
        onSuccess={() => fetchCase()}
      />
    </div>
  );
};
