import React from 'react';

interface SeverityBadgeProps {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  size?: 'sm' | 'md';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = 'md' }) => {
  const sev = (severity || 'LOW').toUpperCase();

  const styles = {
    LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    HIGH: 'bg-orange-500/15 text-orange-400 border-orange-500/40',
    CRITICAL: 'bg-rose-500/20 text-rose-300 border-rose-500/50 glow-critical animate-pulse',
  }[sev] || 'bg-slate-500/10 text-slate-400 border-slate-500/30';

  const sizeCls = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';

  return (
    <span className={`inline-flex items-center gap-1 rounded border font-semibold tracking-wider uppercase ${styles} ${sizeCls}`}>
      {sev === 'CRITICAL' && <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" />}
      {sev}
    </span>
  );
};
