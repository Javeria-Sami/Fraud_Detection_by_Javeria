import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export interface RiskDistributionCardProps {
  distribution?: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const TIER_COLORS = {
  LOW: '#10B981',
  MEDIUM: '#EAB308',
  HIGH: '#F97316',
  CRITICAL: '#EF4444',
};

export const RiskDistributionCard: React.FC<RiskDistributionCardProps> = ({
  distribution,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <Card className="h-full flex flex-col justify-between">
        <CardHeader>
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-48 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-40 flex items-center justify-center">
            <Skeleton className="h-32 w-32 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full border-rose-500/30 flex flex-col justify-center items-center p-6 text-center">
        <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
        <h4 className="text-sm font-semibold text-soc-foreground">Risk Distribution Unavailable</h4>
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

  const total = (distribution?.LOW || 0) + (distribution?.MEDIUM || 0) + (distribution?.HIGH || 0) + (distribution?.CRITICAL || 0);

  if (total === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Risk Distribution</CardTitle>
          <CardDescription>Transaction risk tier breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={ShieldCheck}
            title="No Risk Data"
            description="No transaction records found in the selected time range."
          />
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: 'Low Risk (0-39)', key: 'LOW', value: distribution?.LOW || 0, color: TIER_COLORS.LOW },
    { name: 'Medium Risk (40-69)', key: 'MEDIUM', value: distribution?.MEDIUM || 0, color: TIER_COLORS.MEDIUM },
    { name: 'High Risk (70-89)', key: 'HIGH', value: distribution?.HIGH || 0, color: TIER_COLORS.HIGH },
    { name: 'Critical Risk (90-100)', key: 'CRITICAL', value: distribution?.CRITICAL || 0, color: TIER_COLORS.CRITICAL },
  ].filter((item) => item.value > 0);

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Risk Tier Distribution</CardTitle>
            <CardDescription>Calibrated composite score grouping</CardDescription>
          </div>
          <span className="text-xs font-mono text-soc-muted">{total} txns</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Donut Chart */}
        <div className="h-44 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={68}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#1e293b',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
                formatter={(val: number) => [`${val} (${((val / total) * 100).toFixed(1)}%)`, 'Count']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / Breakdown meters */}
        <div className="space-y-2 pt-2 border-t border-soc-border/60">
          {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((tier) => {
            const count = distribution?.[tier] || 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={tier} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-soc-muted">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TIER_COLORS[tier] }} />
                    <span className="text-[11px] font-semibold">{tier}</span>
                  </span>
                  <span className="text-soc-foreground font-semibold">
                    {count.toLocaleString()} <span className="text-soc-muted font-normal">({pct.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: TIER_COLORS[tier],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
