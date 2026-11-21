import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Printer,
  Share2,
  Trash2,
  CheckCircle2,
  Clock,
  Send,
  Eye,
  ShoppingBag,
  User,
  Phone,
  FileText,
  Copy,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Check,
  Calendar,
  AlertCircle,
  Edit3
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Quote, QuoteItem, Customer, Product, PaymentMethod } from '../../types';
import { STORE_LOGO_BASE64 } from '../../assets/logoBase64';
import { formatMoney, formatDate, formatDateTime } from '../../utils/formatters';
import { executeDirectPrint } from '../../utils/printService';
import { ConfirmModal } from '../common/ConfirmModal';

export const QuotesView: React.FC = () => {
  const {
    quotes,
    products,
    customers,
    addQuote,
    updateQuote,
    deleteQuote,
    convertQuoteToSale,
    settings,
    currentUser,
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BROUILLON' | 'ENVOYE' | 'ACCEPTE' | 'REFUSE' | 'CONVERTI'>('ALL');

  // Modal: Create / Edit Quote
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [quoteCustomerName, setQuoteCustomerName] = useState('');
  const [quoteCustomerPhone, setQuoteCustomerPhone] = useState('');
  const [quoteCustomerId, setQuoteCustomerId] = useState('');
  const [quoteValidUntil, setQuoteValidUntil] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteTerms, setQuoteTerms] = useState('Paiement à la livraison / Validité 30 jours.');
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);

  // Item addition inside quote modal
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');

  // View / Print / Confirm / Convert Modals
  const [selectedQuoteForPrint, setSelectedQuoteForPrint] = useState<Quote | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [quoteToConvert, setQuoteToConvert] = useState<Quote | null>(null);
  const [convertPaymentMethod, setConvertPaymentMethod] = useState<PaymentMethod>('ESPECES');
  const [convertAmountReceived, setConvertAmountReceived] = useState<string>('0');
  const [convertError, setConvertError] = useState<string | null>(null);

  // Filtered Quotes
  const filteredQuotes = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return (quotes || []).filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (q) {
        const numMatch = (item.quoteNumber || '').toLowerCase().includes(q);
        const nameMatch = (item.customerName || '').toLowerCase().includes(q);
        const phoneMatch = (item.customerPhone || '').toLowerCase().includes(q);
        return numMatch || nameMatch || phoneMatch;
      }
      return true;
    });
  }, [quotes, statusFilter, searchTerm]);

  // Open Create Quote Modal
  const handleOpenCreateModal = () => {
    setEditingQuote(null);
    setQuoteError(null);
    setQuoteCustomerName('');
    setQuoteCustomerPhone('');
    setQuoteCustomerId('');
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setQuoteValidUntil(in30Days);
    setQuoteNotes('');
    setQuoteTerms('Offre valable 30 jours. Prix TTC.');
    setQuoteItems([]);
    setShowQuoteModal(true);
  };

  // Open Edit Quote Modal
  const handleOpenEditModal = (quote: Quote) => {
    setEditingQuote(quote);
    setQuoteError(null);
    setQuoteCustomerId(quote.customerId || '');
    setQuoteCustomerName(quote.customerName || '');
    setQuoteCustomerPhone(quote.customerPhone || '');
    setQuoteValidUntil(quote.validUntil ? quote.validUntil.slice(0, 10) : '');
    setQuoteNotes(quote.notes || '');
    setQuoteTerms(quote.terms || 'Offre valable 30 jours. Prix TTC.');
    setQuoteItems((quote.items || []).map(it => ({ ...it })));
    setShowQuoteModal(true);
  };

  // Add Item to current quote
  const handleAddItemToQuote = () => {
    setQuoteError(null);
    const qty = Math.max(0.01, parseFloat(itemQuantity) || 1);
    const price = parseFloat(itemPrice) || 0;

    if (price <= 0) {
      setQuoteError('Le prix unitaire doit être supérieur à 0.');
      return;
    }

    const pId = selectedProductId;
    let pName = customItemName.trim();
    let pCode = 'ART';
    let pUnit = 'unité';

    if (selectedProductId) {
      const prod = (products || []).find(p => p.id === selectedProductId);
      if (prod) {
        pName = prod.name;
        pCode = prod.code;
        pUnit = prod.unit;
      }
    }

    if (!pName) {
      setQuoteError('Veuillez sélectionner un article ou saisir une désignation.');
      return;
    }

    const total = Math.round(qty * price);
    const newItem: QuoteItem = {
      productId: pId || `custom_${Date.now()}`,
      productName: pName,
      productCode: pCode,
      productUnit: pUnit,
      quantity: qty,
      unitPrice: price,
      discountPercent: 0,
      total,
    };

    setQuoteItems((prev) => [...prev, newItem]);
    setSelectedProductId('');
    setCustomItemName('');
    setItemPrice('');
    setItemQuantity('1');
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setQuoteItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Save Quote
  const handleSaveQuote = (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteError(null);
    if (quoteItems.length === 0) {
      setQuoteError('Veuillez ajouter au moins un article au devis.');
      return;
    }

    let cName = quoteCustomerName.trim();
    let cPhone = quoteCustomerPhone.trim();

    if (quoteCustomerId) {
      const cust = (customers || []).find(c => c.id === quoteCustomerId);
      if (cust) {
        cName = cust.name;
        cPhone = cust.phone;
      }
    }

    if (!cName) {
      setQuoteError('Veuillez renseigner le nom du client.');
      return;
    }

    const subtotal = quoteItems.reduce((acc, it) => acc + it.total, 0);
    const totalAmount = subtotal;

    if (editingQuote) {
      updateQuote(editingQuote.id, {
        customerName: cName,
        customerPhone: cPhone,
        customerId: quoteCustomerId || undefined,
        items: quoteItems,
        subtotal,
        totalAmount,
        validUntil: quoteValidUntil || undefined,
        notes: quoteNotes || undefined,
        terms: quoteTerms || undefined,
      });
    } else {
      addQuote({
        date: new Date().toISOString(),
        customerId: quoteCustomerId || undefined,
        customerName: cName,
        customerPhone: cPhone,
        items: quoteItems,
        subtotal,
        discountTotal: 0,
        taxAmount: 0,
        totalAmount,
        validUntil: quoteValidUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: quoteNotes || undefined,
        terms: quoteTerms || undefined,
        status: 'ENVOYE',
      });
    }

    setShowQuoteModal(false);
    setToastMessage(editingQuote ? `✅ Devis ${editingQuote.quoteNumber} mis à jour.` : '✅ Nouveau devis enregistré.');
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Open Conversion Modal
  const handleOpenConvertModal = (quote: Quote) => {
    setQuoteToConvert(quote);
    setConvertPaymentMethod('ESPECES');
    setConvertAmountReceived(String(quote.totalAmount));
    setConvertError(null);
  };

  // Execute Quote -> Sale conversion
  const handleConfirmConvertQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteToConvert) return;
    setConvertError(null);
    const amountNum = convertPaymentMethod === 'CREDIT' ? 0 : Math.max(0, parseFloat(convertAmountReceived) || 0);
    const res = convertQuoteToSale(quoteToConvert.id, convertPaymentMethod, amountNum);
    if (res.success && res.sale) {
      setToastMessage(`✅ Devis ${quoteToConvert.quoteNumber} converti en facture ${res.sale.invoiceNumber} et déstocké !`);
      setTimeout(() => setToastMessage(null), 5000);
      setQuoteToConvert(null);
    } else {
      setConvertError(res.message || 'Erreur lors de la conversion du devis.');
    }
  };

  // Print Quote
  const printQuoteDoc = (quote: Quote) => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Devis / Proforma - ${quote.quoteNumber}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.25; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 14px; }
          .quote-logo {
            max-height: 100px;
            max-width: 190px;
            object-fit: contain;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            padding: 2px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @media print {
            .quote-logo {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          .shop-brand-title {
            font-family: 'Playfair Display', 'Cinzel', 'Didot', 'Georgia', serif;
            font-size: 24px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: 2px;
            line-height: 1.05;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .shop-brand-subtitle {
            font-size: 11px;
            font-weight: 800;
            color: #334155;
            letter-spacing: 4px;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .shop-brand-tagline {
            font-size: 10px;
            font-weight: 700;
            color: #64748b;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .doc-title { font-size: 22px; font-weight: 900; color: #4338ca; text-align: right; line-height: 1.15; }
          .meta-box { display: flex; justify-content: space-between; margin-bottom: 14px; background: #f8fafc; padding: 10px 12px; border-radius: 8px; line-height: 1.25; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-size: 11.5px; font-weight: 700; text-transform: uppercase; line-height: 1.2; }
          td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; line-height: 1.2; }
          .total-box { margin-left: auto; width: 280px; margin-top: 10px; border-top: 2px solid #0f172a; padding-top: 6px; }
          .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; line-height: 1.2; }
          .footer { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10.5px; text-align: center; color: #64748b; line-height: 1.25; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img class="quote-logo" src="${settings.logoUrl || STORE_LOGO_BASE64}" alt="Logo" />
            <div>
              ${(!settings.storeName || settings.storeName.toUpperCase().includes('TANE FAH'))
                ? `<div class="shop-brand-title">TANE FAH</div><div class="shop-brand-subtitle">C O L L E C T I O N</div>`
                : `<div class="shop-brand-title">${settings.storeName || settings.shopName || 'MA BOUTIQUE'}</div>`
              }
              ${settings.storeTagline ? `<div class="shop-brand-tagline">— ${settings.storeTagline} —</div>` : ''}
              <div style="font-size: 11px; color: #475569; margin-top: 2px;">${settings.address || settings.shopAddress || ''}</div>
              <div style="font-size: 11px; color: #475569;">Tél : ${settings.phone || settings.shopPhone || ''}</div>
              ${(settings.email || settings.shopEmail) ? `<div style="font-size: 11px; color: #475569;">Email : ${settings.email || settings.shopEmail}</div>` : ''}
            </div>
          </div>
          <div>
            <div class="doc-title">DEVIS / PROFORMA</div>
            <div style="font-weight: bold; text-align: right;">N° ${quote.quoteNumber}</div>
            <div style="text-align: right; font-size: 12px;">Date: ${formatDate(quote.createdAt)}</div>
            ${quote.validUntil ? `<div style="text-align: right; font-size: 12px; color: #dc2626;">Valable jusqu'au: ${formatDate(quote.validUntil)}</div>` : ''}
          </div>
        </div>

        <div class="meta-box">
          <div>
            <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold;">Client :</span>
            <div style="font-size: 15px; font-weight: bold;">${quote.customerName}</div>
            ${quote.customerPhone ? `<div>Tél : ${quote.customerPhone}</div>` : ''}
          </div>
          <div>
            <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold;">Émis par :</span>
            <div>${quote.userName || 'Le Responsable'}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Désignation de l'article</th>
              <th style="text-align: center;">Qté</th>
              <th style="text-align: right;">Prix Unitaire</th>
              <th style="text-align: right;">Total HT/TTC</th>
            </tr>
          </thead>
          <tbody>
            ${quote.items.map(it => `
              <tr>
                <td><strong>${it.productName}</strong></td>
                <td style="text-align: center;">${it.quantity}</td>
                <td style="text-align: right;">${formatMoney(it.unitPrice, settings.currency)}</td>
                <td style="text-align: right; font-weight: bold;">${formatMoney(it.total, settings.currency)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-box">
          <div class="total-row">
            <span>TOTAL NET :</span>
            <span>${formatMoney(quote.totalAmount, settings.currency)}</span>
          </div>
        </div>

        ${quote.terms ? `
          <div style="margin-top: 25px; padding: 12px; background: #f1f5f9; border-radius: 8px; font-size: 12px;">
            <strong>Conditions :</strong> ${quote.terms}
          </div>
        ` : ''}

        ${quote.notes ? `
          <div style="margin-top: 10px; font-size: 12px; color: #475569;">
            <strong>Notes :</strong> ${quote.notes}
          </div>
        ` : ''}

        <div class="footer">
          Merci pour votre confiance. Ce document est un devis commercial et ne constitue pas une facture définitive avant validation.
        </div>
      </body>
      </html>
    `;

    executeDirectPrint(html);
  };

  // WhatsApp Share
  const handleShareWhatsApp = (quote: Quote) => {
    let text = `*DEVIS PROFORMA N° ${quote.quoteNumber}*\n`;
    text += `*Boutique :* ${settings.storeName || settings.shopName || 'Ma Boutique'}\n`;
    text += `*Client :* ${quote.customerName}\n`;
    text += `*Date :* ${formatDate(quote.createdAt)}\n\n`;
    text += `*ARTICLES PROPOSÉS :*\n`;
    quote.items.forEach((it, i) => {
      text += `${i + 1}. ${it.productName} x${it.quantity} = ${formatMoney(it.total, settings.currency)}\n`;
    });
    text += `\n*TOTAL NET : ${formatMoney(quote.totalAmount, settings.currency)}*\n`;
    if (quote.validUntil) text += `Valide jusqu'au: ${formatDate(quote.validUntil)}\n`;
    if (quote.terms) text += `Conditions: ${quote.terms}\n`;
    text += `\nMerci de nous contacter au ${settings.phone || settings.shopPhone || ''} pour confirmation.`;

    const phone = quote.customerPhone ? quote.customerPhone.replace(/[^0-9]/g, '') : '';
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  return (
    <div className="space-y-5">
      {toastMessage && (
        <div className="p-3 bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-between animate-in fade-in">
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-200 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            Devis & Factures Proformas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Création de propositions de prix, impression PDF, envoi WhatsApp et conversion automatique en vente.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nouveau Devis Proforma
        </button>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            {['ALL', 'ENVOYE', 'ACCEPTE', 'CONVERTI', 'REFUSE'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' && `Tous (${quotes.length})`}
                {st === 'ENVOYE' && `En cours (${quotes.filter(q => q.status === 'ENVOYE' || q.status === 'BROUILLON').length})`}
                {st === 'ACCEPTE' && `Acceptés (${quotes.filter(q => q.status === 'ACCEPTE').length})`}
                {st === 'CONVERTI' && `Convertis en vente (${quotes.filter(q => q.status === 'CONVERTI').length})`}
                {st === 'REFUSE' && `Refusés (${quotes.filter(q => q.status === 'REFUSE').length})`}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par n° de devis, client, téléphone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* QUOTES LIST */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">N° Devis</th>
                <th className="p-3.5">Date & Validité</th>
                <th className="p-3.5">Client</th>
                <th className="p-3.5 text-center">Articles</th>
                <th className="p-3.5 text-right">Montant Total</th>
                <th className="p-3.5">Statut</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotes.length > 0 ? (
                filteredQuotes.map((quote) => {
                  const isConverted = quote.status === 'CONVERTI';

                  return (
                    <tr key={quote.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-bold font-mono text-indigo-700">
                        {quote.quoteNumber}
                      </td>
                      <td className="p-3.5">
                        <p className="text-slate-800">{formatDate(quote.createdAt)}</p>
                        {quote.validUntil && (
                          <span className="text-[10px] text-slate-400">
                            Jusqu'au {formatDate(quote.validUntil)}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900">{quote.customerName}</p>
                        {quote.customerPhone && (
                          <span className="text-[10px] text-slate-500">{quote.customerPhone}</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-700">
                        {quote.items.length}
                      </td>
                      <td className="p-3.5 text-right font-black text-sm text-indigo-900">
                        {formatMoney(quote.totalAmount, settings.currency)}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isConverted
                              ? 'bg-emerald-100 text-emerald-800'
                              : quote.status === 'REFUSE'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {isConverted ? 'Converti en vente' : quote.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isConverted && (
                            <button
                              type="button"
                              onClick={() => handleOpenConvertModal(quote)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                              title="Transformer ce devis en vente"
                            >
                              <ShoppingBag className="w-3 h-3" />
                              Convertir
                            </button>
                          )}
                          {!isConverted && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(quote)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                              title="Modifier ce devis"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => printQuoteDoc(quote)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="Imprimer le devis"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(quote)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                            title="Envoyer par WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuoteToDelete(quote)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    Aucun devis trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE QUOTE MODAL */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveQuote}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in"
          >
            <div className="p-4 bg-indigo-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                {editingQuote ? 'Modifier le Devis' : 'Nouveau Devis Proforma'}
              </h3>
              <button
                type="button"
                onClick={() => setShowQuoteModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[85vh] overflow-y-auto">
              {quoteError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{quoteError}</span>
                </div>
              )}
              {/* Client selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Client enregistré
                  </label>
                  <select
                    value={quoteCustomerId}
                    onChange={(e) => {
                      setQuoteCustomerId(e.target.value);
                      if (e.target.value) {
                        setQuoteCustomerName('');
                        setQuoteCustomerPhone('');
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Ou saisir manuellement --</option>
                    {(customers || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone || 'Pas de numéro'})
                      </option>
                    ))}
                  </select>
                </div>

                {!quoteCustomerId && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Nom du client *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Entreprise SAKO"
                        value={quoteCustomerName}
                        onChange={(e) => setQuoteCustomerName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Téléphone</label>
                      <input
                        type="tel"
                        placeholder="Ex: 76 00 00 00"
                        value={quoteCustomerPhone}
                        onChange={(e) => setQuoteCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Add items section */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  Ajouter un article au devis
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        setSelectedProductId(e.target.value);
                        if (e.target.value) {
                          const prod = (products || []).find(p => p.id === e.target.value);
                          if (prod) {
                            setItemPrice(String(prod.salePrice));
                            setCustomItemName('');
                          }
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                    >
                      <option value="">-- Choisir du catalogue ou taper ci-dessous --</option>
                      {(products || []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({formatMoney(p.salePrice, settings.currency)})
                        </option>
                      ))}
                    </select>
                    {!selectedProductId && (
                      <input
                        type="text"
                        placeholder="Ou désignation personnalisée..."
                        value={customItemName}
                        onChange={(e) => setCustomItemName(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                      />
                    )}
                  </div>
                  <div>
                    <input
                      type="number"
                      min="1"
                      placeholder="Prix unitaire"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-indigo-900 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qté"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(e.target.value)}
                      className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center font-bold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddItemToQuote}
                      className="flex-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700"
                    >
                      + Ajouter
                    </button>
                  </div>
                </div>
              </div>

              {/* Items List Table */}
              <div>
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      <th className="p-2">Article</th>
                      <th className="p-2 text-center">Qté</th>
                      <th className="p-2 text-right">P.U</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quoteItems.length > 0 ? (
                      quoteItems.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-medium text-slate-800">{it.productName}</td>
                          <td className="p-2 text-center font-bold">{it.quantity}</td>
                          <td className="p-2 text-right">{formatMoney(it.unitPrice, settings.currency)}</td>
                          <td className="p-2 text-right font-black text-indigo-900">
                            {formatMoney(it.total, settings.currency)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-rose-500 hover:text-rose-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">
                          Aucun article ajouté au devis.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total Calculation */}
              <div className="flex justify-end p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                <div className="text-right">
                  <span className="text-xs text-indigo-700 font-medium">Montant Total Proforma : </span>
                  <strong className="text-lg font-black text-indigo-900 ml-2">
                    {formatMoney(quoteItems.reduce((a, b) => a + b.total, 0), settings.currency)}
                  </strong>
                </div>
              </div>

              {/* Validity & Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Date d'expiration / Validité
                  </label>
                  <input
                    type="date"
                    value={quoteValidUntil}
                    onChange={(e) => setQuoteValidUntil(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Conditions de paiement</label>
                  <input
                    type="text"
                    value={quoteTerms}
                    onChange={(e) => setQuoteTerms(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuoteModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Enregistrer & Émettre le Devis
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* CONVERT QUOTE TO SALE MODAL */}
      {quoteToConvert && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmConvertQuote}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in"
          >
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Convertir le Devis {quoteToConvert.quoteNumber}
              </h3>
              <button
                type="button"
                onClick={() => setQuoteToConvert(null)}
                className="text-white hover:opacity-80 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              {convertError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold">
                  ⚠️ {convertError}
                </div>
              )}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                <span className="text-slate-600 font-semibold">Total du devis ({quoteToConvert.customerName}) :</span>
                <strong className="text-base font-black text-emerald-700">
                  {formatMoney(quoteToConvert.totalAmount, settings.currency)}
                </strong>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mode de paiement *</label>
                <select
                  value={convertPaymentMethod}
                  onChange={(e) => {
                    const method = e.target.value as PaymentMethod;
                    setConvertPaymentMethod(method);
                    setConvertAmountReceived(method === 'CREDIT' ? '0' : String(quoteToConvert.totalAmount));
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold bg-white"
                >
                  <option value="ESPECES">Espèces</option>
                  <option value="MOBILE_MONEY">Mobile Money (Wave / OM)</option>
                  <option value="CARTE_BANCAIRE">Carte Bancaire</option>
                  <option value="VIREMENT">Virement Bancaire</option>
                  <option value="CREDIT">À Crédit (Dette client)</option>
                </select>
              </div>
              {convertPaymentMethod !== 'CREDIT' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Montant encaissé ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={convertAmountReceived}
                    onChange={(e) => setConvertAmountReceived(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-black text-sm text-emerald-700"
                  />
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuoteToConvert(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Valider la Vente & Déstocker
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(quoteToDelete)}
        title="Supprimer ce devis ?"
        message={
          quoteToDelete
            ? `Voulez-vous supprimer définitivement le devis ${quoteToDelete.quoteNumber} (${quoteToDelete.customerName}) ?`
            : ''
        }
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={() => {
          if (quoteToDelete) {
            deleteQuote(quoteToDelete.id);
            setToastMessage(`Devis ${quoteToDelete.quoteNumber} supprimé.`);
            setTimeout(() => setToastMessage(null), 4000);
          }
          setQuoteToDelete(null);
        }}
        onCancel={() => setQuoteToDelete(null)}
      />
    </div>
  );
};
