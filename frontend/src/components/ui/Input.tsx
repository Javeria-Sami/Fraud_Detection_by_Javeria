import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  helperText,
  error,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-soc-foreground">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-soc-muted pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`w-full rounded-lg border bg-soc-surface text-xs text-soc-foreground placeholder:text-soc-muted transition-all focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
            leftIcon ? 'pl-9' : 'pl-3'
          } ${rightIcon ? 'pr-9' : 'pr-3'} py-2.5 ${
            error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-soc-border'
          } ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 text-soc-muted flex items-center">
            {rightIcon}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-[11px] text-rose-400 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-soc-muted">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
