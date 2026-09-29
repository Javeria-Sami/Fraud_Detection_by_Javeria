import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DeviceRiskProfile } from '../../types';
import {
  Search,
  Smartphone,
  Users,
  AlertTriangle,
  MapPin,
  Store,
  ShieldAlert,
  ArrowUpRight,
  Percent,
  Activity
} from 'lucide-react';

interface DeviceProfileViewProps {
  deviceProfiles: DeviceRiskProfile[];
  selectedDevice: DeviceRiskProfile | null;
  onSelectDevice: (device: DeviceRiskProfile) => void;
  search: string;
  setSearch: (s: string) => void;
}

export const DeviceProfileView: React.FC<DeviceProfileViewProps> = ({
  deviceProfiles,
  selectedDevice,
  onSelectDevice,
  search,
  setSearch,
}) => {
  const navigate = useNavigate();

  const filteredDevices = deviceProfiles.filter((d) =>
    d.device_id.toLowerCase().includes(search.toLowerCase())
  );

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
      {/* Device List Sidebar */}
      <div className="bg-soc-card border border-soc-border rounded-2xl p-4 shadow-xl space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search device fingerprint..."
            className="w-full bg-soc-bg border border-soc-border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
          {filteredDevices.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">No devices found.</div>
          ) : (
            filteredDevices.map((d) => {
              const isSelected = selectedDevice?.device_id === d.device_id;
              const isShared = (d.distinct_users_count || 0) > 1;
              return (
                <div
                  key={d.device_id}
                  onClick={() => onSelectDevice(d)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/40 text-white shadow-md'
                      : 'bg-soc-bg/80 border-soc-border hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold font-mono text-xs truncate max-w-[160px]">
                      {d.device_id}
                    </span>
                    {isShared && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center gap-0.5">
                        <Users className="w-2.5 h-2.5" />
                        Shared
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                    <span>{d.total_transactions} txns</span>
                    <span>{((d.failure_rate || 0) * 100).toFixed(1)}% fail</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-soc-border/50 text-[10px]">
                    {getProfileStateBadge(d.profile_state)}
                    <span className="text-slate-400 font-mono">{d.distinct_users_count} users</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Device 360° Inspector */}
      <div className="lg:col-span-2 space-y-6">
        {selectedDevice ? (
          <div className="space-y-6">
            {/* Identity & Overview Card */}
            <div className="bg-soc-card border border-soc-border rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center font-bold text-lg">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold font-mono text-white">
                        {selectedDevice.device_id}
                      </h2>
                      {getProfileStateBadge(selectedDevice.profile_state)}
                    </div>
                    <span className="text-xs text-slate-400">Hardware & Telemetry Fingerprint</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/transactions?search=${selectedDevice.device_id}`)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <span>Inspect Transactions</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-soc-border text-xs">
                <div>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    Associated Users
                  </span>
                  <div className="text-base font-bold font-mono text-white mt-0.5">
                    {selectedDevice.distinct_users_count || 0}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    Total Transactions
                  </span>
                  <div className="text-base font-bold font-mono text-white mt-0.5">
                    {selectedDevice.total_transactions}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-amber-400" />
                    Failure Rate
                  </span>
                  <div className="text-base font-bold font-mono text-white mt-0.5">
                    {((selectedDevice.failure_rate || 0) * 100).toFixed(1)}%
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Store className="w-3.5 h-3.5 text-emerald-400" />
                    Associated Merchants
                  </span>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                    {selectedDevice.distinct_merchants_count || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Contextual Signals */}
            {selectedDevice.contextual_signals && selectedDevice.contextual_signals.length > 0 && (
              <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Contextual Device Risk Signals ({selectedDevice.contextual_signals.length})
                  </h3>
                </div>

                <div className="space-y-2">
                  {selectedDevice.contextual_signals.map((sig, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-soc-bg border border-soc-border rounded-xl space-y-1"
                    >
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
                  ))}
                </div>
              </div>
            )}

            {/* User Association Breakdown */}
            <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-soc-border pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Associated User Accounts ({selectedDevice.distinct_users_count || 0})
                  </h3>
                </div>
                {selectedDevice.distinct_users_count > 1 && (
                  <span className="text-[11px] text-rose-400 font-medium">
                    Multi-Account Device Sharing
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {(selectedDevice.associated_users || []).map((user, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(`/cases?search=${user}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-soc-bg hover:bg-slate-800 border border-soc-border rounded-xl text-xs font-mono text-slate-200 transition-colors"
                  >
                    <span>{user}</span>
                    <ArrowUpRight className="w-3 h-3 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Locations Observed */}
            <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex items-center gap-2 border-b border-soc-border pb-3">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Observed Geo Locations
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                {(selectedDevice.locations_used || []).length === 0 ? (
                  <p className="text-slate-500 py-2">No geo points recorded.</p>
                ) : (
                  (selectedDevice.locations_used || []).map((loc, idx) => (
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
        ) : (
          <div className="bg-soc-card border border-soc-border rounded-2xl p-12 text-center text-slate-500 text-xs">
            Select a device to inspect hardware risk and multi-user association telemetry.
          </div>
        )}
      </div>
    </div>
  );
};
