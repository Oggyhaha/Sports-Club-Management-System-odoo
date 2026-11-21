import React, { useState, useEffect, useCallback } from 'react';
import { Coffee, Plus, RefreshCw, ShoppingCart } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import cafeteriaService from '../../services/cafeteriaService';
import memberService from '../../services/memberService';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils/formatters';

export const CafeteriaMenuPage = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Ticket Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState({}); // { [productId]: quantity }
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { showToast } = useToast();

  const loadMenu = useCallback(async () => {
    setLoading(true);
    try {
      const [menuData, membersData] = await Promise.all([
        cafeteriaService.getMenu(),
        memberService.getMembers({ status: 'active' }),
      ]);
      setMenuItems(menuData || []);
      setMembers(membersData || []);
    } catch (err) {
      showToast?.('Failed to load cafeteria menu items.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const handleQuantityChange = (productId, qty) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (qty <= 0) {
        delete next[productId];
      } else {
        next[productId] = qty;
      }
      return next;
    });
  };

  const calculateTotal = () => {
    return Object.entries(selectedItems).reduce((acc, [pId, qty]) => {
      const item = menuItems.find((m) => m.id === pId);
      return acc + (Number(item?.price || 0) * qty);
    }, 0);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    const itemsList = Object.entries(selectedItems).map(([productId, quantity]) => ({
      product_id: productId,
      quantity,
    }));

    if (itemsList.length === 0) {
      setErrorMsg('Please select at least one menu item.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        order_type: 'cafeteria',
        items: itemsList,
      };
      if (selectedMemberId) payload.member_id = selectedMemberId;

      await cafeteriaService.createOrder(payload);
      showToast?.('Cafeteria order sent to kitchen queue!', 'success');
      setIsOrderModalOpen(false);
      setSelectedItems({});
      setSelectedMemberId('');
      loadMenu();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to place kitchen order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Cafeteria & Bar Menu"
        subtitle="Manage food items, beverages, kitchen inventory, and point-of-service tickets."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Cafeteria Menu' }]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSelectedItems({});
              setSelectedMemberId('');
              setErrorMsg('');
              setIsOrderModalOpen(true);
            }}
            leftIcon={Plus}
          >
            Create Kitchen Ticket
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-400 text-xs">Loading cafeteria menu...</div>
        ) : menuItems.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-500 text-xs bg-white rounded-xl border border-slate-200">
            No cafeteria menu items configured.
          </div>
        ) : (
          menuItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1 text-2xs">
                  <span className="font-mono text-slate-400">{item.sku}</span>
                  <StatusBadge status={item.is_active ? 'active' : 'inactive'} />
                </div>
                <h4 className="font-bold text-slate-900 text-xs mt-2 line-clamp-1">{item.name}</h4>
                <p className="text-sm font-mono font-bold text-slate-900 mt-1">
                  {formatCurrency(item.price)}
                </p>
                <p className="text-3xs text-slate-400 mt-1">
                  Stock: <strong className="text-slate-700">{item.current_stock} available</strong>
                </p>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    setSelectedItems({ [item.id]: 1 });
                    setIsOrderModalOpen(true);
                  }}
                >
                  Order Item
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Kitchen Ticket Modal */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title="Create Kitchen Order Ticket"
        subtitle="Submit order ticket directly to kitchen queue (KDS)"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Customer / Member</label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
            >
              <option value="">Walk-in Café Guest</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.plan_name || 'Member'})
                </option>
              ))}
            </select>
          </div>

          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {menuItems.map((item) => {
              const currentQty = selectedItems[item.id] || 0;
              return (
                <div key={item.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-2xs text-slate-500 font-mono">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max={item.current_stock}
                      value={currentQty}
                      onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-center text-slate-900 font-mono"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-sky-50 rounded-lg border border-sky-200 flex items-center justify-between">
            <span className="font-semibold text-sky-900">Estimated Ticket Total:</span>
            <span className="font-mono font-bold text-sm text-sky-950">
              {formatCurrency(calculateTotal())}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsOrderModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={submitting}
              disabled={Object.keys(selectedItems).length === 0}
            >
              Dispatch to Kitchen Queue
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CafeteriaMenuPage;
