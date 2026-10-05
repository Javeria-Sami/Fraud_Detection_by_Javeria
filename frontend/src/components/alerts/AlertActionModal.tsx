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
          iconColor: 'text-emerald-800 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
          confirmBtn: 'bg-[#1B5E20] hover:bg-[#144718] text-white',
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
          iconColor: 'text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20',
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
          iconColor: 'text-rose-700 dark:text-rose-400 bg-rose-500/15 border-rose-500/30',
          confirmBtn: 'bg-rose-700 hover:bg-rose-600 text-white',
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
          iconColor: 'text-emerald-800 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
          confirmBtn: 'bg-[#1B5E20] hover:bg-[#144718] text-white',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-soc-card border border-soc-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${config.iconColor}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-soc-foreground tracking-tight">{config.title}</h2>
              <p className="text-xs font-mono text-soc-muted">Alert ID: {alertId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-soc-muted hover:text-soc-foreground p-1 rounded-lg hover:bg-soc-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-soc-muted">{config.description}</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {actionType !== 'assign' && config.reasons.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-soc-foreground block mb-1">Primary Rationale</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-soc-border rounded-xl px-3 py-2 text-xs text-soc-foreground focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
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
              <label className="text-[11px] font-semibold text-soc-foreground block mb-1">Select Analyst</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-soc-border rounded-xl px-3 py-2 text-xs text-soc-foreground focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono shadow-sm"
              >
                <option value="USR-ANALYST-01">USR-ANALYST-01 (Sarah Connor)</option>
                <option value="USR-ANALYST-02">USR-ANALYST-02 (Alex Chen)</option>
                <option value="USR-ADMIN-01">USR-ADMIN-01 (Security Admin)</option>
              </select>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-soc-foreground block mb-1">Investigation Note (Optional)</label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add investigation context, customer callback notes, or rule feedback..."
              className="w-full bg-white dark:bg-slate-900 border border-soc-border rounded-xl px-3 py-2 text-xs text-soc-foreground placeholder:text-soc-muted focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 resize-none shadow-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-soc-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-soc-surface border border-soc-border hover:bg-soc-card text-soc-foreground text-xs font-semibold transition-colors"
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
