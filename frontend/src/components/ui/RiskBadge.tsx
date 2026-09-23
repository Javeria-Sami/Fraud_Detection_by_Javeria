import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  level?: RiskLevel | string;
  score?: number;
  showIcon?: boolean;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  score,
  showIcon = true,
  showScore = true,
  size = 'md',
  className = '',
  ...props
}) => {
  // Infer level from score if level is missing
  let resolvedLevel: RiskLevel = 'LOW';
  if (level) {
    resolvedLevel = level.toUpperCase() as RiskLevel;
  } else if (typeof score === 'number') {
    if (score >= 90) resolvedLevel = 'CRITICAL';
    else if (score >= 70) resolvedLevel = 'HIGH';
    else if (score >= 30) resolvedLevel = 'MEDIUM';
    else resolvedLevel = 'LOW';
  }

  const levelConfigs: Record<RiskLevel, {
    bg: string;
    border: string;
    text: string;
    icon: React.ElementType;
    label: string;
  }> = {
    LOW: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      icon: ShieldCheck,
      label: 'LOW RISK',
    },
    MEDIUM: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      icon: AlertTriangle,
      label: 'MEDIUM RISK',
    },
    HIGH: {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      text: 'text-orange-400',
      icon: AlertTriangle,
      label: 'HIGH RISK',
    },
    CRITICAL: {
      bg: 'bg-rose-500/15',
      border: 'border-rose-500/40',
      text: 'text-rose-400',
      icon: ShieldAlert,
      label: 'CRITICAL',
    },
  };

  const current = levelConfigs[resolvedLevel] || levelConfigs.LOW;
  const Icon = current.icon;

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-[11px] px-2.5 py-0.5 gap-1.5',
    lg: 'text-xs px-3 py-1 gap-2 font-semibold',
  };

  return (
    <span
      role="status"
      aria-label={`Security Risk: ${current.label} ${score !== undefined ? `Score ${score.toFixed(0)} out of 100` : ''}`}
      className={`inline-flex items-center font-mono font-medium rounded-md border ${current.bg} ${current.border} ${current.text} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {showIcon && <Icon className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} />}
      <span>{current.label}</span>
      {showScore && typeof score === 'number' && (
        <span className="opacity-80 pl-1 border-l border-current/30">
          {score.toFixed(0)}/100
        </span>
      )}
    </span>
  );
};
