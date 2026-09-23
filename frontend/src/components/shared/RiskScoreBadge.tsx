import React from 'react';

interface RiskScoreBadgeProps {
  score: number;
  level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  size?: 'sm' | 'md' | 'lg';
  showLevel?: boolean;
}

export const RiskScoreBadge: React.FC<RiskScoreBadgeProps> = ({
  score,
  level,
  size = 'md',
  showLevel = true,
}) => {
  const normalizedLevel = (level || (
    score <= 30 ? 'LOW' : score <= 70 ? 'MEDIUM' : score <= 90 ? 'HIGH' : 'CRITICAL'
  )).toUpperCase();

  const colorStyles = {
    LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    MEDIUM: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    CRITICAL: 'bg-rose-500/15 text-rose-400 border-rose-500/40 glow-critical',
  }[normalizedLevel] || 'bg-slate-500/10 text-slate-400 border-slate-500/30';

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 font-mono',
    md: 'text-sm px-2.5 py-1 font-mono font-medium',
    lg: 'text-lg px-3.5 py-1.5 font-mono font-bold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${colorStyles} ${sizeStyles}`}
    >
      <span className="font-semibold">{score.toFixed(0)}</span>
      <span className="text-[10px] text-slate-400">/100</span>
      {showLevel && (
        <span className="ml-1 text-[11px] uppercase tracking-wider font-sans font-bold opacity-90">
          {normalizedLevel}
        </span>
      )}
    </span>
  );
};
