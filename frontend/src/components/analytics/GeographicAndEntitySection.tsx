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
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl h-80 p-5" />
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl h-80 p-5" />
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl h-80 p-5" />
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl h-80 p-5" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Country Risk Ranking */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <span>Geographic Country Breakdown</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Top transaction origins and elevated risk concentrations
              </p>
            </div>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
              {geoData.countries?.length || 0} Countries
            </span>
          </div>

          <div className="overflow-x-auto">
            {geoData.countries && geoData.countries.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2 font-medium">Country</th>
                    <th className="pb-2 font-medium">Txns</th>
                    <th className="pb-2 font-medium">Volume</th>
                    <th className="pb-2 font-medium">High Risk</th>
                    <th className="pb-2 font-medium">Risk Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {geoData.countries.slice(0, 8).map((c) => (
                    <tr key={c.country} className="hover:bg-slate-800/40">
                      <td className="py-2.5 font-medium text-white flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        <span>{c.country}</span>
                      </td>
                      <td className="py-2.5 text-slate-300">
                        {c.transaction_count.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-slate-300">
                        {c.total_volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2.5 text-rose-400 font-semibold">{c.high_risk_count}</td>
                      <td className="py-2.5">
                        <span
                          className={`font-medium ${
                            c.high_risk_percentage > 20
                              ? 'text-rose-400'
                              : c.high_risk_percentage > 5
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {c.high_risk_percentage.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-48 text-xs text-slate-500">
                No country geographic data available
              </div>
            )}
          </div>
        </div>

        {/* Top Cities */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Top Regional Metropolitan Cities</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                City hubs with highest activity and anomaly flags
              </p>
            </div>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
              {geoData.cities?.length || 0} Cities
            </span>
          </div>

          <div className="overflow-x-auto">
            {geoData.cities && geoData.cities.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2 font-medium">City</th>
                    <th className="pb-2 font-medium">Country</th>
                    <th className="pb-2 font-medium">Total Txns</th>
                    <th className="pb-2 font-medium">High Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {geoData.cities.slice(0, 8).map((city) => (
                    <tr key={`${city.city}-${city.country}`} className="hover:bg-slate-800/40">
                      <td className="py-2.5 font-medium text-white">{city.city}</td>
                      <td className="py-2.5 text-slate-400">{city.country}</td>
                      <td className="py-2.5 text-slate-300">
                        {city.transaction_count.toLocaleString()}
                      </td>
                      <td className="py-2.5 font-semibold text-amber-400">
                        {city.high_risk_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-48 text-xs text-slate-500">
                No city geographic records found
              </div>
            )}
          </div>
        </div>

        {/* Top Merchants by Volume & Risk */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-purple-400" />
                <span>Top Merchant Activity</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Merchants ranked by transaction flow and risk proportion
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {entityData.top_merchants && entityData.top_merchants.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2 font-medium">Merchant</th>
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 font-medium">Txns</th>
                    <th className="pb-2 font-medium">Volume</th>
                    <th className="pb-2 font-medium">Risk Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {entityData.top_merchants.slice(0, 8).map((m) => (
                    <tr key={m.merchant_name} className="hover:bg-slate-800/40">
                      <td className="py-2.5 font-semibold text-white max-w-[140px] truncate">
                        {m.merchant_name}
                      </td>
                      <td className="py-2.5 text-slate-400">{m.merchant_category || 'N/A'}</td>
                      <td className="py-2.5 text-slate-300">{m.transaction_count.toLocaleString()}</td>
                      <td className="py-2.5 text-slate-300">
                        {m.total_volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`font-semibold ${
                            m.high_risk_rate > 20
                              ? 'text-rose-400'
                              : m.high_risk_rate > 5
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {m.high_risk_rate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-48 text-xs text-slate-500">
                No merchant activity data available
              </div>
            )}
          </div>
        </div>

        {/* High-Velocity & Shared Devices */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>Device Fingerprint Patterns</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Shared devices and multi-account velocity concentrations
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {entityData.top_devices && entityData.top_devices.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2 font-medium">Device Fingerprint</th>
                    <th className="pb-2 font-medium">Distinct Users</th>
                    <th className="pb-2 font-medium">Total Txns</th>
                    <th className="pb-2 font-medium">Avg Risk</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {entityData.top_devices.slice(0, 8).map((d) => (
                    <tr key={d.device_id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 font-mono text-[11px] text-slate-300 max-w-[130px] truncate">
                        {d.device_id}
                      </td>
                      <td className="py-2.5 font-semibold text-cyan-400 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{d.distinct_users}</span>
                      </td>
                      <td className="py-2.5 text-slate-300">{d.transaction_count}</td>
                      <td className="py-2.5 font-medium text-slate-200">
                        {d.avg_risk_score.toFixed(1)}
                      </td>
                      <td className="py-2.5">
                        {d.is_shared ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1 w-fit">
                            <ShieldAlert className="w-2.5 h-2.5" /> Shared
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 w-fit">
                            Single
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-48 text-xs text-slate-500">
                No device fingerprint patterns detected
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
