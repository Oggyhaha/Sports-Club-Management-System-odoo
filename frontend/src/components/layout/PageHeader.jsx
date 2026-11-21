import React from 'react';
import Breadcrumb from './Breadcrumb';

export const PageHeader = ({
  title,
  subtitle,
  breadcrumb = [],
  actions,
  className = '',
}) => {
  return (
    <div className={`mb-6 pb-4 border-b border-slate-200/80 ${className}`}>
      {breadcrumb.length > 0 && <Breadcrumb items={breadcrumb} />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
