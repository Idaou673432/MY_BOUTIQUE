import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Search,
  Check,
  Printer,
  AlertTriangle,
  Edit3,
  User,
  Banknote,
  Smartphone,
  CreditCard,
  Building,
  Clock,
  Package,
  PackagePlus,
  CheckCircle2,
  Boxes,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Sale, SaleItem, PaymentMethod, Product } from '../../types';
import { useStore } from '../../context/StoreContext';
import { formatMoney, formatDateTime } from '../../utils/formatters';

interface EditSaleModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updatedSale: Sale, shouldPrint?: boolean) => void;
}

const PRODUCT_UNITS = ['pièce', 'kg', 'g', 'litre', 'mètre', 'paquet', 'boîte', 'sac', 'carton', 'bidon', 'bouteille'];

export const EditSaleModal: React.FC<EditSaleModalProps> = ({
  sale,
  isOpen,
  onClose,
  onSaved,
}) => {
  const { products, categories, customers, settings, updateSale, addProduct } = useStore();

  const [items, setItems] = useState<SaleItem[]>([]);
  const [customerId, setCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ESPECES');
  const [amountReceived, setAmountReceived] = useState<string>('0');
  const [remainingDebtInput, setRemainingDebtInput] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('Correction après erreur de saisie');

  // Stock browser states
  const [productSearch, setProductSearch] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [showStockBrowser, setShowStockBrowser] = useState<boolean>(true);

  // Create new product in stock + add to invoice
  const [showNewStockProductForm, setShowNewStockProductForm] = useState<boolean>(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategoryId, setNewProdCategoryId] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('pièce');
  const [newProdPurchasePrice, setNewProdPurchasePrice] = useState('');
  const [newProdSalePrice, setNewProdSalePrice] = useState('');
  const [newProdInitialStock, setNewProdInitialStock] = useState('10');
  const [newProdInvoiceQty, setNewProdInvoiceQty] = useState('1');

  // Ad-hoc custom item (off-catalog)
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customQty, setCustomQty] = useState('1');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && sale) {
      setItems((sale.items || []).map(it => ({ ...it })));
      setCustomerId(sale.customerId || '');
      setPaymentMethod(sale.paymentMethod);
      setAmountReceived(String(sale.amountReceived ?? sale.totalAmount));
      setRemainingDebtInput(String(sale.remainingDue ?? 0));
      setNotes(sale.notes || '');
      setCorrectionReason('Correction après erreur de saisie');
      setProductSearch('');
      setSelectedCategoryId('all');
      setShowStockBrowser(true);
      setShowNewStockProductForm(false);
      setShowCustomItemForm(false);
      setErrorMsg(null);
      setInfoMsg(null);
      setNewProdName('');
      setNewProdCategoryId(categories?.[0]?.id || 'cat_general');
      setNewProdUnit('pièce');
      setNewProdPurchasePrice('');
      setNewProdSalePrice('');
      setNewProdInitialStock('10');
      setNewProdInvoiceQty('1');
    }
  }, [isOpen, sale, categories]);

  // Map original sale quantities per productId so we know true available stock during correction
  const oldQtyByProductId = useMemo(() => {
    const map: Record<string, number> = {};
    if (!sale) return map;
    (sale.items || []).forEach(it => {
      if (it.productId && !it.productId.startsWith('custom_')) {
        map[it.productId] = (map[it.productId] || 0) + it.quantity;
      }
    });
    return map;
  }, [sale]);

  // Current quantities in edited invoice per productId
  const currentQtyByProductId = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach(it => {
      if (it.productId && !it.productId.startsWith('custom_')) {
        map[it.productId] = (map[it.productId] || 0) + it.quantity;
      }
    });
    return map;
  }, [items]);

  const getEffectiveAvailableStock = (prod: Product): number => {
    const oldQty = oldQtyByProductId[prod.id] || 0;
    const editedQty = currentQtyByProductId[prod.id] || 0;
    return Math.round((prod.currentStock + oldQty - editedQty) * 1000) / 1000;
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, it) => sum + it.total, 0);
    const taxAmount = settings.taxEnabled ? (subtotal * settings.taxRatePercent) / 100 : 0;
    const totalAmount = Math.round(subtotal + taxAmount);
    const discountTotal = items.reduce(
      (sum, it) => sum + (it.unitPrice * it.quantity * (it.discountPercent || 0)) / 100,
      0
    );
    return { subtotal, taxAmount, totalAmount, discountTotal };
  }, [items, settings.taxEnabled, settings.taxRatePercent]);

  // Keep amountReceived / remainingDebt synced cleanly when user clicks quick actions or switches payment method
  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method === 'CREDIT') {
      setAmountReceived('0');
      setRemainingDebtInput(String(totals.totalAmount));
    } else {
      setAmountReceived(String(totals.totalAmount));
      setRemainingDebtInput('0');
    }
  };

  const handleAmountReceivedChange = (val: string) => {
    setAmountReceived(val);
    const num = parseFloat(val) || 0;
    const rem = Math.max(0, totals.totalAmount - num);
    setRemainingDebtInput(String(rem));
  };

  const handleItemChange = (index: number, field: 'quantity' | 'unitPrice' | 'discountPercent', rawVal: number) => {
    setErrorMsg(null);
    setItems(prev =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        const safeRaw = Number.isFinite(rawVal) ? rawVal : 0;
        const quantity = field === 'quantity' ? Math.max(0.01, safeRaw) : it.quantity;
        const unitPrice = field === 'unitPrice' ? Math.max(0, safeRaw) : it.unitPrice;
        const discountPercent = field === 'discountPercent' ? Math.min(100, Math.max(0, safeRaw)) : (it.discountPercent || 0);
        const total = Math.round(unitPrice * quantity * (1 - discountPercent / 100));
        const margin = total - (it.unitCost || 0) * quantity;
        return {
          ...it,
          quantity,
          unitPrice,
          discountPercent,
          total,
          margin,
        };
      })
    );
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setErrorMsg('Une facture doit contenir au moins un article.');
      return;
    }
    setErrorMsg(null);
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddCatalogProduct = (prod: Product) => {
    setErrorMsg(null);
    setInfoMsg(null);

    const available = getEffectiveAvailableStock(prod);
    if (!settings.allowNegativeStock && available < 1 && available <= 0) {
      setErrorMsg(
        `Stock insuffisant pour "${prod.name}" (disponible restant : ${available} ${prod.unit}). Modifiez le stock du produit ou activez le stock négatif dans Paramètres.`
      );
      return;
    }

    const existingIdx = items.findIndex(it => it.productId === prod.id);
    if (existingIdx >= 0) {
      const nextQty = items[existingIdx].quantity + 1;
      handleItemChange(existingIdx, 'quantity', nextQty);
      setInfoMsg(`Quantité de "${prod.name}" augmentée à ${nextQty} ${prod.unit || 'pièce'}.`);
    } else {
      const unitPrice = prod.salePrice;
      const unitCost = prod.purchasePrice;
      const addQty = available > 0 && available < 1 ? available : 1;
      const total = Math.round(unitPrice * addQty);
      const newItem: SaleItem = {
        productId: prod.id,
        productName: prod.name,
        productCode: prod.code,
        productUnit: prod.unit || 'pièce',
        quantity: addQty,
        unitPrice,
        unitCost,
        discountPercent: 0,
        total,
        margin: total - unitCost * addQty,
      };
      setItems(prev => [...prev, newItem]);
      setInfoMsg(`"${prod.name}" ajouté à la facture depuis le stock.`);
    }
  };

  const handleCreateNewStockProductAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const name = newProdName.trim();
    const salePrice = parseFloat(newProdSalePrice);
    const purchasePrice = parseFloat(newProdPurchasePrice || '0');
    const initialStock = parseFloat(newProdInitialStock || '0');
    const invoiceQty = parseFloat(newProdInvoiceQty || '1');

    if (!name) {
      setErrorMsg('Veuillez saisir le nom du nouveau produit.');
      return;
    }
    if (isNaN(salePrice) || salePrice < 0) {
      setErrorMsg('Veuillez saisir un prix de vente valide.');
      return;
    }
    if (isNaN(invoiceQty) || invoiceQty <= 0) {
      setErrorMsg('La quantité à facturer doit être supérieure à zéro.');
      return;
    }
    if (!settings.allowNegativeStock && (isNaN(initialStock) || initialStock < invoiceQty)) {
      setErrorMsg(
        `Le stock initial (${isNaN(initialStock) ? 0 : initialStock}) doit être supérieur ou égal à la quantité facturée (${invoiceQty}).`
      );
      return;
    }

    const createdProd = addProduct({
      code: '',
      barcode: '',
      name,
      description: 'Produit ajouté au stock lors de la correction de facture',
      categoryId: newProdCategoryId || categories?.[0]?.id || 'cat_general',
      brand: '',
      unit: newProdUnit || 'pièce',
      purchasePrice: isNaN(purchasePrice) ? 0 : Math.max(0, purchasePrice),
      salePrice,
      currentStock: isNaN(initialStock) ? 0 : Math.max(0, initialStock),
      minStock: settings.lowStockThresholdDefault || 5,
      maxStock: Math.max(50, (isNaN(initialStock) ? 10 : initialStock) * 2),
      active: true,
    });

    const lineTotal = Math.round(createdProd.salePrice * invoiceQty);
    const newItem: SaleItem = {
      productId: createdProd.id,
      productName: createdProd.name,
      productCode: createdProd.code,
      productUnit: createdProd.unit || 'pièce',
      quantity: invoiceQty,
      unitPrice: createdProd.salePrice,
      unitCost: createdProd.purchasePrice,
      discountPercent: 0,
      total: lineTotal,
      margin: lineTotal - createdProd.purchasePrice * invoiceQty,
    };

    setItems(prev => [...prev, newItem]);
    setShowNewStockProductForm(false);
    setNewProdName('');
    setNewProdPurchasePrice('');
    setNewProdSalePrice('');
    setNewProdInitialStock('10');
    setNewProdInvoiceQty('1');
    setInfoMsg(
      `Nouveau produit "${createdProd.name}" créé dans le stock (${createdProd.currentStock} ${createdProd.unit}) et ajouté à la facture (${invoiceQty} ${createdProd.unit}).`
    );
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const price = parseFloat(customPrice);
    const qty = parseFloat(customQty) || 1;
    if (!customName.trim() || isNaN(price) || price < 0 || qty <= 0) {
      setErrorMsg('Veuillez renseigner une désignation, un prix et une quantité valides.');
      return;
    }

    const total = Math.round(price * qty);
    const newItem: SaleItem = {
      productId: `custom_${Date.now()}`,
      productName: customName.trim(),
      productUnit: 'pièce',
      quantity: qty,
      unitPrice: price,
      unitCost: 0,
      discountPercent: 0,
      total,
      margin: total,
    };
    setItems(prev => [...prev, newItem]);
    setCustomName('');
    setCustomPrice('');
    setCustomQty('1');
    setShowCustomItemForm(false);
    setInfoMsg(`Article libre "${newItem.productName}" ajouté à la facture.`);
  };

  const filteredCatalog = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return (products || [])
      .filter(p => {
        if (p.active === false) return false;
        if (selectedCategoryId !== 'all' && p.categoryId !== selectedCategoryId) return false;
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.code || '').toLowerCase().includes(q) ||
          (p.barcode || '').toLowerCase().includes(q) ||
          (p.brand || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // Prioritize items with stock available first
        const aAvail = getEffectiveAvailableStock(a) > 0 ? 1 : 0;
        const bAvail = getEffectiveAvailableStock(b) > 0 ? 1 : 0;
        if (aAvail !== bAvail) return bAvail - aAvail;
        return a.name.localeCompare(b.name);
      });
  }, [products, productSearch, selectedCategoryId, oldQtyByProductId, currentQtyByProductId]);

  if (!isOpen || !sale) return null;

  const submitCorrection = (shouldPrint: boolean) => {
    setErrorMsg(null);
    if (items.length === 0) {
      setErrorMsg('Ajoutez au moins un article à la facture.');
      return;
    }

    // Validate stock availability before calling updateSale
    if (!settings.allowNegativeStock) {
      for (const prodId of Object.keys(currentQtyByProductId)) {
        const prod = (products || []).find(p => p.id === prodId);
        if (prod) {
          const remaining = getEffectiveAvailableStock(prod);
          if (remaining < 0) {
            setErrorMsg(
              `Stock insuffisant pour "${prod.name}" : vous demandez ${Math.abs(remaining)} ${prod.unit} de plus que le stock disponible.`
            );
            return;
          }
        }
      }
    }

    const parsedReceived = parseFloat(amountReceived);
    const finalReceived = isNaN(parsedReceived) ? 0 : Math.max(0, parsedReceived);
    const parsedRemaining = parseFloat(remainingDebtInput);
    const finalRemaining = isNaN(parsedRemaining)
      ? Math.max(0, totals.totalAmount - finalReceived)
      : Math.max(0, parsedRemaining);

    const res = updateSale(
      sale.id,
      {
        items,
        paymentMethod,
        amountReceived: finalReceived,
        customerId: customerId || undefined,
        notes: notes.trim() || undefined,
        remainingDebt: finalRemaining,
      },
      correctionReason.trim() || "Erreur d'ajout"
    );

    if (!res.success || !res.sale) {
      setErrorMsg(res.message || "Impossible d'enregistrer la correction.");
      return;
    }

    if (onSaved) {
      onSaved(res.sale, shouldPrint);
    }
    onClose();
  };

  const deltaTotal = totals.totalAmount - sale.totalAmount;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base flex items-center gap-2 flex-wrap">
                Corriger la Facture {sale.invoiceNumber}
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  Facture déjà validée
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Date initiale : {formatDateTime(sale.date)} • Les stocks, la caisse et les dettes clients seront automatiquement ajustés.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center justify-between gap-2 font-semibold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{infoMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setInfoMsg(null)}
                className="text-emerald-600 hover:text-emerald-800 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Stock Catalog Picker & New Stock Product Creation */}
          <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowStockBrowser(prev => !prev)}
                className="font-black text-indigo-950 flex items-center gap-2 text-left cursor-pointer"
              >
                <Boxes className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Ajouter des produits du stock à cette facture ({filteredCatalog.length} disponibles)</span>
                {showStockBrowser ? (
                  <ChevronUp className="w-4 h-4 text-indigo-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-indigo-600" />
                )}
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewStockProductForm(prev => !prev);
                    setShowCustomItemForm(false);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                    showNewStockProductForm
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  }`}
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  {showNewStockProductForm ? 'Fermer nouveau produit' : '+ Nouveau produit dans le stock'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomItemForm(prev => !prev);
                    setShowNewStockProductForm(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-100 text-[11px] font-bold text-indigo-700 cursor-pointer transition-colors"
                >
                  {showCustomItemForm ? 'Fermer article libre' : '+ Article libre (hors stock)'}
                </button>
              </div>
            </div>

            {/* New Product Direct to Stock Form */}
            {showNewStockProductForm && (
              <form
                onSubmit={handleCreateNewStockProductAndAdd}
                className="bg-white border border-emerald-300 rounded-xl p-3.5 space-y-3 shadow-xs animate-in fade-in"
              >
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                  <span className="font-black text-emerald-900 flex items-center gap-1.5">
                    <PackagePlus className="w-4 h-4 text-emerald-600" />
                    Créer un nouveau produit dans le stock & l'ajouter à la facture
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    Enregistré définitivement dans le catalogue stock
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Nom du produit *
                    </label>
                    <input
                      type="text"
                      required
                      value={newProdName}
                      onChange={e => setNewProdName(e.target.value)}
                      placeholder="Ex: Ciment CPJ 45, Huile 5L, Clous 80mm..."
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Catégorie
                    </label>
                    <select
                      value={newProdCategoryId}
                      onChange={e => setNewProdCategoryId(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                    >
                      {(categories || []).map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Unité
                    </label>
                    <select
                      value={newProdUnit}
                      onChange={e => setNewProdUnit(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                    >
                      {PRODUCT_UNITS.map(u => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Prix d'achat ({settings.currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={newProdPurchasePrice}
                      onChange={e => setNewProdPurchasePrice(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Prix de vente ({settings.currency}) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={newProdSalePrice}
                      onChange={e => setNewProdSalePrice(e.target.value)}
                      placeholder="Ex: 5000"
                      className="w-full px-3 py-1.5 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Stock initial créé *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={newProdInitialStock}
                      onChange={e => setNewProdInitialStock(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Qté ajoutée à la facture *
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      required
                      value={newProdInvoiceQty}
                      onChange={e => setNewProdInvoiceQty(e.target.value)}
                      className="w-full px-3 py-1.5 border border-indigo-300 rounded-lg text-xs font-bold text-indigo-900"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <p className="text-[11px] text-slate-500">
                    Après validation de la facture, le stock restant de ce produit sera :{' '}
                    <strong className="text-slate-900">
                      {Math.round(((parseFloat(newProdInitialStock) || 0) - (parseFloat(newProdInvoiceQty) || 0)) * 1000) / 1000}{' '}
                      {newProdUnit}
                    </strong>
                  </p>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Créer dans le stock & Ajouter à la facture
                  </button>
                </div>
              </form>
            )}

            {/* Ad-hoc custom item (not saved to stock) */}
            {showCustomItemForm && (
              <form
                onSubmit={handleAddCustomItem}
                className="bg-white border border-indigo-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 animate-in fade-in"
              >
                <input
                  type="text"
                  placeholder="Désignation article libre *"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="sm:col-span-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  required
                />
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={`Prix unitaire (${settings.currency})`}
                  value={customPrice}
                  onChange={e => setCustomPrice(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  required
                />
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="Qté"
                    value={customQty}
                    onChange={e => setCustomQty(e.target.value)}
                    className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center"
                    required
                  />
                  <button
                    type="submit"
                    className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs cursor-pointer"
                  >
                    Ajouter
                  </button>
                </div>
              </form>
            )}

            {/* Search & Category Filter + Stock Grid */}
            {showStockBrowser && (
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="Rechercher un produit du stock (nom, code, marque, code-barres)..."
                      className="w-full pl-9 pr-8 py-2 bg-white border border-indigo-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    {productSearch && (
                      <button
                        type="button"
                        onClick={() => setProductSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <select
                    value={selectedCategoryId}
                    onChange={e => setSelectedCategoryId(e.target.value)}
                    className="px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="all">Toutes les catégories</option>
                    {(categories || []).map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Clickable Stock Product List */}
                <div className="bg-white border border-indigo-100 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {filteredCatalog.length > 0 ? (
                    filteredCatalog.map(prod => {
                      const available = getEffectiveAvailableStock(prod);
                      const inInvoiceItem = items.find(it => it.productId === prod.id);
                      const isOut = available <= 0;
                      const isLow = available > 0 && available <= prod.minStock;
                      const blocked = !settings.allowNegativeStock && isOut;

                      return (
                        <div
                          key={prod.id}
                          className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-indigo-50/50 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 truncate">{prod.name}</span>
                              {inInvoiceItem && (
                                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[10px] font-bold">
                                  Sur facture : {inInvoiceItem.quantity} {prod.unit}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              <span className="font-mono">{prod.code}</span>
                              <span>•</span>
                              <span
                                className={`font-bold ${
                                  isOut
                                    ? 'text-rose-600'
                                    : isLow
                                    ? 'text-amber-600'
                                    : 'text-emerald-700'
                                }`}
                              >
                                Stock dispo : {available} {prod.unit}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="font-black text-indigo-700">
                              {formatMoney(prod.salePrice, settings.currency)}
                            </span>
                            <button
                              type="button"
                              disabled={blocked}
                              onClick={() => handleAddCatalogProduct(prod)}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                                blocked
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{inInvoiceItem ? '+1' : 'Ajouter'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      Aucun produit trouvé dans le stock pour cette recherche. Utilisez « + Nouveau produit dans le stock » pour en créer un.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Article</th>
                    <th className="p-3 text-center w-32">Quantité</th>
                    <th className="p-3 text-right w-32">Prix Unit.</th>
                    <th className="p-3 text-center w-24">Remise %</th>
                    <th className="p-3 text-right w-32">Total Ligne</th>
                    <th className="p-3 text-center w-12">Suppr.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => {
                    const catalogProd = (products || []).find(p => p.id === it.productId);
                    const remainingStock = catalogProd ? getEffectiveAvailableStock(catalogProd) : null;
                    return (
                      <tr key={`${it.productId}_${idx}`} className="hover:bg-slate-50/70">
                        <td className="p-3">
                          <p className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{it.productName}</span>
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>{it.productCode || 'Libre'} • Unité : {it.productUnit || 'pièce'}</span>
                            {remainingStock !== null && (
                              <span
                                className={`font-semibold ${
                                  remainingStock < 0
                                    ? 'text-rose-600'
                                    : remainingStock === 0
                                    ? 'text-amber-600'
                                    : 'text-emerald-600'
                                }`}
                              >
                                • Reste en stock : {remainingStock} {it.productUnit || 'pièce'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleItemChange(idx, 'quantity', Math.max(0.01, it.quantity - 1))}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={it.quantity}
                              onChange={e => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0.01)}
                              className="w-16 text-center py-1 border border-slate-200 rounded font-bold text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => handleItemChange(idx, 'quantity', it.quantity + 1)}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={it.unitPrice}
                            onChange={e => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-28 text-right px-2 py-1 border border-slate-200 rounded font-bold text-slate-900"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={it.discountPercent || 0}
                            onChange={e => handleItemChange(idx, 'discountPercent', parseFloat(e.target.value) || 0)}
                            className="w-16 text-center py-1 border border-slate-200 rounded font-semibold text-slate-700"
                          />
                        </td>
                        <td className="p-3 text-right font-black text-slate-900">
                          {formatMoney(it.total, settings.currency)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="Retirer cette ligne"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Client, Payment & Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Customer + Payment Details */}
            <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <label className="font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  Client associé
                </label>
                <select
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Client au comptant (Anonyme)</option>
                  {(customers || []).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mode de paiement</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    { id: 'ESPECES', label: 'Espèces', icon: Banknote },
                    { id: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone },
                    { id: 'CARTE_BANCAIRE', label: 'Carte', icon: CreditCard },
                    { id: 'VIREMENT', label: 'Virement', icon: Building },
                    { id: 'CREDIT', label: 'À Crédit', icon: Clock },
                  ].map(m => {
                    const Icon = m.icon;
                    const active = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handlePaymentMethodChange(m.id as PaymentMethod)}
                        className={`px-2.5 py-2 rounded-lg border text-left flex items-center gap-1.5 cursor-pointer transition-all ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[11px] truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Montant encaissé ({settings.currency})
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={amountReceived}
                      onChange={e => handleAmountReceivedChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-black text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleAmountReceivedChange(String(totals.totalAmount))}
                      className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-lg text-[10px] font-bold hover:bg-indigo-200 shrink-0 cursor-pointer"
                      title="Mettre égal au nouveau total"
                    >
                      Exact
                    </button>
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Reste à payer / Dette ({settings.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={remainingDebtInput}
                    onChange={e => setRemainingDebtInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-black text-rose-700"
                  />
                </div>
              </div>
            </div>

            {/* Right: Reason, Notes & Financial Summary */}
            <div className="space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Motif de correction *
                  </label>
                  <input
                    type="text"
                    value={correctionReason}
                    onChange={e => setCorrectionReason(e.target.value)}
                    placeholder="Ex: Erreur de quantité, mauvais article ajouté, remise oubliée..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Notes sur la facture (optionnel)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Observation affichée sur le ticket..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Totals Recap */}
              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Ancien total facture :</span>
                  <span className="font-semibold line-through">
                    {formatMoney(sale.totalAmount, settings.currency)}
                  </span>
                </div>
                {totals.discountTotal > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>Remises appliquées :</span>
                    <span>-{formatMoney(totals.discountTotal, settings.currency)}</span>
                  </div>
                )}
                {settings.taxEnabled && (
                  <div className="flex justify-between text-slate-300">
                    <span>TVA ({settings.taxRatePercent}%) :</span>
                    <span>{formatMoney(totals.taxAmount, settings.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-700 text-base font-black">
                  <span>Nouveau Total Corrigé :</span>
                  <span className="text-emerald-400">
                    {formatMoney(totals.totalAmount, settings.currency)}
                  </span>
                </div>
                {deltaTotal !== 0 && (
                  <div className="flex justify-between text-[11px] pt-0.5">
                    <span className="text-slate-400">Écart après correction :</span>
                    <span className={deltaTotal > 0 ? 'text-amber-300 font-bold' : 'text-sky-300 font-bold'}>
                      {deltaTotal > 0 ? '+' : ''}
                      {formatMoney(deltaTotal, settings.currency)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => submitCorrection(false)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Enregistrer la Correction</span>
          </button>
          <button
            type="button"
            onClick={() => submitCorrection(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Enregistrer & Réimprimer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
