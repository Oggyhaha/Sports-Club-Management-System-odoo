import React, { useState, useEffect, useCallback } from 'react';
import { Package, ArrowUpCircle, RefreshCw, AlertTriangle, History } from 'lucide-react';
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
      await shopService.restock({
        product_id: selectedProduct.product_id,
        quantity: Number(restockQty),
        notes: restockNotes,
      });
      showToast?.(`Added ${restockQty} units to ${selectedProduct.product_name}!`, 'success');
      setRestockModalOpen(false);
      setSelectedProduct(null);
      loadData();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Restock failed.', 'error');
    } finally {
      setSubmittingRestock(false);
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !adjustReason) {
      setErrorMsg('Correction reason is mandatory for inventory audit trail.');
      return;
    }
    setSubmittingAdjust(true);
    setErrorMsg('');

    try {
      await shopService.adjustStock({
        product_id: selectedProduct.product_id,
        new_quantity: Number(adjustQty),
        reason: adjustReason,
      });
      showToast?.(`Adjusted ${selectedProduct.product_name} stock to ${adjustQty}!`, 'success');
      setAdjustModalOpen(false);
      setSelectedProduct(null);
      loadData();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Stock adjustment failed.');
    } finally {
      setSubmittingAdjust(false);
    }
  };

  const lowStockCount = inventory.filter((i) => i.current_stock <= i.reorder_threshold).length;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Inventory Control & Stock Ledger"
        subtitle="Shared merchandise and cafeteria inventory, restocking records, and audit adjustments."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Shop Inventory' }]}
        actions={
          <Button variant="outline" size="sm" onClick={loadData} isLoading={loading} leftIcon={RefreshCw}>
            Refresh
          </Button>
        }
      />

      {/* Low Stock Warning Header if present */}
      {lowStockCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{lowStockCount} items</strong> are currently at or below their reorder threshold.
            </span>
          </div>
          <span className="font-semibold text-amber-800">Review Watchlist</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 px-1 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'inventory'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Physical Stock Levels ({inventory.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('movements')}
          className={`pb-3 px-1 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'movements'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Movement Audit Ledger ({movements.length})
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <Card noPadding>
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Loading inventory balances...</div>
          ) : inventory.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">No inventory items tracked.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4">Product Name</th>
                    <th className="py-2.5 px-4">SKU</th>
                    <th className="py-2.5 px-4 text-right">Current Stock</th>
                    <th className="py-2.5 px-4 text-right">Reorder Threshold</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventory.map((item) => {
                    const isLow = item.current_stock <= item.reorder_threshold;
                    return (
                      <tr key={item.product_id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {item.product_name}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 text-2xs">{item.sku}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                          {item.current_stock}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {item.reorder_threshold}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                              isLow
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isLow ? 'Low Stock' : 'Optimal'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(item);
                              setRestockQty(10);
                              setRestockNotes('');
                              setRestockModalOpen(true);
                            }}
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
                          >
                            Adjust
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        /* Movements Audit Ledger Table */
        <Card noPadding>
          {movements.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No inventory movements recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4">Date & Time</th>
                    <th className="py-2.5 px-4">Item</th>
                    <th className="py-2.5 px-4">Movement Type</th>
                    <th className="py-2.5 px-4 text-right">Quantity</th>
                    <th className="py-2.5 px-4">Audit Reason / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 text-slate-600 font-mono text-2xs">
                        {formatDateTime(mov.created_at)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {mov.product_name || mov.product?.name || 'Product'}
                      </td>
                      <td className="py-3 px-4 capitalize">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-2xs font-medium">
                          {mov.movement_type}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold ${
                          mov.quantity_delta > 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {mov.quantity_delta > 0 ? `+${mov.quantity_delta}` : mov.quantity_delta}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-2xs">{mov.reason || '—'}</td>
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
        title={`Restock: ${selectedProduct?.product_name}`}
        subtitle="Record incoming merchandise batch shipment"
      >
        <form onSubmit={handleRestockSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Quantity Received *</label>
            <input
              type="number"
              min="1"
              value={restockQty}
              onChange={(e) => setRestockQty(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Supplier / Batch Notes</label>
            <input
              type="text"
              value={restockNotes}
              onChange={(e) => setRestockNotes(e.target.value)}
              placeholder="e.g. Batch PO #8492 from Yonex Distributor"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setRestockModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submittingRestock}>
              Add to Stock
            </Button>
          </div>
        </form>
      </Modal>

      {/* Adjust Modal */}
      <Modal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title={`Audit Adjust: ${selectedProduct?.product_name}`}
        subtitle="Manually correct stock discrepancy with mandatory reason"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">New Physical Stock Count *</label>
            <input
              type="number"
              min="0"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Audit Correction Reason *</label>
            <textarea
              rows={3}
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Quarterly physical cycle count revealed damaged shuttlecock canister."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" type="submit" isLoading={submittingAdjust}>
              Record Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ShopInventoryPage;
