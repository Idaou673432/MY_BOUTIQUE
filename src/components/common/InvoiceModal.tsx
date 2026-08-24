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
  ChevronDown,
  RotateCcw,
  AlertTriangle
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
  const { settings, customers, cancelSale } = useStore();
  
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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Erreur de saisie / Demande client');
  const [isCancelling, setIsCancelling] = useState(false);

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

  const handleExecuteCancelSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;
    setIsCancelling(true);
    const res = cancelSale(sale.id, cancelReason.trim() || 'Annulation par le caissier');
    setIsCancelling(false);
    if (res.success) {
      setPrintFeedback('Vente annulée avec succès. Articles restockés et caisse ajustée.');
      setShowCancelModal(false);
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      alert(res.message || 'Impossible d’annuler la vente.');
    }
  };

  const isSaleCancelled = sale.status === 'ANNULEE';

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
              className="bg-white p-6 sm:p-10 mx-auto border-2 border-slate-900 shadow-md text-slate-950 rounded-xl max-w-3xl print:border-none print:shadow-none print:p-2 print:max-w-full font-bold"
            >
              {/* Top Business Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 pb-3 border-b-2 border-slate-950">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-slate-950 text-white flex items-center justify-center font-black text-xl shadow-xs">
                      {(settings.storeName || settings.shopName || 'B').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase leading-tight">
                        {settings.storeName || settings.shopName || 'BOUTIQUE MALI'}
                      </h1>
                      {(settings.storeTagline || settings.businessType) && (
                        <p className="text-[11px] text-slate-950 font-black uppercase tracking-wider leading-tight">
                          {settings.storeTagline || settings.businessType}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-950 font-black space-y-0.5 pt-1 leading-snug">
                    {(settings.address || settings.shopAddress) && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                        <span className="font-black">ADRESSE : {settings.address || settings.shopAddress}</span>
                      </p>
                    )}
                    {(settings.phone || settings.shopPhone) && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                        <span className="font-black">TÉL : <strong className="font-black text-slate-950">{settings.phone || settings.shopPhone}</strong></span>
                      </p>
                    )}
                    {(settings.email || settings.shopEmail) && (
                      <p className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                        <span className="font-black">EMAIL : <strong className="font-black text-slate-950">{settings.email || settings.shopEmail}</strong></span>
                      </p>
                    )}
                    {settings.nifRccm && (
                      <p className="text-[10.5px] font-mono text-slate-950 font-black">
                        NIF / RCCM : <span className="font-black">{settings.nifRccm}</span>
                      </p>
                    )}
                    {settings.mobileMoneyNumber && (
                      <p className="text-[10.5px] font-mono text-slate-950 font-black">
                        PAIEMENT MOBILE (WAVE/OM) : <span className="font-black">{settings.mobileMoneyNumber}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Document Title & Reference */}
                <div className="text-left sm:text-right space-y-0.5 self-stretch sm:self-auto bg-slate-100 p-2.5 rounded-lg border-2 border-slate-950">
                  <div className="inline-block px-2.5 py-0.5 bg-slate-950 text-white rounded text-[11px] font-black uppercase tracking-wider">
                    FACTURE OFFICIELLE
                  </div>
                  <div className="pt-1 text-[11px] space-y-0.5 font-black leading-tight">
                    <p className="text-slate-950">
                      N° Facture : <strong className="text-black font-black">{sale.invoiceNumber}</strong>
                    </p>
                    <p className="text-slate-950">
                      Date : <strong className="text-black font-black">{formatDate(sale.date)}</strong>
                    </p>
                    <p className="text-slate-950">
                      Heure : <strong className="text-black font-black">{formatDateTime(sale.date).split(' ')[1] || ''}</strong>
                    </p>
                    <p className="text-slate-950">
                      Établi par : <strong className="text-black font-black">{sale.userName}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Client Info Card */}
              <div className="my-3 p-2.5 rounded-lg bg-slate-50 border-2 border-black grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-black leading-snug">
                <div>
                  <p className="text-[10px] font-black uppercase text-black tracking-wider">Facturé à :</p>
                  <p className="font-black text-sm text-black uppercase leading-tight">{sale.customerName || 'Client Comptoir'}</p>
                  {customer?.phone && (
                    <p className="text-black mt-0.5 flex items-center gap-1.5 font-black text-[11px]">
                      <Phone className="w-3 h-3 text-black" />
                      <span>{customer.phone}</span>
                    </p>
                  )}
                  {customer?.address && (
                    <p className="text-black mt-0.5 flex items-center gap-1.5 font-black text-[11px]">
                      <MapPin className="w-3 h-3 text-black" />
                      <span>{customer.address}</span>
                    </p>
                  )}
                </div>

                <div className="sm:text-right space-y-0.5 sm:border-l-2 sm:border-black sm:pl-3">
                  <p className="text-[10px] font-black uppercase text-black tracking-wider">Modalités de règlement :</p>
                  <p className="font-black text-black uppercase text-xs">{getPaymentMethodLabel(sale.paymentMethod)}</p>
                  <p className="text-black text-[11px] font-black">
                    Statut : <span className="text-black font-black underline">Acquittée / Réglée</span>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-white uppercase text-[10px] tracking-wider font-black">
                      <th className="py-2.5 px-3 rounded-l-lg">N°</th>
                      <th className="py-2.5 px-3">Désignation</th>
                      <th className="py-2.5 px-3 text-center">Qté</th>
                      <th className="py-2.5 px-3 text-right">Prix Unitaire</th>
                      <th className="py-2.5 px-3 text-right rounded-r-lg">Total ({settings.currency || 'FCFA'})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-slate-300">
                    {sale.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-slate-900 font-mono text-[11px] font-bold">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <p className="font-black text-slate-950">{item.productName}</p>
                          {item.productCode && (
                            <p className="text-[10px] font-mono text-slate-700 font-bold">Réf: {item.productCode}</p>
                          )}
                          {item.discountPercent > 0 && (
                            <p className="text-[10px] text-emerald-800 font-black">
                              Remise de {item.discountPercent}% appliquée
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-black text-slate-950">
                          {formatQuantity(item.quantity)} {item.productUnit || ''}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-900 font-mono font-bold">
                          {formatMoney(item.unitPrice, '')}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-950 font-mono">
                          {formatMoney(item.total, '')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-300">
                <div className="space-y-2 max-w-sm text-xs">
                  <div className="p-3 bg-slate-100 rounded-xl border-2 border-slate-300 text-slate-950 space-y-1">
                    <p className="font-black text-[11px]">Arrêté la présente facture à la somme de :</p>
                    <p className="font-black uppercase text-slate-950 italic text-[11px]">
                      {numberToWordsFrench(Math.round(sale.totalAmount))} {settings.currency || 'Francs CFA'}
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-72 space-y-2 text-xs bg-slate-50 p-4 rounded-xl border-2 border-black font-black">
                  <div className="flex justify-between text-black">
                    <span className="font-black">Total Brut :</span>
                    <span className="font-mono font-black">{formatMoney(sale.subtotal, settings.currency)}</span>
                  </div>

                  {sale.discountTotal > 0 && (
                    <div className="flex justify-between text-black font-black">
                      <span>Remise accordée :</span>
                      <span className="font-mono font-black">-{formatMoney(sale.discountTotal, settings.currency)}</span>
                    </div>
                  )}

                  {settings.taxEnabled && sale.taxAmount > 0 && (
                    <div className="flex justify-between text-black">
                      <span className="font-black">TVA ({settings.taxRatePercent}%) :</span>
                      <span className="font-mono font-black">{formatMoney(sale.taxAmount, settings.currency)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t-2 border-black font-black text-base text-black">
                    <span className="font-black uppercase">Net à Payer :</span>
                    <span className="text-lg text-black font-mono font-black">
                      {formatMoney(sale.totalAmount, settings.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-4 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="border-2 border-dashed border-black rounded-xl p-4 min-h-[90px] flex flex-col justify-between">
                  <p className="font-black text-black uppercase text-[10px]">
                    Le Client (Mention "Bon pour accord")
                  </p>
                  <p className="text-[10px] text-black font-black italic">Signature & Date</p>
                </div>

                <div className="border-2 border-dashed border-black rounded-xl p-4 min-h-[90px] flex flex-col justify-between">
                  <p className="font-black text-black uppercase text-[10px]">
                    Pour l'Établissement (Signature & Cachet)
                  </p>
                  <p className="text-[10px] text-black font-black italic">Cachet & Signature autorisée</p>
                </div>
              </div>

              {/* Footer Notice */}
              <div className="pt-4 text-center text-[10px] text-black font-black border-t-2 border-black mt-4 space-y-0.5">
                <p className="font-black text-black">{settings.receiptFooterMessage}</p>
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
              className={`bg-white p-4 mx-auto border-2 border-slate-900 shadow-md text-slate-950 text-xs font-mono font-bold rounded-lg ${
                printFormat === 'TICKET_58' ? 'max-w-[280px]' : 'max-w-[350px]'
              } print:border-none print:shadow-none print:max-w-full print:p-0`}
            >
              {/* Store Header (ULTRA BOLD & HIGH CONTRAST) */}
              <div className="text-center space-y-0.5 pb-2 border-b-2 border-dashed border-slate-950">
                <h2 className="font-black text-base text-slate-950 uppercase tracking-wide leading-tight">
                  {settings.storeName || settings.shopName || 'BOUTIQUE MALI'}
                </h2>
                {(settings.storeTagline || settings.businessType) && (
                  <p className="text-[11px] text-slate-950 font-black uppercase leading-tight">
                    {settings.storeTagline || settings.businessType}
                  </p>
                )}
                {(settings.address || settings.shopAddress) && (
                  <p className="text-[11px] text-slate-950 font-black uppercase leading-tight">
                    ADRESSE: {settings.address || settings.shopAddress}
                  </p>
                )}
                {(settings.phone || settings.shopPhone) && (
                  <p className="text-[11px] text-slate-950 font-black leading-tight">
                    TÉL: {settings.phone || settings.shopPhone}
                  </p>
                )}
                {(settings.email || settings.shopEmail) && (
                  <p className="text-[11px] text-slate-950 font-black leading-tight">
                    EMAIL: {settings.email || settings.shopEmail}
                  </p>
                )}
                {settings.nifRccm && (
                  <p className="text-[10px] text-slate-950 font-black uppercase leading-tight">
                    NIF / RCCM: {settings.nifRccm}
                  </p>
                )}
                {settings.mobileMoneyNumber && (
                  <p className="text-[10px] text-slate-950 font-black uppercase leading-tight">
                    WAVE / OM: {settings.mobileMoneyNumber}
                  </p>
                )}
              </div>

              {/* Sale Metadata */}
              <div className="py-1.5 border-b-2 border-dashed border-black space-y-0.5 text-xs font-black text-black leading-tight">
                <div className="flex justify-between">
                  <span>Ticket N°:</span>
                  <span className="font-black text-black">{sale.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span className="font-black">{formatDateTime(sale.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Caissier:</span>
                  <span className="font-black">{sale.userName}</span>
                </div>
                {sale.customerName && (
                  <div className="flex justify-between">
                    <span>Client:</span>
                    <span className="font-black text-black uppercase">{sale.customerName}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="py-1.5 border-b-2 border-dashed border-black">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-2 border-black text-xs text-black uppercase font-black leading-tight">
                      <th className="pb-0.5">Article</th>
                      <th className="pb-0.5 text-center">Qté</th>
                      <th className="pb-0.5 text-right">P.U</th>
                      <th className="pb-0.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dashed divide-black">
                    {sale.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-0.5 text-xs pr-1 font-black leading-tight text-black">
                          {item.productName}
                          {item.discountPercent > 0 && (
                            <span className="block text-[9.5px] text-black font-black leading-none">
                              Remise -{item.discountPercent}%
                            </span>
                          )}
                        </td>
                        <td className="py-0.5 text-center font-black text-black leading-tight">
                          {formatQuantity(item.quantity)}
                        </td>
                        <td className="py-0.5 text-right font-black text-black leading-tight">
                          {formatMoney(item.unitPrice, '')}
                        </td>
                        <td className="py-0.5 text-right font-black text-black leading-tight">
                          {formatMoney(item.total, '')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="py-1.5 border-b-2 border-dashed border-black space-y-0.5 text-xs font-black text-black leading-tight">
                <div className="flex justify-between">
                  <span>Sous-total :</span>
                  <span className="font-black">{formatMoney(sale.subtotal, settings.currency)}</span>
                </div>
                {sale.discountTotal > 0 && (
                  <div className="flex justify-between text-black font-black">
                    <span>Remise totale :</span>
                    <span>-{formatMoney(sale.discountTotal, settings.currency)}</span>
                  </div>
                )}
                {settings.taxEnabled && sale.taxAmount > 0 && (
                  <div className="flex justify-between text-black font-black">
                    <span>TVA ({settings.taxRatePercent}%) :</span>
                    <span className="font-black">{formatMoney(sale.taxAmount, settings.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-0.5 text-sm font-black text-black border-t-2 border-black">
                  <span className="font-black uppercase">NET À PAYER :</span>
                  <span className="text-base font-black text-black">
                    {formatMoney(sale.totalAmount, settings.currency)}
                  </span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="py-1.5 border-b-2 border-dashed border-black space-y-0.5 text-xs font-black text-black leading-tight">
                <div className="flex justify-between">
                  <span>Paiement:</span>
                  <span className="font-black uppercase">{getPaymentMethodLabel(sale.paymentMethod)}</span>
                </div>
                {sale.amountReceived > 0 && (
                  <div className="flex justify-between">
                    <span>Montant reçu:</span>
                    <span className="font-black">{formatMoney(sale.amountReceived, settings.currency)}</span>
                  </div>
                )}
                {sale.changeGiven > 0 && (
                  <div className="flex justify-between font-black text-black">
                    <span>Monnaie rendue:</span>
                    <span className="font-black">{formatMoney(sale.changeGiven, settings.currency)}</span>
                  </div>
                )}
              </div>

              {/* Barcode simulation */}
              <div className="pt-1.5 text-center space-y-0.5 leading-tight">
                <div className="inline-block px-2.5 py-0.5 bg-slate-200 rounded tracking-widest text-[9.5px] font-mono font-black text-slate-950">
                  ||||| | |||| || |||||| | |||||
                </div>
                <p className="text-[8.5px] text-slate-800 font-bold">{sale.invoiceNumber}</p>
              </div>

              {/* Footer */}
              <div className="pt-1.5 text-center text-[9.5px] text-slate-950 font-bold leading-tight space-y-0.5">
                <p className="font-black">{settings.receiptFooterMessage}</p>
                <p className="text-[8.5px] text-slate-800 font-bold">Merci de votre fidélité !</p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Footer - Hidden in Print */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Fermer
            </button>

            {!isSaleCancelled ? (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Annuler cette vente, restocker les articles et régulariser la caisse / dette"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>Annuler la Vente</span>
              </button>
            ) : (
              <span className="px-3 py-1.5 bg-rose-100 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Vente Annulée & Restockée
              </span>
            )}
          </div>
          
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

    {/* Cancel Sale Confirmation Modal */}
    {showCancelModal && (
      <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
        <form
          onSubmit={handleExecuteCancelSale}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95"
        >
          <div className="p-4 bg-rose-700 text-white flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-white" />
              Confirmation Annulation : {sale.invoiceNumber}
            </h3>
            <button
              type="button"
              onClick={() => setShowCancelModal(false)}
              className="text-white hover:opacity-80"
            >
              ✕
            </button>
          </div>

          <div className="p-5 space-y-4 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-1.5">
              <p className="font-bold text-sm">Action irréversible :</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>Les <strong>{sale.items.length} article(s)</strong> seront automatiquement restitués en stock.</li>
                <li>Le montant de <strong>{formatMoney(sale.totalAmount, settings.currency)}</strong> sera déduit de la caisse ou du compte client.</li>
                <li>Cette opération sera tracée dans le journal d'audit.</li>
              </ul>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Motif d'annulation obligatoire *
              </label>
              <input
                type="text"
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Erreur de saisie, client a changé d'avis, retour article..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
              >
                Retour
              </button>
              <button
                type="submit"
                disabled={isCancelling}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {isCancelling ? 'Annulation...' : 'Confirmer l’Annulation'}
              </button>
            </div>
          </div>
        </form>
      </div>
    )}

    {/* Direct Printer Hardware Settings Modal */}
    <DirectPrinterModal
      isOpen={showPrinterSettings}
      onClose={() => setShowPrinterSettings(false)}
    />
    </>
  );
};
