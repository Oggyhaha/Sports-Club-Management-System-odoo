import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, Plus, RefreshCw, FolderPlus } from 'lucide-react';
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
  const [price, setPrice] = useState('500.00');
  const [taxRate, setTaxRate] = useState('18.0');
  const [initialStock, setInitialStock] = useState(20);
  const [reorderThreshold, setReorderThreshold] = useState(5);
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
  const canManage = roles.includes(ROLES.OWNER) || roles.includes(ROLES.SHOP_STAFF);

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
    setPrice('500.00');
    setTaxRate('18.0');
    setInitialStock(20);
    setReorderThreshold(5);
    setIsActive(true);
    setProdError('');
    setIsProdModalOpen(true);
  };

  const openEditProduct = (prod) => {
    setEditingProduct(prod);
    setName(prod.name);
    setSku(prod.sku);
    setCategoryId(prod.category_id || (categories[0]?.id ?? ''));
    setPrice(String(prod.price));
    setTaxRate(String(prod.tax_rate));
    setReorderThreshold(prod.reorder_threshold);
    setIsActive(prod.is_active);
    setProdError('');
    setIsProdModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!name || !sku || !categoryId) {
      setProdError('Name, SKU, and category are required.');
      return;
    }
    setSubmittingProd(true);
    setProdError('');

    try {
      const payload = {
        name,
        sku: sku.toUpperCase().trim(),
        category_id: categoryId,
        price,
        tax_rate: taxRate,
        reorder_threshold: Number(reorderThreshold),
        is_active: isActive,
      };

      if (editingProduct) {
        await shopService.updateProduct(editingProduct.id, payload);
        showToast?.('Product updated successfully!', 'success');
      } else {
        payload.initial_stock = Number(initialStock);
        payload.module_type = 'shop';
        await shopService.createProduct(payload);
        showToast?.('Product published to shop catalog!', 'success');
      }
      setIsProdModalOpen(false);
      loadData();
    } catch (err) {
      setProdError(err.response?.data?.detail || 'Failed to save product.');
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
        description: catDesc,
        module_type: 'shop',
      });
      showToast?.('New merchandise category created!', 'success');
      setIsCatModalOpen(false);
      setCatName('');
      setCatDesc('');
      loadData();
    } catch (err) {
      setCatError(err.response?.data?.detail || 'Failed to create category.');
    } finally {
      setSubmittingCat(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Merchandise & Product Catalog"
        subtitle="Manage retail inventory specifications, SKUs, tax percentages, and stock reorder triggers."
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
                New Product
              </Button>
            </div>
          )
        }
      />

      <Card noPadding>
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading product catalog...</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No products defined in catalog. Click "New Product" to register merchandise.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Item Name</th>
                  <th className="py-2.5 px-4">SKU</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 text-right">Retail Price</th>
                  <th className="py-2.5 px-4 text-right">GST Tax</th>
                  <th className="py-2.5 px-4 text-right">In Stock</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-semibold text-slate-900">{p.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-2xs">{p.sku}</td>
                    <td className="py-3 px-4 text-slate-600 capitalize">
                      {p.category?.name || 'General'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(p.price)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {p.tax_rate}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      {p.current_stock}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={p.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {canManage && (
                        <Button variant="outline" size="sm" onClick={() => openEditProduct(p)}>
                          Edit
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

      {/* Product Modal */}
      <Modal
        isOpen={isProdModalOpen}
        onClose={() => setIsProdModalOpen(false)}
        title={editingProduct ? 'Edit Merchandise Product' : 'Register New Merchandise'}
        subtitle="Manage product specifications and inventory parameters"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
          {prodError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">
              {prodError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Product Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Yonex Pro Racket"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Unique SKU *</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. YON-RACK-01"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                required
              />
            </div>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Retail Price (INR) *</label>
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">GST Tax Rate % *</label>
              <input
                type="text"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {!editingProduct && (
              <div>
                <label className="block font-medium text-slate-700 mb-1">Initial Opening Stock *</label>
                <input
                  type="number"
                  min="0"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>
            )}
            <div>
              <label className="block font-medium text-slate-700 mb-1">Reorder Threshold *</label>
              <input
                type="number"
                min="1"
                value={reorderThreshold}
                onChange={(e) => setReorderThreshold(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="prod-is-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <label htmlFor="prod-is-active" className="text-slate-700 font-medium cursor-pointer">
              Product is active and visible at POS counter
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsProdModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submittingProd}>
              {editingProduct ? 'Update Product' : 'Save Product'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Category Modal */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title="Create Merchandise Category"
        subtitle="Group products into organized shop categories"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
          {catError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">
              {catError}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Category Title *</label>
            <input
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="e.g. Rackets & Grips"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              placeholder="Badminton and tennis equipment."
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
