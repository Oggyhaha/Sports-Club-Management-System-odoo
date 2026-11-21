import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, RefreshCw, Eye, XCircle } from 'lucide-react';
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
      const params = { order_type: 'shop' };
      if (statusFilter) params.status = statusFilter;
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
      await shopService.cancelOrder(orderToCancel.id);
      showToast?.('Order cancelled and inventory restored.', 'success');
      setCancelModalOpen(false);
      setOrderToCancel(null);
      loadOrders();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to cancel order.', 'error');
    } finally {
      setCancelling(false);
    }
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
              <option value="">All Statuses</option>
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
          <div className="p-12 text-center text-slate-500 text-xs">No orders recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Order ID</th>
                  <th className="py-2.5 px-4">Date & Time</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4 text-right">Items</th>
                  <th className="py-2.5 px-4 text-right">Tax (INR)</th>
                  <th className="py-2.5 px-4 text-right">Total (INR)</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono text-2xs text-slate-500">
                      {ord.id.substring(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-2xs">
                      {formatDateTime(ord.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      {ord.member?.full_name ? (
                        <span className="font-semibold text-slate-900">{ord.member.full_name}</span>
                      ) : (
                        <span className="text-slate-500 italic">Walk-In Retail</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      {ord.items?.length || 0}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatCurrency(ord.tax_amount || 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(ord.total_amount || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={ord.status} />
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(ord);
                          setDetailsModalOpen(true);
                        }}
                      >
                        Details
                      </Button>
                      {ord.status !== 'cancelled' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:text-rose-700"
                          onClick={() => {
                            setOrderToCancel(ord);
                            setCancelModalOpen(true);
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Details Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Order Receipt Details"
        subtitle={`Order #${selectedOrder?.id?.substring(0, 8)}`}
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between text-slate-600">
              <div>
                <p>Status: <strong className="capitalize text-slate-900">{selectedOrder.status}</strong></p>
                <p className="text-3xs text-slate-400 mt-0.5">{formatDateTime(selectedOrder.created_at)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900 font-mono text-base">{formatCurrency(selectedOrder.total_amount)}</p>
                <p className="text-3xs text-slate-400">Total Charged</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr className="py-2 px-3">
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedOrder.items?.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="py-2 px-3 font-semibold text-slate-900">{item.product_name}</td>
                      <td className="py-2 px-3 text-right font-mono">{item.quantity}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(item.unit_price)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(Number(item.unit_price) * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setDetailsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel POS Order"
        message="Are you sure you want to cancel this order? Cancelled items will be returned to inventory stock immediately."
        confirmText="Confirm Order Cancellation"
        confirmVariant="danger"
        isLoading={cancelling}
      />
    </div>
  );
};

export default ShopOrdersPage;
