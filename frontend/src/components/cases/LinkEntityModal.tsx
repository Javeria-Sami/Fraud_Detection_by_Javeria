import React, { useState } from 'react';
import { X, Link2, Bell, CreditCard, ShieldAlert } from 'lucide-react';
import { apiClient } from '../../services/api';
import { Case } from '../../types';

interface LinkEntityModalProps {
  isOpen: boolean;
  entityType: 'ALERT' | 'TRANSACTION';
  caseId: string;
  onClose: () => void;
  onSuccess: (updatedCase: Case) => void;
}

export const LinkEntityModal: React.FC<LinkEntityModalProps> = ({
  isOpen,
  entityType,
  caseId,
  onClose,
  onSuccess,
}) => {
  const [entityId, setEntityId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isAlert = entityType === 'ALERT';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityId.trim()) {
      setErrorMsg(`Please enter a valid ${isAlert ? 'Alert ID' : 'Transaction ID'}.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      let res;
      if (isAlert) {
        res = await apiClient.post<Case>(`/cases/${caseId}/alerts`, {
          alert_id: entityId.trim(),
        });
      } else {
        res = await apiClient.post<Case>(`/cases/${caseId}/transactions`, {
          transaction_id: entityId.trim(),
        });
      }

      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      console.error(`Failed to link ${entityType}:`, err);
      const msg = err.response?.data?.detail || `Failed to link ${entityType}.`;
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-soc-card border border-soc-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              {isAlert ? <Bell className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Link {isAlert ? 'Security Alert' : 'Transaction'}
              </h2>
              <p className="text-xs text-slate-400">Attach related event to Case {caseId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {isAlert ? 'Alert ID' : 'Transaction ID'} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={isAlert ? 'e.g. ALT-1004' : 'e.g. TXN-10001'}
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {isAlert
                ? 'The alert will be associated with this case and transitioned to INVESTIGATING status.'
                : 'The transaction will be linked to this case for evidence tracking and anomaly scoring.'}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Linking...</span>
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  <span>Attach to Case</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
