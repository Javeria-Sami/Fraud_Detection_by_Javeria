import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, UserCheck, FilePlus2, AlertCircle } from 'lucide-react';
import { apiClient } from '../../services/api';
import { Case } from '../../types';

export type CaseActionType = 'STATUS' | 'ASSIGN' | 'RESOLVE' | 'EVIDENCE';

interface CaseActionModalProps {
  isOpen: boolean;
  actionType: CaseActionType;
  caseData: Case;
  onClose: () => void;
  onSuccess: (updatedCase: Case) => void;
}

export const CaseActionModal: React.FC<CaseActionModalProps> = ({
  isOpen,
  actionType,
  caseData,
  onClose,
  onSuccess,
}) => {
  // Status State
  const [targetStatus, setTargetStatus] = useState<string>('INVESTIGATING');
  const [statusReason, setStatusReason] = useState<string>('');

  // Assign State
  const [assignedAnalyst, setAssignedAnalyst] = useState<string>(
    caseData.assigned_analyst || 'analyst@fraudshield.io'
  );
  const [assignNote, setAssignNote] = useState<string>('');

  // Resolve State
  const [resolutionOutcome, setResolutionOutcome] = useState<string>('Confirmed Fraud');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  // Evidence State
  const [evidenceTitle, setEvidenceTitle] = useState<string>('');
  const [evidenceType, setEvidenceType] = useState<string>('TRANSACTION_LOG');
  const [evidenceDescription, setEvidenceDescription] = useState<string>('');
  const [evidencePayloadText, setEvidencePayloadText] = useState<string>(
    '{\n  "indicator": "Velocity Spike",\n  "severity": "CRITICAL",\n  "ip": "198.51.100.42"\n}'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      let res;
      if (actionType === 'STATUS') {
        res = await apiClient.post<Case>(`/cases/${caseData.id}/status`, {
          status: targetStatus,
          reason_note: statusReason.trim() || undefined,
          expected_status: caseData.status,
        });
      } else if (actionType === 'ASSIGN') {
        res = await apiClient.post<Case>(`/cases/${caseData.id}/assign`, {
          assigned_analyst: assignedAnalyst,
          note: assignNote.trim() || undefined,
        });
      } else if (actionType === 'RESOLVE') {
        if (!resolutionNotes.trim()) {
          setErrorMsg('Resolution notes are mandatory for case closure.');
          setIsSubmitting(false);
          return;
        }
        res = await apiClient.post<Case>(`/cases/${caseData.id}/resolve`, {
          resolution: resolutionOutcome,
          resolution_notes: resolutionNotes.trim(),
        });
      } else if (actionType === 'EVIDENCE') {
        if (!evidenceTitle.trim()) {
          setErrorMsg('Evidence title is required.');
          setIsSubmitting(false);
          return;
        }
        let parsedPayload = {};
        try {
          parsedPayload = JSON.parse(evidencePayloadText);
        } catch (e) {
          parsedPayload = { raw: evidencePayloadText };
        }
        await apiClient.post(`/cases/${caseData.id}/evidence`, {
          title: evidenceTitle.trim(),
          description: evidenceDescription.trim() || undefined,
          evidence_type: evidenceType,
          payload: parsedPayload,
        });
        // Refetch case
        res = await apiClient.get<Case>(`/cases/${caseData.id}`);
      }

      if (res) {
        onSuccess(res.data);
      }
      onClose();
    } catch (err: any) {
      console.error(`Case action ${actionType} failed:`, err);
      const msg = err.response?.data?.detail || 'Action failed. Please try again.';
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderModalContent = () => {
    switch (actionType) {
      case 'STATUS':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-soc-foreground mb-1.5">
                Target Investigation Status
              </label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-soc-border rounded-xl text-xs text-soc-foreground focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-medium shadow-sm"
              >
                <option value="INVESTIGATING">INVESTIGATING — Active Analyst Investigation</option>
                <option value="PENDING">PENDING — Awaiting External Verification / Customer Info</option>
                <option value="RESOLVED">RESOLVED — Investigation Finalized</option>
                <option value="CLOSED">CLOSED — Terminate Case Lifecycle</option>
                <option value="REOPENED">REOPENED — Reopen Closed Case</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-soc-foreground mb-1.5">
                Transition Reason & Context Note
              </label>
              <textarea
                rows={3}
                placeholder="Explain the reason for this lifecycle state change..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-soc-border rounded-xl text-xs text-soc-foreground placeholder:text-soc-muted focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 resize-none shadow-sm"
              />
            </div>
          </div>
        );

      case 'ASSIGN':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-soc-foreground mb-1.5">
                Assignee
              </label>
              <select
                value={assignedAnalyst}
                onChange={(e) => setAssignedAnalyst(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-soc-border rounded-xl text-xs text-soc-foreground focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono text-[11px] shadow-sm"
              >
                <option value="analyst@fraudshield.io">analyst@fraudshield.io (Senior Analyst)</option>
                <option value="admin@fraudshield.io">admin@fraudshield.io (Lead Admin)</option>
                <option value="tier2_investigator@fraudshield.io">tier2_investigator@fraudshield.io (Tier 2)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-soc-foreground mb-1.5">
                Handover / Assignment Note
              </label>
              <textarea
                rows={3}
                placeholder="Optional assignment instructions or handover details..."
                value={assignNote}
                onChange={(e) => setAssignNote(e.target.value)}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-soc-border rounded-xl text-xs text-soc-foreground placeholder:text-soc-muted focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 resize-none shadow-sm"
              />
            </div>
          </div>
        );

      case 'RESOLVE':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-soc-foreground mb-1.5">
                Adjudication Outcome <span className="text-rose-500">*</span>
              </label>
              <select
                value={resolutionOutcome}
                onChange={(e) => setResolutionOutcome(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-soc-border rounded-xl text-xs text-soc-foreground focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-medium shadow-sm"
              >
                <option value="Confirmed Fraud">Confirmed Fraud (Malicious / Unauthorized)</option>
                <option value="False Positive">False Positive (Benign User Activity)</option>
                <option value="Legitimate Activity">Legitimate Activity (Verified by Cardholder)</option>
                <option value="Suspicious / Inconclusive">Suspicious / Inconclusive (Insufficient Data)</option>
                <option value="Other">Other Operational Resolution</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-soc-foreground mb-1.5">
                Final Investigation Findings & Summary <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="Document conclusive findings, customer contact logs, merchant verification, or mitigation actions taken..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-soc-border rounded-xl text-xs text-soc-foreground placeholder:text-soc-muted focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 resize-none shadow-sm"
              />
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              Resolving this case will automatically synchronize and resolve all associated security alerts and update user risk profiling.
            </div>
          </div>
        );

      case 'EVIDENCE':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-soc-foreground mb-1.5">
                Evidence Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Device Fingerprint Anomaly Header"
                value={evidenceTitle}
                onChange={(e) => setEvidenceTitle(e.target.value)}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-soc-border rounded-xl text-xs text-soc-foreground placeholder:text-soc-muted focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-soc-foreground mb-1.5">
                  Artifact Category
                </label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-soc-border rounded-xl text-xs text-soc-foreground focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                >
                  <option value="TRANSACTION_LOG">Transaction Log</option>
                  <option value="DEVICE_FINGERPRINT">Device Fingerprint</option>
                  <option value="IP_GEO">IP & Geolocation Log</option>
                  <option value="USER_COMMUNICATION">User Communication</option>
                  <option value="DOCUMENT">Document Reference</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-soc-foreground mb-1.5">
                  Brief Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Observed proxy spoofing"
                  value={evidenceDescription}
                  onChange={(e) => setEvidenceDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-soc-border rounded-xl text-xs text-soc-foreground placeholder:text-soc-muted focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-soc-foreground mb-1.5">
                JSON Metadata / Payload
              </label>
              <textarea
                rows={5}
                value={evidencePayloadText}
                onChange={(e) => setEvidencePayloadText(e.target.value)}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-soc-border rounded-xl text-xs font-mono text-emerald-800 dark:text-emerald-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 resize-none shadow-sm"
              />
            </div>
          </div>
        );
    }
  };

  const getHeaderInfo = () => {
    switch (actionType) {
      case 'STATUS':
        return {
          title: 'Update Investigation Status',
          desc: `Current state: ${caseData.status}`,
          icon: ShieldCheck,
          btnText: 'Update Status',
          btnColor: 'bg-[#1B5E20] hover:bg-[#144718]',
        };
      case 'ASSIGN':
        return {
          title: 'Assign / Reassign Case',
          desc: `Current owner: ${caseData.assigned_analyst || 'Unassigned'}`,
          icon: UserCheck,
          btnText: 'Confirm Assignment',
          btnColor: 'bg-[#1B5E20] hover:bg-[#144718]',
        };
      case 'RESOLVE':
        return {
          title: 'Formal Case Adjudication',
          desc: `Adjudicate and resolve case ${caseData.id}`,
          icon: CheckCircle2,
          btnText: 'Resolve & Close Case',
          btnColor: 'bg-[#1B5E20] hover:bg-[#144718]',
        };
      case 'EVIDENCE':
        return {
          title: 'Attach Evidence Artifact',
          desc: `Add structured evidence binder item to ${caseData.id}`,
          icon: FilePlus2,
          btnText: 'Attach Evidence',
          btnColor: 'bg-[#1B5E20] hover:bg-[#144718]',
        };
    }
  };

  const info = getHeaderInfo();
  const Icon = info.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-soc-card border border-soc-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-soc-border bg-soc-surface/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-400">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-soc-foreground">{info.title}</h2>
              <p className="text-xs text-soc-muted">{info.desc}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-soc-muted hover:text-soc-foreground hover:bg-soc-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {renderModalContent()}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-soc-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-soc-surface hover:bg-soc-card text-soc-foreground border border-soc-border text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-md shadow-emerald-900/15 transition-all ${info.btnColor} disabled:opacity-50`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{info.btnText}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
