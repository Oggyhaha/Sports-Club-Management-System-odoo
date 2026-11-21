import apiClient from '../lib/axios';

/**
 * Service for Cafeteria Menu, Kitchen Order Queue & Status Updates.
 */
export const cafeteriaService = {
  async getMenu(params = {}) {
    const res = await apiClient.get('/cafeteria/menu', { params });
    return res.data;
  },

  async createOrder(data) {
    const res = await apiClient.post('/cafeteria/orders', data);
    return res.data;
  },

  async getOrders(params = {}) {
    const res = await apiClient.get('/cafeteria/orders', { params });
    return res.data;
  },

  async updateOrderStatus(orderId, status) {
    const res = await apiClient.patch(`/cafeteria/orders/${orderId}/status`, { status });
    return res.data;
  },

  async cancelOrder(orderId) {
    const res = await apiClient.post(`/cafeteria/orders/${orderId}/cancel`);
    return res.data;
  },
};

export default cafeteriaService;
