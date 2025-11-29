import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-brand-700 mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            w-full rounded-lg border transition-colors duration-200
            px-4 py-2.5
            ${error
              ? 'border-status-danger-300 focus:border-status-danger-500 focus:ring-status-danger-500'
              : 'border-brand-300 focus:border-accent-500 focus:ring-accent-500'
            }
            focus:outline-none focus:ring-2 focus:ring-offset-0
            text-brand-900 bg-white
            ${className}
          `}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-sm text-status-danger-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-brand-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

