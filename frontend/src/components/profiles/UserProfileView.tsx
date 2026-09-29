import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRiskProfile } from '../../types';
import { RiskScoreBadge } from '../shared/RiskScoreBadge';
import {
  Search,
  Smartphone,
  MapPin,
  Clock,
  Store,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Percent,
  Layers,
  AlertCircle
} from 'lucide-react';

interface UserProfileViewProps {
  userProfiles: UserRiskProfile[];
  selectedUser: UserRiskProfile | null;
  onSelectUser: (user: UserRiskProfile) => void;
  search: string;
  setSearch: (s: string) => void;
  riskFilter: string;
  setRiskFilter: (r: string) => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  userProfiles,
  selectedUser,
  onSelectUser,
  search,
  setSearch,
  riskFilter,
  setRiskFilter,
}) => {
  const navigate = useNavigate();

  const filteredUsers = userProfiles.filter((u) => {
    const matchesSearch =
      u.user_id.toLowerCase().includes(search.toLowerCase()) ||
      (u.user_name && u.user_name.toLowerCase().includes(search.toLowerCase()));
    const matchesRisk =
      riskFilter === 'ALL' || u.risk_level?.toUpperCase() === riskFilter.toUpperCase();
    return matchesSearch && matchesRisk;
  });

  const getProfileStateBadge = (state: string) => {
    switch (state) {
      case 'ESTABLISHED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 border border-emerald-500/40 text-emerald-400">
            ESTABLISHED
          </span>
        );
      case 'LIMITED_HISTORY':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/15 border border-amber-500/40 text-amber-400">
            LIMITED HISTORY
          </span>
        );
      case 'NEW_ENTITY':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/15 border border-blue-500/40 text-blue-400">
            NEW ENTITY
          </span>
        );
    }
  };

  const getSignalSeverityBadge = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-500/15 border-rose-500/40 text-rose-400';
      case 'HIGH':
        return 'bg-amber-500/15 border-amber-500/40 text-amber-400';
      case 'MEDIUM':
        return 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400';
      case 'INFO':
      default:
        return 'bg-blue-500/15 border-blue-500/40 text-blue-400';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sidebar List */}
      <div className="bg-soc-card border border-soc-border rounded-2xl p-4 shadow-xl space-y-3">
        {/* Search & Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user ID or name..."
              className="w-full bg-soc-bg border border-soc-border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setRiskFilter(lvl)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  riskFilter === lvl
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'bg-soc-bg border border-soc-border text-slate-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* User List */}
        <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">No user profiles found.</div>
          ) : (
            filteredUsers.map((u) => {
              const isSelected = selectedUser?.user_id === u.user_id;
              return (
                <div
                  key={u.user_id}
                  onClick={() => onSelectUser(u)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/40 text-white shadow-md'
                      : 'bg-soc-bg/80 border-soc-border hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-xs truncate max-w-[150px]">
                      {u.user_name || u.user_id}
                    </span>
                    <RiskScoreBadge
                      score={u.last_known_risk_score}
                      level={u.risk_level as any}
                      size="sm"
                      showLevel={false}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                    <span>{u.user_id}</span>
                    <span>${(u.avg_amount || 0).toFixed(0)} avg</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-soc-border/50 text-[10px]">
                    {getProfileStateBadge(u.profile_state)}
                    <span className="text-slate-400 font-mono">{u.total_transactions} txns</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Selected User 360° Inspector */}
      <div className="lg:col-span-2 space-y-6">
        {selectedUser ? (
          <div className="space-y-6">
            {/* Header / Identity Banner */}
            <div className="bg-soc-card border border-soc-border rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-lg font-mono">
                    {selectedUser.user_name ? selectedUser.user_name[0] : 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white">
                        {selectedUser.user_name || selectedUser.user_id}
                      </h2>
                      {getProfileStateBadge(selectedUser.profile_state)}
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{selectedUser.user_id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <RiskScoreBadge
                    score={selectedUser.last_known_risk_score}
                    level={selectedUser.risk_level as any}
                    size="lg"
                  />
                </div>
              </div>

              {/* Financial Baseline Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-soc-border text-xs">
                <div>
                  <span className="text-slate-400 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                    Baseline Avg Amount
                  </span>
                  <div className="text-base font-bold font-mono text-white mt-0.5">
                    ${(selectedUser.avg_amount || 0).toFixed(2)}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    Median (50th %ile)
                  </span>
                  <div className="text-base font-bold font-mono text-white mt-0.5">
                    ${(selectedUser.median_amount || 0).toFixed(2)}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-amber-400" />
                    Failure Rate
                  </span>
                  <div className="text-base font-bold font-mono text-white mt-0.5">
                    {((selectedUser.failure_rate || 0) * 100).toFixed(1)}%
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-emerald-400" />
                    Lifetime Volume
                  </span>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                    ${(selectedUser.total_volume || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Quick Cross-Module Navigation Links */}
              <div className="mt-4 pt-4 border-t border-soc-border/60 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate(`/transactions?user_id=${selectedUser.user_id}`)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <span>Explore Transactions</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
                </button>

                <button
                  onClick={() => navigate(`/alerts?search=${selectedUser.user_id}`)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <span>View Entity Alerts</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                </button>

                <button
                  onClick={() => navigate(`/cases?search=${selectedUser.user_id}`)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <span>Investigation Cases</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-purple-400" />
                </button>
              </div>
            </div>

            {/* Contextual Risk Signals */}
            {selectedUser.contextual_signals && selectedUser.contextual_signals.length > 0 && (
              <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Contextual Behavioral Risk Signals ({selectedUser.contextual_signals.length})
                  </h3>
                </div>

                <div className="space-y-2">
                  {selectedUser.contextual_signals.map((sig, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-soc-bg border border-soc-border rounded-xl flex flex-col sm:flex-row sm:items-start justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getSignalSeverityBadge(
                              sig.severity
                            )}`}
                          >
                            {sig.code}
                          </span>
                          <span className="text-xs text-white font-medium">{sig.description}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {typeof sig.evidence === 'object' && sig.evidence !== null
                            ? Object.entries(sig.evidence)
                                .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                                .join(' • ')
                            : String(sig.evidence || '')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Habitual Hours Heatmap/Visualizer */}
            <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Habitual Transaction Hours (24h UTC)
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {selectedUser.habitual_hour_display || 'Normal hours'}
                </span>
              </div>

              {/* 24 Hour Bar Matrix */}
              <div className="grid grid-cols-12 sm:grid-cols-24 gap-1 pt-2">
                {Array.from({ length: 24 }).map((_, hour) => {
                  const isHabitual = (selectedUser.typical_hours || []).includes(hour);
                  return (
                    <div
                      key={hour}
                      className="flex flex-col items-center gap-1 group relative cursor-default"
                    >
                      <div
                        className={`w-full h-8 rounded transition-all ${
                          isHabitual
                            ? 'bg-blue-500 border border-blue-400/50 shadow-sm'
                            : 'bg-slate-800/80 border border-slate-700/50'
                        }`}
                      />
                      <span className="text-[9px] font-mono text-slate-500">{hour}</span>

                      {/* Tooltip */}
                      <div className="absolute bottom-10 hidden group-hover:block bg-slate-900 border border-slate-700 px-2 py-1 rounded text-[10px] font-mono text-white shadow-xl z-20 whitespace-nowrap">
                        {hour}:00 - {isHabitual ? 'Habitual Hour' : 'Infrequent Hour'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Devices & Habitual Locations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Authorized Devices */}
              <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex items-center justify-between border-b border-soc-border pb-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Authorized Devices ({selectedUser.distinct_devices_count || 0})
                    </h3>
                  </div>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  {(selectedUser.distinct_devices || []).length === 0 ? (
                    <p className="text-slate-500 text-xs py-2">No device fingerprints observed.</p>
                  ) : (
                    (selectedUser.distinct_devices || []).map((dev, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-soc-bg border border-soc-border rounded-lg text-slate-200 flex items-center justify-between"
                      >
                        <span className="truncate max-w-[200px]">{dev}</span>
                        <span className="text-[10px] text-blue-400 font-sans">Verified</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Habitual Locations */}
              <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex items-center justify-between border-b border-soc-border pb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Habitual Geo Locations
                    </h3>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  {(selectedUser.top_locations || []).length === 0 ? (
                    <p className="text-slate-500 text-xs py-2">No locations recorded.</p>
                  ) : (
                    (selectedUser.top_locations || []).map((loc, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-soc-bg border border-soc-border rounded-lg text-slate-200 flex justify-between items-center"
                      >
                        <span>
                          {loc.city || 'Unknown'}, {loc.country || 'Global'}
                        </span>
                        <span className="text-emerald-400 font-mono text-[11px]">
                          {loc.count} txns
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Merchant Preferences */}
            <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex items-center gap-2 border-b border-soc-border pb-3">
                <Store className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Associated Merchants ({selectedUser.distinct_merchants_count || 0})
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                {(selectedUser.distinct_merchants || []).length === 0 ? (
                  <p className="text-slate-500 text-xs py-2">No merchant records observed.</p>
                ) : (
                  (selectedUser.distinct_merchants || []).map((m, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-soc-bg border border-soc-border rounded-lg text-xs font-mono text-slate-200"
                    >
                      {m}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-soc-card border border-soc-border rounded-2xl p-12 text-center text-slate-500 text-xs">
            Select a user from the list to inspect 360° behavioral risk profile.
          </div>
        )}
      </div>
    </div>
  );
};
