import React, { useState, useEffect, useCallback } from 'react';
import { Coffee, Plus, RefreshCw, ShoppingCart, Minus, Trash2 } from 'lucide-react';
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
  const [customerType, setCustomerType] = useState('walk_in'); // 'walk_in' | 'member'
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [kitchenNotes, setKitchenNotes] = useState('');
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
      const unitPrice = Number(item?.unit_price ?? item?.price ?? 0);
      return acc + (unitPrice * qty);
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
    if (customerType === 'member' && !selectedMemberId) {
      setErrorMsg('Please select a member or switch to walk-in.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      // Backend CafeteriaOrderCreate schema
      const payload = {
        items: itemsList,
        customer_type: customerType,
        table_number: tableNumber || undefined,
        kitchen_notes: kitchenNotes || undefined,
      };

      if (customerType === 'member') {
        payload.member_id = selectedMemberId;
      } else {
        if (walkInName) payload.walk_in_name = walkInName;
      }

      await cafeteriaService.createOrder(payload);
      showToast?.('Cafeteria order sent to kitchen queue!', 'success');
      setIsOrderModalOpen(false);
      setSelectedItems({});
      setSelectedMemberId('');
      setWalkInName('');
      setTableNumber('');
      setKitchenNotes('');
      loadMenu();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to place kitchen order.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalItemCount = Object.values(selectedItems).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Cafeteria & Bar Menu"
        subtitle="Beverages, fresh juices, health shakes, cafeteria snacks, and kitchen tickets."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Cafeteria Menu' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsOrderModalOpen(true)}
              leftIcon={ShoppingCart}
            >
              New Kitchen Ticket ({totalItemCount})
            </Button>
            <Button variant="outline" size="sm" onClick={loadMenu} isLoading={loading} leftIcon={RefreshCw}>
              Refresh
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading cafeteria offerings...</div>
      ) : menuItems.length === 0 ? (
        <Card className="text-center py-12 text-slate-500 text-xs">
          <Coffee className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p>No cafeteria items configured.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {menuItems.map((item) => {
            const currentQty = selectedItems[item.id] || 0;
            const price = item.unit_price ?? item.price ?? 0;

            return (
              <Card key={item.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{item.name}</h3>
                      <p className="text-3xs text-slate-400 mt-0.5">{item.category?.name || 'Beverage & Snacks'}</p>
                    </div>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {formatCurrency(price)}
                    </span>
                  </div>

                  {item.description && (
                    <p className="mt-2 text-xs text-slate-600 line-clamp-2">{item.description}</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  {currentQty === 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantityChange(item.id, 1)}
                      leftIcon={Plus}
                    >
                      Add to Ticket
                    </Button>
                  ) : (
                    <div className="flex items-center border border-slate-300 rounded-lg bg-slate-50">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.id, currentQty - 1)}
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2 font-mono font-bold text-slate-900 text-xs">{currentQty}</span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.id, currentQty + 1)}
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {currentQty > 0 && (
                    <span className="font-mono font-bold text-sky-800 text-xs">
                      {formatCurrency(price * currentQty)}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Kitchen Ticket Modal */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title="Submit Kitchen Ticket"
        subtitle="Route cafeteria order to live kitchen display system"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Customer Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setCustomerType('walk_in')}
              className={`py-1 rounded font-medium text-center cursor-pointer ${
                customerType === 'walk_in' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600'
              }`}
            >
              Walk-in Guest
            </button>
            <button
              type="button"
              onClick={() => setCustomerType('member')}
              className={`py-1 rounded font-medium text-center cursor-pointer ${
                customerType === 'member' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600'
              }`}
            >
              Club Member
            </button>
          </div>

          {customerType === 'member' ? (
            <div>
              <label className="block font-medium text-slate-700 mb-1">Select Member *</label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                required
              >
                <option value="">-- Choose Member --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.plan?.name || 'Member'} • {m.plan?.bar_discount_percent || 0}% café disc)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block font-medium text-slate-700 mb-1">Guest Name (Optional)</label>
              <input
                type="text"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                placeholder="Walk-in Customer Name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Table Number</label>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="e.g. Table 4, Counter"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Kitchen Preparation Notes</label>
              <input
                type="text"
                value={kitchenNotes}
                onChange={(e) => setKitchenNotes(e.target.value)}
                placeholder="e.g. Extra ice, no sugar"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          {/* Selected Items Summary */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-700 block mb-2">Order Items:</span>
            {totalItemCount === 0 ? (
              <p className="text-slate-400 italic">No items selected from menu yet.</p>
            ) : (
              <ul className="space-y-1">
                {Object.entries(selectedItems).map(([pId, qty]) => {
                  const item = menuItems.find((m) => m.id === pId);
                  return (
                    <li key={pId} className="flex justify-between text-slate-800">
                      <span>{qty}x {item?.name}</span>
                      <span className="font-mono">{formatCurrency((item?.unit_price ?? item?.price ?? 0) * qty)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
              <span>Estimated Total:</span>
              <span className="font-mono text-sky-800">{formatCurrency(calculateTotal())}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsOrderModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={totalItemCount === 0}
              isLoading={submitting}
            >
              Send to Kitchen
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CafeteriaMenuPage;
