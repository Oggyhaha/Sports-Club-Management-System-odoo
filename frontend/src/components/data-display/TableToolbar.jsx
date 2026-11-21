import React from 'react';
import SearchField from './SearchField';

/**
 * Champions Club - Table Toolbar Component
 * 
 * Houses table search input, filter chips/selectors, and table action buttons.
 */
export const TableToolbar = ({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters,
  actions,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-50/70 border-b border-slate-200/80 ${className}`}
    >
      <div className="flex flex-1 items-center gap-3">
        {onSearchChange !== undefined && (
          <SearchField
            value={searchValue || ''}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            className="w-full sm:max-w-xs"
          />
        )}
        {filters && <div className="flex items-center gap-2">{filters}</div>}
      </div>

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};

export default TableToolbar;
