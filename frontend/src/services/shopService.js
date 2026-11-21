import apiClient from '../lib/axios';

/**
 * Service for Pro-Shop Products, Inventory, Stock Adjustments & Orders.
 */
export const shopService = {
  // Categories
  async getCategories() {
    const res = await apiClient.get('/shop/categories');
    return res.data;
  },

  async createCategory(data) {
    const res = await apiClient.post('/shop/categories', data);
    return res.data;
  },

  // Products
  async getProducts(params = {}) {
    const res = await apiClient.get('/shop/products', { params });
    return res.data;
  },

  async getProductById(productId) {
    const res = await apiClient.get(`/shop/products/${productId}`);
    return res.data;
  },

  async createProduct(data) {
    const res = await apiClient.post('/shop/products', data);
    return res.data;
  },

  async updateProduct(productId, data) {
    const res = await apiClient.put(`/shop/products/${productId}`, data);
    return res.data;
  },

  // Inventory & Stock Movements
  async getInventory() {
    const res = await apiClient.get('/shop/inventory');
    return res.data;
  },

  async adjustStock(data) {
    const res = await apiClient.post('/shop/inventory/adjust', data);
    return res.data;
  },

  async restock(data) {
    const res = await apiClient.post('/shop/inventory/restock', data);
    return res.data;
  },

  async getMovements(params = {}) {
    const res = await apiClient.get('/shop/inventory/movements', { params });
    return res.data;
  },

  // Orders
  async getOrders(params = {}) {
    const res = await apiClient.get('/shop/orders', { params });
    return res.data;
  },

  async getOrderById(orderId) {
    const res = await apiClient.get(`/shop/orders/${orderId}`);
    return res.data;
  },

  async createOrder(data) {
    const res = await apiClient.post('/shop/orders', data);
    return res.data;
  },

  async cancelOrder(orderId) {
    const res = await apiClient.post(`/shop/orders/${orderId}/cancel`);
    return res.data;
  },
};

export default shopService;
