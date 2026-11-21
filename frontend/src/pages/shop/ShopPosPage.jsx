import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, Plus, Minus, Trash2, CheckCircle2, User, CreditCard } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import shopService from '../../services/shopService';
import memberService from '../../services/memberService';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils/formatters';

export const ShopPosPage = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);

  // Cart State: [{ product, quantity }]
  const [cart, setCart] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [customerType, setCustomerType] = useState('walk_in'); // 'walk_in' | 'member'
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(null);

  const { showToast } = useToast();

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, prods, mems] = await Promise.all([
        shopService.getCategories(),
        shopService.getProducts({ is_active: true }),
        memberService.getMembers({ status: 'active' }),
      ]);
      setCategories(cats || []);
      setProducts(prods || []);
      setMembers(mems || []);
    } catch (err) {
      showToast?.('Failed to load shop products.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory)
    : products;

  const addToCart = (product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    const availableStock = product.current_stock ?? 0;
    if (existing) {
      if (product.inventory_tracked && existing.quantity >= availableStock) {
        showToast?.('Cannot exceed available inventory stock.', 'error');
        return;
      }
      setCart(
        cart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      if (product.inventory_tracked && availableStock < 1) {
        showToast?.('Item is currently out of stock.', 'error');
        return;
      }
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            const availableStock = item.product.current_stock ?? 0;
            if (item.product.inventory_tracked && nextQty > availableStock) {
              showToast?.('Cannot exceed available inventory stock.', 'error');
              return item;
            }
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  // Calculations
  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const memberDiscountPct = customerType === 'member' && selectedMember?.plan?.shop_discount_percent
    ? Number(selectedMember.plan.shop_discount_percent)
    : 0;

  const subtotal = cart.reduce(
    (acc, item) => acc + Number(item.product.unit_price ?? item.product.price ?? 0) * item.quantity,
    0
  );

  const discountAmount = cart.reduce((acc, item) => {
    if (item.product.discount_eligible && memberDiscountPct > 0) {
      const price = Number(item.product.unit_price ?? item.product.price ?? 0);
      return acc + (price * item.quantity * (memberDiscountPct / 100));
    }
    return acc;
  }, 0);

  const totalEstimate = Math.max(0, subtotal - discountAmount);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (customerType === 'member' && !selectedMemberId) {
      showToast?.('Please select a club member or switch to walk-in.', 'error');
      return;
    }
    setSubmitting(true);

    try {
      // Backend OrderCreate schema
      const payload = {
        customer_type: customerType,
        items: cart.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
      };

      if (customerType === 'member') {
        payload.member_id = selectedMemberId;
      } else {
        if (walkInName) payload.walk_in_name = walkInName;
        if (walkInPhone) payload.walk_in_phone = walkInPhone;
      }

      const orderRes = await shopService.createOrder(payload);
      // Auto-confirm POS order
      if (orderRes?.id) {
        try {
          await shopService.confirmOrder(orderRes.id);
        } catch (e) {
          // ignore if already confirmed
        }
      }

      setCheckoutSuccess(orderRes);
      setCart([]);
      setSelectedMemberId('');
      setWalkInName('');
      setWalkInPhone('');
      showToast?.('POS Order processed and confirmed successfully!', 'success');
      loadCatalog();
    } catch (err) {
      showToast?.(err.response?.data?.detail || err.message || 'Failed to submit POS order.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Pro-Shop POS Counter"
        subtitle="Point-of-sale checkout, member discount integration, and real-time stock deduction."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Shop POS' }]}
      />

      {/* POS Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Catalog & Categories */}
        <div className="lg:col-span-2 space-y-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                selectedCategory === ''
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Items ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Loading shop merchandise...</div>
          ) : filteredProducts.length === 0 ? (
            <Card className="text-center py-12 text-slate-500 text-xs">
              <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>No products available in this category.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {filteredProducts.map((p) => {
                const stock = p.current_stock ?? 0;
                const isOutOfStock = p.inventory_tracked && stock < 1;

                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => addToCart(p)}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer bg-white ${
                      isOutOfStock
                        ? 'opacity-50 border-slate-200 cursor-not-allowed'
                        : 'border-slate-200 hover:border-sky-500 hover:shadow-2xs active:scale-[0.98]'
                    }`}
                  >
                    <div>
                      <span className="text-3xs font-mono font-semibold text-slate-400">{p.sku || 'ITEM'}</span>
                      <h4 className="font-bold text-slate-900 text-xs line-clamp-1 mt-0.5">{p.name}</h4>
                      <p className="text-3xs text-slate-400 mt-0.5">{p.category?.name || 'Shop'}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-baseline justify-between w-full">
                      <span className="font-bold text-slate-900 text-sm">
                        {formatCurrency(p.unit_price ?? p.price ?? 0)}
                      </span>
                      <span className={`text-3xs font-mono font-semibold px-1.5 py-0.2 rounded ${
                        isOutOfStock ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {p.inventory_tracked ? `${stock} left` : 'In Stock'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: POS Terminal Register / Cart */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-sky-600" /> Current Sale Ticket
              </h3>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-3xs text-rose-600 hover:underline cursor-pointer"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Customer Type Selector */}
            <div className="mt-3.5 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setCustomerType('walk_in')}
                  className={`py-1 rounded font-medium text-center cursor-pointer ${
                    customerType === 'walk_in' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600'
                  }`}
                >
                  Walk-In Guest
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
                  <label className="text-3xs font-semibold text-slate-500 block mb-1">Select Member Account</label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 bg-white"
                  >
                    <option value="">-- Choose Member --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.plan?.name || 'Member'} • {m.plan?.shop_discount_percent || 0}% Disc)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    placeholder="Guest Name (Optional)"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900"
                  />
                  <input
                    type="tel"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    placeholder="Phone (Optional)"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              )}
            </div>

            {/* Cart Items */}
            <div className="mt-4 max-h-[260px] overflow-y-auto divide-y divide-slate-100">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  Ticket is empty. Tap products to add items.
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-semibold text-slate-900 truncate">{item.product.name}</p>
                      <p className="text-3xs text-slate-400 font-mono">
                        {formatCurrency(item.product.unit_price ?? item.product.price ?? 0)} each
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-200 rounded-md bg-slate-50">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="px-2 py-0.5 text-slate-600 hover:text-slate-900"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-mono font-bold text-slate-900 text-xs">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="px-2 py-0.5 text-slate-600 hover:text-slate-900"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Order Totals Summary */}
            <div className="mt-4 pt-3 border-t border-slate-200 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Member Discount ({memberDiscountPct}%)</span>
                  <span className="font-mono">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                <span>Estimated Total</span>
                <span className="font-mono text-sky-800">{formatCurrency(totalEstimate)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <div className="mt-5">
              <Button
                variant="primary"
                size="md"
                className="w-full justify-center"
                disabled={cart.length === 0}
                onClick={handleCheckout}
                isLoading={submitting}
              >
                Complete POS Sale ({formatCurrency(totalEstimate)})
              </Button>
              <p className="mt-1.5 text-center text-3xs text-slate-400">
                Creates an order and synchronizes stock immediately.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ShopPosPage;
