import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  helperText,
  error,
  className = '',
  id,
  rows = 3,
  ...props
}, ref) => {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-semibold text-soc-foreground">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        ref={ref}
        rows={rows}
        className={`w-full rounded-lg border bg-soc-surface text-xs text-soc-foreground placeholder:text-soc-muted p-3 transition-all focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? 'border-rose-500 focus:border-rose-500' : 'border-soc-border'
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-[11px] text-rose-400">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-soc-muted">{helperText}</p>
      ) : null}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({
  label,
  description,
  className = '',
  id,
  ...props
}, ref) => {
  const checkboxId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex items-start gap-2.5">
      <input
        type="checkbox"
        id={checkboxId}
        ref={ref}
        className={`mt-0.5 h-4 w-4 rounded border-soc-border bg-soc-surface text-soc-deepGreen focus:ring-emerald-600 focus:ring-offset-soc-bg transition-colors ${className}`}
        {...props}
      />
      <div className="text-xs">
        <label htmlFor={checkboxId} className="font-medium text-soc-foreground cursor-pointer select-none">
          {label}
        </label>
        {description && <p className="text-[11px] text-soc-muted mt-0.5">{description}</p>}
      </div>
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}) => {
  return (
    <div className="flex items-center justify-between gap-3">
      {label && (
        <div className="text-xs">
          <div className="font-semibold text-soc-foreground">{label}</div>
          {description && <p className="text-[11px] text-soc-muted">{description}</p>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? 'bg-soc-deepGreen' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};
