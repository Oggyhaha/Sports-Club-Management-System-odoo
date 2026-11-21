import React, { useState } from 'react';
import { Calendar, RefreshCw, Download, ChevronDown, Clock, AlertCircle } from 'lucide-react';
import Button from '../common/Button';
import { formatDate, formatDateTime } from '../../utils/formatters';

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'this_year', label: 'This Year' },
  { id: 'custom', label: 'Custom' },
];

const CSV_OPTIONS = [
  { id: 'dashboard', label: 'Unified Dashboard (All)' },
  { id: 'financial', label: 'Financial Analytics' },
  { id: 'members', label: 'Membership Growth' },
  { id: 'bookings', label: 'Court Utilization & Bookings' },
  { id: 'commerce', label: 'Commerce Orders & Inventory' },
  { id: 'hr', label: 'HR Attendance & Payroll' },
  { id: 'tax', label: 'Statutory Tax Summary' },
];

export const DashboardToolbar = ({
  filterType,
  period,
  startDate,
  endDate,
  customRangeError,
  loading,
  lastUpdated,
  isExporting,
  onSelectPreset,
  onApplyCustomRange,
  onRefresh,
  onExportCsv,
}) => {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [customStart, setCustomStart] = useState(startDate || '');
  const [customEnd, setCustomEnd] = useState(endDate || '');

  const handleApplyCustom = (e) => {
    e.preventDefault();
    onApplyCustomRange(customStart, customEnd);
  };

  return (
    <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Presets Button Group */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
          {PRESETS.map((p) => {
            const isActive = filterType === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPreset(p.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Right side Actions: Refresh + Export */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            isLoading={loading}
            leftIcon={RefreshCw}
            title="Refresh current report data"
          >
            Refresh
          </Button>

          {/* Export CSV Dropdown */}
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              disabled={isExporting}
              isLoading={isExporting}
              leftIcon={Download}
              rightIcon={ChevronDown}
            >
              Export CSV
            </Button>

            {isExportMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsExportMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-lg border border-slate-200 shadow-lg py-1.5 z-30">
                  <div className="px-3 py-1 text-2xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Select Report Export
                  </div>
                  {CSV_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        onExportCsv(opt.id);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-sky-50 hover:text-sky-700 font-medium transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Custom Date Range Picker when Custom filter is active */}
      {filterType === 'custom' && (
        <form
          onSubmit={handleApplyCustom}
          className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs"
        >
          <div className="flex items-center gap-2">
            <label htmlFor="custom-start-date" className="font-medium text-slate-600">
              Start:
            </label>
            <input
              id="custom-start-date"
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="custom-end-date" className="font-medium text-slate-600">
              End:
            </label>
            <input
              id="custom-end-date"
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
              required
            />
          </div>

          <Button type="submit" variant="primary" size="sm">
            Apply Range
          </Button>

          {customRangeError && (
            <div className="flex items-center gap-1.5 text-rose-600 font-medium ml-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{customRangeError}</span>
            </div>
          )}
        </form>
      )}

      {/* Period Metadata & Last Updated Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {period ? (
            <span>
              Active Period:{' '}
              <strong className="text-slate-800 font-semibold">
                {formatDate(period.start_date)}
              </strong>{' '}
              to{' '}
              <strong className="text-slate-800 font-semibold">
                {formatDate(period.end_date)}
              </strong>{' '}
              <span className="text-slate-400">({period.timezone || 'Asia/Kolkata'})</span>
            </span>
          ) : (
            <span>Authoritative backend date boundaries active</span>
          )}
        </div>

        {lastUpdated && (
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated {formatDateTime(lastUpdated)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardToolbar;
