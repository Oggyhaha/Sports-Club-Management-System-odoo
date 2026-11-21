import React, { useState, useEffect, useCallback } from 'react';
import { Coffee, Clock, CheckCircle2, ChevronRight, RefreshCw, XCircle, AlertCircle } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import cafeteriaService from '../../services/cafeteriaService';
import { useToast } from '../../contexts/ToastContext';
import { formatDateTime, formatCurrency } from '../../utils/formatters';

const STATUS_COLUMNS = [
  { id: 'pending', label: '1. New Orders (Pending)', color: 'border-amber-400 bg-amber-50/20' },
  { id: 'preparing', label: '2. In Kitchen (Preparing)', color: 'border-blue-400 bg-blue-50/20' },
  { id: 'ready', label: '3. Pickup Counter (Ready)', color: 'border-teal-400 bg-teal-50/20' },
  { id: 'completed', label: '4. Served / Completed', color: 'border-slate-300 bg-slate-50/20' },
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
    try {
      await cafeteriaService.updateOrderStatus(orderId, nextStatus);
      showToast?.(`Order moved to ${nextStatus}!`, 'success');
      loadKitchenQueue();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to update order status.', 'error');
    }
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    setCancelling(true);
    try {
      await cafeteriaService.cancelOrder(orderToCancel.id);
      showToast?.('Kitchen ticket cancelled and ingredients returned to inventory.', 'success');
      setCancelModalOpen(false);
      setOrderToCancel(null);
      loadKitchenQueue();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to cancel order.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Kitchen Display Queue (KDS)"
        subtitle="Real-time order throughput: Pending → Preparing → Ready → Completed."
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
          const colOrders = orders.filter((o) => o.status === col.id);

          return (
            <div
              key={col.id}
              className={`rounded-xl border flex flex-col h-[650px] overflow-hidden ${col.color}`}
            >
              {/* Column Header */}
              <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">{col.label}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 font-mono text-xs font-bold text-slate-700">
                  {colOrders.length}
                </span>
              </div>

              {/* Ticket Cards List */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {colOrders.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">No active tickets</div>
                ) : (
                  colOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs p-4 flex flex-col justify-between transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between text-2xs pb-2 border-b border-slate-100">
                          <span className="font-mono font-bold text-slate-700">
                            #{ord.id.substring(0, 8)}
                          </span>
                          <span className="text-slate-400 font-mono">
                            {formatDateTime(ord.created_at).split(',')[1]?.trim()}
                          </span>
                        </div>

                        {/* Customer Tag */}
                        <div className="mt-2 text-xs">
                          {ord.member?.full_name ? (
                            <span className="font-semibold text-sky-800">{ord.member.full_name}</span>
                          ) : (
                            <span className="text-slate-500 font-medium italic">Café Table / Walk-in</span>
                          )}
                        </div>

                        {/* Line Items */}
                        <div className="mt-3 space-y-1.5 text-xs">
                          {ord.items?.map((item, idx) => (
                            <div key={item.id || idx} className="flex items-start justify-between">
                              <span className="font-semibold text-slate-900 pr-2">
                                <span className="font-mono text-sky-700 mr-1.5 font-bold">
                                  {item.quantity}×
                                </span>
                                {item.product_name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Ticket Transitions */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        {ord.status === 'pending' && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => handleAdvanceStatus(ord.id, 'preparing')}
                          >
                            Start Preparing →
                          </Button>
                        )}

                        {ord.status === 'preparing' && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full text-xs bg-teal-600 hover:bg-teal-700"
                            onClick={() => handleAdvanceStatus(ord.id, 'ready')}
                          >
                            Mark Ready →
                          </Button>
                        )}

                        {ord.status === 'ready' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => handleAdvanceStatus(ord.id, 'completed')}
                          >
                            Complete Ticket ✓
                          </Button>
                        )}

                        {ord.status !== 'completed' && ord.status !== 'cancelled' && (
                          <button
                            type="button"
                            title="Cancel Kitchen Order"
                            onClick={() => {
                              setOrderToCancel(ord);
                              setCancelModalOpen(true);
                            }}
                            className="p-1.5 text-slate-300 hover:text-rose-600 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Kitchen Order Ticket"
        message="Are you sure you want to cancel this ticket? Any consumed food inventory will be automatically restored."
        confirmText="Cancel Order"
        confirmVariant="danger"
        isLoading={cancelling}
      />
    </div>
  );
};

export default CafeteriaKitchenPage;
