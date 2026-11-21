import apiClient from '../lib/axios';

/**
 * Service for Employee Directory, Departments & Designations.
 */
export const employeeService = {
  // Departments
  async getDepartments() {
    const res = await apiClient.get('/departments');
    return res.data;
  },

  async createDepartment(data) {
    const res = await apiClient.post('/departments', data);
    return res.data;
  },

  async updateDepartment(departmentId, data) {
    const res = await apiClient.put(`/departments/${departmentId}`, data);
    return res.data;
  },

  // Designations
  async getDesignations(params = {}) {
    const res = await apiClient.get('/designations', { params });
    return res.data;
  },

  async createDesignation(data) {
    const res = await apiClient.post('/designations', data);
    return res.data;
  },

  // Employees
  async getEmployees(params = {}) {
    const res = await apiClient.get('/employees', { params });
    return res.data;
  },

  async getEmployeeById(employeeId) {
    const res = await apiClient.get(`/employees/${employeeId}`);
    return res.data;
  },

  async createEmployee(data) {
    const res = await apiClient.post('/employees', data);
    return res.data;
  },

  async updateEmployee(employeeId, data) {
    const res = await apiClient.put(`/employees/${employeeId}`, data);
    return res.data;
  },

  async updateEmployeeStatus(employeeId, status) {
    const res = await apiClient.patch(`/employees/${employeeId}/status`, { employment_status: status });
    return res.data;
  },

  async getMyProfile() {
    const res = await apiClient.get('/employees/me');
    return res.data;
  },
};

export default employeeService;
