import apiClient from '../lib/axios';

/**
 * Service for Attendance logs, clock punch actions & HR corrections.
 */
export const attendanceService = {
  async getAttendance(params = {}) {
    const res = await apiClient.get('/attendance', { params });
    return res.data;
  },

  async checkIn(data = {}) {
    const res = await apiClient.post('/attendance/check-in', data);
    return res.data;
  },

  async checkOut(data = {}) {
    const res = await apiClient.post('/attendance/check-out', data);
    return res.data;
  },

  async correctAttendance(attendanceId, data) {
    const res = await apiClient.put(`/attendance/${attendanceId}/correct`, data);
    return res.data;
  },
};

export default attendanceService;
