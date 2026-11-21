import React, { useState, useEffect, useCallback } from 'react';
import { Package, ArrowUpCircle, RefreshCw, AlertTriangle, History, ArrowDownCircle, Sliders } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import shopService from '../../services/shopService';
import { useToast } from '../../contexts/ToastContext';
import { formatDate, formatDateTime } from '../../utils/formatters';

export const ShopInventoryPage = () => {
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'movements'
  const [loading, setLoading] = useState(true);

  // Restock Modal
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [restockQty, setRestockQty] = useState(10);
  const [restockNotes, setRestockNotes] = useState('');
  const [submittingRestock, setSubmittingRestock] = useState(false);

  // Adjust Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invData, movData] = await Promise.all([
        shopService.getInventory(),
        shopService.getMovements(),
      ]);
      setInventory(invData || []);
      setMovements(movData || []);
    } catch (err) {
      showToast?.('Failed to load inventory stock levels.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct || restockQty <= 0) return;
    setSubmittingRestock(true);

    try {
      // Backend schema InventoryRestockRequest: { product_id, quantity, reason }
      await shopService.restock({
        product_id: selectedProduct.product_id,
        quantity: Number(restockQty),
        reason: restockNotes.trim() || 'Supplier Shipment Delivery',
      });
      showToast?.(`Restocked ${restockQty} units for ${selectedProduct.product_name}!`, 'success');
      setRestockModalOpen(false);
      setSelectedProduct(null);
      setRestockNotes('');
      loadData();
    } catch (err) {
      showToast?.(err.response?.data?.detail || err.message || 'Restock failed.', 'error');
    } finally {
      setSubmittingRestock(false);
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!adjustReason || adjustReason.trim().length < 3) {
      setErrorMsg('Audit correction reason must be at least 3 characters.');
      return;
    }
    setSubmittingAdjust(true);
    setErrorMsg('');

    try {
      // Backend schema InventoryAdjustRequest: { product_id, new_stock, reason }
      await shopService.adjustStock({
        product_id: selectedProduct.product_id,
        new_stock: Number(adjustQty),
        reason: adjustReason.trim(),
      });
      showToast?.(`Adjusted ${selectedProduct.product_name} stock to ${adjustQty}!`, 'success');
      setAdjustModalOpen(false);
      setSelectedProduct(null);
      setAdjustReason('');
      loadData();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Stock adjustment failed.');
    } finally {
      setSubmittingAdjust(false);
    }
  };

  const lowStockCount = inventory.filter((item) => item.is_low_stock).length;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Inventory & Stock Management"
        subtitle="Shared pro-shop & cafeteria warehouse stock, restock intake, and audited adjustments."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Inventory' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} isLoading={loading} leftIcon={RefreshCw}>
              Refresh
            </Button>
          </div>
        }
      />

      {/* Low Stock Warning Banner */}
      {lowStockCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">{lowStockCount} items at or below reorder threshold</p>
              <p className="text-amber-700 mt-0.5">Urgent purchase order recommended to prevent POS stockouts.</p>
            </div>
          </div>
          <span className="font-mono font-bold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-md">
            Action Required
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'border-b-2 border-sky-600 text-sky-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" /> Stock Levels ({inventory.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('movements')}
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'movements'
              ? 'border-b-2 border-sky-600 text-sky-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" /> Movement Ledger ({movements.length})
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <Card noPadding>
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Loading stock matrix...</div>
          ) : inventory.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">No inventory items tracked yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4">Item Name</th>
                    <th className="py-2.5 px-4">SKU</th>
                    <th className="py-2.5 px-4">Module</th>
                    <th className="py-2.5 px-4 text-center">Current Stock</th>
                    <th className="py-2.5 px-4 text-center">Threshold</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventory.map((item) => (
                    <tr key={item.product_id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-semibold text-slate-900">{item.product_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{item.sku || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="capitalize px-2 py-0.5 rounded text-3xs font-semibold bg-slate-100 text-slate-700">
                          {item.module_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 text-sm">
                        {item.current_stock}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-400">
                        {item.reorder_threshold}
                      </td>
                      <td className="py-3 px-4">
                        {item.current_stock === 0 ? (
                          <StatusBadge status="out_of_stock" />
                        ) : item.is_low_stock ? (
                          <StatusBadge status="low_stock" />
                        ) : (
                          <StatusBadge status="in_stock" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(item);
                              setRestockQty(10);
                              setRestockNotes('');
                              setRestockModalOpen(true);
                            }}
                            leftIcon={ArrowUpCircle}
                          >
                            Restock
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(item);
                              setAdjustQty(item.current_stock);
                              setAdjustReason('');
                              setErrorMsg('');
                              setAdjustModalOpen(true);
                            }}
                            leftIcon={Sliders}
                          >
                            Adjust
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card noPadding>
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Loading movement history...</div>
          ) : movements.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">No recorded stock movements yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Movement Type</th>
                    <th className="py-2.5 px-4 text-center">Change</th>
                    <th className="py-2.5 px-4 text-center">Resulting Stock</th>
                    <th className="py-2.5 px-4">Audit Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/60 font-mono text-slate-700">
                      <td className="py-3 px-4 text-slate-500 font-sans">{formatDateTime(m.created_at)}</td>
                      <td className="py-3 px-4 font-sans capitalize font-semibold text-slate-900">
                        {m.movement_type.replace('_', ' ')}
                      </td>
                      <td className={`py-3 px-4 text-center font-bold ${
                        m.quantity_change > 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">
                        {m.resulting_stock}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-500 text-2xs">
                        {m.reason || 'Standard operational transaction'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Restock Modal */}
      <Modal
        isOpen={restockModalOpen}
        onClose={() => setRestockModalOpen(false)}
        title="Supplier Restock Intake"
        subtitle={`Add physical stock intake for ${selectedProduct?.product_name}`}
      >
        <form onSubmit={handleRestockSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Quantity Received *</label>
            <input
              type="number"
              min="1"
              value={restockQty}
              onChange={(e) => setRestockQty(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Restock Reason / PO Reference</label>
            <input
              type="text"
              value={restockNotes}
              onChange={(e) => setRestockNotes(e.target.value)}
              placeholder="e.g. Supplier PO #4092 intake"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setRestockModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submittingRestock}>
              Confirm Restock
            </Button>
          </div>
        </form>
      </Modal>

      {/* Adjust Modal */}
      <Modal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title="Audited Stock Correction"
        subtitle={`Override stock count for ${selectedProduct?.product_name}`}
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">New Absolute Stock Level *</label>
            <input
              type="number"
              min="0"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
              required
            />
            <p className="mt-1 text-3xs text-slate-400">
              Current recorded count is {selectedProduct?.current_stock}. Setting this will record an audited variance.
            </p>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Mandatory Correction Reason *</label>
            <textarea
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Physical inventory cycle count variance, damaged box written off"
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submittingAdjust}>
              Record Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ShopInventoryPage;
