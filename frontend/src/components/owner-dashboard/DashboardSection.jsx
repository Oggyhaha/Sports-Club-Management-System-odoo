import React from 'react';

/**
 * Uniform section container for executive dashboard subsystems.
 */
export const DashboardSection = ({
  icon: Icon,
  title,
  subtitle,
  badge,
  action,
  children,
  className = '',
}) => {
  return (
    <section className={`space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
              {badge && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold bg-slate-100 text-slate-600">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
      </div>

      <div>{children}</div>
    </section>
  );
};

export default DashboardSection;
