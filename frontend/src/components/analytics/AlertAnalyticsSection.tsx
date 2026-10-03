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

const PALETTE = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export const AlertAnalyticsSection: React.FC<AlertAnalyticsSectionProps> = ({
  data,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-soc-card border border-soc-border rounded-2xl h-24 p-4" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-soc-card border border-soc-border rounded-2xl h-80 p-5" />
          <div className="bg-soc-card border border-soc-border rounded-2xl h-80 p-5" />
        </div>
      </div>
    );
  }

  const customTooltipStyle = {
    backgroundColor: 'var(--soc-card, #FFFFFF)',
    borderColor: 'var(--soc-border, #E2E8F0)',
    borderRadius: '0.75rem',
    color: 'var(--soc-foreground, #0F172A)',
    fontSize: '0.75rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
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
        <div className="bg-soc-card border border-soc-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-500">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-soc-muted uppercase tracking-wider">
              Total Alerts
            </div>
            <div className="text-2xl font-bold font-mono text-soc-foreground mt-1">
              {(data?.total_alerts ?? 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-soc-card border border-soc-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-soc-muted uppercase tracking-wider">
              Active / Critical
            </div>
            <div className="text-2xl font-bold font-mono text-soc-foreground mt-1">
              {data?.active_alerts ?? 0}{' '}
              <span className="text-xs font-normal text-rose-600 dark:text-rose-400">
                ({data?.critical_alerts ?? 0} crit)
              </span>
            </div>
          </div>
        </div>

        <div className="bg-soc-card border border-soc-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-soc-muted uppercase tracking-wider">
              Resolved Alerts
            </div>
            <div className="text-2xl font-bold font-mono text-soc-foreground mt-1">
              {data.response_metrics?.total_resolved || 0}
            </div>
          </div>
        </div>

        <div className="bg-soc-card border border-soc-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-500">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-soc-muted uppercase tracking-wider">
              Avg Resolution (MTTR)
            </div>
            <div className="text-2xl font-bold font-mono text-soc-foreground mt-1">
              {formatMinutes(data.response_metrics?.avg_resolution_time_minutes)}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Timeline */}
      <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-soc-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-rose-500" />
              <span>Alert Generation vs Resolution Velocity</span>
            </h3>
            <p className="text-xs text-soc-muted mt-0.5">
              Chronological frequency of incoming vs triaged security alerts
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-soc-muted bg-soc-surface border border-soc-border px-2.5 py-1 rounded-lg">
            {data.alert_trend?.length || 0} Intervals
          </span>
        </div>

        <div className="h-64 w-full">
          {data.alert_trend && data.alert_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.alert_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  type="monotone"
                  dataKey="total_alerts"
                  name="Generated Alerts"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="critical_alerts"
                  name="Critical Alerts"
                  stroke="#EF4444"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="resolved_alerts"
                  name="Resolved"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-soc-muted">
              No alert trend data available
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Distribution */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-soc-foreground flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-amber-500" />
              <span>Severity Breakdown</span>
            </h3>
            <p className="text-xs text-soc-muted mt-0.5">Alerts categorized by priority</p>
          </div>

          <div className="h-56 w-full flex items-center justify-between">
            {data.severity_distribution && data.severity_distribution.length > 0 ? (
              <>
                <div className="w-1/2 h-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.severity_distribution}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={58}
                        paddingAngle={3}
                      >
                        {data.severity_distribution.map((entry) => (
                          <Cell
                            key={`cell-${entry.label}`}
                            fill={SEVERITY_COLORS[entry.label] || '#64748B'}
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={customTooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 flex flex-col justify-center space-y-2 pl-2">
                  {data.severity_distribution.map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-xs pr-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: SEVERITY_COLORS[item.label] || '#64748B' }}
                        />
                        <span className="font-semibold text-soc-muted uppercase tracking-wider text-[11px] truncate">
                          {item.label}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-soc-foreground ml-2">{item.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full w-full text-xs text-soc-muted">
                No severity data
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-soc-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Status Distribution</span>
            </h3>
            <p className="text-xs text-soc-muted mt-0.5">Alerts by lifecycle state</p>
          </div>

          <div className="h-56 w-full flex items-center justify-between">
            {data.status_distribution && data.status_distribution.length > 0 ? (
              <>
                <div className="w-1/2 h-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.status_distribution}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={58}
                        paddingAngle={3}
                      >
                        {data.status_distribution.map((_, index) => (
                          <Cell key={`status-${index}`} fill={PALETTE[index % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={customTooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 flex flex-col justify-center space-y-2 pl-2">
                  {data.status_distribution.map((item, index) => (
                    <div key={item.label} className="flex items-center justify-between text-xs pr-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: PALETTE[index % PALETTE.length] }}
                        />
                        <span className="font-semibold text-soc-muted uppercase tracking-wider text-[11px] truncate">
                          {item.label}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-soc-foreground ml-2">{item.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full w-full text-xs text-soc-muted">
                No status data
              </div>
            )}
          </div>
        </div>

        {/* Top Trigger Reasons */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-soc-foreground flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-500" />
              <span>Top Alert Reasons</span>
            </h3>
            <p className="text-xs text-soc-muted mt-0.5">Most frequent security trigger types</p>
          </div>

          <div className="h-56 w-full">
            {data.top_alert_reasons && data.top_alert_reasons.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.top_alert_reasons.slice(0, 5)}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                  <YAxis
                    dataKey="label"
                    type="category"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    width={130}
                  />
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    formatter={(value: any, name: any, item: any) => [
                      `${value} alerts`,
                      item?.payload?.label || 'Reason',
                    ]}
                  />
                  <Bar dataKey="count" name="Alerts" fill="#8B5CF6" radius={[0, 6, 6, 0]} barSize={16}>
                    {data.top_alert_reasons.slice(0, 5).map((_, index) => (
                      <Cell key={`reason-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-soc-muted">
                No alert reasons available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
