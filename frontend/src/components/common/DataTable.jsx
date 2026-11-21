import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import LoadingIndicator from '../feedback/LoadingIndicator';
import Button from './Button';

export const DataTable = ({
  columns = [],
  data = [],
  keyField = 'id',
  isLoading = false,
  emptyMessage = 'No records found.',
  onRowClick,
  enablePagination = true,
  pageSize: initialPageSize = 10,
  className = '',
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  const paginatedData = useMemo(() => {
    if (!enablePagination) return data;
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize, enablePagination]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className={`w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs ${className}`}>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 tracking-wider border-b border-slate-200">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-6 py-3.5 ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  } ${col.headerClassName || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <LoadingIndicator size="md" text="Loading records..." />
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => (
                <tr
                  key={row[keyField] || rowIdx}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`transition-colors hover:bg-slate-50/70 ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col, colIdx) => {
                    const value = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
                    return (
                      <td
                        key={colIdx}
                        className={`px-6 py-4 whitespace-nowrap text-slate-900 ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        } ${col.cellClassName || ''}`}
                      >
                        {col.render ? col.render(value, row) : (value ?? '-')}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {enablePagination && data.length > 0 && !isLoading && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-slate-700">{Math.min(currentPage * pageSize, data.length)}</span> of{' '}
            <span className="font-semibold text-slate-700">{data.length}</span> records
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              leftIcon={ChevronLeft}
            >
              Previous
            </Button>
            <span className="px-2 font-medium text-slate-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              rightIcon={ChevronRight}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
