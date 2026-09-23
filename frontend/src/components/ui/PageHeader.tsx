import React from 'react';
import { Breadcrumbs } from './Breadcrumbs';

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  breadcrumbs?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  breadcrumbs = true,
  actions,
  className = '',
}) => {
  return (
    <div className={`mb-6 space-y-2 pb-4 border-b border-soc-border/60 ${className}`}>
      {breadcrumbs && <Breadcrumbs className="mb-2" />}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-soc-foreground font-sans">
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>
          {description && (
            <p className="text-xs text-soc-muted mt-1 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2.5 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
