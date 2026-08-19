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
  Download,
  Sparkles,
  Layers,
  Usb,
  Bluetooth,
  ExternalLink,
  Settings as SettingsIcon,
  ChevronDown
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
import {
  generateThermalReceiptHtml,
  generateA4InvoiceHtml,
  executeDirectPrint,
  downloadHtmlFile,
  openPrintWindow,
  printViaWebSerial,
  printViaWebBluetooth,
  printViaRawBT,
  PrintReceiptFormat
} from '../../utils/printService';
import { DirectPrinterModal } from './DirectPrinterModal';

interface InvoiceModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  initialFormat?: 'A4' | 'TICKET_80' | 'TICKET_58' | 'TICKET' | 'A5';
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  sale,
  isOpen,
  onClose,
  initialFormat,
}) => {
  const { settings, customers } = useStore();
  
  const getInitialFormat = (): PrintReceiptFormat => {
    if (initialFormat === 'TICKET_58') return 'TICKET_58';
    if (initialFormat === 'TICKET' || initialFormat === 'TICKET_80') return 'TICKET_80';
    if (initialFormat === 'A5') return 'A5';
    if (initialFormat === 'A4') return 'A4';
    return settings.defaultInvoiceFormat === 'TICKET' ? 'TICKET_80' : 'A4';
  };

  const [printFormat, setPrintFormat] = useState<PrintReceiptFormat>(getInitialFormat());
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [showPrintMenu, setShowPrintMenu] = useState(false);

  if (!isOpen || !sale) return null;

  const customer: Customer | undefined = sale.customerId
    ? (customers || []).find((c) => c.id === sale.customerId)
    : undefined;

  // Universal Direct Print Dispatcher
  const handlePrintDirect = async () => {
    setIsPrinting(true);
    setPrintFeedback('Impression en cours...');

    // If merchant configured USB Direct
    if (settings.printerType === 'USB_SERIAL') {
      const res = await printViaWebSerial(sale, settings, customer);
      setPrintFeedback(res.message);
      setIsPrinting(false);
      setTimeout(() => setPrintFeedback(null), 4000);
      return;
    }

    // If merchant configured Bluetooth Direct
    if (settings.printerType === 'BLUETOOTH') {
      const res = await printViaWebBluetooth(sale, settings, customer);
      setPrintFeedback(res.message);
      setIsPrinting(false);
      setTimeout(() => setPrintFeedback(null), 4000);
      return;
    }

    // If merchant configured RawBT
    if (settings.printerType === 'RAWBT') {
      const res = printViaRawBT(sale, settings, customer);
      setPrintFeedback(res.message);
      setIsPrinting(false);
      setTimeout(() => setPrintFeedback(null), 4000);
      return;
    }

    // Browser Dedicated Tab / Default
    let html = '';
    if (printFormat === 'TICKET_80') {
      html = generateThermalReceiptHtml(sale, settings, customer, 80);
    } else if (printFormat === 'TICKET_58') {
      html = generateThermalReceiptHtml(sale, settings, customer, 58);
    } else {
      html = generateA4InvoiceHtml(sale, settings, customer);
    }

    try {
      await executeDirectPrint(html);
      setPrintFeedback('Fenêtre d’impression ouverte avec succès !');
    } catch (err) {
      console.error('Print error:', err);
      window.print();
    } finally {
      setIsPrinting(false);
      setTimeout(() => setPrintFeedback(null), 4000);
    }
  };

  // Specific hardware print handlers
  const handlePrintUSB = async () => {
    setIsPrinting(true);
    setPrintFeedback('Connexion à l’imprimante USB...');
    const res = await printViaWebSerial(sale, settings, customer);
    setPrintFeedback(res.message);
    setIsPrinting(false);
    setShowPrintMenu(false);
    setTimeout(() => setPrintFeedback(null), 4000);
  };

  const handlePrintBluetooth = async () => {
    setIsPrinting(true);
    setPrintFeedback('Connexion à l’imprimante Bluetooth...');
    const res = await printViaWebBluetooth(sale, settings, customer);
    setPrintFeedback(res.message);
    setIsPrinting(false);
    setShowPrintMenu(false);
    setTimeout(() => setPrintFeedback(null), 4000);
  };

  const handlePrintRawBT = () => {
    const res = printViaRawBT(sale, settings, customer);
    setPrintFeedback(res.message);
    setShowPrintMenu(false);
    setTimeout(() => setPrintFeedback(null), 4000);
  };

  const handlePrintNewTab = () => {
    let html = '';
    if (printFormat === 'TICKET_80' || printFormat === 'TICKET_58') {
      html = generateThermalReceiptHtml(sale, settings, customer, printFormat === 'TICKET_58' ? 58 : 80);
    } else {
      html = generateA4InvoiceHtml(sale, settings, customer);
    }
    openPrintWindow(html);
    setShowPrintMenu(false);
    setPrintFeedback('Ticket ouvert dans un nouvel onglet.');
    setTimeout(() => setPrintFeedback(null), 3000);
  };

  // Download standalone receipt file
  const handleDownloadFile = () => {
    let html = '';
    if (printFormat === 'TICKET_80' || printFormat === 'TICKET_58') {
      html = generateThermalReceiptHtml(sale, settings, customer, printFormat === 'TICKET_58' ? 58 : 80);
    } else {
      html = generateA4InvoiceHtml(sale, settings, customer);
    }
    const filename = `Recu_${sale.invoiceNumber}_${new Date().toISOString().split('T')[0]}.html`;
    downloadHtmlFile(html, filename);
    setPrintFeedback('Fichier reçu téléchargé !');
    setTimeout(() => setPrintFeedback(null), 3000);
  };

  const handleCopySummary = () => {
    const lines = [
      `*FACTURE ${sale.invoiceNumber}* - ${settings.storeName || settings.shopName || 'Boutique'}`,
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
      }* chez *${settings.storeName || settings.shopName || 'notre boutique'}* :\n` +
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
    <>
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
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700 font-bold">
                    {sale.invoiceNumber}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Impression directe optimisée pour imprimantes thermiques (80mm/58mm) et format A4
                </p>
              </div>
            </div>

            {/* Format Selector & Close */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setPrintFormat('TICKET_80')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    printFormat === 'TICKET_80'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Format Ticket de Caisse Thermique Standard 80mm"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Ticket 80mm</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintFormat('TICKET_58')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    printFormat === 'TICKET_58'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Format Ticket Compact Mini-Imprimante 58mm (Bluetooth / USB)"
                >
                  <Receipt className="w-3.5 h-3.5 text-amber-300" />
                  <span>Mini 58mm</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintFormat('A4')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    printFormat === 'A4'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Format Facture Officielle A4"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Facture A4</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowPrinterSettings(true)}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Configurer l'imprimante thermique directe"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Action Controls Bar - Hidden in Print */}
          <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 no-print text-xs">
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Reçu certifié • Monnaie : {settings.currency || 'FCFA'}</span>
              {printFeedback && (
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded-md animate-pulse">
                  {printFeedback}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySummary}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 font-medium transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copié !' : 'Copier texte'}
              </button>

              <button
                type="button"
                onClick={handleDownloadFile}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 font-medium transition-colors cursor-pointer"
                title="Télécharger le reçu au format HTML autonome"
              >
                <Download className="w-3.5 h-3.5" />
                Télécharger
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-xs transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                WhatsApp
              </button>

              {/* Main Print Button with Dropdown */}
              <div className="relative inline-flex rounded-lg shadow-xs">
                <button
                  type="button"
                  disabled={isPrinting}
                  onClick={handlePrintDirect}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-l-lg font-bold transition-all cursor-pointer disabled:opacity-50"
                  title="Imprimer directement"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isPrinting ? 'Impression...' : 'Imprimer Directement'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintMenu(!showPrintMenu)}
                  className="px-2 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-r-lg border-l border-indigo-500 font-bold transition-all cursor-pointer"
                  title="Autres modes d'impression"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {/* Print Options Dropdown */}
                {showPrintMenu && (
                  <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs text-slate-800 animate-in fade-in">
                    <button
                      type="button"
                      onClick={handlePrintNewTab}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 cursor-pointer font-medium"
                    >
                      <ExternalLink className="w-4 h-4 text-indigo-600" />
                      <div>
                        <div className="font-bold">Ouvrir dans un Nouvel Onglet</div>
                        <div className="text-[10px] text-slate-500">Sans restriction de cadre (100% garanti)</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handlePrintUSB}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 cursor-pointer font-medium"
                    >
                      <Usb className="w-4 h-4 text-indigo-600" />
                      <div>
                        <div className="font-bold">Imprimante USB Directe (ESC/POS)</div>
                        <div className="text-[10px] text-slate-500">Envoi direct par câble USB (Web Serial)</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handlePrintBluetooth}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 cursor-pointer font-medium"
                    >
                      <Bluetooth className="w-4 h-4 text-indigo-600" />
                      <div>
                        <div className="font-bold">Imprimante Bluetooth Sans Fil</div>
                        <div className="text-[10px] text-slate-500">Mini imprimante thermique Bluetooth</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handlePrintRawBT}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 cursor-pointer font-medium"
                    >
                      <Smartphone className="w-4 h-4 text-indigo-600" />
                      <div>
                        <div className="font-bold">Application RawBT (Android)</div>
                        <div className="text-[10px] text-slate-500">Impression via l'application RawBT</div>
                      </div>
                    </button>

                    <div className="border-t border-slate-100 my-1"></div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowPrintMenu(false);
                        setShowPrinterSettings(true);
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      <SettingsIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Configurer l'imprimante par défaut</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* PRINTABLE CONTENT PREVIEW AREA */}
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
                        {settings.storeName || 'Boutique Mali'}
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
                        NIF / RCCM : {settings.nifRccm}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Document Title & Reference */}
                <div className="text-left sm:text-right space-y-1 self-stretch sm:self-auto bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="inline-block px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-wider">
                    FACTURE OFFICIELLE
                  </div>
                  <div className="pt-2 text-xs space-y-0.5">
                    <p className="text-slate-500">
                      N° Facture : <strong className="text-slate-900 text-sm">{sale.invoiceNumber}</strong>
                    </p>
                    <p className="text-slate-500">
                      Date : <strong className="text-slate-900">{formatDate(sale.date)}</strong>
                    </p>
                    <p className="text-slate-500">
                      Heure : <strong className="text-slate-900">{formatDateTime(sale.date).split(' ')[1] || ''}</strong>
                    </p>
                    <p className="text-slate-500">
                      Établi par : <strong className="text-slate-900">{sale.userName}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Client Info Card */}
              <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Facturé à :</p>
                  <p className="font-bold text-base text-slate-900 mt-0.5">{sale.customerName || 'Client Comptoir'}</p>
                  {customer?.phone && (
                    <p className="text-slate-600 mt-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{customer.phone}</span>
                    </p>
                  )}
                  {customer?.address && (
                    <p className="text-slate-600 mt-0.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{customer.address}</span>
                    </p>
                  )}
                </div>

                <div className="sm:text-right space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Modalités de règlement :</p>
                  <p className="font-bold text-slate-800">{getPaymentMethodLabel(sale.paymentMethod)}</p>
                  <p className="text-slate-500 text-[11px]">
                    Statut : <span className="text-emerald-700 font-bold">Acquittée / Réglée</span>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3 rounded-l-lg">N°</th>
                      <th className="py-2.5 px-3">Désignation</th>
                      <th className="py-2.5 px-3 text-center">Qté</th>
                      <th className="py-2.5 px-3 text-right">Prix Unitaire</th>
                      <th className="py-2.5 px-3 text-right rounded-r-lg">Total ({settings.currency || 'FCFA'})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sale.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900">{item.productName}</p>
                          {item.productCode && (
                            <p className="text-[10px] font-mono text-slate-400">Réf: {item.productCode}</p>
                          )}
                          {item.discountPercent > 0 && (
                            <p className="text-[10px] text-emerald-600 font-semibold">
                              Remise de {item.discountPercent}% appliquée
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800">
                          {formatQuantity(item.quantity)} {item.productUnit || ''}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700 font-mono">
                          {formatMoney(item.unitPrice, '')}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900 font-mono">
                          {formatMoney(item.total, '')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
                <div className="space-y-2 max-w-sm text-xs">
                  <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-indigo-950 space-y-1">
                    <p className="font-bold text-[11px]">Arrêté la présente facture à la somme de :</p>
                    <p className="font-bold uppercase text-indigo-900 italic text-[11px]">
                      {numberToWordsFrench(Math.round(sale.totalAmount))} {settings.currency || 'Francs CFA'}
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-72 space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Brut :</span>
                    <span className="font-mono">{formatMoney(sale.subtotal, settings.currency)}</span>
                  </div>

                  {sale.discountTotal > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Remise accordée :</span>
                      <span className="font-mono">-{formatMoney(sale.discountTotal, settings.currency)}</span>
                    </div>
                  )}

                  {settings.taxEnabled && sale.taxAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>TVA ({settings.taxRatePercent}%) :</span>
                      <span className="font-mono">{formatMoney(sale.taxAmount, settings.currency)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-slate-300 font-black text-base text-slate-900">
                    <span>Net à Payer :</span>
                    <span className="text-lg text-indigo-700 font-mono">
                      {formatMoney(sale.totalAmount, settings.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-4 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="border border-dashed border-slate-300 rounded-xl p-4 min-h-[90px] flex flex-col justify-between">
                  <p className="font-bold text-slate-700 uppercase text-[10px]">
                    Le Client (Mention "Bon pour accord")
                  </p>
                  <p className="text-[10px] text-slate-400 italic">Signature & Date</p>
                </div>

                <div className="border border-dashed border-slate-300 rounded-xl p-4 min-h-[90px] flex flex-col justify-between">
                  <p className="font-bold text-slate-700 uppercase text-[10px]">
                    Pour l'Établissement (Signature & Cachet)
                  </p>
                  <p className="text-[10px] text-slate-400 italic">Cachet & Signature autorisée</p>
                </div>
              </div>

              {/* Footer Notice */}
              <div className="pt-4 text-center text-[10px] text-slate-500 border-t border-slate-200 mt-4 space-y-0.5">
                <p className="font-semibold text-slate-700">{settings.receiptFooterMessage}</p>
                <p>
                  {settings.invoiceLegalNotice ||
                    'Facture établie conformément aux usages du commerce. En cas de litige, seuls les tribunaux compétents sont habilités.'}
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* FORMAT TICKET THERMIQUE 80mm & 58mm */}
          {/* ========================================================= */}
          {(printFormat === 'TICKET_80' || printFormat === 'TICKET_58') && (
            <div
              id="printable-receipt"
              className={`bg-white p-4 mx-auto border border-slate-300 shadow-md text-slate-900 text-xs font-mono rounded-lg ${
                printFormat === 'TICKET_58' ? 'max-w-[280px]' : 'max-w-[350px]'
              } print:border-none print:shadow-none print:max-w-full print:p-0`}
            >
              {/* Store Header */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
                <h2 className="font-black text-base text-slate-900 uppercase tracking-tight">
                  {settings.storeName || 'BOUTIQUE MALI'}
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
              <div className="py-2 border-b border-dashed border-slate-400 space-y-0.5 text-[11px]">
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
              <div className="py-2.5 border-b border-dashed border-slate-400">
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
              <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-xs">
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
              <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Paiement:</span>
                  <span className="font-bold">{getPaymentMethodLabel(sale.paymentMethod)}</span>
                </div>
                {sale.amountReceived > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Montant reçu:</span>
                    <span>{formatMoney(sale.amountReceived, settings.currency)}</span>
                  </div>
                )}
                {sale.changeGiven > 0 && (
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Monnaie rendue:</span>
                    <span>{formatMoney(sale.changeGiven, settings.currency)}</span>
                  </div>
                )}
              </div>

              {/* Barcode simulation */}
              <div className="pt-2 text-center space-y-0.5">
                <div className="inline-block px-3 py-1 bg-slate-100 rounded tracking-widest text-[10px] font-mono font-bold text-slate-700">
                  ||||| | |||| || |||||| | |||||
                </div>
                <p className="text-[9px] text-slate-400">{sale.invoiceNumber}</p>
              </div>

              {/* Footer */}
              <div className="pt-2 text-center text-[10px] text-slate-500 leading-tight space-y-0.5">
                <p>{settings.receiptFooterMessage}</p>
                <p className="text-[9px] text-slate-400">Merci de votre fidélité !</p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Footer - Hidden in Print */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Fermer
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPrinterSettings(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Configurer l'imprimante thermique"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>Réglages Imprimante</span>
            </button>

            <button
              type="button"
              disabled={isPrinting}
              onClick={handlePrintDirect}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              {isPrinting ? 'Lancement...' : `Imprimer ${printFormat === 'A4' ? 'Facture A4' : printFormat === 'TICKET_58' ? 'Ticket Mini 58mm' : 'Ticket Caisse 80mm'}`}
            </button>
          </div>
        </div>

      </div>
    </div>

    {/* Direct Printer Hardware Settings Modal */}
    <DirectPrinterModal
      isOpen={showPrinterSettings}
      onClose={() => setShowPrinterSettings(false)}
    />
    </>
  );
};
