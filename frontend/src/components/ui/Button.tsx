import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'attention' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const sizeStyles: Record<ButtonSize, string> = {
    sm: "px-2.5 py-1.5 text-xs gap-1.5",
    md: "px-3.5 py-2 text-xs font-semibold gap-2",
    lg: "px-5 py-2.5 text-sm font-semibold gap-2.5",
    icon: "p-2 text-xs",
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary: "bg-soc-deepGreen hover:bg-[#154A19] text-white shadow-sm shadow-emerald-950/20 active:bg-emerald-950",
    secondary: "bg-white dark:bg-soc-card hover:bg-soc-lightGreen dark:hover:bg-soc-cardHover text-soc-foreground border border-soc-border shadow-sm",
    attention: "bg-soc-gold hover:bg-soc-goldHover text-white shadow-sm shadow-amber-950/20 active:bg-[#856008]",
    outline: "bg-transparent hover:bg-soc-lightGreen dark:hover:bg-soc-cardHover text-soc-foreground border border-soc-border",
    ghost: "bg-transparent hover:bg-soc-lightGreen dark:hover:bg-soc-cardHover text-soc-muted hover:text-soc-foreground",
    destructive: "bg-soc-critical hover:bg-red-700 text-white shadow-sm shadow-red-950/20 active:bg-red-800",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          {children && <span>{children}</span>}
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children && <span>{children}</span>}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
