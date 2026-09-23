import React, { useState } from 'react';
import { X, Play, Clock, CheckCircle2, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import { mlMonitoringApi } from '../../services/mlMonitoringApi';
import { MonitoringRunDetail } from '../../types';
import { ModelHealthBadge } from './ModelHealthBadge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  modelVersionId?: string;
  onSuccess?: () => void;
  existingRunDetail?: MonitoringRunDetail | null;
}

export const MonitoringRunModal: React.FC<Props> = ({
  isOpen,
  onClose,
  modelVersionId,
  onSuccess,
  existingRunDetail,
}) => {
  const [windowHours, setWindowHours] = useState(24);
  const [refDays, setRefDays] = useState(7);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<MonitoringRunDetail | null>(
    existingRunDetail || null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExecute = async () => {
    setIsExecuting(true);
    setErrorMsg(null);
    try {
      const res = await mlMonitoringApi.triggerMonitoringRun({
        model_version_id: modelVersionId,
        monitoring_window_hours: windowHours,
        reference_window_days: refDays,
      });
      setExecutionResult(res);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to execute monitoring run.');
    } finally {
      setIsExecuting(false);
    }
  };

  const activeResult = existingRunDetail || executionResult;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-soc-card border border-soc-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 border-b border-soc-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">
              {existingRunDetail ? `Monitoring Run: ${existingRunDetail.run.id}` : 'Trigger Model Monitoring Run'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {!existingRunDetail && (
            <div className="space-y-4">
              <p className="text-slate-400">
                Execute a comprehensive on-demand MLOps assessment evaluating feature drift (PSI/KS), prediction score shift, data quality integrity, and latency percentiles.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Monitoring Window (Active Batch)</label>
                  <select
                    value={windowHours}
                    onChange={(e) => setWindowHours(Number(e.target.value))}
                    className="w-full bg-soc-bg border border-soc-border rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-purple-500"
                  >
                    <option value={1}>Last 1 Hour</option>
                    <option value={6}>Last 6 Hours</option>
                    <option value={12}>Last 12 Hours</option>
                    <option value={24}>Last 24 Hours</option>
                    <option value={48}>Last 48 Hours</option>
                    <option value={168}>Last 7 Days</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Reference Baseline Window</label>
                  <select
                    value={refDays}
                    onChange={(e) => setRefDays(Number(e.target.value))}
                    className="w-full bg-soc-bg border border-soc-border rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-purple-500"
                  >
                    <option value={3}>Previous 3 Days</option>
                    <option value={7}>Previous 7 Days (Standard)</option>
                    <option value={14}>Previous 14 Days</option>
                    <option value={30}>Previous 30 Days (Extended)</option>
                  </select>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                onClick={handleExecute}
                disabled={isExecuting}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all text-sm"
              >
                <Play className={`w-4 h-4 ${isExecuting ? 'animate-spin' : ''}`} />
                <span>{isExecuting ? 'Executing Statistical Engine...' : 'Run Monitoring Pipeline Now'}</span>
              </button>
            </div>
          )}

          {/* Result Presentation */}
          {activeResult && (
            <div className="space-y-4 border-t border-soc-border pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">Execution Summary</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-purple-500/20 text-purple-300">
                    {activeResult.run.status}
                  </span>
                </div>
                {activeResult.health_status && (
                  <ModelHealthBadge status={activeResult.health_status.health_status} size="sm" />
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
                  <span className="text-[10px] text-slate-400 font-sans">Records Evaluated</span>
                  <div className="text-base font-bold text-white mt-0.5">
                    {activeResult.run.records_evaluated}
                  </div>
                </div>
                <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
                  <span className="text-[10px] text-slate-400 font-sans">Engine Duration</span>
                  <div className="text-base font-bold text-cyan-400 mt-0.5">
                    {activeResult.run.duration_ms ? `${activeResult.run.duration_ms} ms` : '—'}
                  </div>
                </div>
                <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
                  <span className="text-[10px] text-slate-400 font-sans">Feature Version</span>
                  <div className="text-sm font-bold text-purple-400 mt-0.5 truncate">
                    {activeResult.run.feature_version}
                  </div>
                </div>
                <div className="p-3 bg-soc-bg border border-soc-border rounded-xl">
                  <span className="text-[10px] text-slate-400 font-sans">Drift Metrics</span>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">
                    {activeResult.drift_results.length} computed
                  </div>
                </div>
              </div>

              {activeResult.health_status?.reason && (
                <div className="p-3 bg-soc-bg border border-soc-border rounded-xl text-xs space-y-1">
                  <span className="text-slate-400 font-semibold font-sans">Health Evaluation Reason:</span>
                  <p className="font-mono text-slate-200">{activeResult.health_status.reason}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-soc-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
