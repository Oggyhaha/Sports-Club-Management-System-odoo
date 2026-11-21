import React, { forwardRef } from 'react';

/**
 * Champions Club - Accessible Form Checkbox
 */
export const Checkbox = forwardRef(
  (
    {
      label,
      description,
      error,
      className = '',
      id,
      name,
      checked,
      disabled = false,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputId = id || name || `chk-${Math.random().toString(36).substring(2, 9)}`;

    return (
      <div className={`flex items-start gap-3 ${className}`}>
        <div className="flex items-center h-5">
          <input
            ref={ref}
            id={inputId}
            name={name}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className={`w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50 cursor-pointer ${
              error ? 'border-rose-400' : ''
            }`}
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="text-sm leading-tight">
            {label && (
              <label htmlFor={inputId} className="font-medium text-slate-800 cursor-pointer select-none">
                {label}
              </label>
            )}
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
            {error && <p className="text-xs text-rose-600 font-medium mt-1">{error}</p>}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
