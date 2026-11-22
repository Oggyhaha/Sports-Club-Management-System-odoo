import apiClient from '../lib/axios';

/**
 * Service for Court Bookings, Availability & Friday Social Play.
 */
export const bookingService = {
  // Availability
  async checkAvailability(targetDate, courtId = null) {
    const params = { date: targetDate, target_date: targetDate };
    if (courtId) params.court_id = courtId;
    const res = await apiClient.get('/bookings/availability', { params });
    return res.data;
  },

  // Bookings CRUD
  async getBookings(params = {}) {
    const res = await apiClient.get('/bookings', { params });
    return res.data;
  },

  async getBookingById(bookingId) {
    const res = await apiClient.get(`/bookings/${bookingId}`);
    return res.data;
  },

  async createBooking(data) {
    const res = await apiClient.post('/bookings', data);
    return res.data;
  },

  async cancelBooking(bookingId) {
    const res = await apiClient.post(`/bookings/${bookingId}/cancel`);
    return res.data;
  },

  // Social Play Sessions
  async getSocialSessions() {
    const res = await apiClient.get('/bookings/social-sessions');
    return res.data;
  },

  async createSocialSession(data) {
    const res = await apiClient.post('/bookings/social-sessions', data);
    return res.data;
  },

  async cancelSocialSession(sessionId) {
    const res = await apiClient.post(`/bookings/social-sessions/${sessionId}/cancel`);
    return res.data;
  },

  async joinSocialSession(sessionId) {
    const res = await apiClient.post(`/bookings/social-sessions/${sessionId}/join`);
    return res.data;
  },

  async leaveSocialSession(sessionId) {
    const res = await apiClient.post(`/bookings/social-sessions/${sessionId}/leave`);
    return res.data;
  },
};

export default bookingService;
