import apiClient from '../lib/axios';

/**
 * Service for Business Clients, Invoices, Payments, Allocations & Receipts.
 */
export const financeService = {
  // Business Clients
  async getClients() {
    const res = await apiClient.get('/business-clients');
    return res.data;
  },

  async getClientById(clientId) {
    const res = await apiClient.get(`/business-clients/${clientId}`);
    return res.data;
  },

  async createClient(data) {
    const res = await apiClient.post('/business-clients', data);
    return res.data;
  },

  async updateClient(clientId, data) {
    const res = await apiClient.put(`/business-clients/${clientId}`, data);
    return res.data;
  },

  // Invoices
  async getInvoices(params = {}) {
    const res = await apiClient.get('/invoices', { params });
    return res.data;
  },

  async getInvoiceById(invoiceId) {
    const res = await apiClient.get(`/invoices/${invoiceId}`);
    return res.data;
  },

  async createInvoice(data) {
    const res = await apiClient.post('/invoices', data);
    return res.data;
  },

  async cancelInvoice(invoiceId, reason = null) {
    const res = await apiClient.post(`/invoices/${invoiceId}/cancel`, null, {
      params: reason ? { reason } : {},
    });
    return res.data;
  },

  // Payments
  async getPayments(params = {}) {
    const res = await apiClient.get('/payments', { params });
    return res.data;
  },

  async getPaymentById(paymentId) {
    const res = await apiClient.get(`/payments/${paymentId}`);
    return res.data;
  },

  async recordPayment(data, customerName = null) {
    const res = await apiClient.post('/payments', data, {
      params: customerName ? { customer_name: customerName } : {},
    });
    return res.data;
  },

  async allocatePayment(paymentId, allocationData) {
    const res = await apiClient.post(`/payments/${paymentId}/allocations`, allocationData);
    return res.data;
  },

  async getPaymentAllocations(paymentId) {
    const res = await apiClient.get(`/payments/${paymentId}/allocations`);
    return res.data;
  },

  async reverseAllocation(allocationId, data) {
    const res = await apiClient.post(`/allocations/${allocationId}/reverse`, data);
    return res.data;
  },

  async refundPayment(paymentId, data) {
    const res = await apiClient.post(`/payments/${paymentId}/refund`, data);
    return res.data;
  },

  // Receipts
  async getReceipts() {
    const res = await apiClient.get('/receipts');
    return res.data;
  },

  async getReceiptById(receiptId) {
    const res = await apiClient.get(`/receipts/${receiptId}`);
    return res.data;
  },
};

export default financeService;
