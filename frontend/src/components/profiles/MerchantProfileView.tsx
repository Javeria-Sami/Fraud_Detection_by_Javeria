import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MerchantRiskProfile } from '../../types';
import {
  Search,
  Store,
  Users,
  Smartphone,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Percent,
  Layers,
  MapPin,
  Tag
} from 'lucide-react';

interface MerchantProfileViewProps {
  merchantProfiles: MerchantRiskProfile[];
  selectedMerchant: MerchantRiskProfile | null;
  onSelectMerchant: (merchant: MerchantRiskProfile) => void;
  search: string;
  setSearch: (s: string) => void;
}

export const MerchantProfileView: React.FC<MerchantProfileViewProps> = ({
  merchantProfiles,
  selectedMerchant,
  onSelectMerchant,
  search,
  setSearch,
}) => {
  const navigate = useNavigate();

  const filteredMerchants = merchantProfiles.filter(
    (m) =>
      m.merchant_name.toLowerCase().includes(search.toLowerCase()) ||
      (m.category && m.category.toLowerCase().includes(search.toLowerCase()))
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

  const getCategoryTierBadge = (tier: string) => {
    switch (tier?.toUpperCase()) {
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-400">
            HIGH RISK TIER
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400">
            MEDIUM RISK TIER
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            STANDARD TIER
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
      {/* Merchant List Sidebar */}
      <div className="bg-soc-card border border-soc-border rounded-2xl p-4 shadow-xl space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search merchant name or category..."
            className="w-full bg-soc-bg border border-soc-border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
          {filteredMerchants.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">No merchants found.</div>
          ) : (
            filteredMerchants.map((m) => {
              const isSelected = selectedMerchant?.merchant_name === m.merchant_name;
              return (
                <div
                  key={m.merchant_name}
                  onClick={() => onSelectMerchant(m)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/40 text-white shadow-md'
                      : 'bg-soc-bg/80 border-soc-border hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-xs truncate max-w-[150px]">
                      {m.merchant_name}
                    </span>
                    {getCategoryTierBadge(m.base_risk_tier)}
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                    <span className="capitalize">{m.category || 'Retail'}</span>
                    <span>${(m.total_volume || 0).toLocaleString()} vol</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-soc-border/50 text-[10px]">
                    {getProfileStateBadge(m.profile_state)}
                    <span className="text-slate-400 font-mono">{m.total_transactions} txns</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Merchant 360° Inspector */}
      <div className="lg:col-span-2 space-y-6">
        {selectedMerchant ? (
          <div className="space-y-6">
            {/* Identity & Overview Banner */}
            <div className="bg-soc-card border border-soc-border rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-lg">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white">{selectedMerchant.merchant_name}</h2>
                      {getProfileStateBadge(selectedMerchant.profile_state)}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                        <Tag className="w-3 h-3 text-slate-500" />
                        {selectedMerchant.category || 'Standard Retail'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getCategoryTierBadge(selectedMerchant.base_risk_tier)}
                  <button
                    onClick={() => navigate(`/transactions?search=${selectedMerchant.merchant_name}`)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <span>Transactions</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
                  </button>
                </div>
              </div>

              {/* Aggregates Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-soc-border text-xs">
                <div>
                  <span className="text-slate-400 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    Lifetime Volume
                  </span>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                    ${(selectedMerchant.total_volume || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    Avg Transaction
                  </span>
                  <div className="text-base font-bold font-mono text-white mt-0.5">
                    ${(selectedMerchant.avg_amount || 0).toFixed(2)}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-amber-400" />
                    Failure Rate
                  </span>
                  <div className="text-base font-bold font-mono text-white mt-0.5">
                    {((selectedMerchant.failure_rate || 0) * 100).toFixed(1)}%
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    Customer Base
                  </span>
                  <div className="text-base font-bold font-mono text-white mt-0.5">
                    {selectedMerchant.distinct_users_count || 0} unique users
                  </div>
                </div>
              </div>
            </div>

            {/* Contextual Signals */}
            {selectedMerchant.contextual_signals && selectedMerchant.contextual_signals.length > 0 && (
              <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Contextual Merchant Risk Signals ({selectedMerchant.contextual_signals.length})
                  </h3>
                </div>

                <div className="space-y-2">
                  {selectedMerchant.contextual_signals.map((sig, idx) => (
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

            {/* Customer & Device Footprint */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Unique Devices */}
              <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex items-center gap-2 border-b border-soc-border pb-3">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Device Diversity
                  </h3>
                </div>
                <div className="text-xs text-slate-300">
                  <div className="text-2xl font-bold font-mono text-white">
                    {selectedMerchant.distinct_devices_count || 0}
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    Unique hardware fingerprints transacted
                  </span>
                </div>
              </div>

              {/* Geographic Reach */}
              <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex items-center gap-2 border-b border-soc-border pb-3">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Geographic Distribution
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  {(selectedMerchant.locations || []).length === 0 ? (
                    <p className="text-slate-500 py-2">No location telemetry.</p>
                  ) : (
                    (selectedMerchant.locations || []).map((loc, idx) => (
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
          </div>
        ) : (
          <div className="bg-soc-card border border-soc-border rounded-2xl p-12 text-center text-slate-500 text-xs">
            Select a merchant to inspect risk classification and transaction distributions.
          </div>
        )}
      </div>
    </div>
  );
};
