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
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'card' | 'upi'
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
    if (existing) {
      if (existing.quantity >= product.current_stock) {
        showToast?.('Cannot exceed available inventory stock.', 'error');
        return;
      }
      setCart(
        cart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      if (product.current_stock < 1) {
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
            if (nextQty > item.product.current_stock) {
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
  const subtotal = cart.reduce(
    (acc, item) => acc + Number(item.product.price) * item.quantity,
    0
  );
  const taxTotal = cart.reduce(
    (acc, item) =>
      acc +
      Number(item.product.price) *
        item.quantity *
        ((Number(item.product.tax_rate) || 0) / 100),
    0
  );
  const total = subtotal + taxTotal;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);

    try {
      const payload = {
        order_type: 'shop',
        items: cart.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
      };
      if (selectedMemberId) payload.member_id = selectedMemberId;

      const orderRes = await shopService.createOrder(payload);
      setCheckoutSuccess(orderRes);
      setCart([]);
      setSelectedMemberId('');
      showToast?.('POS Order processed successfully!', 'success');
      loadCatalog();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to submit POS order.', 'error');
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
            <div className="p-12 text-center text-slate-400 text-xs">Loading merchandise...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs bg-white rounded-xl border border-slate-200">
              No products found in this category.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.current_stock <= 0;
                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-xl border p-4 flex flex-col justify-between transition-all ${
                      isOutOfStock ? 'opacity-60 border-slate-200' : 'border-slate-200 shadow-2xs hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 text-2xs">
                        <span className="font-mono text-slate-400">{p.sku}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-700'
                              : p.current_stock <= p.reorder_threshold
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isOutOfStock ? 'OUT' : `${p.current_stock} in stock`}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs mt-2 line-clamp-2">
                        {p.name}
                      </h4>
                      <p className="text-sm font-mono font-bold text-slate-900 mt-2">
                        {formatCurrency(p.price)}
                      </p>
                    </div>

                    <div className="mt-4 pt-2 border-t border-slate-100">
                      <Button
                        variant={isOutOfStock ? 'outline' : 'primary'}
                        size="sm"
                        disabled={isOutOfStock}
                        onClick={() => addToCart(p)}
                        className="w-full text-xs"
                      >
                        {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: POS Cart & Checkout Drawer */}
        <div>
          <Card title="Current POS Ticket" subtitle="Scan & itemized checkout">
            {/* Member Lookup for Discount */}
            <div className="mb-4 pb-3 border-b border-slate-100 text-xs">
              <label className="block font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" /> Apply Member Profile
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 bg-white"
              >
                <option value="">Walk-in Retail Customer</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.plan_name || 'Member'})
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center">
                <ShoppingBag className="w-8 h-8 text-slate-300 mb-2" />
                Ticket is empty. Click items on the left to add.
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto divide-y divide-slate-100 pr-1">
                {cart.map((item) => (
                  <div key={item.product.id} className="pt-2 flex items-center justify-between text-xs">
                    <div className="flex-1 pr-2">
                      <p className="font-semibold text-slate-900 line-clamp-1">
                        {item.product.name}
                      </p>
                      <p className="text-2xs text-slate-500 font-mono">
                        {formatCurrency(item.product.price)} each
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold text-slate-900 w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ticket Totals */}
            <div className="mt-4 pt-3 border-t border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Calculated GST Tax:</span>
                <span className="font-mono">{formatCurrency(taxTotal)}</span>
              </div>
              <div className="flex items-center justify-between font-bold text-base text-slate-900 pt-2 border-t border-slate-100">
                <span>Total Amount:</span>
                <span className="font-mono text-sky-900">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Complete Order Button */}
            <div className="mt-5">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                disabled={cart.length === 0}
                isLoading={submitting}
                onClick={handleCheckout}
              >
                Complete POS Sale ({formatCurrency(total)})
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ShopPosPage;
