import React from 'react';
import { RiskAnalyticsResponse } from '../../types';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import { ShieldAlert, BarChart2, Activity, Gauge } from 'lucide-react';

interface RiskDistributionChartsProps {
  data: RiskAnalyticsResponse;
  isLoading?: boolean;
}

const RISK_COLORS: Record<string, string> = {
  LOW: '#10B981',      // Emerald
  MEDIUM: '#F59E0B',   // Amber
  HIGH: '#F97316',     // Orange
  CRITICAL: '#EF4444', // Red
};

export const RiskDistributionCharts: React.FC<RiskDistributionChartsProps> = ({
  data,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl h-80 p-5" />
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl h-80 p-5" />
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl h-80 p-5 lg:col-span-2" />
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

  const getHistogramColor = (minScore: number) => {
    if (minScore >= 80) return '#EF4444'; // Red
    if (minScore >= 60) return '#F97316'; // Orange
    if (minScore >= 30) return '#F59E0B'; // Amber
    return '#10B981';                     // Green
  };

  return (
    <div className="space-y-6">
      {/* Top Metric Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Average Risk Score
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {data.average_risk_score.toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-400">/ 100</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Scored Transactions
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {data.total_scored_transactions.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Elevated Risk Ratio
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {(
                (data.risk_level_distribution
                  .filter((r) => r.risk_level === 'HIGH' || r.risk_level === 'CRITICAL')
                  .reduce((acc, curr) => acc + curr.percentage, 0))
              ).toFixed(1)}
              %
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Level Tier Distribution */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Risk Level Tier Distribution</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Proportion of transactions classified by risk tier
              </p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center">
            {data.risk_level_distribution && data.risk_level_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.risk_level_distribution}
                    dataKey="count"
                    nameKey="risk_level"
                    cx="36%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {data.risk_level_distribution.map((entry) => (
                      <Cell
                        key={`cell-${entry.risk_level}`}
                        fill={RISK_COLORS[entry.risk_level] || '#6B7280'}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: '11px', paddingLeft: '10px' }}
                    formatter={(val) => {
                      const item = data.risk_level_distribution.find((d) => d.risk_level === val);
                      return `${val}: ${item?.count || 0} (${item?.percentage || 0}%)`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full w-full text-xs text-slate-500">
                No risk tier data available
              </div>
            )}
          </div>
        </div>

        {/* 0-100 Risk Score Histogram */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-400" />
                <span>0–100 Risk Score Frequency Distribution</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Decile histogram of scored transactions
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            {data.risk_histogram && data.risk_histogram.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.risk_histogram}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="bucket" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Bar dataKey="count" name="Frequency" radius={[4, 4, 0, 0]}>
                    {data.risk_histogram.map((bucket, index) => (
                      <Cell key={`hist-${index}`} fill={getHistogramColor(bucket.min_score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-500">
                No histogram data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Risk Trend Timeline */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Risk Severity & Average Score Trend</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Evolution of average risk score alongside high & critical volume
            </p>
          </div>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
            {data.risk_trend?.length || 0} Intervals
          </span>
        </div>

        <div className="h-64 w-full">
          {data.risk_trend && data.risk_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.risk_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 100]} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="avg_risk_score"
                  name="Avg Risk (0-100)"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="high_risk_count"
                  name="High Risk Count"
                  stroke="#F97316"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="critical_risk_count"
                  name="Critical Risk Count"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-500">
              No trend data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
