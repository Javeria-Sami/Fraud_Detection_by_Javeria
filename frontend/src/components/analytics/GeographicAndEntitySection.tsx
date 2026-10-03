import React from 'react';
import {
  GeographicAnalyticsResponse,
  EntityPatternsResponse,
} from '../../types';
import {
  Globe,
  MapPin,
  Store,
  Smartphone,
  ShieldAlert,
  Users,
} from 'lucide-react';

interface GeographicAndEntitySectionProps {
  geoData: GeographicAnalyticsResponse;
  entityData: EntityPatternsResponse;
  isLoading?: boolean;
}

export const GeographicAndEntitySection: React.FC<GeographicAndEntitySectionProps> = ({
  geoData,
  entityData,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
        <div className="bg-soc-card border border-soc-border rounded-2xl h-80 p-5 shadow-sm" />
        <div className="bg-soc-card border border-soc-border rounded-2xl h-80 p-5 shadow-sm" />
        <div className="bg-soc-card border border-soc-border rounded-2xl h-80 p-5 shadow-sm" />
        <div className="bg-soc-card border border-soc-border rounded-2xl h-80 p-5 shadow-sm" />
      </div>
    );
  }

  const countries = geoData?.countries ?? [];
  const cities = geoData?.cities ?? [];
  const merchants = entityData?.top_merchants || (entityData as any)?.merchants || [];
  const devices = entityData?.top_devices || (entityData as any)?.devices || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Country Risk Ranking */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-soc-foreground flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span>Geographic Country Breakdown</span>
              </h3>
              <p className="text-xs text-soc-muted mt-0.5">
                Top transaction origins and elevated risk concentrations
              </p>
            </div>
            <span className="text-xs text-soc-muted bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-soc-border font-medium">
              {countries.length} Countries
            </span>
          </div>

          <div className="overflow-x-auto">
            {countries.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-soc-border text-soc-muted">
                    <th className="pb-2 font-semibold">Country</th>
                    <th className="pb-2 font-semibold">Txns</th>
                    <th className="pb-2 font-semibold">Volume</th>
                    <th className="pb-2 font-semibold">High Risk</th>
                    <th className="pb-2 font-semibold">Risk Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soc-border">
                  {countries.slice(0, 8).map((c) => (
                    <tr key={c.country} className="hover:bg-blue-50/60 dark:hover:bg-soc-hover/40 transition-colors">
                      <td className="py-2.5 font-medium text-soc-foreground flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        <span>{c.country}</span>
                      </td>
                      <td className="py-2.5 text-soc-text-secondary font-mono">
                        {(c.transaction_count ?? 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 text-soc-text-secondary font-mono">
                        {(c.total_volume ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2.5 text-rose-600 dark:text-rose-400 font-semibold font-mono">{c.high_risk_count ?? 0}</td>
                      <td className="py-2.5">
                        <span
                          className={`font-semibold font-mono ${
                            (c.high_risk_percentage ?? 0) > 20
                              ? 'text-rose-600 dark:text-rose-400'
                              : (c.high_risk_percentage ?? 0) > 5
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {(c.high_risk_percentage ?? 0).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-48 text-xs text-soc-muted">
                No country geographic data available
              </div>
            )}
          </div>
        </div>

        {/* Top Cities */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-soc-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Top Regional Metropolitan Cities</span>
              </h3>
              <p className="text-xs text-soc-muted mt-0.5">
                City hubs with highest activity and anomaly flags
              </p>
            </div>
            <span className="text-xs text-soc-muted bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-soc-border font-medium">
              {cities.length} Cities
            </span>
          </div>

          <div className="overflow-x-auto">
            {cities.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-soc-border text-soc-muted">
                    <th className="pb-2 font-semibold">City</th>
                    <th className="pb-2 font-semibold">Country</th>
                    <th className="pb-2 font-semibold">Total Txns</th>
                    <th className="pb-2 font-semibold">High Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soc-border">
                  {cities.slice(0, 8).map((city) => (
                    <tr key={`${city.city}-${city.country}`} className="hover:bg-blue-50/60 dark:hover:bg-soc-hover/40 transition-colors">
                      <td className="py-2.5 font-medium text-soc-foreground">{city.city}</td>
                      <td className="py-2.5 text-soc-muted">{city.country}</td>
                      <td className="py-2.5 text-soc-text-secondary font-mono">
                        {(city.transaction_count ?? 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 font-semibold font-mono text-amber-600 dark:text-amber-400">
                        {city.high_risk_count ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-48 text-xs text-soc-muted">
                No city geographic records found
              </div>
            )}
          </div>
        </div>

        {/* Top Merchants by Volume & Risk */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-soc-foreground flex items-center gap-2">
                <Store className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Top Merchant Activity</span>
              </h3>
              <p className="text-xs text-soc-muted mt-0.5">
                Merchants ranked by transaction flow and risk proportion
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {merchants.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-soc-border text-soc-muted">
                    <th className="pb-2 font-semibold">Merchant</th>
                    <th className="pb-2 font-semibold">Category</th>
                    <th className="pb-2 font-semibold">Txns</th>
                    <th className="pb-2 font-semibold">Volume</th>
                    <th className="pb-2 font-semibold">Risk Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soc-border">
                  {merchants.slice(0, 8).map((m: any) => (
                    <tr key={m.merchant_name} className="hover:bg-blue-50/60 dark:hover:bg-soc-hover/40 transition-colors">
                      <td className="py-2.5 font-semibold text-soc-foreground max-w-[140px] truncate">
                        {m.merchant_name}
                      </td>
                      <td className="py-2.5 text-soc-muted">{m.merchant_category || 'N/A'}</td>
                      <td className="py-2.5 text-soc-text-secondary font-mono">{(m.transaction_count ?? 0).toLocaleString()}</td>
                      <td className="py-2.5 text-soc-text-secondary font-mono">
                        {(m.total_volume ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`font-semibold font-mono ${
                            (m.high_risk_rate ?? 0) > 20
                              ? 'text-rose-600 dark:text-rose-400'
                              : (m.high_risk_rate ?? 0) > 5
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {(m.high_risk_rate ?? 0).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-48 text-xs text-soc-muted">
                No merchant activity data available
              </div>
            )}
          </div>
        </div>

        {/* High-Velocity & Shared Devices */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-soc-foreground flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Device Fingerprint Patterns</span>
              </h3>
              <p className="text-xs text-soc-muted mt-0.5">
                Shared devices and multi-account velocity concentrations
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {devices.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-soc-border text-soc-muted">
                    <th className="pb-2 font-semibold">Device Fingerprint</th>
                    <th className="pb-2 font-semibold">Distinct Users</th>
                    <th className="pb-2 font-semibold">Total Txns</th>
                    <th className="pb-2 font-semibold">Avg Risk</th>
                    <th className="pb-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soc-border">
                  {devices.slice(0, 8).map((d: any) => (
                    <tr key={d.device_id} className="hover:bg-blue-50/60 dark:hover:bg-soc-hover/40 transition-colors">
                      <td className="py-2.5 font-mono text-[11px] text-soc-text-secondary max-w-[130px] truncate">
                        {d.device_id}
                      </td>
                      <td className="py-2.5 font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1 font-mono">
                        <Users className="w-3 h-3" />
                        <span>{d.distinct_users ?? 1}</span>
                      </td>
                      <td className="py-2.5 text-soc-text-secondary font-mono">{d.transaction_count ?? 0}</td>
                      <td className="py-2.5 font-semibold font-mono text-soc-foreground">
                        {(d.avg_risk_score ?? 0).toFixed(1)}
                      </td>
                      <td className="py-2.5">
                        {d.is_shared ? (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1 w-fit">
                            <ShieldAlert className="w-3 h-3" /> Shared
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-soc-muted border border-soc-border w-fit">
                            Single
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-48 text-xs text-soc-muted">
                No device fingerprint patterns detected
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
