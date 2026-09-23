import React from 'react';
import { Activity, ShieldAlert, AlertTriangle, Cpu, TrendingUp } from 'lucide-react';
import { KPICard } from '../ui/KPICard';
import { SecurityDashboardKPIs } from '../../types';

export interface KPIGridProps {
  kpis: SecurityDashboardKPIs | null;
  timeRange: string;
  isLoading?: boolean;
  error?: string | null;
}

export const KPIGrid: React.FC<KPIGridProps> = ({
  kpis,
  timeRange,
  isLoading = false,
  error = null,
}) => {
  const getRangeLabel = () => {
    switch (timeRange) {
      case '15m': return 'Last 15 minutes';
      case '1h': return 'Last 1 hour';
      case '6h': return 'Last 6 hours';
      case '7d': return 'Last 7 days';
      default: return 'Last 24 hours';
    }
  };

  const rangeLabel = getRangeLabel();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Total Transactions */}
      <KPICard
        title="Total Transactions"
        value={kpis?.total_transactions.toLocaleString() ?? '0'}
        description={`$${(kpis?.total_volume ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} • ${rangeLabel}`}
        icon={Activity}
        isLoading={isLoading}
        error={error}
      />

      {/* 2. High-Risk Transactions */}
      <KPICard
        title="High Risk Transactions"
        value={kpis?.high_risk_transactions.toLocaleString() ?? '0'}
        description={`Tier 70–89 • ${rangeLabel}`}
        icon={AlertTriangle}
        isLoading={isLoading}
        error={error}
        className={kpis && kpis.high_risk_transactions > 0 ? 'border-amber-500/30' : ''}
      />

      {/* 3. Critical Transactions */}
      <KPICard
        title="Critical Transactions"
        value={kpis?.critical_transactions.toLocaleString() ?? '0'}
        description={`Tier 90–100 • ${rangeLabel}`}
        icon={ShieldAlert}
        isLoading={isLoading}
        error={error}
        className={kpis && kpis.critical_transactions > 0 ? 'border-rose-500/40 bg-rose-950/10' : ''}
      />

      {/* 4. Open Alerts */}
      <KPICard
        title="Active Alerts"
        value={kpis?.active_alerts.toLocaleString() ?? '0'}
        description={`${kpis?.critical_alerts ?? 0} critical severity queue`}
        icon={ShieldAlert}
        isLoading={isLoading}
        error={error}
      />

      {/* 5. Anomaly Rate */}
      <KPICard
        title="ML Anomaly Rate"
        value={`${kpis?.anomaly_rate.toFixed(1) ?? '0.0'}%`}
        description={`${kpis?.anomaly_count ?? 0} flagged • Isolation Forest`}
        icon={Cpu}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
};
