import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from '../common/Button';

export const ErrorState = ({
  title = 'Failed to load data',
  description,
  message,
  onRetry,
  retryText = 'Try Again',
  className = '',
}) => {
  const errorText =
    description ||
    message ||
    'An error occurred while fetching data from the server. Please check your network and try again.';

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-rose-50/40 rounded-xl border border-rose-200/80 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-3 border border-rose-200">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-rose-900">{title}</h3>
      <p className="text-xs text-rose-700/80 mt-1 max-w-sm leading-relaxed">{errorText}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="danger" size="sm" onClick={onRetry} leftIcon={RefreshCw}>
            {retryText}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ErrorState;
