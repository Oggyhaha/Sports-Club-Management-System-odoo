import apiClient from '../lib/axios';

/**
 * Service for Attendance logs, clock punch actions & HR corrections.
 * Conforms to backend endpoints in backend/app/modules/employees/routes.py
 */
export const attendanceService = {
  // Administrative overview
  async getAttendance(params = {}) {
    const res = await apiClient.get('/attendance', { params });
    return res.data;
  },

  // Self-service actions
  async checkIn(data = {}) {
    // Optional: { notes }
    const res = await apiClient.post('/attendance/check-in', data);
    return res.data;
  },

  async checkOut(data = {}) {
    // Optional: { notes }
    const res = await apiClient.post('/attendance/check-out', data);
    return res.data;
  },

  async getMyAttendance() {
    const res = await apiClient.get('/attendance/me');
    return res.data;
  },

  // Administrative punch correction
  async correctAttendance(attendanceId, data) {
    // Requires: { check_in_time?, check_out_time?, correction_reason }
    const res = await apiClient.put(`/attendance/${attendanceId}/correct`, data);
    return res.data;
  },
};

export default attendanceService;
