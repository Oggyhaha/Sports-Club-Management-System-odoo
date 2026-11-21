import apiClient from '../lib/axios';

/**
 * Service for Salary Structures, Payroll Periods, Runs, Payslips & Disbursements.
 */
export const payrollService = {
  // Salary Structures
  async getSalaryStructures(params = {}) {
    const res = await apiClient.get('/payroll/salary-structures', { params });
    return res.data;
  },

  async createSalaryStructure(data) {
    const res = await apiClient.post('/payroll/salary-structures', data);
    return res.data;
  },

  async assignSalary(employeeId, data) {
    const res = await apiClient.post(`/payroll/employees/${employeeId}/salary`, data);
    return res.data;
  },

  // Payroll Periods
  async getPeriods() {
    const res = await apiClient.get('/payroll/periods');
    return res.data;
  },

  async createPeriod(data) {
    const res = await apiClient.post('/payroll/periods', data);
    return res.data;
  },

  // Payroll Runs
  async getRuns() {
    const res = await apiClient.get('/payroll/runs');
    return res.data;
  },

  async createRun(data) {
    const res = await apiClient.post('/payroll/runs', data);
    return res.data;
  },

  async reviewRun(runId) {
    const res = await apiClient.post(`/payroll/runs/${runId}/review`);
    return res.data;
  },

  async processRun(runId) {
    const res = await apiClient.post(`/payroll/runs/${runId}/process`);
    return res.data;
  },

  async getRunEntries(runId) {
    const res = await apiClient.get(`/payroll/runs/${runId}/entries`);
    return res.data;
  },

  // Disbursements
  async disburseEntry(entryId, data) {
    const res = await apiClient.post(`/payroll/entries/${entryId}/disburse`, data);
    return res.data;
  },
};

export default payrollService;
