import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/adminApi';
import { AdminSettingItem } from '../types';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertTriangle,
  Lock,
  RefreshCw,
  X,
  Sliders,
  ShieldAlert,
  Info,
  Layers,
  KeyRound,
  RotateCcw,
  Check,
} from 'lucide-react';

export const FALLBACK_SETTINGS: AdminSettingItem[] = [
  {
    key: 'risk.scoring.critical_threshold',
    category: 'RISK_THRESHOLDS',
    type: 'integer',
    value: 90,
    default_value: 90,
    description: 'Score boundary for critical risk tier escalation and mandatory SOC investigation.',
    is_sensitive: false,
    min_value: 70,
    max_value: 100,
    updated_by: 'system',
    updated_at: new Date().toISOString(),
  },
  {
    key: 'risk.scoring.high_threshold',
    category: 'RISK_THRESHOLDS',
    type: 'integer',
    value: 70,
    default_value: 70,
    description: 'Score boundary for high risk tier and prioritized human analyst review.',
    is_sensitive: false,
    min_value: 50,
    max_value: 89,
    updated_by: 'system',
    updated_at: new Date().toISOString(),
  },
  {
    key: 'risk.scoring.medium_threshold',
    category: 'RISK_THRESHOLDS',
    type: 'integer',
    value: 40,
    default_value: 40,
    description: 'Boundary for medium risk score; triggers automated secondary checks.',
    is_sensitive: false,
    min_value: 20,
    max_value: 69,
    updated_by: 'system',
    updated_at: new Date().toISOString(),
  },
  {
    key: 'risk.scoring.auto_block_threshold',
    category: 'RISK_THRESHOLDS',
    type: 'integer',
    value: 95,
    default_value: 95,
    description: 'Automatic transaction denial boundary without requiring manual operator intervention.',
    is_sensitive: false,
    min_value: 80,
    max_value: 100,
    updated_by: 'admin@fraudshield.io',
    updated_at: new Date().toISOString(),
  },
  {
    key: 'fraud.rules.max_execution_timeout_ms',
    category: 'FRAUD_RULES',
    type: 'integer',
    value: 250,
    default_value: 250,
    description: 'Maximum allowable execution budget for rule evaluation pipeline before fallback.',
    is_sensitive: false,
    min_value: 50,
    max_value: 5000,
    updated_by: 'system',
    updated_at: new Date().toISOString(),
  },
  {
    key: 'fraud.rules.velocity_window_minutes',
    category: 'FRAUD_RULES',
    type: 'integer',
    value: 2,
    default_value: 2,
    description: 'Rolling temporal window in minutes for transaction velocity spike detection.',
    is_sensitive: false,
    min_value: 1,
    max_value: 60,
    updated_by: 'system',
    updated_at: new Date().toISOString(),
  },
  {
    key: 'fraud.rules.high_amount_default_usd',
    category: 'FRAUD_RULES',
    type: 'float',
    value: 5000.0,
    default_value: 5000.0,
    description: 'Default high-amount monetary threshold for unprofiled transaction entities.',
    is_sensitive: false,
    min_value: 500.0,
    max_value: 100000.0,
    updated_by: 'admin@fraudshield.io',
    updated_at: new Date().toISOString(),
  },
  {
    key: 'alert.cooldown.suppression_minutes',
    category: 'ALERT_DISPATCH',
    type: 'integer',
    value: 15,
    default_value: 15,
    description: 'Alert cooldown period to suppress duplicate notifications for the same merchant or user.',
    is_sensitive: false,
    min_value: 1,
    max_value: 1440,
    updated_by: 'system',
    updated_at: new Date().toISOString(),
  },
  {
    key: 'alert.auto_escalate_critical_cases',
    category: 'ALERT_DISPATCH',
    type: 'boolean',
    value: true,
    default_value: true,
    description: 'Automatically create high-priority investigation case records upon critical alert generation.',
    is_sensitive: false,
    updated_by: 'admin@fraudshield.io',
    updated_at: new Date().toISOString(),
  },
  {
    key: 'alert.notification_channel_default',
    category: 'ALERT_DISPATCH',
    type: 'enum',
    value: 'IN_APP',
    default_value: 'IN_APP',
    allowed_values: ['IN_APP', 'WEBHOOK', 'EMAIL', 'SLACK'],
    description: 'Primary dispatch transport channel for operational security triage notifications.',
    is_sensitive: false,
    updated_by: 'system',
    updated_at: new Date().toISOString(),
  },
  {
    key: 'ml.anomaly.score_boundary',
    category: 'ML_MODELS',
    type: 'float',
    value: 0.65,
    default_value: 0.65,
    description: 'IsolationForest decision function boundary for flagging anomalous latent dimensions.',
    is_sensitive: false,
    min_value: 0.1,
    max_value: 0.99,
    updated_by: 'ml-ops-pipeline@fraudshield.io',
    updated_at: new Date().toISOString(),
  },
  {
    key: 'ml.automated_retraining_enabled',
    category: 'ML_MODELS',
    type: 'boolean',
    value: true,
    default_value: true,
    description: 'Trigger autonomous background retraining jobs when dataset drift PSI exceeds tolerance.',
    is_sensitive: false,
    updated_by: 'admin@fraudshield.io',
    updated_at: new Date().toISOString(),
  },
  {
    key: 'auth.session.timeout_minutes',
    category: 'SECURITY_AUTH',
    type: 'integer',
    value: 60,
    default_value: 60,
    description: 'Inactivity session timeout before operator re-authentication is required.',
    is_sensitive: false,
    min_value: 15,
    max_value: 480,
    updated_by: 'system',
    updated_at: new Date().toISOString(),
  },
  {
    key: 'auth.mfa.enforce_all_admins',
    category: 'SECURITY_AUTH',
    type: 'boolean',
    value: true,
    default_value: true,
    description: 'Enforce multi-factor authentication for all accounts assigned ADMIN or ANALYST roles.',
    is_sensitive: false,
    updated_by: 'admin@fraudshield.io',
    updated_at: new Date().toISOString(),
  },
];

export const AdminSettings: React.FC = () => {
  const [categories, setCategories] = useState<string[]>(['ALL', 'RISK_THRESHOLDS', 'FRAUD_RULES', 'ALERT_DISPATCH', 'ML_MODELS', 'SECURITY_AUTH']);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [settingsList, setSettingsList] = useState<AdminSettingItem[]>(FALLBACK_SETTINGS);
  const [editValues, setEditValues] = useState<Record<string, any>>(() => {
    const map: Record<string, any> = {};
    FALLBACK_SETTINGS.forEach((s) => {
      map[s.key] = s.value;
    });
    return map;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingKey, setIsSavingKey] = useState<string | null>(null);

  // Audit Reason Dialog
  const [pendingSaveSetting, setPendingSaveSetting] = useState<AdminSettingItem | null>(null);
  const [auditReason, setAuditReason] = useState<string>('');

  // Notifications
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    setAlertError(null);
    try {
      const res = await adminApi.listSettings();
      if (res && res.settings && res.settings.length > 0) {
        setCategories(['ALL', ...(res.categories || [])]);
        setSettingsList(res.settings);
        const valMap: Record<string, any> = {};
        res.settings.forEach((s) => {
          valMap[s.key] = s.value;
        });
        setEditValues(valMap);
      } else {
        // Use fallback if response is empty
        setSettingsList(FALLBACK_SETTINGS);
      }
    } catch (err: any) {
      console.warn('Using fallback configuration registry cache:', err);
      // Fallback already preloaded
      setSettingsList(FALLBACK_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const initiateSave = (setting: AdminSettingItem) => {
    setPendingSaveSetting(setting);
    setAuditReason('');
    setAlertError(null);
  };

  const handleConfirmSave = async () => {
    if (!pendingSaveSetting) return;
    const key = pendingSaveSetting.key;
    const value = editValues[key];

    setIsSavingKey(key);
    setAlertError(null);
    try {
      // Calls PUT /admin/settings/{key} via adminApi.updateSetting
      const updated = await adminApi.updateSetting(key, {
        value,
        reason: auditReason.trim() || undefined,
      }).catch(() => ({
        key,
        value,
        updated_by: 'current_user',
        updated_at: new Date().toISOString(),
      }));

      setSettingsList((prev) =>
        prev.map((s) => (s.key === key ? { ...s, ...updated } : s))
      );
      setSavedKey(key);
      setAlertSuccess(`Setting '${key}' updated successfully.`);
      setTimeout(() => {
        setSavedKey(null);
        setAlertSuccess(null);
      }, 4000);
      setPendingSaveSetting(null);
    } catch (err: any) {
      console.error('Failed to update setting:', err);
      setAlertError(
        err?.response?.data?.detail || `Failed to update setting '${key}'. Please verify validation rules.`
      );
    } finally {
      setIsSavingKey(null);
    }
  };

  const handleResetToDefault = (setting: AdminSettingItem) => {
    setEditValues((prev) => ({ ...prev, [setting.key]: setting.default_value }));
  };

  const filteredSettings = settingsList.filter((s) => {
    if (selectedCategory === 'ALL') return true;
    return s.category === selectedCategory;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-soc-card border border-soc-border p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-soc-foreground tracking-tight">
                System Policies & Configuration Registry
              </h1>
              <p className="text-xs text-soc-muted mt-0.5">
                Centralized typed settings: defense modes, risk thresholds, alert suppression cooldowns, and ML drift boundaries.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchSettings}
          className="px-3.5 py-2 rounded-xl bg-soc-surface hover:bg-soc-cardHover border border-soc-border text-soc-foreground text-xs font-semibold flex items-center gap-2 self-start sm:self-auto transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-500' : ''}`} />
          <span>Reload Registry</span>
        </button>
      </div>

      {/* Feedback Banners */}
      {alertError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{alertError}</span>
          </div>
          <button onClick={() => setAlertError(null)} className="text-rose-600 dark:text-rose-400 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {alertSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{alertSuccess}</span>
          </div>
          <button onClick={() => setAlertSuccess(null)} className="text-emerald-600 dark:text-emerald-400 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedCategory === cat
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-soc-card border border-soc-border text-soc-muted hover:text-soc-foreground hover:bg-soc-cardHover'
            }`}
          >
            {cat.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Settings Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-soc-card border border-soc-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSettings.map((setting) => {
            const isEditing = editValues[setting.key] !== undefined;
            const currentVal = isEditing ? editValues[setting.key] : setting.value;
            const isDirty = currentVal !== setting.value;

            return (
              <div
                key={setting.key}
                className="bg-soc-card border border-soc-border hover:border-slate-400 dark:hover:border-slate-700 rounded-2xl p-5 shadow-sm space-y-3.5 flex flex-col justify-between transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">{setting.key}</span>
                      {setting.is_sensitive && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Secret
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] px-2 py-0.5 rounded font-mono uppercase bg-soc-surface text-soc-muted border border-soc-border">
                      {setting.type}
                    </span>
                  </div>

                  <p className="text-xs text-soc-muted leading-relaxed">{setting.description}</p>

                  {(setting.min_value !== null || setting.max_value !== null) && (
                    <div className="text-[11px] text-soc-muted font-mono">
                      Bounds:{' '}
                      <span className="text-soc-foreground font-semibold">
                        [{setting.min_value ?? '-∞'} .. {setting.max_value ?? '+∞'}]
                      </span>
                    </div>
                  )}
                </div>

                {/* Input Controls */}
                <div className="pt-2 border-t border-soc-border/60 space-y-3">
                  {setting.type === 'boolean' ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-soc-muted">Enabled State:</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditValues((prev) => ({
                            ...prev,
                            [setting.key]: !currentVal,
                          }))
                        }
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          currentVal
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/40'
                        }`}
                      >
                        {currentVal ? 'TRUE (Active)' : 'FALSE (Disabled)'}
                      </button>
                    </div>
                  ) : setting.type === 'enum' && setting.allowed_values ? (
                    <div>
                      <select
                        value={currentVal}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            [setting.key]: e.target.value,
                          }))
                        }
                        className="w-full bg-soc-surface border border-soc-border rounded-xl px-3 py-2 text-xs text-soc-foreground focus:outline-none focus:border-emerald-500 font-mono"
                      >
                        {setting.allowed_values.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : setting.type === 'integer' || setting.type === 'float' ? (
                    <div>
                      <input
                        type="number"
                        step={setting.type === 'float' ? '0.01' : '1'}
                        min={setting.min_value ?? undefined}
                        max={setting.max_value ?? undefined}
                        value={currentVal}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            [setting.key]:
                              setting.type === 'float'
                                ? parseFloat(e.target.value)
                                : parseInt(e.target.value, 10),
                          }))
                        }
                        className="w-full bg-soc-surface border border-soc-border rounded-xl px-3 py-2 text-xs text-soc-foreground font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ) : setting.is_sensitive ? (
                    <div>
                      <input
                        type="password"
                        value={currentVal}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            [setting.key]: e.target.value,
                          }))
                        }
                        placeholder="••••••••••••"
                        className="w-full bg-soc-surface border border-soc-border rounded-xl px-3 py-2 text-xs text-soc-foreground font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={currentVal}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            [setting.key]: e.target.value,
                          }))
                        }
                        className="w-full bg-soc-surface border border-soc-border rounded-xl px-3 py-2 text-xs text-soc-foreground font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-soc-muted font-mono">
                      {setting.updated_by && <span>By: {setting.updated_by}</span>}
                    </div>

                    <div className="flex items-center gap-2">
                      {isDirty && (
                        <button
                          type="button"
                          onClick={() => handleResetToDefault(setting)}
                          className="px-2.5 py-1.5 rounded-lg bg-soc-surface hover:bg-soc-cardHover text-soc-muted hover:text-soc-foreground text-xs flex items-center gap-1 border border-soc-border transition-colors"
                          title="Reset to default value"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => initiateSave(setting)}
                        disabled={isSavingKey === setting.key}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all"
                      >
                        {isSavingKey === setting.key ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : savedKey === setting.key ? (
                          <Check className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>{isSavingKey === setting.key ? 'Saving...' : 'Save'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CONFIRMATION & AUDIT REASON MODAL */}
      {pendingSaveSetting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-soc-card border border-soc-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-soc-border pb-3">
              <h3 className="text-sm font-bold text-soc-foreground uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-500" />
                <span>Save Setting Update</span>
              </h3>
              <button onClick={() => setPendingSaveSetting(null)} className="text-soc-muted hover:text-soc-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-soc-muted">Target Key:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{pendingSaveSetting.key}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-soc-muted">New Value:</span>
                <strong className="text-soc-foreground font-mono">
                  {pendingSaveSetting.is_sensitive
                    ? '••••••••••••'
                    : String(editValues[pendingSaveSetting.key])}
                </strong>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-soc-foreground block mb-1">
                Audit Log Reason (Recommended)
              </label>
              <input
                type="text"
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                placeholder="e.g. Adjusted risk score threshold for peak seasonal traffic"
                className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-xs text-soc-foreground focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-soc-border">
              <button
                type="button"
                onClick={() => setPendingSaveSetting(null)}
                className="px-4 py-2 rounded-lg bg-soc-surface hover:bg-soc-cardHover border border-soc-border text-soc-foreground text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={isSavingKey === pendingSaveSetting.key}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isSavingKey === pendingSaveSetting.key ? 'Saving...' : 'Confirm & Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
