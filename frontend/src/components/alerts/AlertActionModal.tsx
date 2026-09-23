import React, { useState } from 'react';
import { X, CheckCircle, ShieldAlert, Ban, UserCheck, AlertTriangle } from 'lucide-react';

export type AlertActionType = 'resolve' | 'dismiss' | 'escalate' | 'assign';

interface AlertActionModalProps {
  isOpen: boolean;
  actionType: AlertActionType | null;
  alertId: string;
  currentStatus: string;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (payload: { reason?: string; note?: string; assignedTo?: string }) => Promise<void>;
}

export const AlertActionModal: React.FC<AlertActionModalProps> = ({
  isOpen,
  actionType,
  alertId,
  currentStatus,
  isSubmitting,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !actionType) return null;

  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [assignedTo, setAssignedTo] = useState('USR-ANALYST-01');

  const getActionConfig = () => {
    switch (actionType) {
      case 'resolve':
        return {
          title: 'Resolve Security Alert',
          description: 'Mark this alert as investigated and resolved. Specify resolution findings.',
          icon: CheckCircle,
          iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          confirmBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white',
          confirmText: 'Confirm Resolution',
          reasons: [
            'Legitimate Customer Activity',
            'Confirmed Fraud - Transaction Blocked',
            'Customer Verified via Out-of-Band Auth',
            'Rule Threshold Tuning Verified',
            'Other Resolution',
          ],
        };
      case 'dismiss':
        return {
          title: 'Dismiss Alert as False Positive',
          description: 'Dismiss this detection from the active queue without escalating.',
          icon: Ban,
          iconColor: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
          confirmBtn: 'bg-slate-700 hover:bg-slate-600 text-white',
          confirmText: 'Dismiss Alert',
          reasons: [
            'Benign False Positive',
            'Known Merchant Anomaly',
            'Duplicate Alert Signal',
            'User Travel Pattern Verified',
            'Other Reason',
          ],
        };
      case 'escalate':
        return {
          title: 'Escalate Alert to Tier 2',
          description: 'Escalate this high-severity detection for senior incident review.',
          icon: ShieldAlert,
          iconColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
          confirmBtn: 'bg-rose-600 hover:bg-rose-500 text-white',
          confirmText: 'Escalate Alert',
          reasons: [
            'Critical Multivariate Outlier',
            'Possible Account Takeover Syndicate',
            'Multi-Card Velocity Spike',
            'Cross-Border Risk Pattern',
            'Requires Management Audit',
          ],
        };
      case 'assign':
        return {
          title: 'Assign Alert to Analyst',
          description: 'Assign ownership of this alert investigation to a team member.',
          icon: UserCheck,
          iconColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
          confirmBtn: 'bg-blue-600 hover:bg-blue-500 text-white',
          confirmText: 'Assign Alert',
          reasons: [],
        };
    }
  };

  const config = getActionConfig();
  const Icon = config.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm({
      reason: reason || (config.reasons[0] || 'Default Action'),
      note,
      assignedTo: actionType === 'assign' ? assignedTo : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-soc-card border border-soc-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${config.iconColor}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">{config.title}</h2>
              <p className="text-xs font-mono text-slate-400">Alert ID: {alertId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-soc-bg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300">{config.description}</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {actionType !== 'assign' && config.reasons.length > 0 && (
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Primary Rationale</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {config.reasons.map((r, i) => (
                  <option key={i} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}

          {actionType === 'assign' && (
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Select Analyst</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value="USR-ANALYST-01">USR-ANALYST-01 (Sarah Connor)</option>
                <option value="USR-ANALYST-02">USR-ANALYST-02 (Alex Chen)</option>
                <option value="USR-ADMIN-01">USR-ADMIN-01 (Security Admin)</option>
              </select>
            </div>
          )}

          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-1">Investigation Note (Optional)</label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add investigation context, customer callback notes, or rule feedback..."
              className="w-full bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-soc-bg border border-soc-border hover:bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 ${config.confirmBtn} disabled:opacity-50`}
            >
              {isSubmitting ? 'Processing...' : config.confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
