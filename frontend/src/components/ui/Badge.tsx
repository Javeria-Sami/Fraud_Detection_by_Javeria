import React from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  const baseStyles = "inline-flex items-center font-mono font-medium rounded-full uppercase tracking-wider select-none";

  const sizeStyles = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-[11px] px-2.5 py-0.5 gap-1.5",
  };

  const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
    default: {
      container: "bg-soc-lightGreen dark:bg-emerald-950/40 text-soc-deepGreen dark:text-emerald-300 border border-emerald-600/30",
      dot: "bg-soc-deepGreen dark:bg-emerald-400",
    },
    success: {
      container: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
      dot: "bg-emerald-600 dark:bg-emerald-400",
    },
    warning: {
      container: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30",
      dot: "bg-amber-600 dark:bg-amber-400",
    },
    destructive: {
      container: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30",
      dot: "bg-rose-600 dark:bg-rose-400",
    },
    info: {
      container: "bg-soc-lightGreen dark:bg-emerald-950/40 text-soc-deepGreen dark:text-emerald-300 border border-emerald-600/30",
      dot: "bg-soc-deepGreen dark:bg-emerald-400",
    },
    outline: {
      container: "bg-transparent text-soc-muted border border-soc-border",
      dot: "bg-soc-muted",
    },
  };

  const currentVariant = variantStyles[variant];

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size]} ${currentVariant.container} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentVariant.dot}`} />}
      {children}
    </span>
  );
};
