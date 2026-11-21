import React from 'react';
import { Search, X } from 'lucide-react';

/**
 * Champions Club - Reusable Search Field
 */
export const SearchField = ({
  value,
  onChange,
  placeholder = 'Search records...',
  className = '',
  onClear,
}) => {
  return (
    <div className={`relative rounded-lg shadow-2xs ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
        <Search className="w-4 h-4" />
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-lg border border-slate-300 pl-9 pr-9 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500 transition-colors"
      />

      {value && (
        <button
          type="button"
          onClick={() => (onClear ? onClear() : onChange(''))}
          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default SearchField;
