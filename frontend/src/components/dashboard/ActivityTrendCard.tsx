import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { TrendBucket } from '../../types';

export interface ActivityTrendCardProps {
  trends?: TrendBucket[];
  timeRange: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const ActivityTrendCard: React.FC<ActivityTrendCardProps> = ({
  trends = [],
  timeRange,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <Skeleton className="h-56 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full border-rose-500/30 flex flex-col justify-center items-center p-6 text-center">
        <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
        <h4 className="text-sm font-semibold text-soc-foreground">Trend Data Unavailable</h4>
        <p className="text-xs text-soc-muted mt-1">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg border border-slate-700 transition-colors"
          >
            Retry
          </button>
        )}
      </Card>
    );
  }

  const hasData = trends && trends.length > 0 && trends.some((t) => t.transaction_count > 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle>Transaction & Threat Velocity</CardTitle>
            <CardDescription>
              Time-series distribution of transaction volume, flagged anomalies, and average risk score
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-slate-300 text-[11px]">Total Volume</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="text-rose-400 text-[11px]">Flagged / Anomalies</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!hasData ? (
          <div className="py-8">
            <EmptyState
              icon={TrendingUp}
              title="No Activity Recorded"
              description="No transaction events captured during this time interval."
            />
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="flagGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
                  formatter={(val: number, name: string) => {
                    if (name === 'transaction_count') return [val, 'Total Transactions'];
                    if (name === 'flagged_count') return [val, 'Flagged Threats'];
                    if (name === 'avg_risk_score') return [`${val}/100`, 'Avg Risk Score'];
                    return [val, name];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="transaction_count"
                  name="transaction_count"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#volGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="flagged_count"
                  name="flagged_count"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#flagGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
