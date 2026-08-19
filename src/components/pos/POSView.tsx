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
  Settings as SettingsIcon
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
  printViaRawBT
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
    createSale,
    settings,
    cashRegister,
  } = useStore();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [barcodeInput, setBarcodeInput] = useState('');

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
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Focus barcode input on mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Filter products for catalog grid
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
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

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

      // Automatic direct print if configured
      if (settings.autoPrintReceiptOnSale) {
        setTimeout(async () => {
          try {
            if (settings.printerType === 'USB_SERIAL') {
              await printViaWebSerial(saleRecord, settings, selectedCustomer);
            } else if (settings.printerType === 'BLUETOOTH') {
              await printViaWebBluetooth(saleRecord, settings, selectedCustomer);
            } else if (settings.printerType === 'RAWBT') {
              printViaRawBT(saleRecord, settings, selectedCustomer);
            } else {
              const html = generateThermalReceiptHtml(
                saleRecord,
                settings,
                selectedCustomer,
                settings.directThermalWidthMm || 80
              );
              executeDirectPrint(html);
            }
          } catch (e) {
            console.error('Auto-print error:', e);
          }
        }, 350);
      }
    } else {
      setErrorMessage(result.message || 'Erreur lors de la validation de la vente.');
    }
  };

  const selectedCustomer = (customers || []).find((c) => c.id === selectedCustomerId);

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col lg:flex-row gap-4 pb-2">
      {/* LEFT COLUMN: PRODUCTS CATALOG & BARCODE SCANNER */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Search, Barcode & Category Bar */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par nom, code ou marque..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Barcode Quick Scanner Form */}
            <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-1.5 sm:w-64">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Scanner code-barres..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Scan
              </button>
            </form>
          </div>

          {/* Categories Tab Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Tous ({products.filter((p) => p.active).length})
            </button>
            {categories.map((cat) => {
              const count = products.filter(
                (p) => p.categoryId === cat.id && p.active
              ).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
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
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 p-3.5 overflow-y-auto">
          {filteredProducts.length > 0 ? (
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
                    className={`text-left p-3 rounded-xl border flex flex-col justify-between transition-all relative group ${
                      inCart
                        ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500'
                        : isOutOfStock
                        ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                        : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                    }`}
                  >
                    {inCart && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shadow-xs">
                        {inCart.quantity}
                      </span>
                    )}

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {product.code}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                        {product.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-end justify-between">
                      <div>
                        <p className="text-xs font-black text-indigo-700">
                          {formatMoney(product.salePrice, settings.currency)}
                        </p>
                        <span
                          className={`text-[10px] font-semibold ${
                            isOutOfStock
                              ? 'text-rose-600'
                              : isLowStock
                              ? 'text-amber-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {isOutOfStock
                            ? 'Rupture'
                            : `Stock: ${product.currentStock} ${product.unit}`}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
              <ShoppingBag className="w-10 h-10 stroke-1 mb-2 text-slate-300" />
              <p className="text-xs font-medium">Aucun produit ne correspond à cette recherche.</p>
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
            cart.map((item) => (
              <div key={item.productId} className="py-2.5 px-2 space-y-1.5 hover:bg-slate-50 rounded-lg">
                <div className="flex items-start justify-between gap-2">
                  <div className="truncate flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{item.productName}</p>
                    <p className="text-[10px] text-slate-500">
                      {formatMoney(item.unitPrice, settings.currency)} unitaire
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-900">
                      {formatMoney(item.total, settings.currency)}
                    </p>
                    {item.discountPercent > 0 && (
                      <span className="text-[10px] text-emerald-600">
                        -{item.discountPercent}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity & Item Discount Controls */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-slate-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Inline Discount */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
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
                      onClick={() => removeFromCart(item.productId)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Supprimer la ligne"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6">
              <ShoppingBag className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs">Votre ticket de caisse est vide.</p>
              <p className="text-[10px] text-slate-400 mt-1">
                Scannez un code-barres ou cliquez sur un article à gauche.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Cart Summary & Pay Trigger */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 space-y-2.5">
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
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmer & Imprimer Reçu
                </button>
              </div>
            </div>
          </div>
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
    </div>
  );
};
