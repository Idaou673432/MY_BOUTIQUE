import React, { useState } from 'react';
import {
  Printer,
  X,
  FileText,
  Receipt,
  Share2,
  Copy,
  CheckCircle2,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { Sale, Customer } from '../../types';
import { useStore } from '../../context/StoreContext';
import {
  formatMoney,
  formatDateTime,
  formatDate,
  getPaymentMethodLabel,
  numberToWordsFrench,
  formatQuantity,
} from '../../utils/formatters';

interface InvoiceModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  initialFormat?: 'A4' | 'TICKET';
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  sale,
  isOpen,
  onClose,
  initialFormat,
}) => {
  const { settings, customers } = useStore();
  const [printFormat, setPrintFormat] = useState<'A4' | 'TICKET'>(
    initialFormat || settings.defaultInvoiceFormat || 'A4'
  );
  const [copied, setCopied] = useState(false);

  if (!isOpen || !sale) return null;

  const customer: Customer | undefined = sale.customerId
    ? (customers || []).find((c) => c.id === sale.customerId)
    : undefined;

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const lines = [
      `*FACTURE ${sale.invoiceNumber}* - ${settings.storeName || 'Boutique'}`,
      `Date: ${formatDateTime(sale.date)}`,
      `Client: ${sale.customerName || 'Client Comptoir'}`,
      `---------------------------------`,
      ...sale.items.map(
        (it) =>
          `• ${it.productName} (x${it.quantity} ${it.productUnit || ''}) : ${formatMoney(
            it.total,
            settings.currency
          )}`
      ),
      `---------------------------------`,
      `Total Net: ${formatMoney(sale.totalAmount, settings.currency)}`,
      `Paiement: ${getPaymentMethodLabel(sale.paymentMethod)}`,
      `Merci pour votre confiance !`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Bonjour ${sale.customerName || 'Cher client'},\nVoici le récapitulatif de votre facture *${
        sale.invoiceNumber
      }* chez *${settings.storeName || 'notre boutique'}* :\n` +
        `Montant Total: *${formatMoney(sale.totalAmount, settings.currency)}*\n` +
        `Date: ${formatDateTime(sale.date)}\n` +
        `Articles: ${sale.items.length} article(s)\n` +
        `Merci de votre confiance !`
    );
    const phone = customer?.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:h-auto print:border-none print:shadow-none print:w-full print:rounded-none">
        
        {/* Top Header Bar - Hidden in Print */}
        <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 no-print border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight flex items-center gap-2">
                Facture & Reçu Client
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                  {sale.invoiceNumber}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Impression standardisée pour tout type de commerce
              </p>
            </div>
          </div>

          {/* Format Selector & Close */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
              <button
                onClick={() => setPrintFormat('A4')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  printFormat === 'A4'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Facture</span> A4
              </button>
              <button
                onClick={() => setPrintFormat('TICKET')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  printFormat === 'TICKET'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ticket</span> 80mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Controls Bar - Hidden in Print */}
        <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 no-print text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Facture conforme aux normes commerciales & fiscales</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copié !' : 'Copier résumé'}
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-xs transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              WhatsApp
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs transition-all"
            >
              <Printer className="w-4 h-4" />
              Imprimer {printFormat === 'A4' ? 'Facture A4' : 'Ticket'}
            </button>
          </div>
        </div>

        {/* PRINTABLE CONTENT AREA */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/60 print:bg-white print:p-0">
          
          {/* ========================================================= */}
          {/* FORMAT A4 OFFICIEL / NORMALISÉ */}
          {/* ========================================================= */}
          {printFormat === 'A4' && (
            <div
              id="printable-receipt"
              className="bg-white p-6 sm:p-10 mx-auto border border-slate-200 shadow-md text-slate-900 rounded-xl max-w-3xl print:border-none print:shadow-none print:p-2 print:max-w-full"
            >
              {/* Top Business Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-900">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-xs">
                      {settings.storeName ? settings.storeName.charAt(0).toUpperCase() : 'B'}
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                        {settings.storeName || 'Boutique & Négoce Général'}
                      </h1>
                      {settings.storeTagline && (
                        <p className="text-xs text-slate-600 font-medium">{settings.storeTagline}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-0.5 pt-2">
                    {settings.address && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{settings.address}</span>
                      </p>
                    )}
                    {settings.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Tél: <strong>{settings.phone}</strong></span>
                      </p>
                    )}
                    {settings.email && (
                      <p className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Email: {settings.email}</span>
                      </p>
                    )}
                    {settings.nifRccm && (
                      <p className="text-[11px] font-mono text-slate-500 font-semibold pt-0.5">
                        NIF / RCCM / SIRET : {settings.nifRccm}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Document Title & Reference */}
                <div className="text-left sm:text-right space-y-1 self-stretch sm:self-auto bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="inline-block px-3 py-1 bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded">
                    FACTURE COMMERCIALE
                  </div>
                  <p className="text-base font-black font-mono text-indigo-700">
                    N° {sale.invoiceNumber}
                  </p>
                  <p className="text-xs text-slate-600">
                    <strong>Date :</strong> {formatDateTime(sale.date)}
                  </p>
                  <p className="text-xs text-slate-600">
                    <strong>Caissier :</strong> {sale.userName}
                  </p>
                  <p className="text-xs text-slate-600">
                    <strong>Règlement :</strong> {getPaymentMethodLabel(sale.paymentMethod)}
                  </p>
                </div>
              </div>

              {/* Client & Billing Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-slate-200 text-xs">
                {/* Client Info */}
                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">
                    Facturé à / Client :
                  </p>
                  <p className="text-sm font-extrabold text-slate-900">
                    {sale.customerName || 'Client Comptoir'}
                  </p>
                  {customer?.phone && (
                    <p className="text-slate-600">
                      <strong>Tél :</strong> {customer.phone}
                    </p>
                  )}
                  {customer?.address && (
                    <p className="text-slate-600">
                      <strong>Adresse :</strong> {customer.address}
                    </p>
                  )}
                  {customer?.email && (
                    <p className="text-slate-600">
                      <strong>Email :</strong> {customer.email}
                    </p>
                  )}
                  {!customer && !sale.customerName && (
                    <p className="text-slate-400 italic">Vente au comptoir / Client occasionnel</p>
                  )}
                </div>

                {/* Payment Condition & Legal details */}
                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">
                    Modalités & Paiement :
                  </p>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Statut du paiement :</span>
                    <span
                      className={`font-bold ${
                        sale.paymentMethod === 'CREDIT' ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {sale.paymentMethod === 'CREDIT' ? 'À Crédit (En attente)' : 'Réglé intégralement'}
                    </span>
                  </div>
                  {settings.bankDetails && (
                    <p className="text-slate-600 text-[11px] pt-1">
                      <strong>RIB / Banque :</strong> {settings.bankDetails}
                    </p>
                  )}
                  {settings.mobileMoneyNumber && (
                    <p className="text-slate-600 text-[11px]">
                      <strong>Mobile Money (Wave / OM) :</strong> {settings.mobileMoneyNumber}
                    </p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="py-5">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                      <th className="p-2.5 rounded-l-lg">N°</th>
                      <th className="p-2.5">Désignation de l'article</th>
                      <th className="p-2.5 text-center">Unité</th>
                      <th className="p-2.5 text-center">Qté</th>
                      <th className="p-2.5 text-right">Prix Unitaire</th>
                      <th className="p-2.5 text-center">Remise</th>
                      <th className="p-2.5 text-right rounded-r-lg">Total Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sale.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-2.5 font-semibold text-slate-900">
                          {item.productName}
                          {item.productCode && (
                            <span className="block text-[10px] font-mono text-slate-400">
                              Réf: {item.productCode}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center text-slate-600">
                          {item.productUnit || 'pièce'}
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-900">
                          {formatQuantity(item.quantity)}
                        </td>
                        <td className="p-2.5 text-right text-slate-700">
                          {formatMoney(item.unitPrice, '')}
                        </td>
                        <td className="p-2.5 text-center text-slate-600">
                          {item.discountPercent > 0 ? (
                            <span className="font-bold text-emerald-600">
                              -{item.discountPercent}%
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-2.5 text-right font-black text-slate-900">
                          {formatMoney(item.total, '')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals & Words representation */}
              <div className="pt-2 pb-6 border-t-2 border-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                {/* Words representation & Notes */}
                <div className="space-y-3">
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs">
                    <p className="font-bold text-indigo-900 text-[11px] mb-1">
                      Arrêtée la présente facture à la somme de :
                    </p>
                    <p className="italic text-indigo-950 font-serif font-semibold text-xs leading-snug">
                      "{numberToWordsFrench(sale.totalAmount, settings.currency)}"
                    </p>
                  </div>

                  {sale.notes && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                      <strong>Observations :</strong> {sale.notes}
                    </div>
                  )}
                </div>

                {/* Numerical Totals */}
                <div className="space-y-1.5 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Brut HT :</span>
                    <span className="font-semibold">{formatMoney(sale.subtotal, settings.currency)}</span>
                  </div>

                  {sale.discountTotal > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Remise Commerciale Totale :</span>
                      <span className="font-bold">-{formatMoney(sale.discountTotal, settings.currency)}</span>
                    </div>
                  )}

                  {settings.taxEnabled && (
                    <div className="flex justify-between text-slate-600">
                      <span>TVA ({settings.taxRatePercent}%) :</span>
                      <span>{formatMoney(sale.taxAmount, settings.currency)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t-2 border-slate-900 text-sm font-black text-slate-900">
                    <span>NET À PAYER (TTC) :</span>
                    <span className="text-base font-black text-indigo-700">
                      {formatMoney(sale.totalAmount, settings.currency)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-[11px] space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span>Montant Versé :</span>
                      <span className="font-semibold">{formatMoney(sale.amountReceived, settings.currency)}</span>
                    </div>
                    {sale.changeGiven > 0 && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Monnaie Rendue :</span>
                        <span>{formatMoney(sale.changeGiven, settings.currency)}</span>
                      </div>
                    )}
                    {sale.paymentMethod === 'CREDIT' && (
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span>Reste Dû (Dette) :</span>
                        <span>{formatMoney(sale.totalAmount, settings.currency)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Signatures & Stamp Zones */}
              <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="border border-dashed border-slate-300 rounded-xl p-4 min-h-[100px] flex flex-col justify-between">
                  <p className="font-bold text-slate-700 uppercase text-[10px]">
                    Le Client (Mention "Bon pour accord")
                  </p>
                  <p className="text-[10px] text-slate-400 italic">Signature & Date</p>
                </div>

                <div className="border border-dashed border-slate-300 rounded-xl p-4 min-h-[100px] flex flex-col justify-between">
                  <p className="font-bold text-slate-700 uppercase text-[10px]">
                    Pour l'Établissement (Signature & Cachet)
                  </p>
                  <p className="text-[10px] text-slate-400 italic">Cachet & Signature autorisée</p>
                </div>
              </div>

              {/* Footer Notice */}
              <div className="pt-6 text-center text-[10px] text-slate-500 border-t border-slate-200 mt-6 space-y-0.5">
                <p className="font-semibold text-slate-700">{settings.receiptFooterMessage}</p>
                <p>
                  {settings.invoiceLegalNotice ||
                    'Facture établie conformément aux usages du commerce. En cas de litige, seuls les tribunaux compétents sont habilités.'}
                </p>
                <p className="text-[9px] text-slate-400 pt-1">
                  Document généré par le logiciel de gestion de caisse • Merci de votre visite !
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* FORMAT TICKET THERMIQUE 80mm */}
          {/* ========================================================= */}
          {printFormat === 'TICKET' && (
            <div
              id="printable-receipt"
              className="bg-white p-5 mx-auto border border-slate-300 shadow-sm text-slate-800 text-xs font-mono rounded-lg max-w-[340px] print:border-none print:shadow-none print:max-w-full print:p-0"
            >
              {/* Store Header */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
                <h2 className="font-black text-base text-slate-900 uppercase tracking-tight">
                  {settings.storeName || 'BOUTIQUE'}
                </h2>
                {settings.storeTagline && (
                  <p className="text-[10px] text-slate-600">{settings.storeTagline}</p>
                )}
                {settings.address && (
                  <p className="text-[10px] text-slate-500">{settings.address}</p>
                )}
                {settings.phone && (
                  <p className="text-[10px] text-slate-500">Tél: {settings.phone}</p>
                )}
                {settings.nifRccm && (
                  <p className="text-[9px] text-slate-400">NIF: {settings.nifRccm}</p>
                )}
              </div>

              {/* Sale Metadata */}
              <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ticket N°:</span>
                  <span className="font-bold text-slate-900">{sale.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span>{formatDateTime(sale.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Caissier:</span>
                  <span className="font-medium">{sale.userName}</span>
                </div>
                {sale.customerName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Client:</span>
                    <span className="font-semibold text-slate-900">{sale.customerName}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="py-3 border-b border-dashed border-slate-400">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-300 text-[10px] text-slate-500 uppercase">
                      <th className="pb-1">Article</th>
                      <th className="pb-1 text-center">Qté</th>
                      <th className="pb-1 text-right">P.U</th>
                      <th className="pb-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sale.items.map((item, idx) => (
                      <tr key={idx} className="py-1">
                        <td className="py-1 text-[11px] pr-1 font-medium leading-tight">
                          {item.productName}
                          {item.discountPercent > 0 && (
                            <span className="block text-[9px] text-emerald-600 font-bold">
                              Remise -{item.discountPercent}%
                            </span>
                          )}
                        </td>
                        <td className="py-1 text-center text-slate-600">
                          {formatQuantity(item.quantity)}
                        </td>
                        <td className="py-1 text-right text-slate-600">
                          {formatMoney(item.unitPrice, '')}
                        </td>
                        <td className="py-1 text-right font-bold text-slate-900">
                          {formatMoney(item.total, '')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total :</span>
                  <span>{formatMoney(sale.subtotal, settings.currency)}</span>
                </div>
                {sale.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Remise totale :</span>
                    <span>-{formatMoney(sale.discountTotal, settings.currency)}</span>
                  </div>
                )}
                {settings.taxEnabled && sale.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>TVA ({settings.taxRatePercent}%) :</span>
                    <span>{formatMoney(sale.taxAmount, settings.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 text-sm font-black text-slate-900 border-t border-slate-300">
                  <span>NET À PAYER :</span>
                  <span className="text-base font-black text-indigo-700">
                    {formatMoney(sale.totalAmount, settings.currency)}
                  </span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mode de paiement:</span>
                  <span className="font-bold">{getPaymentMethodLabel(sale.paymentMethod)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Montant reçu:</span>
                  <span>{formatMoney(sale.amountReceived, settings.currency)}</span>
                </div>
                {sale.changeGiven > 0 && (
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Monnaie rendue:</span>
                    <span>{formatMoney(sale.changeGiven, settings.currency)}</span>
                  </div>
                )}
              </div>

              {/* Barcode simulation */}
              <div className="pt-3 text-center space-y-1">
                <div className="inline-block px-3 py-1 bg-slate-100 rounded tracking-widest text-[10px] font-mono font-bold text-slate-700">
                  ||||| | |||| || |||||| | |||||
                </div>
                <p className="text-[9px] text-slate-400">{sale.invoiceNumber}</p>
              </div>

              {/* Footer */}
              <div className="pt-2 text-center text-[10px] text-slate-500 leading-tight space-y-1">
                <p>{settings.receiptFooterMessage}</p>
                <p className="text-[9px] text-slate-400">Merci de votre confiance !</p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Footer - Hidden in Print */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Fermer
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
            >
              <Printer className="w-4 h-4" />
              Imprimer {printFormat === 'A4' ? 'Facture A4' : 'Ticket 80mm'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
