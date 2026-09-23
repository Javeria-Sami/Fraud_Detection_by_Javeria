import React from 'react';
import { AlertStats } from '../../types';
import { AlertTriangle, ShieldAlert, UserCheck, Flame, CheckCircle } from 'lucide-react';

interface AlertKPIsProps {
  stats: AlertStats | null;
  isLoading: boolean;
  selectedStatus: string;
  selectedSeverity: string;
  onFilterClick: (filterType: 'status' | 'severity', value: string) => void;
}

export const AlertKPIs: React.FC<AlertKPIsProps> = ({
  stats,
  isLoading,
  selectedStatus,
  selectedSeverity,
  onFilterClick,
}) => {
  if (isLoading && !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-soc-card border border-soc-border rounded-xl p-4 animate-pulse">
            <div className="h-4 w-20 bg-slate-800 rounded mb-2" />
            <div className="h-7 w-14 bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const kpiList = [
    {
      label: 'Open Alerts',
      count: stats?.open_alerts ?? 0,
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      activeBorder: 'border-amber-400',
      isActive: selectedStatus === 'OPEN',
      onClick: () => onFilterClick('status', selectedStatus === 'OPEN' ? '' : 'OPEN'),
      description: 'Active triage backlog',
    },
    {
      label: 'Critical Severity',
      count: stats?.critical_alerts ?? 0,
      icon: ShieldAlert,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      activeBorder: 'border-rose-400',
      isActive: selectedSeverity === 'CRITICAL',
      onClick: () => onFilterClick('severity', selectedSeverity === 'CRITICAL' ? '' : 'CRITICAL'),
      description: 'Immediate action required',
    },
    {
      label: 'High Priority (P1/P2)',
      count: stats?.high_priority_alerts ?? 0,
      icon: Flame,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
      activeBorder: 'border-orange-400',
      isActive: selectedSeverity === 'HIGH',
      onClick: () => onFilterClick('severity', selectedSeverity === 'HIGH' ? '' : 'HIGH'),
      description: 'Elevated threat scope',
    },
    {
      label: 'Unassigned',
      count: stats?.unassigned_alerts ?? 0,
      icon: UserCheck,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      activeBorder: 'border-blue-400',
      isActive: false,
      onClick: () => onFilterClick('status', selectedStatus === 'NEW' ? '' : 'NEW'),
      description: 'Awaiting analyst pickup',
    },
    {
      label: 'Resolved Today',
      count: stats?.resolved_today ?? 0,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      activeBorder: 'border-emerald-400',
      isActive: selectedStatus === 'RESOLVED',
      onClick: () => onFilterClick('status', selectedStatus === 'RESOLVED' ? '' : 'RESOLVED'),
      description: 'Closed investigations',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
      {kpiList.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <button
            key={idx}
            onClick={kpi.onClick}
            className={`text-left p-4 rounded-xl border transition-all relative overflow-hidden group cursor-pointer ${
              kpi.isActive
                ? `${kpi.bgColor} ${kpi.activeBorder} shadow-lg ring-1 ring-white/10`
                : 'bg-soc-card border-soc-border hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">
                {kpi.label}
              </span>
              <div className={`p-1.5 rounded-lg ${kpi.bgColor} ${kpi.borderColor} ${kpi.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-white tracking-tight">
                {kpi.count.toLocaleString()}
              </span>
            </div>

            <p className="text-[10px] text-slate-400 mt-1 truncate">{kpi.description}</p>
          </button>
        );
      })}
    </div>
  );
};
