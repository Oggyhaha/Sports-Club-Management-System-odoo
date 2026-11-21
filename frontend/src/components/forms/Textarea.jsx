import React, { forwardRef } from 'react';

export const Textarea = forwardRef(
  (
    {
      label,
      error,
      helperText,
      className = '',
      textareaClassName = '',
      id,
      name,
      rows = 3,
      required = false,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const textareaId = id || name || `textarea-${Math.random().toString(36).substring(2, 9)}`;

    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            {label}
            {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          name={name}
          rows={rows}
          disabled={disabled}
          required={required}
          className={`block w-full rounded-lg border text-sm transition-colors duration-200 p-3 placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${
            error
              ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-200'
              : 'border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-emerald-200 bg-white hover:border-slate-400'
          } ${textareaClassName}`}
          {...props}
        />

        {error && <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
