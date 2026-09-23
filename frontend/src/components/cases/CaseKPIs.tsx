import React from 'react';
import { CaseStats } from '../../types';
import { FolderLock, AlertOctagon, UserX, CheckCircle2, ShieldAlert } from 'lucide-react';

interface CaseKPIsProps {
  stats: CaseStats | null;
  isLoading: boolean;
  activeStatusFilter: string;
  onFilterByStatus: (status: string) => void;
}

export const CaseKPIs: React.FC<CaseKPIsProps> = ({
  stats,
  isLoading,
  activeStatusFilter,
  onFilterByStatus,
}) => {
  const cards = [
    {
      id: 'TOTAL',
      label: 'Total Cases',
      value: stats?.total_cases ?? 0,
      icon: FolderLock,
      color: 'indigo',
      borderColor: 'border-indigo-500/20',
      bgColor: 'bg-indigo-500/5',
      textColor: 'text-indigo-400',
      statusTarget: 'ALL',
    },
    {
      id: 'OPEN',
      label: 'Open / Unassigned',
      value: (stats?.open_cases ?? 0) + (stats?.unassigned_cases ?? 0),
      subtext: `${stats?.unassigned_cases ?? 0} unassigned`,
      icon: UserX,
      color: 'amber',
      borderColor: 'border-amber-500/20',
      bgColor: 'bg-amber-500/5',
      textColor: 'text-amber-400',
      statusTarget: 'OPEN',
    },
    {
      id: 'INVESTIGATING',
      label: 'Under Investigation',
      value: stats?.investigating_cases ?? 0,
      icon: ShieldAlert,
      color: 'blue',
      borderColor: 'border-blue-500/20',
      bgColor: 'bg-blue-500/5',
      textColor: 'text-blue-400',
      statusTarget: 'INVESTIGATING',
    },
    {
      id: 'CRITICAL',
      label: 'Critical Severity',
      value: stats?.critical_cases ?? 0,
      icon: AlertOctagon,
      color: 'rose',
      borderColor: 'border-rose-500/20',
      bgColor: 'bg-rose-500/5',
      textColor: 'text-rose-400',
      statusTarget: 'CRITICAL_SEV',
    },
    {
      id: 'RESOLVED',
      label: 'Resolved Today',
      value: stats?.resolved_today ?? 0,
      icon: CheckCircle2,
      color: 'emerald',
      borderColor: 'border-emerald-500/20',
      bgColor: 'bg-emerald-500/5',
      textColor: 'text-emerald-400',
      statusTarget: 'RESOLVED',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeStatusFilter === card.statusTarget;

        return (
          <button
            key={card.id}
            onClick={() => onFilterByStatus(card.statusTarget)}
            className={`flex flex-col p-4 rounded-xl border text-left transition-all ${
              card.bgColor
            } ${card.borderColor} hover:border-slate-500/50 ${
              isActive ? 'ring-2 ring-indigo-500 shadow-md' : ''
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-medium text-slate-400 truncate">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-lg ${card.textColor} bg-slate-800/60`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              {isLoading ? (
                <div className="h-7 w-16 bg-slate-700/50 rounded animate-pulse" />
              ) : (
                <span className="text-2xl font-bold font-mono text-white tracking-tight">
                  {card.value.toLocaleString()}
                </span>
              )}
            </div>

            {card.subtext && (
              <span className="text-[11px] text-slate-400 mt-0.5">
                {card.subtext}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
