import React, { useState, useEffect } from 'react';
import { X, Sliders, Save, CheckCircle2, AlertOctagon } from 'lucide-react';
import { mlMonitoringApi } from '../../services/mlMonitoringApi';
import { MLMonitoringConfig } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const MonitoringConfigModal: React.FC<Props> = ({ isOpen, onClose, onSaved }) => {
  const [config, setConfig] = useState<MLMonitoringConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await mlMonitoringApi.getMonitoringConfig();
      setConfig(data);
    } catch (err: any) {
      setErrorMsg('Failed to load MLOps monitoring configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await mlMonitoringApi.updateMonitoringConfig(config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      if (onSaved) onSaved();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-soc-card border border-soc-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 border-b border-soc-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">MLOps Monitoring Thresholds & Guardrails</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto">
          {isLoading || !config ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6 text-xs">
              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Monitoring thresholds updated and logged to audit system.</span>
                </div>
              )}

              {/* Statistical Drift Thresholds */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                  Statistical Drift Sensitivity (PSI / KS)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Feature Drift PSI Warning Threshold
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.feature_drift_psi_warning}
                      onChange={(e) =>
                        setConfig({ ...config, feature_drift_psi_warning: parseFloat(e.target.value) })
                      }
                      className="w-full bg-soc-bg border border-soc-border rounded-xl p-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                    <span className="text-[10px] text-slate-500">Standard rule: 0.10 indicates moderate shift</span>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Feature Drift PSI Critical Threshold
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.feature_drift_psi_critical}
                      onChange={(e) =>
                        setConfig({ ...config, feature_drift_psi_critical: parseFloat(e.target.value) })
                      }
                      className="w-full bg-soc-bg border border-soc-border rounded-xl p-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                    <span className="text-[10px] text-slate-500">Standard rule: 0.25 indicates significant shift</span>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Prediction Score Shift Warning (PSI)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.prediction_score_drift_psi_warning}
                      onChange={(e) =>
                        setConfig({ ...config, prediction_score_drift_psi_warning: parseFloat(e.target.value) })
                      }
                      className="w-full bg-soc-bg border border-soc-border rounded-xl p-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Minimum Sample Size Safeguard
                    </label>
                    <input
                      type="number"
                      value={config.minimum_sample_size}
                      onChange={(e) =>
                        setConfig({ ...config, minimum_sample_size: parseInt(e.target.value, 10) })
                      }
                      className="w-full bg-soc-bg border border-soc-border rounded-xl p-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                    <span className="text-[10px] text-slate-500">Below this size, status reports UNKNOWN</span>
                  </div>
                </div>
              </div>

              {/* Latency & Quality Guardrails */}
              <div className="space-y-3 border-t border-soc-border pt-4">
                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                  Inference Latency & Error Guardrails
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Inference p95 Latency Warning (ms)
                    </label>
                    <input
                      type="number"
                      value={config.latency_p95_warning_ms}
                      onChange={(e) =>
                        setConfig({ ...config, latency_p95_warning_ms: parseFloat(e.target.value) })
                      }
                      className="w-full bg-soc-bg border border-soc-border rounded-xl p-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Inference p95 Latency Critical (ms)
                    </label>
                    <input
                      type="number"
                      value={config.latency_p95_critical_ms}
                      onChange={(e) =>
                        setConfig({ ...config, latency_p95_critical_ms: parseFloat(e.target.value) })
                      }
                      className="w-full bg-soc-bg border border-soc-border rounded-xl p-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Inference Failure Rate Critical (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.error_rate_critical_threshold}
                      onChange={(e) =>
                        setConfig({ ...config, error_rate_critical_threshold: parseFloat(e.target.value) })
                      }
                      className="w-full bg-soc-bg border border-soc-border rounded-xl p-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Missing Feature Rate Warning (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.missing_feature_rate_warning}
                      onChange={(e) =>
                        setConfig({ ...config, missing_feature_rate_warning: parseFloat(e.target.value) })
                      }
                      className="w-full bg-soc-bg border border-soc-border rounded-xl p-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-soc-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all"
                >
                  <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                  <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
