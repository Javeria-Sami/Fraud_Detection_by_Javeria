import React, { useState, useEffect } from 'react';
import { X, Sliders, Save, CheckCircle2, AlertOctagon } from 'lucide-react';
import { mlRetrainingApi } from '../../../services/mlRetrainingApi';
import { MLRetrainingConfig } from '../../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const RetrainingConfigModal: React.FC<Props> = ({ isOpen, onClose, onSaved }) => {
  const [config, setConfig] = useState<MLRetrainingConfig | null>(null);
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
      const data = await mlRetrainingApi.getConfig();
      setConfig(data);
    } catch (err: any) {
      setErrorMsg('Failed to load MLOps retraining configuration.');
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
      await mlRetrainingApi.updateConfig(config);
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
        {/* Header */}
        <div className="p-5 border-b border-soc-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">Retraining Pipeline Settings & Defaults</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {isLoading || !config ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6 text-xs">
              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 flex items-center gap-2 font-sans">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-2 font-sans">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Retraining settings updated and logged to audit system.</span>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                  Default Hyperparameters
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Default Estimators (n_estimators)
                    </label>
                    <input
                      type="number"
                      value={config.default_n_estimators}
                      onChange={(e) =>
                        setConfig({ ...config, default_n_estimators: parseInt(e.target.value, 10) })
                      }
                      className="w-full bg-soc-bg border border-soc-border rounded-xl p-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Default Contamination Ratio
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.default_contamination}
                      onChange={(e) =>
                        setConfig({ ...config, default_contamination: parseFloat(e.target.value) })
                      }
                      className="w-full bg-soc-bg border border-soc-border rounded-xl p-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Minimum Training Samples Safeguard
                    </label>
                    <input
                      type="number"
                      value={config.minimum_training_samples}
                      onChange={(e) =>
                        setConfig({ ...config, minimum_training_samples: parseInt(e.target.value, 10) })
                      }
                      className="w-full bg-soc-bg border border-soc-border rounded-xl p-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Default Random Seed
                    </label>
                    <input
                      type="number"
                      value={config.default_random_state}
                      onChange={(e) =>
                        setConfig({ ...config, default_random_state: parseInt(e.target.value, 10) })
                      }
                      className="w-full bg-soc-bg border border-soc-border rounded-xl p-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-soc-border pt-4">
                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                  Default Temporal Split Ratios
                </h4>
                <div className="grid grid-cols-3 gap-3 font-mono">
                  <div>
                    <label className="text-slate-400 block mb-1 font-sans">Train Ratio</label>
                    <input
                      type="number"
                      step="0.05"
                      value={config.default_train_ratio}
                      onChange={(e) =>
                        setConfig({ ...config, default_train_ratio: parseFloat(e.target.value) })
                      }
                      className="w-full bg-soc-bg border border-soc-border rounded-xl p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-sans">Val Ratio</label>
                    <input
                      type="number"
                      step="0.05"
                      value={config.default_val_ratio}
                      onChange={(e) =>
                        setConfig({ ...config, default_val_ratio: parseFloat(e.target.value) })
                      }
                      className="w-full bg-soc-bg border border-soc-border rounded-xl p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-sans">Test Ratio</label>
                    <input
                      type="number"
                      step="0.05"
                      value={config.default_test_ratio}
                      onChange={(e) =>
                        setConfig({ ...config, default_test_ratio: parseFloat(e.target.value) })
                      }
                      className="w-full bg-soc-bg border border-soc-border rounded-xl p-2 text-white"
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
                  <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
