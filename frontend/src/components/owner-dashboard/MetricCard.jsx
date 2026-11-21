import React from 'react';

/**
 * Reusable KPI card for executive dashboard statistics.
 * 
 * Props:
 * - title: Metric name
 * - value: Formatted display value
 * - subtitle: Context note or counts (e.g. "42 invoices issued")
 * - typeBadge: "Period" | "Current Snapshot" | "All-Time"
 * - alert: boolean, displays amber warning highlight if true
 * - icon: Lucide icon component
 */
export const MetricCard = ({
  title,
  value,
  subtitle,
  typeBadge,
  alert = false,
  icon: Icon,
  className = '',
}) => {
  const badgeClasses = {
    'Period': 'bg-sky-50 text-sky-700 border-sky-200',
    'Current Snapshot': 'bg-purple-50 text-purple-700 border-purple-200',
    'All-Time': 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div
      className={`p-4 rounded-xl border bg-white shadow-2xs hover:shadow-xs transition-shadow duration-150 flex flex-col justify-between ${
        alert ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200/90'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-slate-600 line-clamp-1">{title}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {typeBadge && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-3xs font-medium border ${
                badgeClasses[typeBadge] || 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {typeBadge}
            </span>
          )}
          {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
        </div>
      </div>

      <div className="mt-2.5">
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-mono">
          {value !== undefined && value !== null ? value : '—'}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
