import React, { forwardRef } from 'react';

/**
 * Champions Club - Accessible Radio Control
 */
export const Radio = forwardRef(
  (
    {
      label,
      description,
      error,
      className = '',
      id,
      name,
      value,
      checked,
      disabled = false,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputId = id || `${name}-${value}` || `rad-${Math.random().toString(36).substring(2, 9)}`;

    return (
      <div className={`flex items-start gap-3 ${className}`}>
        <div className="flex items-center h-5">
          <input
            ref={ref}
            id={inputId}
            name={name}
            type="radio"
            value={value}
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className={`w-4 h-4 border-slate-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50 cursor-pointer ${
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
          </div>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';

export const RadioGroup = ({ label, error, helperText, children, className = '' }) => {
  return (
    <fieldset className={`w-full ${className}`}>
      {label && (
        <legend className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
          {label}
        </legend>
      )}
      <div className="space-y-2">{children}</div>
      {error && <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
    </fieldset>
  );
};

export default Radio;
