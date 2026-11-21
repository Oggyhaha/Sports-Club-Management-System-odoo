import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, Plus, RefreshCw, FolderPlus, Edit3, Lock } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import shopService from '../../services/shopService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ROLES } from '../../config/constants';
import { formatCurrency } from '../../utils/formatters';

export const ShopProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Product Modal State
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitPrice, setUnitPrice] = useState('500.00');
  const [taxRate, setTaxRate] = useState('18.0');
  const [initialStock, setInitialStock] = useState(20);
  const [reorderThreshold, setReorderThreshold] = useState(5);
  const [discountEligible, setDiscountEligible] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [submittingProd, setSubmittingProd] = useState(false);
  const [prodError, setProdError] = useState('');

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [submittingCat, setSubmittingCat] = useState(false);
  const [catError, setCatError] = useState('');

  const { roles } = useAuth();
  const { showToast } = useToast();
  const isOwner = roles.includes(ROLES.OWNER);
  const isShopStaff = roles.includes(ROLES.SHOP_STAFF);
  const canManage = isOwner || isShopStaff;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodsData, catsData] = await Promise.all([
        shopService.getProducts(),
        shopService.getCategories(),
      ]);
      setProducts(prodsData || []);
      setCategories(catsData || []);
    } catch (err) {
      showToast?.('Failed to load product catalog.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateProduct = () => {
    setEditingProduct(null);
    setName('');
    setSku('');
    setCategoryId(categories[0]?.id || '');
    setUnitPrice('500.00');
    setTaxRate('18.0');
    setInitialStock(20);
    setReorderThreshold(5);
    setDiscountEligible(true);
    setIsActive(true);
    setProdError('');
    setIsProdModalOpen(true);
  };

  const openEditProduct = (prod) => {
    setEditingProduct(prod);
    setName(prod.name);
    setSku(prod.sku || '');
    setCategoryId(prod.category_id || (categories[0]?.id ?? ''));
    setUnitPrice(String(prod.unit_price ?? prod.price ?? '0.00'));
    setTaxRate(String(prod.tax_rate ?? '0.00'));
    setReorderThreshold(prod.reorder_threshold ?? 5);
    setDiscountEligible(prod.discount_eligible ?? true);
    setIsActive(prod.is_active);
    setProdError('');
    setIsProdModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!name || !sku || !categoryId) {
      setProdError('Product name, SKU, and category are required.');
      return;
    }
    setSubmittingProd(true);
    setProdError('');

    try {
      if (editingProduct) {
        // ProductUpdate schema
        // Field-level authorization: unit_price and tax_rate are strictly owner-only
        const updatePayload = {
          name,
          sku: sku.toUpperCase().trim(),
          category_id: categoryId,
          reorder_threshold: Number(reorderThreshold),
          discount_eligible: discountEligible,
          is_active: isActive,
        };

        if (isOwner) {
          updatePayload.unit_price = unitPrice;
          updatePayload.tax_rate = taxRate;
        }

        await shopService.updateProduct(editingProduct.id, updatePayload);
        showToast?.('Product details updated successfully!', 'success');
      } else {
        // ProductCreate schema
        const createPayload = {
          name,
          sku: sku.toUpperCase().trim(),
          category_id: categoryId,
          unit_price: unitPrice,
          tax_rate: taxRate,
          initial_stock: Number(initialStock),
          reorder_threshold: Number(reorderThreshold),
          discount_eligible: discountEligible,
          is_active: isActive,
          module_type: 'shop',
        };

        await shopService.createProduct(createPayload);
        showToast?.('Product registered into shop catalog!', 'success');
      }
      setIsProdModalOpen(false);
      loadData();
    } catch (err) {
      setProdError(err.response?.data?.detail || err.message || 'Failed to save product.');
    } finally {
      setSubmittingProd(false);
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catName) {
      setCatError('Category name is required.');
      return;
    }
    setSubmittingCat(true);
    setCatError('');

    try {
      await shopService.createCategory({
        name: catName,
        description: catDesc || undefined,
        module_type: 'shop',
      });
      showToast?.('New merchandise category created!', 'success');
      setIsCatModalOpen(false);
      setCatName('');
      setCatDesc('');
      loadData();
    } catch (err) {
      setCatError(err.response?.data?.detail || err.message || 'Failed to create category.');
    } finally {
      setSubmittingCat(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Pro-Shop Catalog & Merchandise"
        subtitle="Apparel, rackets, equipment, merchandise categories, and pricing management."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Shop Products' }]}
        actions={
          canManage && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCatName('');
                  setCatDesc('');
                  setCatError('');
                  setIsCatModalOpen(true);
                }}
                leftIcon={FolderPlus}
              >
                New Category
              </Button>
              <Button variant="primary" size="sm" onClick={openCreateProduct} leftIcon={Plus}>
                Add Product
              </Button>
            </div>
          )
        }
      />

      <div className="flex items-center justify-between text-xs text-slate-500">
        <p>Products are categorized for the POS counter. Product pricing and tax rates are owner-governed.</p>
        <Button variant="outline" size="sm" onClick={loadData} isLoading={loading} leftIcon={RefreshCw}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading merchandise catalog...</div>
      ) : products.length === 0 ? (
        <Card className="text-center py-12 text-slate-500 text-xs">
          <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p>No products found in the catalog.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p) => {
            const stock = p.current_stock ?? 0;
            const isLowStock = stock <= (p.reorder_threshold ?? 5);

            return (
              <Card key={p.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-3xs font-mono font-semibold text-slate-400">SKU: {p.sku || 'N/A'}</span>
                      <h3 className="font-bold text-slate-900 text-sm mt-0.5">{p.name}</h3>
                      <p className="text-3xs text-slate-500">{p.category?.name || 'Uncategorized'}</p>
                    </div>
                    <StatusBadge status={p.is_active ? 'active' : 'inactive'} />
                  </div>

                  <div className="mt-4 pb-3 border-b border-slate-100 flex items-baseline justify-between">
                    <div>
                      <span className="text-lg font-bold text-slate-900">
                        {formatCurrency(p.unit_price ?? p.price ?? 0)}
                      </span>
                      <span className="text-3xs text-slate-400 ml-1">+{p.tax_rate ?? 0}% GST</span>
                    </div>
                    <span className={`text-2xs font-mono font-semibold px-2 py-0.5 rounded ${
                      stock === 0
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : isLowStock
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {stock} in stock
                    </span>
                  </div>

                  <div className="mt-2 text-3xs text-slate-400 flex items-center justify-between">
                    <span>Reorder at: {p.reorder_threshold ?? 5} units</span>
                    <span>{p.discount_eligible ? 'Member Discount Eligible' : 'Standard Price'}</span>
                  </div>
                </div>

                {canManage && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => openEditProduct(p)} leftIcon={Edit3}>
                      Edit Product
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Product Modal */}
      <Modal
        isOpen={isProdModalOpen}
        onClose={() => setIsProdModalOpen(false)}
        title={editingProduct ? 'Edit Product Details' : 'Register New Product'}
        subtitle={
          editingProduct && !isOwner
            ? 'Staff notice: Product pricing and tax rates are restricted to Club Owners.'
            : 'Configure merchandise details and inventory parameters'
        }
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
          {prodError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-medium">
              {prodError}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Product Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Yonex Nanoflare 800 Racket"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">SKU Code *</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. RACKET-YON-800"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-slate-700">Unit Price (INR) *</label>
                {editingProduct && !isOwner && (
                  <span className="flex items-center gap-0.5 text-3xs text-amber-700 font-semibold">
                    <Lock className="w-2.5 h-2.5" /> Owner Only
                  </span>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                disabled={editingProduct && !isOwner}
                className={`w-full px-3 py-2 border rounded-lg font-mono ${
                  editingProduct && !isOwner
                    ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-slate-900 border-slate-300'
                }`}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-slate-700">GST Tax Rate (%) *</label>
                {editingProduct && !isOwner && (
                  <span className="flex items-center gap-0.5 text-3xs text-amber-700 font-semibold">
                    <Lock className="w-2.5 h-2.5" /> Owner Only
                  </span>
                )}
              </div>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                disabled={editingProduct && !isOwner}
                className={`w-full px-3 py-2 border rounded-lg font-mono ${
                  editingProduct && !isOwner
                    ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-slate-900 border-slate-300'
                }`}
                required
              />
            </div>
          </div>

          {!editingProduct ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Initial Stock Count *</label>
                <input
                  type="number"
                  min="0"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Low-Stock Alert Threshold *</label>
                <input
                  type="number"
                  min="0"
                  value={reorderThreshold}
                  onChange={(e) => setReorderThreshold(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  required
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block font-medium text-slate-700 mb-1">Low-Stock Alert Threshold</label>
              <input
                type="number"
                min="0"
                value={reorderThreshold}
                onChange={(e) => setReorderThreshold(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                required
              />
              <p className="mt-1 text-3xs text-slate-400">
                Stock changes are disabled here. To adjust stock levels, use the dedicated Inventory Management tab.
              </p>
            </div>
          )}

          <div className="flex items-center gap-4 pt-1">
            <div className="flex items-center gap-1.5">
              <input
                type="checkbox"
                id="discountEligible"
                checked={discountEligible}
                onChange={(e) => setDiscountEligible(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <label htmlFor="discountEligible" className="text-slate-700 font-medium cursor-pointer">
                Member Discount Eligible
              </label>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="checkbox"
                id="isProdActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <label htmlFor="isProdActive" className="text-slate-700 font-medium cursor-pointer">
                Active for POS Sales
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsProdModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submittingProd}>
              {editingProduct ? 'Save Changes' : 'Register Product'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Category Modal */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title="Add Merchandise Category"
        subtitle="Create a new catalog category for shop inventory"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
          {catError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-medium">
              {catError}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Category Name *</label>
            <input
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="e.g. Footwear, Rackets, Grip Tape"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Description (Optional)</label>
            <textarea
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              placeholder="Merchandise group notes..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsCatModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submittingCat}>
              Create Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ShopProductsPage;
