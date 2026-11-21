import apiClient from '../lib/axios';

/**
 * Service for Membership Plans, Member Directory & Subscriptions.
 */
export const memberService = {
  // Plans
  async getPlans() {
    const res = await apiClient.get('/members/plans');
    return res.data;
  },

  async createPlan(data) {
    const res = await apiClient.post('/members/plans', data);
    return res.data;
  },

  async updatePlan(planId, data) {
    const res = await apiClient.put(`/members/plans/${planId}`, data);
    return res.data;
  },

  // Member Directory
  async getMembers(params = {}) {
    const res = await apiClient.get('/members', { params });
    return res.data;
  },

  async getMemberById(memberId) {
    const res = await apiClient.get(`/members/${memberId}`);
    return res.data;
  },

  async createMember(data) {
    const res = await apiClient.post('/members', data);
    return res.data;
  },

  async updateMember(memberId, data) {
    const res = await apiClient.put(`/members/${memberId}`, data);
    return res.data;
  },

  // Subscriptions
  async getMemberSubscriptions(memberId) {
    const res = await apiClient.get(`/members/${memberId}/subscriptions`);
    return res.data;
  },

  async purchaseSubscription(memberId, data) {
    const res = await apiClient.post(`/members/${memberId}/subscriptions`, data);
    return res.data;
  },

  async renewSubscription(memberId, data = {}) {
    const res = await apiClient.post(`/members/${memberId}/renew`, data);
    return res.data;
  },
};

export default memberService;
