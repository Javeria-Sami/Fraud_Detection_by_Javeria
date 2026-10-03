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
        <div className="bg-soc-card border border-soc-border rounded-2xl h-80 p-5" />
        <div className="bg-soc-card border border-soc-border rounded-2xl h-80 p-5" />
        <div className="bg-soc-card border border-soc-border rounded-2xl h-80 p-5 lg:col-span-2" />
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

  const getHistogramColor = (minScore: number) => {
    if (minScore >= 80) return '#EF4444'; // Red
    if (minScore >= 60) return '#F97316'; // Orange
    if (minScore >= 30) return '#F59E0B'; // Amber
    return '#10B981';                     // Green
  };

  const avgScore = data?.average_risk_score ?? 0;
  const scoredTxns = data?.total_scored_transactions ?? 0;
  const riskDist = data?.risk_level_distribution ?? [];
  const riskHist = data?.risk_histogram ?? [];
  const riskTrend = data?.risk_trend ?? [];

  const elevatedRatio = riskDist
    .filter((r) => r.risk_level === 'HIGH' || r.risk_level === 'CRITICAL')
    .reduce((acc, curr) => acc + (curr.percentage ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Metric Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-soc-card border border-soc-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-500">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-soc-muted uppercase tracking-wider">
              Average Risk Score
            </div>
            <div className="text-2xl font-bold font-mono text-soc-foreground mt-1">
              {avgScore.toFixed(1)}{' '}
              <span className="text-xs font-normal text-soc-muted">/ 100</span>
            </div>
          </div>
        </div>

        <div className="bg-soc-card border border-soc-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-500">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-soc-muted uppercase tracking-wider">
              Scored Transactions
            </div>
            <div className="text-2xl font-bold font-mono text-soc-foreground mt-1">
              {scoredTxns.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-soc-card border border-soc-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-soc-muted uppercase tracking-wider">
              Elevated Risk Ratio
            </div>
            <div className="text-2xl font-bold font-mono text-soc-foreground mt-1">
              {elevatedRatio.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Level Tier Distribution */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-soc-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span>Risk Level Tier Distribution</span>
              </h3>
              <p className="text-xs text-soc-muted mt-0.5">
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
                        fill={RISK_COLORS[entry.risk_level] || '#64748B'}
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
              <div className="flex items-center justify-center h-full w-full text-xs text-soc-muted">
                No risk tier data available
              </div>
            )}
          </div>
        </div>

        {/* 0-100 Risk Score Histogram */}
        <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-soc-foreground flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-500" />
                <span>0–100 Risk Score Frequency Distribution</span>
              </h3>
              <p className="text-xs text-soc-muted mt-0.5">
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
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" vertical={false} />
                  <XAxis dataKey="bucket" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Bar dataKey="count" name="Frequency" radius={[6, 6, 0, 0]}>
                    {data.risk_histogram.map((bucket, index) => (
                      <Cell key={`hist-${index}`} fill={getHistogramColor(bucket.min_score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-soc-muted">
                No histogram data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Risk Trend Timeline */}
      <div className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-soc-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>Risk Severity & Average Score Trend</span>
            </h3>
            <p className="text-xs text-soc-muted mt-0.5">
              Evolution of average risk score alongside high & critical volume
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-soc-muted bg-soc-surface border border-soc-border px-2.5 py-1 rounded-lg">
            {data.risk_trend?.length || 0} Intervals
          </span>
        </div>

        <div className="h-64 w-full">
          {data.risk_trend && data.risk_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.risk_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={10} tickLine={false} domain={[0, 100]} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="avg_risk_score"
                  name="Avg Risk (0-100)"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="high_risk_count"
                  name="High Risk Count"
                  stroke="#F97316"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="critical_risk_count"
                  name="Critical Risk Count"
                  stroke="#EF4444"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-soc-muted">
              No trend data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
