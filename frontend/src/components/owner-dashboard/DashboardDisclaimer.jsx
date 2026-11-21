import React from 'react';
import { Info, AlertTriangle } from 'lucide-react';

/**
 * Executive methodology callout banner for mandatory disclaimers and notices.
 */
export const DashboardDisclaimer = ({
  title,
  message,
  variant = 'info', // 'info' | 'warning'
  className = '',
}) => {
  const isWarning = variant === 'warning';
  const Icon = isWarning ? AlertTriangle : Info;

  return (
    <div
      className={`p-3.5 rounded-xl border flex items-start gap-3 ${
        isWarning
          ? 'bg-amber-50/70 border-amber-200 text-amber-900'
          : 'bg-sky-50/70 border-sky-200 text-sky-950'
      } ${className}`}
    >
      <Icon
        className={`w-4 h-4 shrink-0 mt-0.5 ${
          isWarning ? 'text-amber-600' : 'text-sky-600'
        }`}
      />
      <div className="text-xs leading-relaxed">
        {title && <span className="font-semibold block mb-0.5">{title}</span>}
        <span className={isWarning ? 'text-amber-800' : 'text-sky-800'}>
          {message}
        </span>
      </div>
    </div>
  );
};

export default DashboardDisclaimer;
