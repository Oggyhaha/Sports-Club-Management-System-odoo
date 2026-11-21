import apiClient from '../lib/axios';

/**
 * Champions Club - Reports & Executive Analytics API Service
 * 
 * Maps directly to backend Milestone G endpoints under /api/v1/reports:
 * - GET /api/v1/reports/dashboard
 * - GET /api/v1/reports/finance/overview
 * - GET /api/v1/reports/members/overview
 * - GET /api/v1/reports/bookings/overview
 * - GET /api/v1/reports/commerce/overview
 * - GET /api/v1/reports/hr/overview
 * - GET /api/v1/reports/tax/summary
 * - GET /api/v1/reports/export/csv
 */
export const reportService = {
  /**
   * Fetch complete unified executive dashboard dataset (Owner only).
   */
  async getOwnerDashboard({ filter_type = 'this_month', start_date, end_date } = {}) {
    const params = { filter_type };
    if (filter_type === 'custom' && start_date && end_date) {
      params.start_date = start_date;
      params.end_date = end_date;
    }
    const response = await apiClient.get('/reports/dashboard', { params });
    return response.data;
  },

  /**
   * Fetch detailed financial analytics and revenue by source (Owner only).
   */
  async getFinancialReport({ filter_type = 'this_month', start_date, end_date } = {}) {
    const params = { filter_type };
    if (filter_type === 'custom' && start_date && end_date) {
      params.start_date = start_date;
      params.end_date = end_date;
    }
    const response = await apiClient.get('/reports/finance/overview', { params });
    return response.data;
  },

  /**
   * Fetch membership growth and distribution report.
   */
  async getMembershipReport({ filter_type = 'this_month', start_date, end_date } = {}) {
    const params = { filter_type };
    if (filter_type === 'custom' && start_date && end_date) {
      params.start_date = start_date;
      params.end_date = end_date;
    }
    const response = await apiClient.get('/reports/members/overview', { params });
    return response.data;
  },

  /**
   * Fetch court utilization and booking trends report.
   */
  async getBookingReport({ filter_type = 'this_month', start_date, end_date } = {}) {
    const params = { filter_type };
    if (filter_type === 'custom' && start_date && end_date) {
      params.start_date = start_date;
      params.end_date = end_date;
    }
    const response = await apiClient.get('/reports/bookings/overview', { params });
    return response.data;
  },

  /**
   * Fetch commerce retail orders and inventory health report.
   */
  async getCommerceReport({ filter_type = 'this_month', start_date, end_date } = {}) {
    const params = { filter_type };
    if (filter_type === 'custom' && start_date && end_date) {
      params.start_date = start_date;
      params.end_date = end_date;
    }
    const response = await apiClient.get('/reports/commerce/overview', { params });
    return response.data;
  },

  /**
   * Fetch workforce attendance and payroll report.
   */
  async getHRReport({ filter_type = 'this_month', start_date, end_date } = {}) {
    const params = { filter_type };
    if (filter_type === 'custom' && start_date && end_date) {
      params.start_date = start_date;
      params.end_date = end_date;
    }
    const response = await apiClient.get('/reports/hr/overview', { params });
    return response.data;
  },

  /**
   * Fetch statutory output tax liability summary (Owner only).
   */
  async getTaxReport({ filter_type = 'this_month', start_date, end_date } = {}) {
    const params = { filter_type };
    if (filter_type === 'custom' && start_date && end_date) {
      params.start_date = start_date;
      params.end_date = end_date;
    }
    const response = await apiClient.get('/reports/tax/summary', { params });
    return response.data;
  },

  /**
   * Download CSV export file for the selected report and period.
   * Prompts browser file save using the server-provided filename.
   */
  async exportReportCsv({
    report_type = 'dashboard',
    filter_type = 'this_month',
    start_date,
    end_date,
  } = {}) {
    const params = { report_type, filter_type };
    if (filter_type === 'custom' && start_date && end_date) {
      params.start_date = start_date;
      params.end_date = end_date;
    }

    const response = await apiClient.get('/reports/export/csv', {
      params,
      responseType: 'blob',
    });

    // Extract filename from Content-Disposition header if available
    let filename = `champions_club_${report_type}_${filter_type}.csv`;
    const disposition = response.headers['content-disposition'];
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    // Trigger browser file download
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { filename };
  },
};

export default reportService;
