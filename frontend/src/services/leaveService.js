import apiClient from '../lib/axios';

/**
 * Service for Employee Leave applications, HR queue, approvals & rejections.
 */
export const leaveService = {
  async getLeaves(params = {}) {
    const res = await apiClient.get('/leaves', { params });
    return res.data;
  },

  async applyLeave(data) {
    const res = await apiClient.post('/leaves', data);
    return res.data;
  },

  async approveLeave(leaveId, data = {}) {
    const res = await apiClient.post(`/leaves/${leaveId}/approve`, data);
    return res.data;
  },

  async rejectLeave(leaveId, data = {}) {
    const res = await apiClient.post(`/leaves/${leaveId}/reject`, data);
    return res.data;
  },

  async cancelLeave(leaveId) {
    const res = await apiClient.post(`/leaves/${leaveId}/cancel`);
    return res.data;
  },
};

export default leaveService;
