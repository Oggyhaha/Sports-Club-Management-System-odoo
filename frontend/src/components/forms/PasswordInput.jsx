import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

/**
 * Champions Club - PasswordInput with Eye/EyeOff Visibility Toggle
 */
export const PasswordInput = forwardRef(
  (
    {
      label,
      error,
      helperText,
      className = '',
      inputClassName = '',
      id,
      name,
      required = false,
      disabled = false,
      placeholder = '••••••••',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || name || `pwd-${Math.random().toString(36).substring(2, 9)}`;

    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            {label}
            {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative rounded-lg shadow-2xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Lock className="w-4 h-4" />
          </div>

          <input
            ref={ref}
            id={inputId}
            name={name}
            type={showPassword ? 'text' : 'password'}
            disabled={disabled}
            required={required}
            placeholder={placeholder}
            className={`block w-full rounded-lg border text-sm transition-colors duration-150 pl-9 pr-10 py-2 focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${
              error
                ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-200'
                : 'border-slate-300 text-slate-900 focus:border-sky-500 focus:ring-sky-200 hover:border-slate-400'
            } ${inputClassName}`}
            {...props}
          />

          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {error && <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
