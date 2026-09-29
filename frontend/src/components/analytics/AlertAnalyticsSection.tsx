import React from 'react';
import { AlertAnalyticsResponse } from '../../types';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  BellRing,
  Clock,
  CheckCircle,
  AlertOctagon,
  TrendingUp,
  Tag,
} from 'lucide-react';

interface AlertAnalyticsSectionProps {
  data: AlertAnalyticsResponse;
  isLoading?: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#10B981',
  MEDIUM: '#F59E0B',
  HIGH: '#F97316',
  CRITICAL: '#EF4444',
};

const PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export const AlertAnalyticsSection: React.FC<AlertAnalyticsSectionProps> = ({
  data,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-xl h-24 p-4" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl h-80 p-5" />
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl h-80 p-5" />
        </div>
      </div>
    );
  }

  const customTooltipStyle = {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderRadius: '0.5rem',
    color: '#f8fafc',
    fontSize: '0.75rem',
  };

  const formatMinutes = (mins?: number) => {
    if (mins === undefined || mins === null) return 'N/A';
    if (mins < 60) return `${Math.round(mins)} min`;
    const hours = (mins / 60).toFixed(1);
    return `${hours} hrs`;
  };

  return (
    <div className="space-y-6">
      {/* Response Metrics & Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Alerts
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {data.total_alerts.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active / Critical
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {data.active_alerts}{' '}
              <span className="text-xs font-normal text-rose-400">
                ({data.critical_alerts} crit)
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Resolved Alerts
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {data.response_metrics?.total_resolved || 0}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Avg Resolution (MTTR)
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {formatMinutes(data.response_metrics?.avg_resolution_time_minutes)}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Timeline */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-rose-400" />
              <span>Alert Generation vs Resolution Velocity</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological frequency of incoming vs triaged security alerts
            </p>
          </div>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
            {data.alert_trend?.length || 0} Intervals
          </span>
        </div>

        <div className="h-64 w-full">
          {data.alert_trend && data.alert_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.alert_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  type="monotone"
                  dataKey="total_alerts"
                  name="Generated Alerts"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="critical_alerts"
                  name="Critical Alerts"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="resolved_alerts"
                  name="Resolved"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-500">
              No alert trend data available
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Distribution */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-amber-400" />
              <span>Severity Breakdown</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Alerts categorized by priority</p>
          </div>

          <div className="h-56 w-full flex items-center">
            {data.severity_distribution && data.severity_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.severity_distribution}
                    dataKey="count"
                    nameKey="label"
                    cx="36%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={3}
                  >
                    {data.severity_distribution.map((entry) => (
                      <Cell
                        key={`cell-${entry.label}`}
                        fill={SEVERITY_COLORS[entry.label] || '#6B7280'}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: '11px', paddingLeft: '4px', lineHeight: '22px' }}
                    formatter={(val) => {
                      const item = data.severity_distribution.find((d) => d.label === val);
                      return `${val}: ${item?.count || 0}`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full w-full text-xs text-slate-500">
                No severity data
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Status Distribution</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Alerts by lifecycle state</p>
          </div>

          <div className="h-56 w-full flex items-center">
            {data.status_distribution && data.status_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.status_distribution}
                    dataKey="count"
                    nameKey="label"
                    cx="36%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={3}
                  >
                    {data.status_distribution.map((_, index) => (
                      <Cell key={`status-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: '11px', paddingLeft: '4px', lineHeight: '22px' }}
                    formatter={(val) => {
                      const item = data.status_distribution.find((d) => d.label === val);
                      return `${val}: ${item?.count || 0}`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full w-full text-xs text-slate-500">
                No status data
              </div>
            )}
          </div>
        </div>

        {/* Top Trigger Reasons */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-400" />
              <span>Top Alert Reasons</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Most frequent security trigger types</p>
          </div>

          <div className="h-56 w-full">
            {data.top_alert_reasons && data.top_alert_reasons.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.top_alert_reasons.slice(0, 5)}
                  layout="vertical"
                  margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                  <YAxis
                    dataKey="label"
                    type="category"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    width={110}
                    tickFormatter={(val: string) => {
                      if (!val) return '';
                      return val.length > 15 ? `${val.slice(0, 13)}…` : val;
                    }}
                  />
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    formatter={(value: any, name: any, item: any) => [
                      `${value} alerts`,
                      item?.payload?.label || 'Reason',
                    ]}
                  />
                  <Bar dataKey="count" name="Alerts" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={16}>
                    {data.top_alert_reasons.slice(0, 5).map((_, index) => (
                      <Cell key={`reason-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-500">
                No alert reasons available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
