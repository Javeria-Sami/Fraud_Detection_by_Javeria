import React from 'react';
import { ModelHealthType } from '../../types';
import { CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';

interface Props {
  status: ModelHealthType | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const ModelHealthBadge: React.FC<Props> = ({ status, size = 'md', showIcon = true }) => {
  const normStatus = (status || 'UNKNOWN').toUpperCase();

  const getStyle = () => {
    switch (normStatus) {
      case 'NORMAL':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
          label: 'NORMAL',
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
          label: 'WARNING',
        };
      case 'CRITICAL':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-400',
          icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />,
          label: 'CRITICAL',
        };
      default:
        return {
          bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
          dot: 'bg-slate-400',
          icon: <HelpCircle className="w-3.5 h-3.5 text-slate-400" />,
          label: 'UNKNOWN',
        };
    }
  };

  const style = getStyle();

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-mono font-semibold rounded-lg border ${style.bg} ${sizeClasses}`}
    >
      {showIcon && style.icon}
      <span>{style.label}</span>
    </span>
  );
};
