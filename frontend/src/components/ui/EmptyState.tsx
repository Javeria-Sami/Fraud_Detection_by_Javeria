import React from 'react';
import { Inbox, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center border border-dashed border-soc-border rounded-xl bg-soc-surface/30 ${className}`}>
      <div className="p-3.5 rounded-2xl bg-soc-cardHover border border-soc-border text-soc-muted mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-soc-foreground mb-1.5">{title}</h4>
      <p className="text-xs text-soc-muted max-w-sm mb-5 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'We encountered an error loading this resource. Please try again.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center border border-rose-500/20 rounded-xl bg-rose-500/5 ${className}`}>
      <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-soc-foreground mb-1.5">{title}</h4>
      <p className="text-xs text-soc-muted max-w-sm mb-5 leading-relaxed">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          onClick={onRetry}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
