import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit2,
  Trash2,
  Eye,
  Barcode,
  Layers,
  AlertTriangle,
  History,
  CheckCircle2,
  XCircle,
  FileText,
  Tag,
  Building2,
  MapPin
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product } from '../../types';
import { formatMoney, formatDate, formatDateTime, getMovementTypeBadge } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';

export const ProductsView: React.FC = () => {
  const {
    products,
    categories,
    suppliers,
    stockMovements,
    addProduct,
    updateProduct,
    deleteProduct,
    importProducts,
    settings,
    currentUser,
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Product Form state
  const [formData, setFormData] = useState({
    code: '',
    barcode: '',
    name: '',
    description: '',
    categoryId: '',
    brand: '',
    unit: 'pièce',
    purchasePrice: 0,
    salePrice: 0,
    currentStock: 0,
    minStock: 5,
    maxStock: 100,
    supplierId: '',
    location: '',
    active: true,
  });

  const showToast = (text: string, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return (products || []).filter((p) => {
      if (!p) return false;
      const name = (p.name || '').toLowerCase();
      const code = (p.code || '').toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();
      const brand = (p.brand || '').toLowerCase();
      const matchesSearch =
        name.includes(q) ||
        code.includes(q) ||
        barcode.includes(q) ||
        brand.includes(q);

      const matchesCategory = categoryFilter === 'all' || p.categoryId === categoryFilter;
      const matchesSupplier = supplierFilter === 'all' || p.supplierId === supplierFilter;

      let matchesStock = true;
      if (stockFilter === 'out') matchesStock = p.currentStock <= 0;
      if (stockFilter === 'low') matchesStock = p.currentStock > 0 && p.currentStock <= p.minStock;

      return matchesSearch && matchesCategory && matchesSupplier && matchesStock;
    });
  }, [products, searchTerm, categoryFilter, supplierFilter, stockFilter]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      code: `ART-${Math.floor(1000 + Math.random() * 9000)}`,
      barcode: `${Math.floor(600000000000 + Math.random() * 99999999999)}`,
      name: '',
      description: '',
      categoryId: categories[0]?.id || '',
      brand: '',
      unit: 'pièce',
      purchasePrice: 0,
      salePrice: 0,
      currentStock: 0,
      minStock: settings.lowStockThresholdDefault,
      maxStock: 100,
      supplierId: suppliers[0]?.id || '',
      location: '',
      active: true,
    });
    setShowProductModal(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      code: p.code,
      barcode: p.barcode,
      name: p.name,
      description: p.description,
      categoryId: p.categoryId,
      brand: p.brand,
      unit: p.unit,
      purchasePrice: p.purchasePrice,
      salePrice: p.salePrice,
      currentStock: p.currentStock,
      minStock: p.minStock,
      maxStock: p.maxStock,
      supplierId: p.supplierId || '',
      location: p.location || '',
      active: p.active,
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        ...formData,
        purchasePrice: Number(formData.purchasePrice),
        salePrice: Number(formData.salePrice),
        currentStock: Number(formData.currentStock),
        minStock: Number(formData.minStock),
        maxStock: Number(formData.maxStock),
      });
      showToast(`Produit "${formData.name}" mis à jour avec succès.`);
    } else {
      addProduct({
        ...formData,
        purchasePrice: Number(formData.purchasePrice),
        salePrice: Number(formData.salePrice),
        currentStock: Number(formData.currentStock),
        minStock: Number(formData.minStock),
        maxStock: Number(formData.maxStock),
      });
      showToast(`Produit "${formData.name}" ajouté avec succès.`);
    }
    setShowProductModal(false);
  };

  const handleConfirmDelete = () => {
    if (!productToDelete) return;
    const res = deleteProduct(productToDelete.id);
    if (res.success) {
      showToast(`Produit supprimé du catalogue.`);
    } else {
      showToast(res.message || 'Impossible de supprimer ce produit.', true);
    }
    setShowDeleteModal(false);
    setProductToDelete(null);
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Code', 'Code-barres', 'Nom', 'Catégorie', 'Prix Achat', 'Prix Vente', 'Stock', 'Seuil Min', 'Emplacement'];
    const rows = (products || []).map(p => {
      const cat = (categories || []).find(c => c.id === p.categoryId)?.name || '';
      return [
        `"${p.code}"`,
        `"${p.barcode}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${cat}"`,
        p.purchasePrice,
        p.salePrice,
        p.currentStock,
        p.minStock,
        `"${p.location || ''}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `catalogue_produits_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isVendeur = currentUser.role === 'VENDEUR';

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-16 right-4 z-50 p-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-4 ${
            toastMessage.isError
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {toastMessage.isError ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            Gestion des Produits ({products.length})
          </h1>
          <p className="text-xs text-slate-500">
            Catalogue complet, prix d'achat, prix de vente, codes-barres et stocks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter CSV
          </button>
          {!isVendeur && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Nouveau Produit
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Recherche par nom, code, code-barres..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Supplier Filter */}
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="all">Tous les fournisseurs</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.companyName}
              </option>
            ))}
          </select>

          {/* Stock Level Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStockFilter('all')}
              className={`flex-1 py-1 text-center rounded-lg text-xs font-semibold transition-all ${
                stockFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`flex-1 py-1 text-center rounded-lg text-xs font-semibold transition-all ${
                stockFilter === 'low' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              Faible
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className={`flex-1 py-1 text-center rounded-lg text-xs font-semibold transition-all ${
                stockFilter === 'out' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              Rupture
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Code & Article</th>
                <th className="p-3.5">Catégorie</th>
                {!isVendeur && <th className="p-3.5 text-right">Prix Achat</th>}
                <th className="p-3.5 text-right">Prix Vente</th>
                {!isVendeur && <th className="p-3.5 text-right">Marge</th>}
                <th className="p-3.5 text-center">Stock</th>
                <th className="p-3.5">Emplacement</th>
                <th className="p-3.5">Statut</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const cat = (categories || []).find((c) => c.id === product.categoryId);
                  const margin = product.salePrice - product.purchasePrice;
                  const marginPercent =
                    product.salePrice > 0
                      ? Math.round((margin / product.salePrice) * 100)
                      : 0;
                  const isOutOfStock = product.currentStock <= 0;
                  const isLowStock =
                    product.currentStock <= product.minStock && !isOutOfStock;

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Code & Article */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[10px] text-slate-400 font-semibold">
                            {product.code} • {product.barcode}
                          </span>
                          <p className="font-bold text-slate-900 text-xs">{product.name}</p>
                          {product.brand && (
                            <span className="text-[10px] text-slate-500">Marque: {product.brand}</span>
                          )}
                        </div>
                      </td>

                      {/* Catégorie */}
                      <td className="p-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {cat?.name || 'Général'}
                        </span>
                      </td>

                      {/* Prix Achat */}
                      {!isVendeur && (
                        <td className="p-3.5 text-right font-medium text-slate-600">
                          {formatMoney(product.purchasePrice, settings.currency)}
                        </td>
                      )}

                      {/* Prix Vente */}
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        {formatMoney(product.salePrice, settings.currency)}
                      </td>

                      {/* Marge */}
                      {!isVendeur && (
                        <td className="p-3.5 text-right">
                          <span className="font-semibold text-emerald-600">
                            +{formatMoney(margin, '')} ({marginPercent}%)
                          </span>
                        </td>
                      )}

                      {/* Stock */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-700'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isOutOfStock && '🔴 0'}
                          {isLowStock && `⚠️ ${product.currentStock}`}
                          {!isOutOfStock && !isLowStock && `🟢 ${product.currentStock}`} {product.unit}s
                        </span>
                      </td>

                      {/* Emplacement */}
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {product.location || '—'}
                      </td>

                      {/* Statut */}
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            product.active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {product.active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedProductForHistory(product);
                              setShowHistoryModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg"
                            title="Historique des mouvements"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          {!isVendeur && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(product)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg"
                                title="Modifier"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setProductToDelete(product);
                                  setShowDeleteModal(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                    Aucun produit trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in"
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingProduct ? 'Modifier le Produit' : 'Nouveau Produit'}
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Code Produit *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Code-barres (EAN)</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Unité de mesure</label>
                  <input
                    type="text"
                    placeholder="pièce, kg, m, paquet, sac, rouleau..."
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['pièce', 'kg', 'mètre', 'sac', 'paquet', 'litre', 'rouleau', 'boîte', 'paire', 'flacon'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setFormData({ ...formData, unit: u })}
                        className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                          formData.unit === u
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nom du Produit *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Riz Parfumé 5kg"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Marque / Fabricant</label>
                  <input
                    type="text"
                    placeholder="Ex: Royal Taste"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Catégorie</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Fournisseur Principal</label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">Aucun fournisseur assigné</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing section */}
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Prix d'Achat ({settings.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-indigo-900 block mb-1">
                    Prix de Vente ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.salePrice}
                    onChange={(e) => setFormData({ ...formData, salePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg font-black text-indigo-700"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <span className="text-[11px] text-slate-500">Marge brute calculée :</span>
                  <span className="text-xs font-bold text-emerald-600 mt-1">
                    +{formatMoney(formData.salePrice - formData.purchasePrice, settings.currency)}
                  </span>
                </div>
              </div>

              {/* Stock controls */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Stock Actuel</label>
                  <input
                    type="number"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Stock Minimum (Alerte)</label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Stock Maximum</label>
                  <input
                    type="number"
                    value={formData.maxStock}
                    onChange={(e) => setFormData({ ...formData, maxStock: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Emplacement / Rayon</label>
                  <input
                    type="text"
                    placeholder="Rayon A - Étagère 2"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Détails du produit..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="prod_active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="prod_active" className="font-semibold text-slate-700">
                  Produit actif (visible en caisse POS)
                </label>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                {editingProduct ? 'Enregistrer les Modifications' : 'Créer le Produit'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PRODUCT HISTORY MODAL */}
      {showHistoryModal && selectedProductForHistory && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">
                  Historique de Stock : {selectedProductForHistory.name}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Code: {selectedProductForHistory.code} | Stock Actuel: {selectedProductForHistory.currentStock} {selectedProductForHistory.unit}s
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                {stockMovements.filter((m) => m.productId === selectedProductForHistory.id).length > 0 ? (
                  stockMovements
                    .filter((m) => m.productId === selectedProductForHistory.id)
                    .map((mov) => {
                      const badge = getMovementTypeBadge(mov.type);
                      return (
                        <div
                          key={mov.id}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}>
                                {badge.label}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                {formatDateTime(mov.date)}
                              </span>
                            </div>
                            <p className="text-slate-800 font-medium">{mov.reason}</p>
                            <p className="text-[10px] text-slate-400">Par: {mov.userName}</p>
                          </div>

                          <div className="text-right">
                            <span
                              className={`text-sm font-black ${
                                mov.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity} {selectedProductForHistory.unit}s
                            </span>
                            <p className="text-[10px] text-slate-500">
                              {mov.previousStock} → <strong>{mov.newStock}</strong>
                            </p>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <p className="text-center text-slate-400 text-xs py-6">
                    Aucun mouvement de stock enregistré pour cet article.
                  </p>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Supprimer le produit"
        message={`Êtes-vous sûr de vouloir supprimer "${productToDelete?.name}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer définitivement"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
};
