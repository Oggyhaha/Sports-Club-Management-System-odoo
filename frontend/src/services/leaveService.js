import apiClient from '../lib/axios';

/**
 * Service for Employee Leave applications, HR queue, approvals & rejections.
 * Conforms to backend endpoints in backend/app/modules/employees/routes.py
 */
export const leaveService = {
  // Administrative queue
  async getLeaves(params = {}) {
    const res = await apiClient.get('/leaves', { params });
    return res.data;
  },

  async getLeaveById(leaveId) {
    const res = await apiClient.get(`/leaves/${leaveId}`);
    return res.data;
  },

  // Self-service actions
  async applyLeave(data) {
    // Requires: { leave_type, start_date, end_date, reason }
    const res = await apiClient.post('/leaves', data);
    return res.data;
  },

  async getMyLeaves() {
    const res = await apiClient.get('/leaves/me');
    return res.data;
  },

  async cancelLeave(leaveId) {
    const res = await apiClient.post(`/leaves/${leaveId}/cancel`);
    return res.data;
  },

  // Administrative review
  async approveLeave(leaveId, data = {}) {
    // Optional: { review_remarks }
    const res = await apiClient.post(`/leaves/${leaveId}/approve`, data);
    return res.data;
  },

  async rejectLeave(leaveId, data = {}) {
    // Optional: { review_remarks }
    const res = await apiClient.post(`/leaves/${leaveId}/reject`, data);
    return res.data;
  },
};

export default leaveService;
