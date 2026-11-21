import apiClient from '../lib/axios';

/**
 * Service for Cafeteria Menu, Kitchen Order Queue & Status Updates.
 * Conforms to backend endpoints in backend/app/modules/cafeteria/routes.py
 */
export const cafeteriaService = {
  // Menu items
  async getMenu(params = {}) {
    const res = await apiClient.get('/cafeteria/menu', { params });
    return res.data;
  },

  // Orders
  async getOrders(params = {}) {
    const res = await apiClient.get('/cafeteria/orders', { params });
    return res.data;
  },

  async getOrderById(orderId) {
    const res = await apiClient.get(`/cafeteria/orders/${orderId}`);
    return res.data;
  },

  async createOrder(data) {
    // Requires: { items, customer_type, member_id?, walk_in_name?, walk_in_phone?, table_number?, kitchen_notes?, notes? }
    const res = await apiClient.post('/cafeteria/orders', data);
    return res.data;
  },

  async updateOrderStatus(orderId, newStatus, notes = null) {
    // Exact schema: { new_status: 'preparing' | 'ready' | 'served' | 'cancelled', notes?: string }
    const res = await apiClient.patch(`/cafeteria/orders/${orderId}/status`, {
      new_status: newStatus,
      notes: notes || undefined,
    });
    return res.data;
  },

  async cancelOrder(orderId, notes = null) {
    const res = await apiClient.post(`/cafeteria/orders/${orderId}/cancel`, null, {
      params: notes ? { notes } : {},
    });
    return res.data;
  },
};

export default cafeteriaService;
