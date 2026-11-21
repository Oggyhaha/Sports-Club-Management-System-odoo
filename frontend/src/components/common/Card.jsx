import React from 'react';

export const Card = ({
  children,
  title,
  subtitle,
  action,
  footer,
  className = '',
  bodyClassName = '',
  noPadding = false,
  ...props
}) => {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow duration-200 overflow-hidden ${className}`}
      {...props}
    >
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}

      <div className={`${noPadding ? '' : 'p-6'} ${bodyClassName}`}>{children}</div>

      {footer && (
        <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
