import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Barcode,
  Trash2,
  Plus,
  Minus,
  Percent,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Smartphone,
  CreditCard,
  Building,
  UserPlus,
  Receipt,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  Printer,
  Settings as SettingsIcon,
  LayoutGrid,
  List,
  TrendingUp,
  PackageCheck,
  Tag,
  Coins,
  Layers,
  CheckSquare,
  PackagePlus,
  ChevronDown,
  Check,
  Boxes,
  X,
  SlidersHorizontal
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product, SaleItem, PaymentMethod, Sale } from '../../types';
import { formatMoney, getPaymentMethodLabel } from '../../utils/formatters';
import { InvoiceModal } from '../common/InvoiceModal';
import { DirectPrinterModal } from '../common/DirectPrinterModal';
import {
  generateThermalReceiptHtml,
  executeDirectPrint,
  printViaWebSerial,
  printViaWebBluetooth,
  printViaRawBT,
  autoPrintSaleReceipt
} from '../../utils/printService';
import confetti from 'canvas-confetti';

interface POSViewProps {
  onNavigate?: (tab: string) => void;
}

export const POSView: React.FC<POSViewProps> = () => {
  const {
    products,
    categories,
    customers,
    addCustomer,
    addProduct,
    createSale,
    cancelSale,
    settings,
    updateSettings,
    cashRegister,
  } = useStore();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock'>('all');

  // Multi-Select Products Modal State
  const [showSelectProductsModal, setShowSelectProductsModal] = useState(false);
  const [modalSelectedItems, setModalSelectedItems] = useState<Record<string, number>>({});
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalCategory, setModalCategory] = useState<string>('all');

  // Quick Add Product on the fly State
  const [showQuickAddProductModal, setShowQuickAddProductModal] = useState(false);
  const [quickProdName, setQuickProdName] = useState('');
  const [quickProdPrice, setQuickProdPrice] = useState('');
  const [quickProdCost, setQuickProdCost] = useState('');
  const [quickProdStock, setQuickProdStock] = useState('10');
  const [quickProdCategory, setQuickProdCategory] = useState('');
  const [quickProdCode, setQuickProdCode] = useState('');
  const [quickProdBarcode, setQuickProdBarcode] = useState('');
  const [quickProdUnit, setQuickProdUnit] = useState('pièce');

  // Cart
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [discountGlobalPercent, setDiscountGlobalPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ESPECES');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Modals & UI States
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemQty, setCustomItemQty] = useState('1');
  const [customItemCost, setCustomItemCost] = useState('');
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus barcode input on mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Live Auto-suggest list for the search bar
  const autocompleteSuggestions = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    if (!q) return [];
    return (products || [])
      .filter((p) => {
        if (!p || !p.active) return false;
        const name = (p.name || '').toLowerCase();
        const code = (p.code || '').toLowerCase();
        const barcode = (p.barcode || '').toLowerCase();
        return name.includes(q) || code.includes(q) || barcode.includes(q);
      })
      .slice(0, 8);
  }, [products, searchTerm]);

  // Filter products for catalog grid / quick list
  const filteredProducts = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return (products || []).filter((p) => {
      if (!p || !p.active) return false;
      const name = (p.name || '').toLowerCase();
      const code = (p.code || '').toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();
      const matchesSearch = name.includes(q) || code.includes(q) || barcode.includes(q);
      const matchesCategory =
        selectedCategory === 'all' || p.categoryId === selectedCategory;

      let matchesStock = true;
      if (stockFilter === 'in_stock') {
        matchesStock = p.currentStock > 0;
      } else if (stockFilter === 'low_stock') {
        matchesStock = p.currentStock <= p.minStock && p.currentStock > 0;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchTerm, selectedCategory, stockFilter]);

  // Filter products inside the Multi-Select Catalog Modal
  const modalFilteredProducts = useMemo(() => {
    const q = (modalSearchTerm || '').toLowerCase().trim();
    return (products || []).filter((p) => {
      if (!p || !p.active) return false;
      const name = (p.name || '').toLowerCase();
      const code = (p.code || '').toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();
      const matchesSearch = name.includes(q) || code.includes(q) || barcode.includes(q);
      const matchesCat = modalCategory === 'all' || p.categoryId === modalCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, modalSearchTerm, modalCategory]);

  // Open Multi-Select Modal and synchronize with current cart
  const handleOpenSelectProductsModal = () => {
    const initialMap: Record<string, number> = {};
    cart.forEach((it) => {
      if (!it.productId.startsWith('custom_')) {
        initialMap[it.productId] = it.quantity;
      }
    });
    setModalSelectedItems(initialMap);
    setModalSearchTerm('');
    setModalCategory('all');
    setShowSelectProductsModal(true);
  };

  // Update quantity in the Multi-Select Modal
  const handleModalQuantityChange = (productId: string, qty: number) => {
    const prod = (products || []).find((p) => p.id === productId);
    if (!prod) return;

    if (qty <= 0) {
      setModalSelectedItems((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      return;
    }

    if (!settings.allowNegativeStock && qty > prod.currentStock) {
      qty = prod.currentStock;
    }

    setModalSelectedItems((prev) => ({
      ...prev,
      [productId]: qty,
    }));
  };

  // Toggle item in Multi-Select Modal (1 if unselected, 0 if selected)
  const handleModalToggleItem = (product: Product) => {
    const currentQty = modalSelectedItems[product.id] || 0;
    if (currentQty > 0) {
      handleModalQuantityChange(product.id, 0);
    } else {
      if (!settings.allowNegativeStock && product.currentStock <= 0) {
        setErrorMessage(`"${product.name}" est en rupture de stock.`);
        return;
      }
      handleModalQuantityChange(product.id, 1);
    }
  };
  // Apply selected items from Modal into the actual Sale Cart
  const handleApplySelectedModalProducts = () => {
    setCart((prev) => {
      // Keep any custom/surcharge items
      const customItems = prev.filter((it) => it.productId.startsWith('custom_'));
      
      const newItems: SaleItem[] = [];

      Object.entries(modalSelectedItems).forEach(([pId, rawQty]) => {
        const qty = Number(rawQty) || 0;
        if (qty > 0) {
          const prod = products.find((p) => p.id === pId);
          if (prod) {
            const existingInCart = prev.find((it) => it.productId === pId);
            const unitPrice = existingInCart ? existingInCart.unitPrice : prod.salePrice;
            const discountPercent = existingInCart ? existingInCart.discountPercent : 0;
            const discountPrice = unitPrice * (1 - discountPercent / 100);
            const total = qty * discountPrice;
            const margin = total - (prod.purchasePrice * qty);

            newItems.push({
              productId: prod.id,
              productName: prod.name,
              productCode: prod.code,
              productUnit: prod.unit || 'pièce',
              quantity: qty,
              unitPrice,
              unitCost: prod.purchasePrice,
              discountPercent,
              total,
              margin,
            });
          }
        }
      });

      return [...newItems, ...customItems];
    });
    setShowSelectProductsModal(false);
  };

  // Quick product creation handler on the fly
  const handleQuickCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProdName.trim()) return;

    const sPrice = parseFloat(quickProdPrice) || 0;
    const pCost = parseFloat(quickProdCost) || 0;
    const initStock = parseFloat(quickProdStock) || 0;
    const catId = quickProdCategory || categories[0]?.id || 'cat_default';
    const code = quickProdCode.trim() || `ART-${Math.floor(1000 + Math.random() * 9000)}`;

    const newProd = addProduct({
      name: quickProdName.trim(),
      code,
      barcode: quickProdBarcode.trim() || undefined,
      categoryId: catId,
      salePrice: sPrice,
      purchasePrice: pCost,
      currentStock: initStock,
      minStock: 5,
      unit: quickProdUnit.trim() || 'pièce',
      active: true,
    });

    if (newProd) {
      addToCart(newProd);
    }

    // Reset fields
    setQuickProdName('');
    setQuickProdPrice('');
    setQuickProdCost('');
    setQuickProdStock('10');
    setQuickProdCode('');
    setQuickProdBarcode('');
    setShowQuickAddProductModal(false);
  };

  // Add product to cart
  const addToCart = (product: Product) => {
    setErrorMessage(null);
    if (!settings.allowNegativeStock && product.currentStock <= 0) {
      setErrorMessage(`Article "${product.name}" en rupture de stock.`);
      return;
    }

    setCart((prev) => {
      const existing = (prev || []).find((it) => it.productId === product.id);
      if (existing) {
        if (!settings.allowNegativeStock && existing.quantity >= product.currentStock) {
          setErrorMessage(`Stock disponible atteint (${product.currentStock} ${product.unit}s).`);
          return prev;
        }
        const updatedQty = existing.quantity + 1;
        const discountPrice = existing.unitPrice * (1 - existing.discountPercent / 100);
        const newTotal = updatedQty * discountPrice;
        const newMargin = newTotal - existing.unitCost * updatedQty;

        return prev.map((it) =>
          it.productId === product.id
            ? { ...it, quantity: updatedQty, total: newTotal, margin: newMargin }
            : it
        );
      } else {
        const item: SaleItem = {
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          productUnit: product.unit || 'pièce',
          quantity: 1,
          unitPrice: product.salePrice,
          unitCost: product.purchasePrice,
          discountPercent: 0,
          total: product.salePrice,
          margin: product.salePrice - product.purchasePrice,
        };
        return [...prev, item];
      }
    });
  };

  // Add custom / special item or price increase line to cart
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customItemName.trim() || 'Article / Frais Spécial';
    const price = parseFloat(customItemPrice) || 0;
    const qty = Math.max(1, parseFloat(customItemQty) || 1);
    const cost = parseFloat(customItemCost) || 0;

    if (price <= 0) {
      setErrorMessage('Le prix de vente doit être supérieur à 0 FCFA.');
      return;
    }

    const customId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const total = qty * price;
    const margin = total - (cost * qty);

    const newItem: SaleItem = {
      productId: customId,
      productName: name,
      productCode: 'SPEC',
      productUnit: 'unité',
      quantity: qty,
      unitPrice: price,
      unitCost: cost,
      discountPercent: 0,
      total,
      margin,
    };

    setCart((prev) => [...prev, newItem]);
    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQty('1');
    setCustomItemCost('');
    setShowCustomItemModal(false);
  };

  // Update item unit price (supports negotiated, higher or lower prices)
  const updateUnitPrice = (productId: string, newUnitPrice: number) => {
    const validPrice = Math.max(0, newUnitPrice);
    setCart((prev) =>
      (prev || []).map((it) => {
        if (it.productId === productId) {
          const discountPrice = validPrice * (1 - it.discountPercent / 100);
          const total = it.quantity * discountPrice;
          const margin = total - (it.unitCost * it.quantity);
          return { ...it, unitPrice: validPrice, total, margin };
        }
        return it;
      })
    );
  };

  // Update item quantity
  const updateQuantity = (productId: string, newQty: number) => {
    setErrorMessage(null);
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const prod = (products || []).find((p) => p.id === productId);
    if (prod && !settings.allowNegativeStock && newQty > prod.currentStock) {
      setErrorMessage(`Quantité limitée au stock disponible (${prod.currentStock}).`);
      return;
    }

    setCart((prev) =>
      (prev || []).map((it) => {
        if (it.productId === productId) {
          const discountPrice = it.unitPrice * (1 - it.discountPercent / 100);
          const total = newQty * discountPrice;
          const margin = total - it.unitCost * newQty;
          return { ...it, quantity: newQty, total, margin };
        }
        return it;
      })
    );
  };

  // Update item discount
  const updateDiscount = (productId: string, discountPercent: number) => {
    const validDiscount = Math.max(0, Math.min(100, discountPercent));
    setCart((prev) =>
      (prev || []).map((it) => {
        if (it.productId === productId) {
          const discountPrice = it.unitPrice * (1 - validDiscount / 100);
          const total = it.quantity * discountPrice;
          const margin = total - it.unitCost * it.quantity;
          return { ...it, discountPercent: validDiscount, total, margin };
        }
        return it;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => (prev || []).filter((it) => it.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomerId('');
    setDiscountGlobalPercent(0);
    setAmountReceived('');
    setNotes('');
    setErrorMessage(null);
  };

  // Barcode scanner simulation / Enter key handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const rawInput = barcodeInput.trim();
    const cleanInput = rawInput.toLowerCase();
    const matched = (products || []).find(
      (p) =>
        p.active &&
        ((p.barcode && p.barcode.trim().toLowerCase() === cleanInput) ||
         (p.code && p.code.toLowerCase().trim() === cleanInput))
    );

    if (matched) {
      addToCart(matched);
      setBarcodeInput('');
    } else {
      setErrorMessage(`Aucun produit trouvé avec le code: ${barcodeInput}`);
    }
  };

  // Cart Calculations
  const subtotal = useMemo(() => cart.reduce((sum, it) => sum + it.total, 0), [cart]);
  const totalCost = useMemo(() => cart.reduce((sum, it) => sum + (it.unitCost * it.quantity), 0), [cart]);
  const totalProfit = useMemo(() => Math.max(0, subtotal - totalCost), [subtotal, totalCost]);
  const profitMarginPercent = subtotal > 0 ? ((totalProfit / subtotal) * 100).toFixed(1) : '0';

  // Calculate extra profit earned through cashier price bumps compared to standard catalog prices
  const extraGainFromPriceOverride = useMemo(() => {
    return cart.reduce((sum, it) => {
      const origProduct = (products || []).find((p) => p.id === it.productId);
      if (origProduct && it.unitPrice > origProduct.salePrice) {
        const extraPerUnit = it.unitPrice - origProduct.salePrice;
        return sum + extraPerUnit * it.quantity;
      }
      return sum;
    }, 0);
  }, [cart, products]);

  const taxAmount = settings.taxEnabled ? (subtotal * settings.taxRatePercent) / 100 : 0;
  const totalToPay = Math.round(subtotal + taxAmount);

  const numReceived = parseFloat(amountReceived) || 0;
  const changeDue = Math.max(0, numReceived - totalToPay);

  // Quick Add Customer
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;
    const created = addCustomer({
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim() || 'Non renseigné',
    });
    setSelectedCustomerId(created.id);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setShowCustomerModal(false);
  };

  // Process Checkout
  const handleValidateSale = () => {
    setErrorMessage(null);
    if (cart.length === 0) {
      setErrorMessage('Veuillez ajouter au moins un produit au panier.');
      return;
    }

    if (paymentMethod === 'ESPECES' && numReceived < totalToPay) {
      setErrorMessage(`Montant reçu insuffisant (${formatMoney(numReceived, settings.currency)} sur ${formatMoney(totalToPay, settings.currency)}).`);
      return;
    }

    if (paymentMethod === 'CREDIT' && !selectedCustomerId) {
      setErrorMessage('Une vente à crédit nécessite obligatoirement de sélectionner un client.');
      return;
    }

    const customerForPrint = selectedCustomerId
      ? (customers || []).find((c) => c.id === selectedCustomerId)
      : undefined;

    const result = createSale(
      cart,
      paymentMethod,
      paymentMethod === 'ESPECES' ? numReceived : totalToPay,
      selectedCustomerId || undefined,
      notes || undefined
    );

    if (result.success && result.sale) {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch {}

      const saleRecord = result.sale;
      setLastCompletedSale(saleRecord);
      setShowReceiptModal(true);
      setShowCheckoutModal(false);
      clearCart();

      // Trigger automatic direct print if configured
      if (settings.autoPrintReceiptOnSale) {
        // Execute immediately with robust in-page iframe printing
        autoPrintSaleReceipt(saleRecord, settings, customerForPrint).catch((err) => {
          console.error('Auto-print error:', err);
        });
      }
    } else {
      setErrorMessage(result.message || 'Erreur lors de la validation de la vente.');
    }
  };

  const selectedCustomer = (customers || []).find((c) => c.id === selectedCustomerId);

  const modalSelectedCount = useMemo(() => {
    return Object.values(modalSelectedItems).reduce((sum: number, q: number) => sum + (Number(q) || 0), 0);
  }, [modalSelectedItems]);

  const modalSelectedTotal = useMemo(() => {
    return Object.entries(modalSelectedItems).reduce((sum: number, [pId, qty]) => {
      const prod = (products || []).find((p) => p.id === pId);
      return sum + (prod ? prod.salePrice * (Number(qty) || 0) : 0);
    }, 0);
  }, [modalSelectedItems, products]);

  return (
    <div className="flex flex-col gap-3 pb-2 h-[calc(100vh-5.5rem)]">
      {/* QUICK BANNER FOR LAST COMPLETED SALE */}
      {lastCompletedSale && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-emerald-950">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Vente <strong>{lastCompletedSale.invoiceNumber}</strong> encaissée ({formatMoney(lastCompletedSale.totalAmount, settings.currency)}) • Client: <strong>{lastCompletedSale.customerName || 'Comptoir'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                const customerForPrint = lastCompletedSale.customerId
                  ? (customers || []).find((c) => c.id === lastCompletedSale.customerId)
                  : undefined;
                await autoPrintSaleReceipt(lastCompletedSale, settings, customerForPrint);
              }}
              className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Envoyer immédiatement le ticket à l'imprimante"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              Imprimer Direct
            </button>
            <button
              type="button"
              onClick={() => setShowReceiptModal(true)}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5" />
              Aperçu Reçu
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Annuler immédiatement la vente ${lastCompletedSale.invoiceNumber} ? Les articles seront remis en stock et la caisse sera ajustée.`)) {
                  const res = cancelSale(lastCompletedSale.id, 'Annulation immédiate après achat par le caissier');
                  if (res.success) {
                    setLastCompletedSale(null);
                    alert('Vente annulée avec succès. Articles réintégrés en stock.');
                  } else {
                    alert(res.message || 'Erreur lors de l’annulation.');
                  }
                }
              }}
              className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Annuler immédiatement cette vente"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              Annuler cette vente
            </button>
            <button
              type="button"
              onClick={() => setLastCompletedSale(null)}
              className="text-slate-400 hover:text-slate-600 p-1 text-xs"
              title="Masquer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-hidden">
        {/* LEFT COLUMN: PRODUCTS CATALOG & BARCODE SCANNER */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Search, Barcode, Selection & Category Bar */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search Input with Live Autocomplete Suggestions */}
            <div ref={searchContainerRef} className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par nom, code, marque..."
                value={searchTerm}
                onFocus={() => setShowSearchSuggestions(true)}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSearchSuggestions(true);
                }}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />

              {/* Autocomplete Suggestions Popup */}
              {showSearchSuggestions && autocompleteSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-72 overflow-y-auto divide-y divide-slate-100 animate-in fade-in">
                  <div className="p-2 bg-slate-50 text-[11px] font-bold text-slate-500 flex items-center justify-between">
                    <span>Résultats rapides ({autocompleteSuggestions.length})</span>
                    <span className="text-[10px] text-slate-400 font-normal">Cliquez pour ajouter au panier</span>
                  </div>
                  {autocompleteSuggestions.map((prod) => {
                    const isOutOfStock = prod.currentStock <= 0;
                    const isLowStock = prod.currentStock <= prod.minStock && !isOutOfStock;
                    const inCart = (cart || []).find((it) => it.productId === prod.id);

                    return (
                      <div
                        key={prod.id}
                        onClick={() => {
                          addToCart(prod);
                          setShowSearchSuggestions(false);
                        }}
                        className="p-2.5 hover:bg-indigo-50/70 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate">{prod.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span className="font-mono">{prod.code}</span>
                            {prod.barcode && <span>• {prod.barcode}</span>}
                            <span
                              className={`font-bold ${
                                isOutOfStock
                                  ? 'text-rose-600'
                                  : isLowStock
                                  ? 'text-amber-600'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {isOutOfStock ? '0 en stock' : `Stock: ${prod.currentStock} ${prod.unit}`}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-black text-indigo-700">
                            {formatMoney(prod.salePrice, settings.currency)}
                          </span>
                          <button
                            type="button"
                            disabled={isOutOfStock && !settings.allowNegativeStock}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                          >
                            {inCart ? `+1 (${inCart.quantity})` : '+ Sélectionner'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Barcode Quick Scanner Form */}
            <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-1.5 sm:w-56">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Scan code..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="w-full pl-9 pr-2 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                Scan
              </button>
            </form>

            {/* Multi-Selection & Quick Add Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleOpenSelectProductsModal}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                title="Ouvrir la fenêtre de sélection multiple des articles"
              >
                <CheckSquare className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">Choisir Articles</span>
                <span className="sm:hidden">Articles</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQuickAddProductModal(true)}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Ajouter un nouvel article directement"
              >
                <PackagePlus className="w-4 h-4" />
                <span className="hidden md:inline">+ Nouveau</span>
              </button>
            </div>

            {/* View Mode Switcher (Grid / List Table) */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Affichage en Grille"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Affichage en Liste / Tableau Rapide"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filters Row: Categories & Stock Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
            {/* Categories Tab Scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Toutes catégories ({products.filter((p) => p.active).length})
              </button>
              {categories.map((cat) => {
                const count = products.filter(
                  (p) => p.categoryId === cat.id && p.active
                ).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>

            {/* Quick Stock Filters */}
            <div className="flex items-center gap-1 shrink-0 bg-white border border-slate-200 p-0.5 rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => setStockFilter('all')}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  stockFilter === 'all'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Tous
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('in_stock')}
                className={`px-2 py-0.5 rounded font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  stockFilter === 'in_stock'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
                title="Afficher uniquement les articles ayant du stock disponible"
              >
                <PackageCheck className="w-3 h-3" />
                En Stock ({products.filter((p) => p.active && p.currentStock > 0).length})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('low_stock')}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  stockFilter === 'low_stock'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'text-amber-700 hover:bg-amber-50'
                }`}
                title="Afficher les articles proches de la rupture"
              >
                Faible ({products.filter((p) => p.active && p.currentStock <= p.minStock && p.currentStock > 0).length})
              </button>
            </div>
          </div>
        </div>

        {/* Product Cards Grid OR Rapid List Table */}
        <div className="flex-1 p-3.5 overflow-y-auto">
          {filteredProducts.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.currentStock <= 0;
                  const isLowStock = product.currentStock <= product.minStock && !isOutOfStock;
                  const inCart = (cart || []).find((it) => it.productId === product.id);

                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={isOutOfStock && !settings.allowNegativeStock}
                      className={`text-left p-3 rounded-xl border flex flex-col justify-between transition-all relative group cursor-pointer ${
                        inCart
                          ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500 shadow-xs'
                          : isOutOfStock
                          ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                          : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md'
                      }`}
                    >
                      {inCart && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shadow-xs">
                          {inCart.quantity}
                        </span>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {product.code}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-800'
                                : isLowStock
                                ? 'bg-amber-100 text-amber-900 font-black'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isOutOfStock
                              ? '0 en stock'
                              : `${product.currentStock} ${product.unit}`}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                          {product.name}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-end justify-between">
                        <div>
                          <p className="text-xs font-black text-indigo-700">
                            {formatMoney(product.salePrice, settings.currency)}
                          </p>
                          <span className="text-[10px] text-slate-400">Prix standard</span>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          + Ajouter
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* High-Density Quick List View for Cashiers */
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">Article & Code</th>
                      <th className="py-2.5 px-3">Catégorie</th>
                      <th className="py-2.5 px-3 text-center">Stock Disponible</th>
                      <th className="py-2.5 px-3 text-right">Prix de Vente</th>
                      <th className="py-2.5 px-3 text-center">Action Rapide</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((product) => {
                      const isOutOfStock = product.currentStock <= 0;
                      const isLowStock = product.currentStock <= product.minStock && !isOutOfStock;
                      const inCart = (cart || []).find((it) => it.productId === product.id);
                      const catName = categories.find((c) => c.id === product.categoryId)?.name || 'Général';

                      return (
                        <tr
                          key={product.id}
                          className={`hover:bg-indigo-50/50 transition-colors ${
                            inCart ? 'bg-indigo-50/30 font-semibold' : ''
                          }`}
                        >
                          <td className="py-2 px-3">
                            <p className="font-bold text-slate-800">{product.name}</p>
                            <span className="text-[10px] text-slate-400 font-mono">{product.code} {product.barcode ? `• ${product.barcode}` : ''}</span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">{catName}</td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                isOutOfStock
                                  ? 'bg-rose-100 text-rose-800'
                                  : isLowStock
                                  ? 'bg-amber-100 text-amber-900 font-black'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {product.currentStock} {product.unit}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-black text-indigo-700">
                            {formatMoney(product.salePrice, settings.currency)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => addToCart(product)}
                              disabled={isOutOfStock && !settings.allowNegativeStock}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                inCart
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : isOutOfStock
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white'
                              }`}
                            >
                              {inCart ? `+1 (${inCart.quantity})` : '+ Vendre'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
              <ShoppingBag className="w-10 h-10 stroke-1 mb-2 text-slate-300" />
              <p className="text-xs font-medium">Aucun produit ne correspond à ces critères de recherche ou de stock.</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: INTERACTIVE TICKET & CHECKOUT */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden shrink-0">
        {/* Header & Customer Picker */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-600" />
              Panier en cours ({cart.reduce((s, i) => s + i.quantity, 0)} art.)
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowPrinterSettings(true)}
                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                title="Réglages et test de l'imprimante directe"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[11px] text-rose-600 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Vider
                </button>
              )}
            </div>
          </div>

          {/* Customer selector with debt warning */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="flex-1 py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">Client Anonyme (Comptoir)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.creditBalance > 0 ? `(Dette: ${formatMoney(c.creditBalance, settings.currency)})` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowCustomerModal(true)}
              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-lg"
              title="Créer un nouveau client"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Article Direct Dropdown Selector */}
          <div className="flex items-center gap-1.5">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  const prod = products.find((p) => p.id === e.target.value);
                  if (prod) addToCart(prod);
                }
              }}
              className="flex-1 py-1.5 px-2.5 bg-white border border-indigo-200 hover:border-indigo-400 rounded-lg text-xs text-indigo-950 font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="">+ Choisir & Ajouter un article au ticket...</option>
              {products
                .filter((p) => p.active)
                .map((p) => {
                  const out = p.currentStock <= 0;
                  return (
                    <option key={p.id} value={p.id} disabled={out && !settings.allowNegativeStock}>
                      {p.name} — {formatMoney(p.salePrice, settings.currency)} ({out ? 'Rupture' : `${p.currentStock} ${p.unit}`})
                    </option>
                  );
                })}
            </select>
            <button
              type="button"
              onClick={handleOpenSelectProductsModal}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
              title="Ouvrir le catalogue complet pour sélectionner des articles"
            >
              <CheckSquare className="w-4 h-4" />
            </button>
          </div>

          {/* Surcharge / Custom Item Quick Action */}
          <div className="flex items-center justify-between pt-0.5">
            <button
              type="button"
              onClick={() => {
                setCustomItemName('Majoration / Prix Spécial');
                setCustomItemPrice('');
                setCustomItemQty('1');
                setCustomItemCost('');
                setShowCustomItemModal(true);
              }}
              className="w-full py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3 text-emerald-600" />
              + Majoration / Article Hors-Catalogue
            </button>
          </div>

          {selectedCustomer && selectedCustomer.creditBalance > 0 && (
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center justify-between">
              <span>⚠️ Dette en cours pour ce client :</span>
              <strong>{formatMoney(selectedCustomer.creditBalance, settings.currency)}</strong>
            </div>
          )}
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="p-2.5 bg-rose-50 border-b border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Cart Item Rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
          {cart.length > 0 ? (
            cart.map((item) => {
              const origProduct = (products || []).find(p => p.id === item.productId);
              const isHigherPrice = origProduct && item.unitPrice > origProduct.salePrice;
              const isLowerPrice = origProduct && item.unitPrice < origProduct.salePrice;
              const isCustom = item.productId.startsWith('custom_');
              const itemProfit = item.total - (item.unitCost * item.quantity);

              return (
                <div key={item.productId} className="py-2.5 px-2 space-y-2 hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold text-slate-800 truncate">{item.productName}</p>
                        {isCustom && (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">
                            Personnalisé
                          </span>
                        )}
                        {isHigherPrice && (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-black flex items-center gap-0.5">
                            <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />
                            + Gain {formatMoney(item.unitPrice - origProduct.salePrice, settings.currency)}/u
                          </span>
                        )}
                        {isLowerPrice && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">
                            Prix réduit
                          </span>
                        )}
                      </div>
                      
                      {/* Price override & profit indicator */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-semibold text-slate-500">P.U Saisi :</span>
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice || ''}
                          onChange={(e) => updateUnitPrice(item.productId, parseFloat(e.target.value) || 0)}
                          className="w-24 px-1.5 py-0.5 bg-white border border-indigo-200 hover:border-indigo-500 rounded text-xs font-black text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          title="Saisie libre du prix de vente pour ajuster votre bénéfice"
                        />
                        <span className="text-[10px] text-slate-400 font-medium">{settings.currency}</span>

                        {/* Quick Price Bump Buttons */}
                        <div className="flex items-center gap-0.5 ml-1">
                          <button
                            type="button"
                            onClick={() => updateUnitPrice(item.productId, item.unitPrice + 500)}
                            className="px-1 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold transition-colors cursor-pointer"
                            title="Augmenter le prix de 500 FCFA pour plus de bénéfice"
                          >
                            +500
                          </button>
                          <button
                            type="button"
                            onClick={() => updateUnitPrice(item.productId, item.unitPrice + 1000)}
                            className="px-1 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold transition-colors cursor-pointer"
                            title="Augmenter le prix de 1000 FCFA pour plus de bénéfice"
                          >
                            +1000
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-slate-900">
                        {formatMoney(item.total, settings.currency)}
                      </p>
                      {item.discountPercent > 0 && (
                        <span className="text-[10px] text-emerald-600 block">
                          -{item.discountPercent}%
                        </span>
                      )}
                      {item.unitCost > 0 && (
                        <span className="text-[9px] font-bold text-emerald-700 block">
                          Marge: +{formatMoney(itemProfit, settings.currency)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity & Item Discount Controls */}
                  <div className="flex items-center justify-between pt-0.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Inline Discount */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5">
                        <span className="text-[10px] text-slate-500">Remise:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent || ''}
                          placeholder="0"
                          onChange={(e) =>
                            updateDiscount(item.productId, parseFloat(e.target.value) || 0)
                          }
                          className="w-8 text-center text-[11px] font-bold text-indigo-700 bg-transparent focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400">%</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Supprimer la ligne"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6">
              <ShoppingBag className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-medium">Votre ticket de caisse est vide.</p>
              <p className="text-[10px] text-slate-400 mt-1">
                Scannez un code-barres ou cliquez sur un article en stock à gauche.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Cart Summary & Profit Display */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 space-y-2.5">
          {/* Real-time Profit & Margin Card */}
          {cart.length > 0 && (
            <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  Bénéfice estimé sur cette vente :
                </span>
                <strong className="text-xs font-black text-emerald-800">
                  +{formatMoney(totalProfit, settings.currency)} ({profitMarginPercent}%)
                </strong>
              </div>
              {extraGainFromPriceOverride > 0 && (
                <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                  Dont <strong>+{formatMoney(extraGainFromPriceOverride, settings.currency)}</strong> gagnés grâce aux prix majorés !
                </p>
              )}
            </div>
          )}

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Sous-total :</span>
              <span className="font-semibold">{formatMoney(subtotal, settings.currency)}</span>
            </div>
            {settings.taxEnabled && (
              <div className="flex justify-between text-slate-600">
                <span>TVA ({settings.taxRatePercent}%) :</span>
                <span>{formatMoney(taxAmount, settings.currency)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-sm font-black text-slate-900">
              <span>TOTAL À PAYER :</span>
              <span className="text-lg font-black text-indigo-700">
                {formatMoney(totalToPay, settings.currency)}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (cart.length === 0) {
                setErrorMessage('Veuillez ajouter des articles au panier.');
                return;
              }
              setAmountReceived(String(totalToPay));
              setShowCheckoutModal(true);
            }}
            disabled={cart.length === 0}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <Banknote className="w-4 h-4" />
            Encaisser la Vente ({formatMoney(totalToPay, settings.currency)})
          </button>
        </div>
      </div>

      {/* CHECKOUT MODAL: SELECT PAYMENT METHOD & CHANGE */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-400" />
                Règlement de la Vente
              </h3>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Total to pay highlighted */}
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
                <p className="text-xs text-indigo-800 font-medium">Montant Total Net</p>
                <p className="text-2xl font-black text-indigo-900">
                  {formatMoney(totalToPay, settings.currency)}
                </p>
              </div>

              {/* Payment Methods Grid */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Mode de Règlement (Mali)</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'ESPECES', label: 'Espèces (FCFA)', sub: 'Cash en caisse', icon: Banknote, color: 'emerald' },
                    { id: 'MOBILE_MONEY', label: 'Orange Money / Wave', sub: 'Moov / Sama Money', icon: Smartphone, color: 'orange' },
                    { id: 'VIREMENT', label: 'Virement / Chèque', sub: 'BDM / BOA / BMS', icon: CreditCard, color: 'blue' },
                    { id: 'CREDIT', label: 'À Crédit (Dette)', sub: 'Carnet client', icon: Building, color: 'rose' },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                        className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500 font-bold text-indigo-900 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-xs font-bold block leading-tight">{m.label}</span>
                          <span className="text-[10px] text-slate-500">{m.sub}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash Calculation for Espèces */}
              {paymentMethod === 'ESPECES' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Montant reçu du client ({settings.currency})
                    </label>
                    <input
                      type="number"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      placeholder={String(totalToPay)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Fast shortcut buttons */}
                  <div className="flex items-center gap-1.5">
                    {[totalToPay, 5000, 10000, 20000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmountReceived(String(val))}
                        className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {formatMoney(val, '')}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">Monnaie à rendre :</span>
                    <strong className="text-sm font-black text-emerald-700">
                      {formatMoney(changeDue, settings.currency)}
                    </strong>
                  </div>
                </div>
              )}

              {/* Credit Notice */}
              {paymentMethod === 'CREDIT' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                  <p className="font-bold">⚠️ Vente à Crédit</p>
                  <p className="text-[11px]">
                    Cette somme sera automatiquement ajoutée aux créances dues par le client{' '}
                    <strong>{selectedCustomer ? selectedCustomer.name : 'Sélectionnez un client'}</strong>.
                  </p>
                </div>
              )}

              {/* Notes */}
              <div>
                <input
                  type="text"
                  placeholder="Notes sur la vente (optionnel)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
                />
              </div>

              {/* Automatic receipt print toggle switch */}
              <label className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-emerald-50/60 transition-colors">
                <input
                  type="checkbox"
                  checked={settings.autoPrintReceiptOnSale ?? false}
                  onChange={(e) => updateSettings({ autoPrintReceiptOnSale: e.target.checked })}
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Printer className="w-3.5 h-3.5 text-emerald-600" />
                    Impression automatique du ticket de caisse
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {settings.autoPrintReceiptOnSale
                      ? '✓ Le ticket sera automatiquement envoyé à votre imprimante.'
                      : 'Cochez cette case pour activer l’impression automatique.'}
                  </span>
                </div>
              </label>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleValidateSale}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Valider l'Encaissement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      {showCustomItemModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddCustomItem}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in"
          >
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Majoration / Article Spécial
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomItemModal(false)}
                className="text-emerald-200 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Désignation / Libellé *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Majoration prix, Frais de livraison, Emballage..."
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Prix de vente ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Ex: 5000"
                    value={customItemPrice}
                    onChange={(e) => setCustomItemPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Quantité
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={customItemQty}
                    onChange={(e) => setCustomItemQty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Coût d'achat (optionnel)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0 (si pas de coût)"
                  value={customItemCost}
                  onChange={(e) => setCustomItemCost(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomItemModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                >
                  Ajouter au Panier
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCustomer}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in"
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Nouveau Client</h3>
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nom complet / Société *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Oumar Ndiaye"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Numéro de Téléphone
                </label>
                <input
                  type="tel"
                  placeholder="Ex: +221 77 000 00 00"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
                >
                  Enregistrer & Sélectionner
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* INVOICE & RECEIPT MODAL */}
      <InvoiceModal
        sale={lastCompletedSale}
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
      />

      {/* DIRECT PRINTER MODAL */}
      <DirectPrinterModal
        isOpen={showPrinterSettings}
        onClose={() => setShowPrinterSettings(false)}
      />

      {/* CATALOG MULTI-SELECT ARTICLES MODAL */}
      {showSelectProductsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    Sélectionner des Articles pour la Vente
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Cochez ou ajustez les quantités des articles à ajouter au ticket.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSelectProductsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            {/* Filter & Search Bar in Modal */}
            <div className="p-3.5 border-b border-slate-200 bg-slate-50 space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrer par nom, code, code-barres..."
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    autoFocus
                  />
                </div>

                {/* Categories Tab Scroll in Modal */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setModalCategory('all')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      modalCategory === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Toutes ({products.filter((p) => p.active).length})
                  </button>
                  {categories.map((cat) => {
                    const count = products.filter(
                      (p) => p.categoryId === cat.id && p.active
                    ).length;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setModalCategory(cat.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          modalCategory === cat.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {cat.name} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Products Table with Quick Checkbox & Quantity Selectors */}
            <div className="flex-1 overflow-y-auto p-3">
              {modalFilteredProducts.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3 w-10 text-center">Choix</th>
                        <th className="py-2.5 px-3">Désignation de l'article</th>
                        <th className="py-2.5 px-3">Catégorie</th>
                        <th className="py-2.5 px-3 text-center">Stock</th>
                        <th className="py-2.5 px-3 text-right">Prix Unitaire</th>
                        <th className="py-2.5 px-3 text-center w-36">Quantité à Vendre</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {modalFilteredProducts.map((prod) => {
                        const isOutOfStock = prod.currentStock <= 0;
                        const qty = modalSelectedItems[prod.id] || 0;
                        const isSelected = qty > 0;
                        const catName =
                          categories.find((c) => c.id === prod.categoryId)?.name || 'Général';

                        return (
                          <tr
                            key={prod.id}
                            className={`transition-colors ${
                              isSelected
                                ? 'bg-indigo-50/60 font-semibold'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isOutOfStock && !settings.allowNegativeStock}
                                onChange={() => handleModalToggleItem(prod)}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <p className="font-bold text-slate-800">{prod.name}</p>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {prod.code} {prod.barcode ? `• ${prod.barcode}` : ''}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-600">{catName}</td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isOutOfStock
                                    ? 'bg-rose-100 text-rose-800'
                                    : prod.currentStock <= prod.minStock
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {isOutOfStock ? '0 (Rupture)' : `${prod.currentStock} ${prod.unit}`}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-black text-indigo-700">
                              {formatMoney(prod.salePrice, settings.currency)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  disabled={qty <= 0}
                                  onClick={() => handleModalQuantityChange(prod.id, qty - 1)}
                                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 flex items-center justify-center text-xs cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  max={!settings.allowNegativeStock ? prod.currentStock : undefined}
                                  value={qty}
                                  onChange={(e) =>
                                    handleModalQuantityChange(
                                      prod.id,
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-12 text-center py-0.5 border border-slate-200 rounded font-bold text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  disabled={
                                    !settings.allowNegativeStock && qty >= prod.currentStock
                                  }
                                  onClick={() => handleModalQuantityChange(prod.id, qty + 1)}
                                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 flex items-center justify-center text-xs cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                  <p className="text-xs font-semibold">Aucun article trouvé pour cette recherche.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setModalSearchTerm('');
                      setModalCategory('all');
                    }}
                    className="text-xs text-indigo-600 font-bold hover:underline"
                  >
                    Effacer les filtres
                  </button>
                </div>
              )}
            </div>

            {/* Modal Bottom Sticky Summary & Validation Footer */}
            <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs">
                <span className="font-bold text-slate-700">
                  Articles sélectionnés :{' '}
                  <strong className="text-indigo-600 font-black text-sm">
                    {modalSelectedCount}
                  </strong>
                </span>
                <span className="text-slate-300">|</span>
                <span className="font-bold text-slate-700">
                  Total estimé :{' '}
                  <strong className="text-emerald-700 font-black text-sm">
                    {formatMoney(modalSelectedTotal, settings.currency)}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowSelectProductsModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleApplySelectedModalProducts}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Valider et Ajouter au Panier ({modalSelectedCount})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD PRODUCT ON THE FLY MODAL */}
      {showQuickAddProductModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleQuickCreateProduct}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in"
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">Créer & Vendre un Nouvel Article</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddProductModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nom / Désignation de l'article *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Savon liquide 1L, Huile de palme 5L..."
                  value={quickProdName}
                  onChange={(e) => setQuickProdName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Prix de Vente ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Ex: 2500"
                    value={quickProdPrice}
                    onChange={(e) => setQuickProdPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Prix d'Achat / Coût ({settings.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 1800"
                    value={quickProdCost}
                    onChange={(e) => setQuickProdCost(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Stock Initial
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quickProdStock}
                    onChange={(e) => setQuickProdStock(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Unité de Vente
                  </label>
                  <select
                    value={quickProdUnit}
                    onChange={(e) => setQuickProdUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="pièce">Pièce / Unité</option>
                    <option value="paquet">Paquet / Carton</option>
                    <option value="kg">Kilogramme (kg)</option>
                    <option value="litre">Litre (L)</option>
                    <option value="mètre">Mètre (m)</option>
                    <option value="sac">Sac</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Catégorie
                </label>
                <select
                  value={quickProdCategory}
                  onChange={(e) => setQuickProdCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Code / Référence
                  </label>
                  <input
                    type="text"
                    placeholder="Auto si vide"
                    value={quickProdCode}
                    onChange={(e) => setQuickProdCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Code-barres (optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="Scan ou EAN"
                    value={quickProdBarcode}
                    onChange={(e) => setQuickProdBarcode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAddProductModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Enregistrer & Ajouter au Panier
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
      </div>
    </div>
  );
};
