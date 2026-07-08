import React, { useState } from 'react';
import { AppState, Product, Category } from '../types';
import { Plus, Edit, FolderPlus, Trash, Search, Tag, DollarSign, Percent, Box } from 'lucide-react';
import { formatCurrency, getBusinessConfig, getThemePalette } from '../utils/storage';

interface ProductsViewProps {
  state: AppState;
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onEditProduct: (product: Product) => void;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
}

export default function ProductsView({ state, onAddProduct, onEditProduct, onAddCategory }: ProductsViewProps) {
  const company = state.settings.company;
  const themePalette = getThemePalette(company);
  const bizConfig = getBusinessConfig(company);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states for Product
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodCat, setProdCat] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodHsn, setProdHsn] = useState('');
  const [prodGst, setProdGst] = useState(18);
  const [prodSales, setProdSales] = useState(0);
  const [prodPurch, setProdPurch] = useState(0);
  const [prodMinStock, setProdMinStock] = useState(5);
  const [prodInitStock, setProdInitStock] = useState(10);

  // Form states for Category
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const handleOpenProductModal = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setProdName(product.name || '');
      setProdSku(product.sku || '');
      setProdCat(product.categoryId || '');
      setProdDesc(product.description || '');
      setProdHsn(product.hsnCode || '');
      setProdGst(product.gstRate ?? 18);
      setProdSales(product.salesPrice ?? 0);
      setProdPurch(product.purchasePrice ?? 0);
      setProdMinStock(product.minStockAlert ?? 5);
      setProdInitStock(product.initialStock ?? 10);
    } else {
      setEditingProduct(null);
      setProdName('');
      setProdSku('');
      setProdCat(state.categories[0]?.id || '');
      setProdDesc('');
      setProdHsn('');
      setProdGst(18);
      setProdSales(0);
      setProdPurch(0);
      setProdMinStock(5);
      setProdInitStock(10);
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodSku.trim() || !prodCat) return;

    const productPayload = {
      name: prodName,
      sku: prodSku,
      categoryId: prodCat,
      description: prodDesc,
      hsnCode: prodHsn,
      gstRate: Number(prodGst),
      salesPrice: Number(prodSales),
      purchasePrice: Number(prodPurch),
      minStockAlert: Number(prodMinStock),
      initialStock: Number(prodInitStock)
    };

    if (editingProduct) {
      onEditProduct({ ...productPayload, id: editingProduct.id });
    } else {
      onAddProduct(productPayload);
    }
    setIsProductModalOpen(false);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    onAddCategory({
      name: catName,
      description: catDesc
    });

    setCatName('');
    setCatDesc('');
    setIsCategoryModalOpen(false);
  };

  const filteredProducts = state.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.hsnCode.includes(searchTerm);
    const matchesCategory = categoryFilter === 'all' || p.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header and Add Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{bizConfig.productsLabelPlural} & Categories</h1>
          <p className="text-sm text-slate-500">{bizConfig.description}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            id="btn-add-category"
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-lg border border-slate-200 transition-colors"
          >
            <FolderPlus className="h-4 w-4" />
            Add Category
          </button>
          <button 
            onClick={() => handleOpenProductModal(null)}
            id="btn-add-product"
            className={`flex items-center gap-1.5 ${themePalette.bg} ${themePalette.hoverBg} text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow transition-all`}
          >
            <Plus className="h-4 w-4" />
            Add {bizConfig.productLabel}
          </button>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Name, SKU, or HSN Code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Filter Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="all">All Categories</option>
            {state.categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">SKU / Item</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Category</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">HSN Code</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">GST Rate</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Purchase Price</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Sales Price</th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Min Alert</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400 text-sm">
                    No products match your search. Add some new inventory to start.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const categoryName = state.categories.find(c => c.id === p.categoryId)?.name || 'Default';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">{p.name}</div>
                          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                            {p.sku}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {categoryName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500">
                        {p.hsnCode || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${themePalette.lightBg} ${themePalette.text} border ${themePalette.border}`}>
                          {p.gstRate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-slate-600">
                        {formatCurrency(p.purchasePrice, company)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-slate-900">
                        {formatCurrency(p.salesPrice, company)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-semibold text-amber-600">
                        {p.minStockAlert}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button 
                          onClick={() => handleOpenProductModal(p)}
                          className={`${themePalette.text} hover:opacity-80 font-semibold inline-flex items-center gap-1 mr-2`}
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Add/Edit Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. HP ProBook Laptop"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">SKU / Code *</label>
                  <input
                    type="text"
                    required
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. HP-PRO-BK"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Category *</label>
                  <select
                    value={prodCat}
                    onChange={(e) => setProdCat(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {state.categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">HSN Code</label>
                  <input
                    type="text"
                    value={prodHsn}
                    onChange={(e) => setProdHsn(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. 84713010"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">GST Rate (%) *</label>
                  <select
                    value={prodGst}
                    onChange={(e) => setProdGst(Number(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Purchase Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={prodPurch}
                    onChange={(e) => setProdPurch(Number(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Sales Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={prodSales}
                    onChange={(e) => setProdSales(Number(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Min Stock Alert Level</label>
                  <input
                    type="number"
                    min={0}
                    value={prodMinStock}
                    onChange={(e) => setProdMinStock(Number(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Opening / Initial Stock</label>
                  <input
                    type="number"
                    min={0}
                    disabled={!!editingProduct}
                    value={prodInitStock}
                    onChange={(e) => setProdInitStock(Number(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 disabled:text-slate-400"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Description / Notes</label>
                  <textarea
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Provide optional notes or specifications..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-product"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Add New Category</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">Category Name *</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Peripheral hardware"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">Description</label>
                <textarea
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Printer inks, toner cartridges and papers"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-category"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
