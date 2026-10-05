import React from 'react';
import { ShieldAlert, AlertTriangle, Info, CheckCircle2, Clock, Eye, Check } from 'lucide-react';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';

export interface AlertBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  severity?: AlertSeverity | string;
  status?: AlertStatus | string;
  size?: 'sm' | 'md';
}

export const AlertBadge: React.FC<AlertBadgeProps> = ({
  severity,
  status,
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-[11px] px-2.5 py-0.5 gap-1.5',
  };

  // If severity badge
  if (severity) {
    const sev = severity.toUpperCase() as AlertSeverity;
    const severityConfigs: Record<AlertSeverity, { bg: string; border: string; text: string; icon: React.ElementType }> = {
      LOW: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', border: 'border-emerald-600/30', text: 'text-emerald-800 dark:text-emerald-300', icon: Info },
      MEDIUM: { bg: 'bg-amber-500/10 dark:bg-amber-500/15', border: 'border-amber-600/30', text: 'text-amber-800 dark:text-amber-300', icon: AlertTriangle },
      HIGH: { bg: 'bg-orange-500/10 dark:bg-orange-500/15', border: 'border-orange-600/30', text: 'text-orange-800 dark:text-orange-300', icon: AlertTriangle },
      CRITICAL: { bg: 'bg-rose-500/10 dark:bg-rose-500/20', border: 'border-rose-600/35', text: 'text-rose-800 dark:text-rose-300', icon: ShieldAlert },
    };
    const current = severityConfigs[sev] || severityConfigs.LOW;
    const Icon = current.icon;

    return (
      <span
        role="status"
        aria-label={`Alert Severity ${sev}`}
        className={`inline-flex items-center font-mono font-medium rounded-md border ${current.bg} ${current.border} ${current.text} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        <Icon className="w-3 h-3 shrink-0" />
        <span>{sev} SEVERITY</span>
      </span>
    );
  }

  // If status badge
  if (status) {
    const st = status.toUpperCase() as AlertStatus;
    const statusConfigs: Record<AlertStatus, { bg: string; border: string; text: string; icon: React.ElementType }> = {
      NEW: { bg: 'bg-rose-500/10 dark:bg-rose-500/20', border: 'border-rose-600/30', text: 'text-rose-800 dark:text-rose-300', icon: ShieldAlert },
      ACKNOWLEDGED: { bg: 'bg-soc-lightGreen dark:bg-emerald-950/40', border: 'border-emerald-600/30', text: 'text-soc-deepGreen dark:text-emerald-300', icon: Eye },
      INVESTIGATING: { bg: 'bg-amber-500/10 dark:bg-amber-500/15', border: 'border-amber-600/30', text: 'text-amber-800 dark:text-amber-300', icon: Clock },
      RESOLVED: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', border: 'border-emerald-600/30', text: 'text-emerald-800 dark:text-emerald-300', icon: CheckCircle2 },
      CLOSED: { bg: 'bg-slate-100 dark:bg-slate-800/80', border: 'border-slate-300 dark:border-slate-700/80', text: 'text-slate-700 dark:text-slate-300', icon: Check },
    };
    const current = statusConfigs[st] || statusConfigs.NEW;
    const Icon = current.icon;

    return (
      <span
        role="status"
        aria-label={`Alert Status ${st}`}
        className={`inline-flex items-center font-mono font-medium rounded-md border ${current.bg} ${current.border} ${current.text} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        <Icon className="w-3 h-3 shrink-0" />
        <span>{st}</span>
      </span>
    );
  }

  return null;
};
