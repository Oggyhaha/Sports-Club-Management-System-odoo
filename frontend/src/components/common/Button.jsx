import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Champions Club - Standard Button Component
 * 
 * Variants:
 * - primary: Restrained sky blue accent (SaaS primary CTA)
 * - secondary: Dark navy slate-900
 * - outline: Subtle border with slate hover
 * - ghost: Borderless clean text button
 * - danger: Rose-600 for destructive actions
 * - warning: Amber-500
 */
export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className = '',
  onClick,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] cursor-pointer';

  const variants = {
    primary:
      'bg-sky-600 hover:bg-sky-700 text-white shadow-xs hover:shadow focus:ring-sky-500 border border-transparent',
    secondary:
      'bg-slate-900 hover:bg-slate-800 text-white shadow-xs hover:shadow focus:ring-slate-700 border border-transparent',
    outline:
      'border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs focus:ring-sky-500',
    ghost:
      'text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:ring-slate-400 border border-transparent',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-xs hover:shadow focus:ring-rose-500 border border-transparent',
    warning:
      'bg-amber-500 hover:bg-amber-600 text-white shadow-xs hover:shadow focus:ring-amber-400 border border-transparent',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {LeftIcon && <LeftIcon className="w-4 h-4 shrink-0" />}
          <span>{children}</span>
          {RightIcon && <RightIcon className="w-4 h-4 shrink-0" />}
        </>
      )}
    </button>
  );
};

export default Button;
