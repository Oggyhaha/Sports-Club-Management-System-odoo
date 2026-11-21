import apiClient from '../lib/axios';

/**
 * Service for Salary Structures, Payroll Periods, Runs, Payslips & Disbursements.
 * Conforms to backend endpoints in backend/app/modules/employees/routes.py
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
    // Requires: { salary_structure_id, base_salary, effective_from, payment_frequency? }
    const res = await apiClient.post(`/payroll/employees/${employeeId}/salary`, data);
    return res.data;
  },

  async getEmployeeSalaryHistory(employeeId) {
    const res = await apiClient.get(`/payroll/employees/${employeeId}/salary`);
    return res.data;
  },

  // Payroll Periods
  async getPeriods() {
    const res = await apiClient.get('/payroll/periods');
    return res.data;
  },

  async createPeriod(data) {
    // Requires: { period_name, start_date, end_date }
    const res = await apiClient.post('/payroll/periods', data);
    return res.data;
  },

  // Payroll Runs
  async getRuns() {
    const res = await apiClient.get('/payroll/runs');
    return res.data;
  },

  async getRunById(runId) {
    // Returns PayrollRunResponse with embedded entries and components
    const res = await apiClient.get(`/payroll/runs/${runId}`);
    return res.data;
  },

  async createRun(data) {
    // Requires: { period_id }
    const res = await apiClient.post('/payroll/runs', data);
    return res.data;
  },

  async reviewRun(runId) {
    const res = await apiClient.post(`/payroll/runs/${runId}/review`);
    return res.data;
  },

  async processRun(runId) {
    // Irreversible action: generates payslips and freezes components
    const res = await apiClient.post(`/payroll/runs/${runId}/process`);
    return res.data;
  },

  // Disbursements
  async disburseEntry(entryId, data) {
    // Requires: { payment_method, external_reference?, notes? }
    const res = await apiClient.post(`/payroll/entries/${entryId}/disburse`, data);
    return res.data;
  },

  // Payslips (Self-service / Admin)
  async getMyPayslips() {
    const res = await apiClient.get('/payroll/me/payslips');
    return res.data;
  },

  async getMyPayslipById(payslipId) {
    const res = await apiClient.get(`/payroll/me/payslips/${payslipId}`);
    return res.data;
  },
};

export default payrollService;
