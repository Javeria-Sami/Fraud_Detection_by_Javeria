import React, { useState } from 'react';
import { X, Play, RefreshCw, Cpu, Layers, ShieldCheck, AlertOctagon, HelpCircle } from 'lucide-react';
import { mlRetrainingApi } from '../../../services/mlRetrainingApi';
import { StartRetrainingParams, RetrainingRunItem } from '../../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (run: RetrainingRunItem) => void;
}

export const StartRetrainingModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [customVersion, setCustomVersion] = useState('');
  const [modelType, setModelType] = useState('Isolation Forest');
  const [nEstimators, setNEstimators] = useState(150);
  const [contamination, setContamination] = useState(0.08);
  const [randomState, setRandomState] = useState(42);
  const [trainRatio, setTrainRatio] = useState(0.70);
  const [valRatio, setValRatio] = useState(0.15);
  const [testRatio, setTestRatio] = useState(0.15);
  const [minSamples, setMinSamples] = useState(50);
  const [thresholdMethod, setThresholdMethod] = useState('CONTAMINATION');
  const [fixedThreshold, setFixedThreshold] = useState(0.65);
  const [featureVersion, setFeatureVersion] = useState('features-v1');

  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExecuting(true);
    setErrorMsg(null);

    const params: StartRetrainingParams = {
      custom_version: customVersion.trim() || undefined,
      model_type: modelType,
      n_estimators: Number(nEstimators),
      contamination: Number(contamination),
      random_state: Number(randomState),
      train_ratio: Number(trainRatio),
      val_ratio: Number(valRatio),
      test_ratio: Number(testRatio),
      min_samples: Number(minSamples),
      threshold_method: thresholdMethod,
      fixed_threshold: Number(fixedThreshold),
      target_feature_version: featureVersion,
    };

    try {
      const run = await mlRetrainingApi.triggerRetraining(params);
      onSuccess(run);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to start retraining pipeline.');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-soc-card border border-soc-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 border-b border-soc-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">Trigger Model Retraining Pipeline</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 flex items-center gap-2 font-sans">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Model Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Candidate Version Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. v1.3.0 or auto-generated"
                value={customVersion}
                onChange={(e) => setCustomVersion(e.target.value)}
                className="w-full bg-soc-bg border border-soc-border rounded-xl p-2.5 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Model Architecture</label>
              <select
                value={modelType}
                onChange={(e) => setModelType(e.target.value)}
                className="w-full bg-soc-bg border border-soc-border rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-purple-500"
              >
                <option value="Isolation Forest">Isolation Forest (Ensemble Unsupervised)</option>
              </select>
            </div>
          </div>

          {/* Hyperparameters */}
          <div className="space-y-3 border-t border-soc-border pt-4">
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              Hyperparameters & Calibration
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Number of Estimators</label>
                <input
                  type="number"
                  value={nEstimators}
                  onChange={(e) => setNEstimators(Number(e.target.value))}
                  className="w-full bg-soc-bg border border-soc-border rounded-xl p-2 text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Contamination Ratio</label>
                <input
                  type="number"
                  step="0.01"
                  value={contamination}
                  onChange={(e) => setContamination(Number(e.target.value))}
                  className="w-full bg-soc-bg border border-soc-border rounded-xl p-2 text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Deterministic Seed</label>
                <input
                  type="number"
                  value={randomState}
                  onChange={(e) => setRandomState(Number(e.target.value))}
                  className="w-full bg-soc-bg border border-soc-border rounded-xl p-2 text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Temporal Splitting */}
          <div className="space-y-3 border-t border-soc-border pt-4">
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              Chronological Temporal Split Ratios (No Leakage)
            </h4>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Train Ratio</label>
                <input
                  type="number"
                  step="0.05"
                  value={trainRatio}
                  onChange={(e) => setTrainRatio(Number(e.target.value))}
                  className="w-full bg-soc-bg border border-soc-border rounded-xl p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Validation Ratio</label>
                <input
                  type="number"
                  step="0.05"
                  value={valRatio}
                  onChange={(e) => setValRatio(Number(e.target.value))}
                  className="w-full bg-soc-bg border border-soc-border rounded-xl p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Test Ratio</label>
                <input
                  type="number"
                  step="0.05"
                  value={testRatio}
                  onChange={(e) => setTestRatio(Number(e.target.value))}
                  className="w-full bg-soc-bg border border-soc-border rounded-xl p-2 text-white font-mono"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              Data is ordered chronologically: Past (Train) → Middle (Validation Threshold Calibration) → Future (Test Evaluation).
            </p>
          </div>

          {/* Configuration Preview Box */}
          <div className="p-4 bg-soc-bg border border-soc-border rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Zero Automatic Deployment Guarantee</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Retraining generates a candidate model registered with status{' '}
              <span className="font-mono text-purple-300 font-semibold">EVALUATED</span>. The current production model will remain active and unchanged until a separate controlled approval action.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-soc-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isExecuting}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all"
            >
              <Play className={`w-4 h-4 ${isExecuting ? 'animate-spin' : ''}`} />
              <span>{isExecuting ? 'Retraining & Evaluating...' : 'Start Retraining Pipeline'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
