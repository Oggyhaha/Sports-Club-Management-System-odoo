import React, { useState, useEffect, useCallback } from 'react';
import { Coffee, Clock, CheckCircle2, ChevronRight, RefreshCw, XCircle, AlertCircle, Utensils } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import cafeteriaService from '../../services/cafeteriaService';
import { useToast } from '../../contexts/ToastContext';
import { formatDateTime, formatCurrency } from '../../utils/formatters';

const STATUS_COLUMNS = [
  { id: 'pending', label: '1. New Orders (Pending)', nextStatus: 'preparing', color: 'border-amber-400 bg-amber-50/20' },
  { id: 'preparing', label: '2. In Kitchen (Preparing)', nextStatus: 'ready', color: 'border-blue-400 bg-blue-50/20' },
  { id: 'ready', label: '3. Pickup Counter (Ready)', nextStatus: 'served', color: 'border-teal-400 bg-teal-50/20' },
  { id: 'served', label: '4. Served (Terminal)', nextStatus: null, color: 'border-emerald-300 bg-emerald-50/20' },
];

export const CafeteriaKitchenPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cancel Confirmation
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const { showToast } = useToast();

  const loadKitchenQueue = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cafeteriaService.getOrders();
      setOrders(data || []);
    } catch (err) {
      showToast?.('Failed to load kitchen order queue.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadKitchenQueue();
    // Poll every 30 seconds for live kitchen updates
    const interval = setInterval(loadKitchenQueue, 30000);
    return () => clearInterval(interval);
  }, [loadKitchenQueue]);

  const handleAdvanceStatus = async (orderId, nextStatus) => {
    if (!nextStatus) return;
    try {
      // Backend CafeteriaStatusUpdate: { new_status: nextStatus }
      await cafeteriaService.updateOrderStatus(orderId, nextStatus);
      showToast?.(`Order moved to ${nextStatus.toUpperCase()}!`, 'success');
      loadKitchenQueue();
    } catch (err) {
      showToast?.(err.response?.data?.detail || err.message || 'Failed to update order status.', 'error');
    }
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    setCancelling(true);
    try {
      await cafeteriaService.cancelOrder(orderToCancel.id, 'Kitchen cancelled ticket');
      showToast?.('Kitchen ticket cancelled and ingredients returned to inventory.', 'success');
      setCancelModalOpen(false);
      setOrderToCancel(null);
      loadKitchenQueue();
    } catch (err) {
      showToast?.(err.response?.data?.detail || err.message || 'Failed to cancel order.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Kitchen Display Queue (KDS)"
        subtitle="Real-time order throughput: Pending → Preparing → Ready → Served."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Cafeteria Kitchen' }]}
        actions={
          <Button variant="outline" size="sm" onClick={loadKitchenQueue} isLoading={loading} leftIcon={RefreshCw}>
            Refresh Queue
          </Button>
        }
      />

      {/* KDS Column Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => (o.order_status || o.status) === col.id);

          return (
            <div
              key={col.id}
              className={`rounded-xl border flex flex-col h-[650px] overflow-hidden ${col.color}`}
            >
              {/* Column Header */}
              <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">{col.label}</span>
                <span className="text-3xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {colOrders.length}
                </span>
              </div>

              {/* Order Cards List */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1">
                {colOrders.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-slate-400 text-2xs italic">
                    No orders in this stage
                  </div>
                ) : (
                  colOrders.map((order) => {
                    const status = order.order_status || order.status;
                    const canCancel = status === 'pending' || status === 'preparing';

                    return (
                      <div
                        key={order.id}
                        className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-2.5 text-xs transition-all hover:border-slate-300"
                      >
                        {/* Order Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {order.order_number || `#${order.id.slice(0, 6)}`}
                            </span>
                            <p className="text-3xs text-slate-400">
                              {order.table_number ? `Table: ${order.table_number}` : 'Takeaway / Counter'}
                            </p>
                          </div>
                          <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {formatDateTime(order.created_at).split(',')[1]}
                          </span>
                        </div>

                        {/* Customer Info */}
                        <div className="text-3xs text-slate-600 bg-slate-50 p-1.5 rounded">
                          <p className="font-medium text-slate-800">
                            {order.customer_type === 'member' ? (order.member?.full_name || 'Member') : (order.walk_in_name || 'Walk-in Patron')}
                          </p>
                          {order.kitchen_notes && (
                            <p className="text-amber-800 font-semibold mt-0.5">Notes: {order.kitchen_notes}</p>
                          )}
                        </div>

                        {/* Order Items */}
                        <div className="space-y-1 py-1 border-t border-b border-slate-100">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-3xs">
                              <span className="text-slate-800 font-medium">
                                <span className="font-bold text-sky-700 mr-1.5">{item.quantity}x</span>
                                {item.product_name_snapshot || item.product?.name || 'Item'}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Action Controls */}
                        <div className="flex items-center justify-between pt-1">
                          {canCancel ? (
                            <button
                              type="button"
                              onClick={() => {
                                setOrderToCancel(order);
                                setCancelModalOpen(true);
                              }}
                              className="text-3xs text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                            >
                              Cancel Ticket
                            </button>
                          ) : status === 'ready' ? (
                            <span className="text-3xs text-slate-400 italic">Ready (Cannot cancel)</span>
                          ) : (
                            <span className="text-3xs text-emerald-700 font-semibold">Completed</span>
                          )}

                          {col.nextStatus && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleAdvanceStatus(order.id, col.nextStatus)}
                              rightIcon={ChevronRight}
                            >
                              Mark {col.nextStatus.toUpperCase()}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancel Order Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Cafeteria Order"
        message={`Are you sure you want to cancel order '${orderToCancel?.order_number}'? Ingredients and tracked inventory items will be restored automatically.`}
        confirmText="Cancel Order"
        variant="danger"
        isLoading={cancelling}
      />
    </div>
  );
};

export default CafeteriaKitchenPage;
