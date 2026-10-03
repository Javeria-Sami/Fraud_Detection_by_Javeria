import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from './Card';

export interface KPICardProps {
  title: string;
  value: string | number;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  description?: string;
  icon?: React.ElementType;
  isLoading?: boolean;
  error?: string | null;
  badge?: string;
  className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  trend,
  trendDirection = 'neutral',
  description,
  icon: Icon,
  isLoading = false,
  error = null,
  badge,
  className = '',
}) => {
  if (isLoading) {
    return (
      <Card className={`p-5 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-3.5 bg-slate-700/60 rounded w-24" />
            <div className="h-8 w-8 bg-slate-700/60 rounded-lg" />
          </div>
          <div className="h-7 bg-slate-700/60 rounded w-32" />
          <div className="h-3 bg-slate-700/40 rounded w-40" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-5 border-rose-500/30 ${className}`}>
        <div className="text-xs font-semibold text-rose-400 mb-1">Failed to load metric</div>
        <div className="text-xs text-soc-muted">{error}</div>
      </Card>
    );
  }

  const getTrendIcon = () => {
    if (trendDirection === 'up') return <TrendingUp className="w-3.5 h-3.5" />;
    if (trendDirection === 'down') return <TrendingDown className="w-3.5 h-3.5" />;
    return <Minus className="w-3.5 h-3.5" />;
  };

  const getTrendColor = () => {
    if (trendDirection === 'up') return 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (trendDirection === 'down') return 'text-rose-500 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
    return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
  };

  return (
    <Card className={`hover:border-slate-400 dark:hover:border-slate-700 transition-colors ${className}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-soc-muted uppercase tracking-wider">
            {title}
          </span>
          <div className="flex items-center gap-1.5">
            {badge && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400">
                {badge}
              </span>
            )}
            {Icon && (
              <div className="p-2 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400">
                <Icon className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold font-mono text-soc-foreground tracking-tight">
            {value}
          </span>
          {trend && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${getTrendColor()}`}
            >
              {getTrendIcon()}
              <span>{trend}</span>
            </span>
          )}
        </div>

        {description && (
          <p className="text-[11px] text-soc-muted">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
