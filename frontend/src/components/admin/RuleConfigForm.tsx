import React, { useState, useEffect } from 'react';
import { AdminFraudRule, RuleConfigValidationResult } from '../../types';
import { adminApi, CreateRuleVersionPayload } from '../../services/adminApi';
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Layers,
  Save,
  Check,
  ShieldAlert,
} from 'lucide-react';

interface RuleConfigFormProps {
  rule: AdminFraudRule;
  onSuccess: (updatedRule: AdminFraudRule) => void;
  onCancel: () => void;
}

export const RuleConfigForm: React.FC<RuleConfigFormProps> = ({
  rule,
  onSuccess,
  onCancel,
}) => {
  // Suggest next minor or major version
  const getSuggestedVersion = (currentVer: string) => {
    const parts = currentVer.replace(/[^0-9.]/g, '').split('.');
    const major = parseInt(parts[0] || '1', 10);
    const minor = parseInt(parts[1] || '0', 10);
    return `${major}.${minor + 1}`;
  };

  const [versionInput, setVersionInput] = useState<string>(getSuggestedVersion(rule.version || '1.0'));
  const [weightInput, setWeightInput] = useState<number>(rule.weight || 20);
  const [severityInput, setSeverityInput] = useState<string>(rule.severity || 'MEDIUM');
  const [isActiveInput, setIsActiveInput] = useState<boolean>(true);
  const [reasonInput, setReasonInput] = useState<string>('');
  const [configValues, setConfigValues] = useState<Record<string, any>>({ ...(rule.condition_config || {}) });

  // Validation feedback state
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<RuleConfigValidationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize defaults based on rule code if empty
  useEffect(() => {
    const cfg = { ...(rule.condition_config || {}) };
    const code = rule.rule_code.toUpperCase();

    if (code === 'HIGH_AMOUNT') {
      if (cfg.multiplier === undefined) cfg.multiplier = 5.0;
      if (cfg.min_amount === undefined) cfg.min_amount = 1000.0;
    } else if (code === 'RAPID_TRANSACTIONS') {
      if (cfg.count_threshold === undefined) cfg.count_threshold = 4;
      if (cfg.window_minutes === undefined) cfg.window_minutes = 5;
    } else if (code === 'NEW_DEVICE') {
      if (cfg.enabled === undefined) cfg.enabled = true;
    } else if (code === 'UNUSUAL_LOCATION') {
      if (cfg.max_geo_speed_kmh === undefined) cfg.max_geo_speed_kmh = 700.0;
      if (cfg.distance_threshold_km === undefined) cfg.distance_threshold_km = 500.0;
    } else if (code === 'UNUSUAL_TIME') {
      if (cfg.night_start === undefined) cfg.night_start = 1;
      if (cfg.night_end === undefined) cfg.night_end = 5;
    } else if (code === 'FAILED_ATTEMPTS') {
      if (cfg.max_failed_attempts === undefined) cfg.max_failed_attempts = 2;
    } else if (code === 'SUDDEN_SPENDING_INCREASE') {
      if (cfg.spending_multiplier === undefined) cfg.spending_multiplier = 3.0;
    } else if (code === 'MERCHANT_ANOMALY') {
      if (!cfg.high_risk_categories) {
        cfg.high_risk_categories = ['crypto_exchange', 'gambling', 'wire_transfer', 'luxury_goods'];
      }
    }
    setConfigValues(cfg);
  }, [rule]);

  const handleParamChange = (key: string, value: any) => {
    setConfigValues((prev) => ({ ...prev, [key]: value }));
    setValidationResult(null); // Clear validation on edit
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setErrorMessage(null);
    try {
      const res = await adminApi.validateRuleConfig(rule.rule_code, configValues);
      setValidationResult(res);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Validation request failed.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: CreateRuleVersionPayload = {
        version: versionInput,
        configuration: configValues,
        weight: weightInput,
        threshold: configValues.min_amount || configValues.count_threshold || undefined,
        is_active: isActiveInput,
        reason: reasonInput.trim() || undefined,
      };

      await adminApi.createRuleVersion(rule.id, payload);

      // If metadata like severity changed, update parent rule too
      if (severityInput !== rule.severity) {
        await adminApi.updateRule(rule.id, {
          severity: severityInput,
          reason: reasonInput.trim() || undefined,
        });
      }

      // Fetch fresh detail
      const updated = await adminApi.getRuleDetail(rule.id);
      onSuccess(updated);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to persist rule version.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderParameterFields = () => {
    const code = rule.rule_code.toUpperCase();

    if (code === 'HIGH_AMOUNT' || code === 'HIGH_TRANSACTION_AMOUNT') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-soc-foreground block mb-1">
              Baseline Multiplier Threshold
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="100"
                value={configValues.multiplier || 5.0}
                onChange={(e) => handleParamChange('multiplier', parseFloat(e.target.value) || 1)}
                className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-xs text-soc-foreground focus:outline-none focus:border-blue-500 font-mono"
              />
              <span className="text-xs text-soc-muted font-mono">x</span>
            </div>
            <p className="text-[11px] text-soc-muted mt-1">
              Triggers when transaction exceeds user average by this factor.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-soc-foreground block mb-1">
              Absolute Minimum Amount ($)
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={configValues.min_amount || 1000}
              onChange={(e) => handleParamChange('min_amount', parseFloat(e.target.value) || 0)}
              className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-xs text-soc-foreground focus:outline-none focus:border-blue-500 font-mono"
            />
            <p className="text-[11px] text-soc-muted mt-1">
              Minimum dollar floor before multiplier evaluation is enforced.
            </p>
          </div>
        </div>
      );
    }

    if (code === 'RAPID_TRANSACTIONS' || code === 'RAPID_TRANSACTION_SEQUENCE') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-soc-foreground block mb-1">
              Max Transactions Allowed
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={configValues.count_threshold || 4}
              onChange={(e) => handleParamChange('count_threshold', parseInt(e.target.value, 10) || 1)}
              className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-xs text-soc-foreground focus:outline-none focus:border-blue-500 font-mono"
            />
            <p className="text-[11px] text-soc-muted mt-1">
              Transaction count limit within the sliding window.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-soc-foreground block mb-1">
              Sliding Window Duration (Minutes)
            </label>
            <input
              type="number"
              min="1"
              max="1440"
              value={configValues.window_minutes || 5}
              onChange={(e) => handleParamChange('window_minutes', parseInt(e.target.value, 10) || 1)}
              className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-xs text-soc-foreground focus:outline-none focus:border-blue-500 font-mono"
            />
            <p className="text-[11px] text-soc-muted mt-1">
              Lookback interval for counting consecutive transactions.
            </p>
          </div>
        </div>
      );
    }

    if (code === 'NEW_DEVICE') {
      return (
        <div>
          <div className="flex items-center gap-3 p-3 bg-soc-surface border border-soc-border rounded-xl">
            <input
              type="checkbox"
              id="newDeviceEnabled"
              checked={configValues.enabled !== false}
              onChange={(e) => handleParamChange('enabled', e.target.checked)}
              className="w-4 h-4 rounded border-soc-border bg-soc-surface text-blue-600 focus:ring-0"
            />
            <label htmlFor="newDeviceEnabled" className="text-xs text-soc-foreground font-semibold cursor-pointer">
              Enforce Device Fingerprint Novelty Check
            </label>
          </div>
          <p className="text-[11px] text-soc-muted mt-1.5">
            Evaluates unrecognized hardware hashes, user-agent transitions, and unknown device IDs.
          </p>
        </div>
      );
    }

    if (code === 'UNUSUAL_LOCATION') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-soc-foreground block mb-1">
              Max Geographic Velocity (km/h)
            </label>
            <input
              type="number"
              min="50"
              max="3000"
              step="50"
              value={configValues.max_geo_speed_kmh || 700}
              onChange={(e) => handleParamChange('max_geo_speed_kmh', parseFloat(e.target.value) || 500)}
              className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-xs text-soc-foreground focus:outline-none focus:border-blue-500 font-mono"
            />
            <p className="text-[11px] text-soc-muted mt-1">
              Impossible travel threshold (e.g. 700 km/h airline speed limit).
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-soc-foreground block mb-1">
              Distance Threshold (km)
            </label>
            <input
              type="number"
              min="0"
              max="20000"
              step="100"
              value={configValues.distance_threshold_km || 500}
              onChange={(e) => handleParamChange('distance_threshold_km', parseFloat(e.target.value) || 0)}
              className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-xs text-soc-foreground focus:outline-none focus:border-blue-500 font-mono"
            />
            <p className="text-[11px] text-soc-muted mt-1">
              Minimum displacement from previous transaction coordinates.
            </p>
          </div>
        </div>
      );
    }

    if (code === 'UNUSUAL_TIME') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-soc-foreground block mb-1">
              Night Window Start Hour (0–23 UTC)
            </label>
            <input
              type="number"
              min="0"
              max="23"
              value={configValues.night_start !== undefined ? configValues.night_start : 1}
              onChange={(e) => handleParamChange('night_start', parseInt(e.target.value, 10) || 0)}
              className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-xs text-soc-foreground focus:outline-none focus:border-blue-500 font-mono"
            />
            <p className="text-[11px] text-soc-muted mt-1">Start of anomalous nocturnal window.</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-soc-foreground block mb-1">
              Night Window End Hour (0–23 UTC)
            </label>
            <input
              type="number"
              min="0"
              max="23"
              value={configValues.night_end !== undefined ? configValues.night_end : 5}
              onChange={(e) => handleParamChange('night_end', parseInt(e.target.value, 10) || 0)}
              className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-xs text-soc-foreground focus:outline-none focus:border-blue-500 font-mono"
            />
            <p className="text-[11px] text-soc-muted mt-1">End of anomalous nocturnal window.</p>
          </div>
        </div>
      );
    }

    if (code === 'FAILED_ATTEMPTS' || code === 'FAILED_ATTEMPT_SPIKE') {
      return (
        <div>
          <label className="text-xs font-semibold text-soc-foreground block mb-1">
            Max Consecutive Failed Attempts
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={configValues.max_failed_attempts || 2}
            onChange={(e) => handleParamChange('max_failed_attempts', parseInt(e.target.value, 10) || 1)}
            className="w-full sm:w-1/2 bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-xs text-soc-foreground focus:outline-none focus:border-blue-500 font-mono"
          />
          <p className="text-[11px] text-soc-muted mt-1">
            Triggers when prior failed authentication attempts meet or exceed this count.
          </p>
        </div>
      );
    }

    if (code === 'SUDDEN_SPENDING_INCREASE' || code === 'SPENDING_VELOCITY_ANOMALY') {
      return (
        <div>
          <label className="text-xs font-semibold text-soc-foreground block mb-1">
            1-Hour Spending Multiplier
          </label>
          <div className="flex items-center gap-2 max-w-xs">
            <input
              type="number"
              step="0.5"
              min="1.0"
              max="50"
              value={configValues.spending_multiplier || 3.0}
              onChange={(e) => handleParamChange('spending_multiplier', parseFloat(e.target.value) || 1.0)}
              className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-xs text-soc-foreground focus:outline-none focus:border-blue-500 font-mono"
            />
            <span className="text-xs text-soc-muted font-mono">x</span>
          </div>
          <p className="text-[11px] text-soc-muted mt-1">
            Ratio of cumulative 1-hour transaction volume over 30-day baseline average.
          </p>
        </div>
      );
    }

    if (code === 'MERCHANT_ANOMALY') {
      const cats = Array.isArray(configValues.high_risk_categories)
        ? configValues.high_risk_categories.join(', ')
        : '';
      return (
        <div>
          <label className="text-xs font-semibold text-soc-foreground block mb-1">
            High-Risk Merchant Categories (Comma-separated)
          </label>
          <input
            type="text"
            value={cats}
            onChange={(e) =>
              handleParamChange(
                'high_risk_categories',
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            placeholder="crypto_exchange, gambling, wire_transfer, luxury_goods"
            className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-xs text-soc-foreground focus:outline-none focus:border-blue-500 font-mono"
          />
          <p className="text-[11px] text-soc-muted mt-1">
            MCC tags and category labels flagged as elevated fraud risk.
          </p>
        </div>
      );
    }

    // Default JSON parameter fallback
    return (
      <div>
        <label className="text-xs font-semibold text-soc-foreground block mb-1">
          Rule Condition Parameters
        </label>
        <textarea
          rows={3}
          value={JSON.stringify(configValues, null, 2)}
          onChange={(e) => {
            try {
              setConfigValues(JSON.parse(e.target.value));
            } catch (err) {
              // Ignore while typing JSON
            }
          }}
          className="w-full bg-soc-surface border border-soc-border rounded-lg p-2.5 text-xs text-soc-foreground font-mono focus:outline-none focus:border-blue-500"
        />
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Top Header Information */}
      <div className="bg-soc-surface border border-soc-border p-4 rounded-xl flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-soc-muted uppercase tracking-wider">
            Target Rule Definition
          </div>
          <div className="text-base font-bold text-soc-foreground flex items-center gap-2 mt-0.5">
            <span>{rule.name}</span>
            <span className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-semibold">
              {rule.rule_code}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-soc-muted">Current Active:</span>
          <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
            v{rule.version || '1.0'}
          </div>
        </div>
      </div>

      {/* Global Rule Parameters (Score, Severity, Target Version) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-soc-foreground block mb-1">
            New Version Code
          </label>
          <input
            type="text"
            required
            value={versionInput}
            onChange={(e) => setVersionInput(e.target.value)}
            placeholder="e.g. 2.0"
            className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-xs text-soc-foreground focus:outline-none focus:border-blue-500 font-mono font-bold"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-soc-foreground block mb-1">
            Risk Score Weight (0–100)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              value={weightInput}
              onChange={(e) => setWeightInput(parseFloat(e.target.value) || 0)}
              className="w-20 bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-xs text-soc-foreground focus:outline-none focus:border-blue-500 font-mono font-bold"
            />
            <input
              type="range"
              min="0"
              max="100"
              value={weightInput}
              onChange={(e) => setWeightInput(parseFloat(e.target.value) || 0)}
              className="flex-1 accent-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-soc-foreground block mb-1">
            Rule Severity Tier
          </label>
          <select
            value={severityInput}
            onChange={(e) => setSeverityInput(e.target.value)}
            className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-xs text-soc-foreground focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="CRITICAL">Critical Severity</option>
            <option value="HIGH">High Severity</option>
            <option value="MEDIUM">Medium Severity</option>
            <option value="LOW">Low Severity</option>
          </select>
        </div>
      </div>

      {/* Type-Specific Parameter Configuration */}
      <div className="bg-soc-surface border border-soc-border p-4 rounded-xl space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-soc-foreground border-b border-soc-border pb-2">
          <Sliders className="w-4 h-4 text-blue-500" />
          <span>Configurable Detection Thresholds</span>
        </div>
        {renderParameterFields()}
      </div>

      {/* Change Reason & Activation Options */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-soc-foreground block mb-1">
            Change Reason / Audit Justification
          </label>
          <input
            type="text"
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value)}
            placeholder="e.g., Calibrated thresholds following false positive review in Q3 fraud triage."
            className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-xs text-soc-foreground placeholder-soc-muted focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="activateImmediatelyCheck"
            checked={isActiveInput}
            onChange={(e) => setIsActiveInput(e.target.checked)}
            className="rounded border-soc-border bg-soc-surface text-blue-600 focus:ring-0"
          />
          <label htmlFor="activateImmediatelyCheck" className="text-xs text-soc-foreground font-semibold cursor-pointer">
            Atomically activate this version immediately (retires previous active version)
          </label>
        </div>
      </div>

      {/* Validation Feedback Banner */}
      {validationResult && (
        <div
          className={`p-3.5 rounded-xl border text-xs ${
            validationResult.valid
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {validationResult.valid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-500" />
            )}
            <span>
              {validationResult.valid
                ? 'Configuration Schema Validated Successfully'
                : 'Configuration Schema Validation Failed'}
            </span>
          </div>
          {validationResult.errors.length > 0 && (
            <ul className="list-disc list-inside mt-1 text-[11px] space-y-0.5">
              {validationResult.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
          {validationResult.warnings.length > 0 && (
            <ul className="list-disc list-inside mt-1 text-[11px] text-amber-600 dark:text-amber-400 space-y-0.5">
              {validationResult.warnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-soc-border">
        <button
          type="button"
          onClick={handleValidate}
          disabled={isValidating}
          className="px-3.5 py-2 rounded-lg bg-soc-surface hover:bg-soc-cardHover border border-soc-border text-soc-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Check className="w-3.5 h-3.5 text-blue-500" />
          <span>{isValidating ? 'Validating...' : 'Validate Schema'}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-soc-surface hover:bg-soc-cardHover border border-soc-border text-soc-muted hover:text-soc-foreground text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Persisting Version...' : 'Save & Deploy Version'}</span>
          </button>
        </div>
      </div>
    </form>
  );
};
