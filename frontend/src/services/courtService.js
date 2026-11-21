import apiClient from '../lib/axios';

/**
 * Service for Sports Courts inventory & pricing.
 */
export const courtService = {
  async getCourts(params = {}) {
    const res = await apiClient.get('/courts', { params });
    return res.data;
  },

  async getCourtById(courtId) {
    const res = await apiClient.get(`/courts/${courtId}`);
    return res.data;
  },

  async createCourt(data) {
    const res = await apiClient.post('/courts', data);
    return res.data;
  },

  async updateCourt(courtId, data) {
    const res = await apiClient.put(`/courts/${courtId}`, data);
    return res.data;
  },
};

export default courtService;
