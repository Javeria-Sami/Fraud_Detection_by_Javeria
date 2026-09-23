import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { SystemSetting } from '../types';
import { Settings, Save, CheckCircle2, ShieldAlert } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const [settingsList, setSettingsList] = useState<SystemSetting[]>([]);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<SystemSetting[]>('/admin/settings');
      setSettingsList(res.data);
      const valMap: Record<string, any> = {};
      res.data.forEach((s) => {
        valMap[s.key] = s.value;
      });
      setEditValues(valMap);
    } catch (err) {
      console.error('Failed to load system settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdate = async (key: string) => {
    try {
      await apiClient.patch(`/admin/settings/${key}`, { value: editValues[key] });
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 3000);
    } catch (err) {
      console.error('Failed to update setting:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-soc-card border border-soc-border p-5 rounded-2xl">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          <span>System Policies & Risk Thresholds</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Global risk bands, alert suppression cooldown periods, automated block cutoffs, and engine defense modes.
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsList.map((setting) => (
          <div key={setting.key} className="bg-soc-card border border-soc-border rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-blue-400">{setting.key}</span>
              {savedKey === setting.key && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300">{setting.description}</p>

            <div className="flex items-center gap-3 pt-2">
              <input
                type={typeof setting.value === 'number' ? 'number' : 'text'}
                value={editValues[setting.key] ?? setting.value}
                onChange={(e) => {
                  const val = typeof setting.value === 'number' ? parseFloat(e.target.value) : e.target.value;
                  setEditValues((prev) => ({ ...prev, [setting.key]: val }));
                }}
                className="flex-1 bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => handleUpdate(setting.key)}
                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
