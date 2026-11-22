import apiClient from '../lib/axios';

/**
 * Service for Membership Plans, Member Directory & Subscriptions.
 * Conforms to backend endpoints in backend/app/modules/members/routes.py
 */
export const memberService = {
  // Membership Plans
  async getPlans() {
    const res = await apiClient.get('/members/plans');
    return res.data;
  },

  async getPlanById(planId) {
    const res = await apiClient.get(`/members/plans/${planId}`);
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
    // Requires: { full_name, email, plan_id, phone?, start_date?, expiry_date? }
    const res = await apiClient.post('/members', data);
    return res.data;
  },

  async updateMember(memberId, data) {
    const res = await apiClient.put(`/members/${memberId}`, data);
    return res.data;
  },

  // Member Self-Service Profile
  async getMyProfile() {
    const res = await apiClient.get('/members/me');
    return res.data;
  },

  async updateMyProfile(data) {
    const res = await apiClient.put('/auth/me', data);
    return res.data;
  },

  async purchaseSubscriptionOnline(data) {
    // Requires: { plan_id, payment_method?, payment_reference? }
    const res = await apiClient.post('/members/me/subscribe', data);
    return res.data;
  },

  // Subscriptions & Renewals
  async getMemberSubscriptions(memberId) {
    const res = await apiClient.get(`/members/${memberId}/subscriptions`);
    return res.data;
  },

  async purchaseSubscription(memberId, data) {
    // Requires: { plan_id, start_date?, price_paid?, payment_status?, notes? }
    const res = await apiClient.post(`/members/${memberId}/subscriptions`, data);
    return res.data;
  },

  async renewSubscription(memberId, data = {}) {
    // Requires: { payment_status?, notes? }
    const res = await apiClient.post(`/members/${memberId}/renew`, data);
    return res.data;
  },

  async changePlan(memberId, data) {
    // Requires: { new_plan_id, payment_status?, notes? }
    const res = await apiClient.post(`/members/${memberId}/change-plan`, data);
    return res.data;
  },
};

export default memberService;
