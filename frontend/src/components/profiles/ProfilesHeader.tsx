import React from 'react';
import { UserCheck, Smartphone, Store, RefreshCw, ShieldCheck } from 'lucide-react';

interface ProfilesHeaderProps {
  activeTab: 'users' | 'devices' | 'merchants';
  setActiveTab: (tab: 'users' | 'devices' | 'merchants') => void;
  onRecalculate: () => Promise<void>;
  isRecalculating: boolean;
}

export const ProfilesHeader: React.FC<ProfilesHeaderProps> = ({
  activeTab,
  setActiveTab,
  onRecalculate,
  isRecalculating,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-soc-card border border-soc-border p-5 rounded-2xl shadow-sm">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-500">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-soc-foreground tracking-tight flex items-center gap-2">
              360° Entity Risk Profiling
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-full">
                LIVE BASELINES
              </span>
            </h1>
            <p className="text-xs text-soc-muted mt-0.5">
              Behavioral baselines, habitual hours, geo footprints, device-sharing telemetry & contextual anomaly signals.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Tab Selector */}
        <div className="flex items-center gap-1 p-1 bg-soc-bg border border-soc-border rounded-xl">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-soc-muted hover:text-soc-foreground hover:bg-soc-surface'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Users</span>
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'devices'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-soc-muted hover:text-soc-foreground hover:bg-soc-surface'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Devices</span>
          </button>
          <button
            onClick={() => setActiveTab('merchants')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'merchants'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-soc-muted hover:text-soc-foreground hover:bg-soc-surface'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Merchants</span>
          </button>
        </div>

        {/* Recalculate Button */}
        <button
          onClick={onRecalculate}
          disabled={isRecalculating}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-soc-surface border border-soc-border hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 text-soc-muted transition-all disabled:opacity-50 shadow-sm"
          title="Recalculate behavioral aggregates"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${isRecalculating ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isRecalculating ? 'Calculating...' : 'Recalculate'}</span>
        </button>
      </div>
    </div>
  );
};

