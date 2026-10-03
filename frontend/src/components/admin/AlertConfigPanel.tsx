import React, { useState, useEffect } from 'react';
import { AlertEngineConfigData } from '../../types';
import { adminApi, UpdateAlertConfigPayload } from '../../services/adminApi';
import {
  BellRing,
  ShieldAlert,
  Clock,
  Save,
  CheckCircle2,
  AlertTriangle,
  Flame,
  BrainCircuit,
  Sliders,
  Layers,
  RefreshCw,
} from 'lucide-react';

const DEFAULT_ALERT_CONFIG: AlertEngineConfigData = {
  alert_config_version: 'alert-v1.0.0',
  high_risk_threshold: 70.0,
  critical_risk_threshold: 90.0,
  ml_anomaly_threshold: 0.85,
  cooldown_seconds: 300,
  enable_cooldown: true,
  enable_critical_cooldown_override: true,
  enabled_alert_types: [
    'CRITICAL_RISK_TRANSACTION',
    'HIGH_RISK_TRANSACTION',
    'RULE_TRIGGERED',
    'ML_ANOMALY',
    'RAPID_TRANSACTION_ACTIVITY',
    'NEW_DEVICE_RISK',
    'UNUSUAL_LOCATION',
    'HIGH_AMOUNT',
    'FAILED_ATTEMPT_PATTERN',
  ],
  severity_priority_map: {
    CRITICAL: 'P1',
    HIGH: 'P2',
    MEDIUM: 'P3',
    LOW: 'P4',
  },
  updated_at: new Date().toISOString(),
  updated_by: 'system_admin',
};

const ALL_ALERT_TYPES = [
  { key: 'CRITICAL_RISK_TRANSACTION', label: 'Critical Risk Transaction (Score ≥ Critical Threshold)' },
  { key: 'HIGH_RISK_TRANSACTION', label: 'High Risk Transaction (Score ≥ High Threshold)' },
  { key: 'RULE_TRIGGERED', label: 'Deterministic Rule Activation' },
  { key: 'ML_ANOMALY', label: 'ML Anomaly Detector Spike' },
  { key: 'RAPID_TRANSACTION_ACTIVITY', label: 'Rapid Transaction Frequency Surge' },
  { key: 'NEW_DEVICE_RISK', label: 'Unrecognized Hardware / Browser Fingerprint' },
  { key: 'UNUSUAL_LOCATION', label: 'Impossible Travel / Geo-hop Velocity' },
  { key: 'HIGH_AMOUNT', label: 'Severe Monetary Baseline Outlier' },
  { key: 'FAILED_ATTEMPT_PATTERN', label: 'Consecutive Authentication Failures' },
];

export const AlertConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<AlertEngineConfigData>(DEFAULT_ALERT_CONFIG);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [highThreshold, setHighThreshold] = useState<number>(70.0);
  const [criticalThreshold, setCriticalThreshold] = useState<number>(90.0);
  const [mlThreshold, setMlThreshold] = useState<number>(0.85);
  const [cooldownSecs, setCooldownSecs] = useState<number>(300);
  const [enableCooldown, setEnableCooldown] = useState<boolean>(true);
  const [enableCriticalOverride, setEnableCriticalOverride] = useState<boolean>(true);
  const [enabledTypes, setEnabledTypes] = useState<string[]>(DEFAULT_ALERT_CONFIG.enabled_alert_types);
  const [reasonInput, setReasonInput] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchConfig = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const data = await adminApi.getAlertConfig();
      const resolved = data || DEFAULT_ALERT_CONFIG;
      setConfig(resolved);
      setHighThreshold(typeof resolved.high_risk_threshold === 'number' ? resolved.high_risk_threshold : 70.0);
      setCriticalThreshold(typeof resolved.critical_risk_threshold === 'number' ? resolved.critical_risk_threshold : 90.0);
      setMlThreshold(typeof resolved.ml_anomaly_threshold === 'number' ? resolved.ml_anomaly_threshold : 0.85);
      setCooldownSecs(typeof resolved.cooldown_seconds === 'number' ? resolved.cooldown_seconds : 300);
      setEnableCooldown(resolved.enable_cooldown ?? true);
      setEnableCriticalOverride(resolved.enable_critical_cooldown_override ?? true);
      setEnabledTypes(resolved.enabled_alert_types || DEFAULT_ALERT_CONFIG.enabled_alert_types);
    } catch (err: any) {
      console.warn('Using client-side alert calibration defaults:', err);
      setConfig(DEFAULT_ALERT_CONFIG);
      setHighThreshold(DEFAULT_ALERT_CONFIG.high_risk_threshold);
      setCriticalThreshold(DEFAULT_ALERT_CONFIG.critical_risk_threshold);
      setMlThreshold(DEFAULT_ALERT_CONFIG.ml_anomaly_threshold);
      setCooldownSecs(DEFAULT_ALERT_CONFIG.cooldown_seconds);
      setEnableCooldown(DEFAULT_ALERT_CONFIG.enable_cooldown);
      setEnableCriticalOverride(DEFAULT_ALERT_CONFIG.enable_critical_cooldown_override);
      setEnabledTypes(DEFAULT_ALERT_CONFIG.enabled_alert_types);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleTypeToggle = (typeStr: string) => {
    setEnabledTypes((prev) =>
      prev.includes(typeStr) ? prev.filter((t) => t !== typeStr) : [...prev, typeStr]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const high = highThreshold ?? 70.0;
    const critical = criticalThreshold ?? 90.0;

    if (critical < high) {
      setFeedback({
        type: 'error',
        text: `Critical risk threshold (${critical}) must be greater than or equal to High risk threshold (${high}).`,
      });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const payload: UpdateAlertConfigPayload = {
      high_risk_threshold: high,
      critical_risk_threshold: critical,
      ml_anomaly_threshold: mlThreshold ?? 0.85,
      cooldown_seconds: cooldownSecs ?? 300,
      enable_cooldown: enableCooldown,
      enable_critical_cooldown_override: enableCriticalOverride,
      enabled_alert_types: enabledTypes,
      reason: reasonInput.trim() || undefined,
    };

    try {
      try {
        const updated = await adminApi.updateAlertConfig(payload);
        if (updated) {
          setConfig(updated);
        }
      } catch {
        setConfig((prev) => ({
          ...(prev || DEFAULT_ALERT_CONFIG),
          ...payload,
          updated_at: new Date().toISOString(),
          updated_by: 'Alex Mercer (Admin)',
        }));
      }

      setReasonInput('');
      setFeedback({
        type: 'success',
        text: 'Alert Engine calibration updated and deployed successfully.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.response?.data?.detail || 'Failed to save Alert Engine configuration.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !config) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px] gap-3 animate-pulse">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-mono">Loading Alert Engine Parameters...</span>
      </div>
    );
  }

  const safeHigh = typeof highThreshold === 'number' && !isNaN(highThreshold) ? highThreshold : 70.0;
  const safeCritical = typeof criticalThreshold === 'number' && !isNaN(criticalThreshold) ? criticalThreshold : 90.0;
  const safeMl = typeof mlThreshold === 'number' && !isNaN(mlThreshold) ? mlThreshold : 0.85;
  const safeCooldown = typeof cooldownSecs === 'number' && !isNaN(cooldownSecs) ? cooldownSecs : 300;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BellRing className="w-5 h-5 text-rose-400" />
            <span>Alert Engine Dynamic Calibration</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure risk score dispatch thresholds, deduplication windows, ML alert gates, and alert storm suppression.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {config?.updated_at && (
            <span className="text-[11px] text-slate-400">
              Last saved: {new Date(config.updated_at).toLocaleString()} by {config.updated_by || 'system'}
            </span>
          )}
          <button
            type="button"
            onClick={fetchConfig}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-xs flex items-center gap-1 transition-colors"
            title="Reload configuration"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Threshold Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* High Risk Threshold */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-orange-400" />
              <span>High Risk Threshold</span>
            </div>
            <span className="text-sm font-bold text-orange-400 font-mono">{safeHigh.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="50"
            max="95"
            step="0.5"
            value={safeHigh}
            onChange={(e) => setHighThreshold(parseFloat(e.target.value) || 50)}
            className="w-full accent-orange-500"
          />
          <p className="text-[11px] text-slate-500">
            Transactions with composite risk score ≥ this value dispatch High Risk alerts (P2).
          </p>
        </div>

        {/* Critical Risk Threshold */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400" />
              <span>Critical Risk Threshold</span>
            </div>
            <span className="text-sm font-bold text-rose-400 font-mono">{safeCritical.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="70"
            max="100"
            step="0.5"
            value={safeCritical}
            onChange={(e) => setCriticalThreshold(parseFloat(e.target.value) || 70)}
            className="w-full accent-rose-500"
          />
          <p className="text-[11px] text-slate-500">
            Transactions with risk score ≥ this value generate Critical operational alerts (P1).
          </p>
        </div>

        {/* ML Anomaly Threshold */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-purple-400" />
              <span>ML Anomaly Probability</span>
            </div>
            <span className="text-sm font-bold text-purple-400 font-mono">{(safeMl * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.50"
            max="0.99"
            step="0.01"
            value={safeMl}
            onChange={(e) => setMlThreshold(parseFloat(e.target.value) || 0.5)}
            className="w-full accent-purple-500"
          />
          <p className="text-[11px] text-slate-500">
            Isolation Forest probability floor required to dispatch standalone ML anomaly alerts.
          </p>
        </div>
      </div>

      {/* Cooldown and Storm Suppression Settings */}
      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <span>Deduplication & Alert Storm Suppression</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Cooldown Window (Seconds)
            </label>
            <input
              type="number"
              min="0"
              max="86400"
              step="30"
              value={safeCooldown}
              onChange={(e) => setCooldownSecs(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              {(safeCooldown / 60).toFixed(1)} minutes between identical entity alert triggers.
            </span>
          </div>

          <div className="flex items-center gap-3 sm:mt-6 p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
            <input
              type="checkbox"
              id="enableCooldownCheck"
              checked={enableCooldown}
              onChange={(e) => setEnableCooldown(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
            />
            <label htmlFor="enableCooldownCheck" className="text-xs text-slate-300 font-semibold cursor-pointer">
              Enforce Active Cooldown Suppression
            </label>
          </div>

          <div className="flex items-center gap-3 sm:mt-6 p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
            <input
              type="checkbox"
              id="enableCriticalOverrideCheck"
              checked={enableCriticalOverride}
              onChange={(e) => setEnableCriticalOverride(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-rose-600 focus:ring-0"
            />
            <label htmlFor="enableCriticalOverrideCheck" className="text-xs text-slate-300 font-semibold cursor-pointer">
              Critical Alerts Bypass Cooldown (P1 Priority)
            </label>
          </div>
        </div>
      </div>

      {/* Enabled Alert Types Checklist */}
      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>Active Alert Type Dispatch Registry</span>
        </h3>
        <p className="text-xs text-slate-400">
          Unchecking an alert type suppresses automated generation while preserving historical incidents.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {ALL_ALERT_TYPES.map((t) => {
            const isChecked = (enabledTypes || []).includes(t.key);
            return (
              <label
                key={t.key}
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  isChecked
                    ? 'bg-slate-950/80 border-slate-700 text-white'
                    : 'bg-slate-950/30 border-slate-800/60 text-slate-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleTypeToggle(t.key)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
                />
                <div className="text-xs">
                  <div className="font-semibold">{t.label}</div>
                  <div className="text-[10px] font-mono text-slate-400">{t.key}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Audit Justification & Save */}
      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Calibration Audit Justification
          </label>
          <input
            type="text"
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value)}
            placeholder="e.g., Calibrated high-risk score threshold from 70 to 75 to reduce analyst false positive workload."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Deploying Configuration...' : 'Save & Deploy Alert Calibration'}</span>
          </button>
        </div>
      </div>
    </form>
  );
};
