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
} from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [settingsList, setSettingsList] = useState<AdminSettingItem[]>([]);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
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
      setCategories(['ALL', ...(res.categories || [])]);
      setSettingsList(res.settings || []);

      const valMap: Record<string, any> = {};
      (res.settings || []).forEach((s) => {
        valMap[s.key] = s.value;
      });
      setEditValues(valMap);
    } catch (err: any) {
      console.error('Failed to load system settings:', err);
      setAlertError(err?.response?.data?.detail || 'Failed to retrieve system settings.');
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
      });

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-soc-card border border-soc-border p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                System Policies & Configuration Registry
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized typed settings: defense modes, risk thresholds, alert suppression cooldowns, and ML drift boundaries.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchSettings}
          className="px-3.5 py-2 rounded-xl bg-soc-bg hover:bg-slate-800 border border-soc-border text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Reload Registry</span>
        </button>
      </div>

      {/* Feedback Banners */}
      {alertError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{alertError}</span>
          </div>
          <button onClick={() => setAlertError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {alertSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{alertSuccess}</span>
          </div>
          <button onClick={() => setAlertSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
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
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-soc-card border border-soc-border text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {cat}
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
                className="bg-soc-card border border-soc-border hover:border-slate-700 rounded-2xl p-5 shadow-lg space-y-3.5 flex flex-col justify-between transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-emerald-400">{setting.key}</span>
                      {setting.is_sensitive && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Secret
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] px-2 py-0.5 rounded font-mono uppercase bg-slate-800 text-slate-400">
                      {setting.type}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{setting.description}</p>

                  {(setting.min_value !== null || setting.max_value !== null) && (
                    <div className="text-[11px] text-slate-400 font-mono">
                      Bounds:{' '}
                      <span className="text-slate-200 font-semibold">
                        [{setting.min_value ?? '-∞'} .. {setting.max_value ?? '+∞'}]
                      </span>
                    </div>
                  )}
                </div>

                {/* Input Controls */}
                <div className="pt-2 border-t border-soc-border/60 space-y-3">
                  {setting.type === 'boolean' ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Enabled State:</span>
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
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
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
                        className="w-full bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
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
                        className="w-full bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
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
                        className="w-full bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
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
                        className="w-full bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                      {setting.updated_by && <span>By: {setting.updated_by}</span>}
                    </div>

                    <div className="flex items-center gap-2">
                      {isDirty && (
                        <button
                          type="button"
                          onClick={() => handleResetToDefault(setting)}
                          className="px-2.5 py-1.5 rounded-lg bg-soc-bg hover:bg-slate-800 text-slate-400 hover:text-white text-xs flex items-center gap-1"
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
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-soc-card border border-soc-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-soc-border pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400" />
                <span>Save Setting Update</span>
              </h3>
              <button onClick={() => setPendingSaveSetting(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Key:</span>
                <strong className="text-emerald-400 font-mono">{pendingSaveSetting.key}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">New Value:</span>
                <strong className="text-white font-mono">
                  {pendingSaveSetting.is_sensitive
                    ? '••••••••••••'
                    : String(editValues[pendingSaveSetting.key])}
                </strong>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Audit Log Reason (Recommended)
              </label>
              <input
                type="text"
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                placeholder="e.g. Adjusted risk score threshold for peak seasonal traffic"
                className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-soc-border">
              <button
                type="button"
                onClick={() => setPendingSaveSetting(null)}
                className="px-4 py-2 rounded-lg bg-soc-bg hover:bg-slate-800 text-slate-300 text-xs font-semibold"
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
