import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  options,
  error,
  helperText,
  className = '',
  id,
  ...props
}, ref) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-soc-foreground">
          {label}
        </label>
      )}
      <select
        id={selectId}
        ref={ref}
        className={`w-full rounded-lg border bg-soc-surface text-xs text-soc-foreground px-3 py-2.5 transition-all focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? 'border-rose-500 focus:border-rose-500' : 'border-soc-border'
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-soc-card text-soc-foreground">
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-[11px] text-rose-400">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-soc-muted">{helperText}</p>
      ) : null}
    </div>
  );
});

Select.displayName = 'Select';
