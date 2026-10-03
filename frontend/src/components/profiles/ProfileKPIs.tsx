import React from 'react';
import { Users, Smartphone, Store, AlertTriangle, ShieldAlert } from 'lucide-react';
import { ProfileStatsResponse } from '../../types';

interface ProfileKPIsProps {
  stats: ProfileStatsResponse | null;
  isLoading: boolean;
}

export const ProfileKPIs: React.FC<ProfileKPIsProps> = ({ stats, isLoading }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Tracked Users */}
      <div className="bg-soc-card border border-soc-border hover:border-blue-300 dark:hover:border-blue-900/50 rounded-2xl p-4 shadow-sm transition-all relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs text-soc-muted font-medium">Tracked Users</span>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-soc-foreground">
            {isLoading ? '...' : (stats?.total_user_profiles ?? 0).toLocaleString()}
          </span>
          {stats && stats.high_risk_users > 0 && (
            <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
              <AlertTriangle className="w-3 h-3" />
              {stats.high_risk_users} high-risk
            </span>
          )}
        </div>
      </div>

      {/* Device Fingerprints */}
      <div className="bg-soc-card border border-soc-border hover:border-purple-300 dark:hover:border-purple-900/50 rounded-2xl p-4 shadow-sm transition-all relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs text-soc-muted font-medium">Device Fingerprints</span>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
            <Smartphone className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-soc-foreground">
            {isLoading ? '...' : (stats?.total_devices ?? 0).toLocaleString()}
          </span>
          {stats && stats.shared_devices > 0 && (
            <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
              <ShieldAlert className="w-3 h-3" />
              {stats.shared_devices} multi-user shared
            </span>
          )}
        </div>
      </div>

      {/* Active Merchants */}
      <div className="bg-soc-card border border-soc-border hover:border-emerald-300 dark:hover:border-emerald-900/50 rounded-2xl p-4 shadow-sm transition-all relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs text-soc-muted font-medium">Active Merchants</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <Store className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-soc-foreground">
            {isLoading ? '...' : (stats?.total_merchants ?? 0).toLocaleString()}
          </span>
          {stats && stats.high_risk_merchants > 0 && (
            <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
              {stats.high_risk_merchants} high-tier
            </span>
          )}
        </div>
      </div>

      {/* Profiling Engine Guard */}
      <div className="bg-soc-card border border-soc-border hover:border-cyan-300 dark:hover:border-cyan-900/50 rounded-2xl p-4 shadow-sm transition-all relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs text-soc-muted font-medium">Profiling State</span>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-sm font-bold text-soc-foreground flex items-center gap-1.5">
            <span>Temporal Safe</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-soc-surface border border-soc-border text-soc-muted font-mono">v1.2</span>
          </div>
          <span className="text-[11px] text-soc-muted">0% data leakage policy active</span>
        </div>
      </div>
    </div>
  );
};

