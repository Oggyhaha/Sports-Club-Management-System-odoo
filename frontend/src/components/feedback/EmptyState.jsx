import React from 'react';
import { Inbox } from 'lucide-react';
import Button from '../common/Button';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There is no data to display for the selected criteria.',
  actionText,
  actionLabel,
  onAction,
  actionIcon,
  className = '',
}) => {
  const buttonText = actionText || actionLabel;
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-dashed border-slate-200 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3 border border-slate-100">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">{description}</p>
      {buttonText && onAction && (
        <div className="mt-4">
          <Button variant="primary" size="sm" onClick={onAction} leftIcon={actionIcon}>
            {buttonText}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
