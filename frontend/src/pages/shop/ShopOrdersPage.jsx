import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, RefreshCw, Eye, XCircle, CheckCircle, Package } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import shopService from '../../services/shopService';
import { useToast } from '../../contexts/ToastContext';
import { formatDateTime, formatCurrency } from '../../utils/formatters';

export const ShopOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Details Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Cancel Confirmation
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const { showToast } = useToast();

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.order_status = statusFilter;
      const data = await shopService.getOrders(params);
      setOrders(data || []);
    } catch (err) {
      showToast?.('Failed to load shop orders.', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    setCancelling(true);
    try {
      await shopService.cancelOrder(orderToCancel.id, 'Counter order cancelled');
      showToast?.('Order cancelled and inventory restored to warehouse.', 'success');
      setCancelModalOpen(false);
      setOrderToCancel(null);
      loadOrders();
    } catch (err) {
      showToast?.(err.response?.data?.detail || err.message || 'Failed to cancel order.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const openDetails = (order) => {
    setSelectedOrder(order);
    setDetailsModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Pro-Shop Order Repository"
        subtitle="Historical point-of-sale customer receipts, tax itemization, and stock restoration."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Shop Orders' }]}
        actions={
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 bg-white"
            >
              <option value="">All Fulfillment Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Button variant="outline" size="sm" onClick={loadOrders} isLoading={loading} leftIcon={RefreshCw}>
              Refresh
            </Button>
          </div>
        }
      />

      <Card noPadding>
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading shop orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">No orders recorded matching filter criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Order #</th>
                  <th className="py-2.5 px-4">Date & Time</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4 text-center">Items</th>
                  <th className="py-2.5 px-4 text-right">Total Amount</th>
                  <th className="py-2.5 px-4">Fulfillment</th>
                  <th className="py-2.5 px-4">Payment</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => {
                  const status = o.order_status || o.status;
                  const canCancel = status !== 'cancelled' && status !== 'completed';

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {o.order_number || `#${o.id.slice(0, 8)}`}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {formatDateTime(o.created_at)}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {o.customer_type === 'member'
                          ? (o.member?.full_name || 'Club Member')
                          : (o.walk_in_name || 'Walk-in Guest')}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                        {o.items?.length || 0}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(o.total_amount || 0)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={status} />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={o.payment_status || 'unpaid'} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetails(o)}
                            leftIcon={Eye}
                          >
                            View
                          </Button>
                          {canCancel && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-400 hover:text-rose-600"
                              onClick={() => {
                                setOrderToCancel(o);
                                setCancelModalOpen(true);
                              }}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Order Itemization Details Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={`Order Details ${selectedOrder?.order_number || ''}`}
        subtitle={`Placed on ${selectedOrder ? formatDateTime(selectedOrder.created_at) : ''}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
              <div>
                <span className="text-slate-400 text-3xs uppercase">Customer Account</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {selectedOrder.customer_type === 'member'
                    ? (selectedOrder.member?.full_name || 'Club Member')
                    : (selectedOrder.walk_in_name || 'Walk-in Patron')}
                </p>
              </div>
              <div>
                <span className="text-slate-400 text-3xs uppercase">Payment Ledger Status</span>
                <p className="font-semibold text-slate-900 mt-0.5 capitalize">
                  {selectedOrder.payment_status || 'Unpaid'}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-2">Itemized Breakdown</h4>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-2 px-3">Item Snapshot</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">Tax Rate</th>
                    <th className="py-2 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedOrder.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-semibold text-slate-800">
                        {item.product_name_snapshot || item.product?.name || 'Merchandise'}
                      </td>
                      <td className="py-2 px-3 text-center font-mono">{item.quantity}</td>
                      <td className="py-2 px-3 text-right font-mono">
                        {formatCurrency(item.unit_price_snapshot || item.unit_price || 0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {item.tax_rate_snapshot || 0}%
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(item.line_total || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-200 flex flex-col items-end gap-1 text-slate-700">
              <div className="flex justify-between w-48 text-2xs">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrency(selectedOrder.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between w-48 text-2xs text-emerald-700">
                <span>Discount:</span>
                <span className="font-mono">-{formatCurrency(selectedOrder.discount_amount || 0)}</span>
              </div>
              <div className="flex justify-between w-48 text-2xs">
                <span>Tax:</span>
                <span className="font-mono">{formatCurrency(selectedOrder.tax_amount || 0)}</span>
              </div>
              <div className="flex justify-between w-48 text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Total:</span>
                <span className="font-mono text-sky-800">{formatCurrency(selectedOrder.total_amount || 0)}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setDetailsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Order Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Pro-Shop Order"
        message={`Are you sure you want to cancel order '${orderToCancel?.order_number}'? Physical items will be restored to warehouse inventory immediately.`}
        confirmText="Cancel Order"
        variant="danger"
        isLoading={cancelling}
      />
    </div>
  );
};

export default ShopOrdersPage;
