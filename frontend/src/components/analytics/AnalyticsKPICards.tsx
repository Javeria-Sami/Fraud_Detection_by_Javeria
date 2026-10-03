import React from 'react';
import { AnalyticsOverviewKPIs } from '../../types';
import {
  Activity,
  DollarSign,
  AlertTriangle,
  Flame,
  BrainCircuit,
  BellRing,
  FolderOpen,
  Users,
} from 'lucide-react';

interface AnalyticsKPICardsProps {
  kpis: AnalyticsOverviewKPIs;
  isLoading?: boolean;
}

export const AnalyticsKPICards: React.FC<AnalyticsKPICardsProps> = ({ kpis, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 animate-pulse h-28 flex flex-col justify-between"
          >
            <div className="h-4 bg-slate-800 rounded w-1/2" />
            <div className="h-7 bg-slate-800 rounded w-3/4" />
            <div className="h-3 bg-slate-800 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  const safeKpis: Partial<AnalyticsOverviewKPIs> = kpis || {};
  const totalTxns = safeKpis.total_transactions ?? 0;
  const highRiskTxns = safeKpis.high_risk_transactions ?? 0;
  const critRiskTxns = safeKpis.critical_risk_transactions ?? 0;
  const suspTxns = safeKpis.suspicious_transactions ?? 0;
  const anomalyCount = safeKpis.anomaly_count ?? 0;
  const anomalyRate = safeKpis.anomaly_rate ?? 0;
  const activeAlerts = safeKpis.active_alerts ?? 0;
  const critAlerts = safeKpis.critical_alerts ?? 0;
  const openCases = safeKpis.open_cases ?? 0;
  const highRiskUsers = safeKpis.high_risk_users ?? 0;
  const totalVolume = safeKpis.total_volume_usd_equiv ?? 0;
  const flaggedAmount = safeKpis.flagged_amount_usd_equiv ?? 0;
  const currencies = safeKpis.currencies ?? [];

  const formatCurrency = (amount?: number, curr = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: 0,
    }).format(amount ?? 0);
  };

  const cards = [
    {
      title: 'Total Transactions',
      value: totalTxns.toLocaleString(),
      subtext: `${currencies.length} active currencies`,
      icon: Activity,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      title: 'Total Volume (USD Equiv)',
      value: formatCurrency(totalVolume),
      subtext: currencies.length
        ? currencies
            .slice(0, 3)
            .map((c) => `${c.currency}: ${c.transaction_count ?? 0}`)
            .join(' | ')
        : 'All transaction streams',
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      title: 'High & Critical Risk',
      value: (highRiskTxns + critRiskTxns).toLocaleString(),
      subtext: `${critRiskTxns} Critical (${(
        ((highRiskTxns + critRiskTxns) / (totalTxns || 1)) *
        100
      ).toFixed(1)}%)`,
      icon: Flame,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
    },
    {
      title: 'Suspicious Amount (USD)',
      value: formatCurrency(flaggedAmount),
      subtext: `${suspTxns.toLocaleString()} flagged txns`,
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    {
      title: 'ML Anomaly Rate',
      value: `${(anomalyRate * 100).toFixed(2)}%`,
      subtext: `${anomalyCount.toLocaleString()} detected anomalies`,
      icon: BrainCircuit,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
    {
      title: 'Active Security Alerts',
      value: activeAlerts.toLocaleString(),
      subtext: `${critAlerts} critical severity`,
      icon: BellRing,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
    },
    {
      title: 'Open Investigations',
      value: openCases.toLocaleString(),
      subtext: 'Active case dossiers',
      icon: FolderOpen,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
    },
    {
      title: 'High Risk Users',
      value: highRiskUsers.toLocaleString(),
      subtext: 'Entities with score ≥ 70',
      icon: Users,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-4 rounded-xl border bg-slate-900/60 backdrop-blur-md transition-all duration-200 hover:border-slate-700/80 flex flex-col justify-between ${card.border}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-2 rounded-lg ${card.bg} ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-white tracking-tight">{card.value}</div>
              <div className="text-xs text-slate-400 mt-1 truncate" title={card.subtext}>
                {card.subtext}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
