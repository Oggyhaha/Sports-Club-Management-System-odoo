import React from 'react';

/**
 * Champions Club - Section Header Component
 */
export const SectionHeader = ({ title, description, action, className = '' }) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-4 border-b border-slate-200/80 gap-3 ${className}`}>
      <div>
        <h3 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h3>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
};

export default SectionHeader;
