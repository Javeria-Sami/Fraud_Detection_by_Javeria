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
      <div className="bg-soc-card border border-soc-border rounded-2xl p-4 shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Tracked Users</span>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-white">
            {isLoading ? '...' : (stats?.total_user_profiles ?? 0).toLocaleString()}
          </span>
          {stats && stats.high_risk_users > 0 && (
            <span className="text-[11px] font-mono text-amber-400 flex items-center gap-0.5">
              <AlertTriangle className="w-3 h-3" />
              {stats.high_risk_users} high-risk
            </span>
          )}
        </div>
      </div>

      {/* Device Fingerprints */}
      <div className="bg-soc-card border border-soc-border rounded-2xl p-4 shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Device Fingerprints</span>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Smartphone className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-white">
            {isLoading ? '...' : (stats?.total_devices ?? 0).toLocaleString()}
          </span>
          {stats && stats.shared_devices > 0 && (
            <span className="text-[11px] font-mono text-rose-400 flex items-center gap-0.5">
              <ShieldAlert className="w-3 h-3" />
              {stats.shared_devices} multi-user shared
            </span>
          )}
        </div>
      </div>

      {/* Active Merchants */}
      <div className="bg-soc-card border border-soc-border rounded-2xl p-4 shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Active Merchants</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Store className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-white">
            {isLoading ? '...' : (stats?.total_merchants ?? 0).toLocaleString()}
          </span>
          {stats && stats.high_risk_merchants > 0 && (
            <span className="text-[11px] font-mono text-amber-400">
              {stats.high_risk_merchants} high-tier
            </span>
          )}
        </div>
      </div>

      {/* Profiling Engine Guard */}
      <div className="bg-soc-card border border-soc-border rounded-2xl p-4 shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Profiling State</span>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>Temporal Safe</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">v1.2</span>
          </div>
          <span className="text-[11px] text-slate-400">0% data leakage policy active</span>
        </div>
      </div>
    </div>
  );
};
