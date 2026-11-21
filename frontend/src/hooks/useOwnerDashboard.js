import { useState, useEffect, useCallback, useRef } from 'react';
import reportService from '../services/reportService';
import { useToast } from '../contexts/ToastContext';

/**
 * Custom hook for Owner Dashboard state management and reporting API integration.
 * 
 * Features:
 * - Period filter management (today, this_week, this_month, this_year, custom)
 * - Custom date range validation (end_date >= start_date)
 * - Stale-response protection (cancels/discards out-of-order async responses)
 * - CSV export triggering with download lifecycle
 * - Error and loading states
 */
export const useOwnerDashboard = () => {
  const [filterType, setFilterTypeState] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customRangeError, setCustomRangeError] = useState('');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const { showToast } = useToast();
  const requestIdRef = useRef(0);

  // Fetch dashboard data with stale-response protection
  const fetchDashboard = useCallback(async (params) => {
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const response = await reportService.getOwnerDashboard(params);
      
      // Discard stale responses from outdated filter changes
      if (currentRequestId === requestIdRef.current) {
        setData(response);
        setLastUpdated(new Date());
        setLoading(false);
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        const errorDetail =
          err.response?.data?.detail ||
          err.message ||
          'Failed to load executive dashboard data.';
        setError(errorDetail);
        setLoading(false);
      }
    }
  }, []);

  // Trigger initial fetch and fetch whenever filterType or confirmed dates change
  useEffect(() => {
    if (filterType === 'custom') {
      // Custom filter requires valid start and end dates
      if (startDate && endDate) {
        if (endDate < startDate) {
          setCustomRangeError('End date cannot be earlier than start date.');
          return;
        }
        setCustomRangeError('');
        fetchDashboard({
          filter_type: 'custom',
          start_date: startDate,
          end_date: endDate,
        });
      }
    } else {
      setCustomRangeError('');
      fetchDashboard({ filter_type: filterType });
    }
  }, [filterType, startDate, endDate, fetchDashboard]);

  // Handle Preset Selection
  const setPreset = useCallback((preset) => {
    setCustomRangeError('');
    setFilterTypeState(preset);
  }, []);

  // Handle Custom Date Range Submission
  const applyCustomRange = useCallback((start, end) => {
    if (!start || !end) {
      setCustomRangeError('Both start date and end date are required.');
      return false;
    }
    if (end < start) {
      setCustomRangeError('End date cannot be earlier than start date.');
      return false;
    }
    setCustomRangeError('');
    setStartDate(start);
    setEndDate(end);
    setFilterTypeState('custom');
    return true;
  }, []);

  // Manual Refresh
  const refresh = useCallback(() => {
    if (filterType === 'custom') {
      if (startDate && endDate && endDate >= startDate) {
        fetchDashboard({
          filter_type: 'custom',
          start_date: startDate,
          end_date: endDate,
        });
      }
    } else {
      fetchDashboard({ filter_type: filterType });
    }
  }, [filterType, startDate, endDate, fetchDashboard]);

  // Handle CSV Export
  const exportCsv = useCallback(async (reportType = 'dashboard') => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const params = {
        report_type: reportType,
        filter_type: filterType,
      };
      if (filterType === 'custom' && startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      }

      const { filename } = await reportService.exportReportCsv(params);
      showToast?.(`Export downloaded: ${filename}`, 'success');
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        err.message ||
        'CSV export failed. Please try again.';
      showToast?.(errorMsg, 'error');
    } finally {
      setIsExporting(false);
    }
  }, [filterType, startDate, endDate, isExporting, showToast]);

  return {
    filterType,
    startDate,
    endDate,
    customRangeError,
    data,
    loading,
    error,
    lastUpdated,
    isExporting,
    setPreset,
    applyCustomRange,
    refresh,
    exportCsv,
  };
};

export default useOwnerDashboard;
