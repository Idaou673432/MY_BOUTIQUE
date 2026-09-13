import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Printer,
  RotateCcw,
  Eye,
  CheckCircle2,
  XCircle,
  Calendar,
  DollarSign,
  AlertTriangle,
  Plus,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  FileText,
  TrendingUp,
  Banknote,
  Smartphone,
  CreditCard,
  Clock,
  Sparkles
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Sale } from '../../types';
import { formatMoney, formatDateTime, formatTimeOnly, getPaymentMethodLabel } from '../../utils/formatters';
import { InvoiceModal } from '../common/InvoiceModal';
import { DailyReportModal } from './DailyReportModal';

interface SalesHistoryViewProps {
  onNavigate?: (tab: string) => void;
}

type DatePeriodFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({ onNavigate }) => {
  const { sales, cancelSale, settings, currentUser } = useStore();

  // Primary view mode: 'by_day' (Ventes par jour) or 'all_invoices' (Toutes les factures)
  const [viewMode, setViewMode] = useState<'by_day' | 'all_invoices'>('by_day');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [datePeriod, setDatePeriod] = useState<DatePeriodFilter>('all');
  const [customDate, setCustomDate] = useState<string>('');

  // Expandable days in daily view (set of date keys like '2026-09-13')
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Modals
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Daily report modal for printing
  const [dailyReportModalDate, setDailyReportModalDate] = useState<{
    key: string;
    label: string;
    sales: Sale[];
  } | null>(null);

  // Helper date strings (in YYYY-MM-DD local format)
  const getLocalDateKey = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayKey = useMemo(() => getLocalDateKey(new Date()), []);
  const yesterdayKey = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getLocalDateKey(d);
  }, []);

  // Format a date key into a user-friendly French label
  const formatDayLabel = (dateKey: string): { fullLabel: string; badge?: string } => {
    if (dateKey === todayKey) {
      const parts = dateKey.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const formatted = new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d);
      return { fullLabel: formatted.charAt(0).toUpperCase() + formatted.slice(1), badge: "Aujourd'hui" };
    }
    if (dateKey === yesterdayKey) {
      const parts = dateKey.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const formatted = new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d);
      return { fullLabel: formatted.charAt(0).toUpperCase() + formatted.slice(1), badge: 'Hier' };
    }
    try {
      const parts = dateKey.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const formatted = new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d);
      return { fullLabel: formatted.charAt(0).toUpperCase() + formatted.slice(1) };
    } catch {
      return { fullLabel: dateKey };
    }
  };

  // KPIs for Today & Yesterday
  const todaySales = useMemo(() => {
    return (sales || []).filter((s) => {
      if (!s || s.status !== 'COMPLETEE') return false;
      const saleDateKey = s.date.slice(0, 10);
      return saleDateKey === todayKey;
    });
  }, [sales, todayKey]);

  const yesterdaySales = useMemo(() => {
    return (sales || []).filter((s) => {
      if (!s || s.status !== 'COMPLETEE') return false;
      const saleDateKey = s.date.slice(0, 10);
      return saleDateKey === yesterdayKey;
    });
  }, [sales, yesterdayKey]);

  const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
  const todayAvgTicket = todaySales.length > 0 ? Math.round(todayRevenue / todaySales.length) : 0;
  const yesterdayRevenue = yesterdaySales.reduce((sum, s) => sum + s.totalAmount, 0);

  // Filter sales based on search, payment, status, and date period
  const filteredSales = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    const now = new Date();

    let startDate: Date | null = null;
    if (datePeriod === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (datePeriod === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      startDate = new Date(y.getFullYear(), y.getMonth(), y.getDate());
    } else if (datePeriod === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
    } else if (datePeriod === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return (sales || []).filter((s) => {
      if (!s) return false;

      // Text search
      const invNum = (s.invoiceNumber || '').toLowerCase();
      const custName = (s.customerName || '').toLowerCase();
      const userName = (s.userName || '').toLowerCase();
      const itemNames = (s.items || []).map((i) => (i.productName || '').toLowerCase()).join(' ');
      const matchesSearch =
        !q ||
        invNum.includes(q) ||
        custName.includes(q) ||
        userName.includes(q) ||
        itemNames.includes(q);

      // Payment filter
      const matchesPayment = paymentFilter === 'all' || s.paymentMethod === paymentFilter;

      // Status filter
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

      // Date period filter
      const saleDateKey = s.date.slice(0, 10);
      let matchesDate = true;

      if (datePeriod === 'custom' && customDate) {
        matchesDate = saleDateKey === customDate;
      } else if (datePeriod === 'yesterday') {
        matchesDate = saleDateKey === yesterdayKey;
      } else if (datePeriod === 'today') {
        matchesDate = saleDateKey === todayKey;
      } else if (startDate) {
        matchesDate = new Date(s.date) >= startDate;
      }

      return matchesSearch && matchesPayment && matchesStatus && matchesDate;
    });
  }, [sales, searchTerm, paymentFilter, statusFilter, datePeriod, customDate, todayKey, yesterdayKey]);

  // Aggregate filtered sales into Days for the "Ventes par Jour" mode
  const salesByDay = useMemo(() => {
    const groups: Record<
      string,
      {
        dateKey: string;
        sales: Sale[];
        totalRevenue: number;
        totalMargin: number;
        totalItemsSold: number;
        salesCount: number;
        cashTotal: number;
        mobileTotal: number;
        cardTotal: number;
        creditTotal: number;
      }
    > = {};

    filteredSales.forEach((sale) => {
      const dateKey = sale.date.slice(0, 10);
      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateKey,
          sales: [],
          totalRevenue: 0,
          totalMargin: 0,
          totalItemsSold: 0,
          salesCount: 0,
          cashTotal: 0,
          mobileTotal: 0,
          cardTotal: 0,
          creditTotal: 0,
        };
      }

      groups[dateKey].sales.push(sale);

      // Only add to financial sums if completed
      if (sale.status === 'COMPLETEE') {
        groups[dateKey].totalRevenue += sale.totalAmount;
        groups[dateKey].totalMargin += sale.totalMargin;
        groups[dateKey].salesCount += 1;
        groups[dateKey].totalItemsSold += (sale.items || []).reduce((acc, it) => acc + it.quantity, 0);

        if (sale.paymentMethod === 'ESPECES') groups[dateKey].cashTotal += sale.totalAmount;
        if (sale.paymentMethod === 'MOBILE_MONEY') groups[dateKey].mobileTotal += sale.totalAmount;
        if (sale.paymentMethod === 'CARTE_BANCAIRE') groups[dateKey].cardTotal += sale.totalAmount;
        if (sale.paymentMethod === 'CREDIT') groups[dateKey].creditTotal += sale.totalAmount;
      }
    });

    // Sort days descending (most recent first)
    return Object.values(groups).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [filteredSales]);

  // Total net for current filtered set
  const filteredTotalRevenue = useMemo(() => {
    return filteredSales
      .filter((s) => s.status === 'COMPLETEE')
      .reduce((sum, s) => sum + s.totalAmount, 0);
  }, [filteredSales]);

  const toggleDayExpansion = (dateKey: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  const handleOpenCancelModal = (sale: Sale) => {
    setSaleToCancel(sale);
    setCancelReason('Erreur de saisie client / Retour article');
    setErrorMessage(null);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleToCancel || !cancelReason.trim()) return;

    const res = cancelSale(saleToCancel.id, cancelReason.trim());
    if (res.success) {
      setShowCancelModal(false);
      setSaleToCancel(null);
    } else {
      setErrorMessage(res.message || "Erreur lors de l'annulation.");
    }
  };

  const isVendeur = currentUser?.role === 'VENDEUR';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Ventes Réalisées & Factures
            </h1>
            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-[10px] font-bold">
              Journal Quotidien
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des ventes par jour, chiffre d'affaires quotidien, impression des rapports et réimpression des factures.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('pos')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nouvelle Vente (POS)</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time KPI Cards: Daily Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Aujourd'hui */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              Ventes d'Aujourd'hui
            </span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
              {todaySales.length} {todaySales.length > 1 ? 'ventes' : 'vente'}
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-600">
            {formatMoney(todayRevenue, settings.currency)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>Panier moyen : <strong className="text-slate-700">{formatMoney(todayAvgTicket, settings.currency)}</strong></span>
            {todaySales.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const { fullLabel } = formatDayLabel(todayKey);
                  setDailyReportModalDate({
                    key: todayKey,
                    label: fullLabel,
                    sales: todaySales,
                  });
                }}
                className="text-indigo-600 hover:text-indigo-800 font-bold underline text-[10px] flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3 h-3" />
                Rapport du jour
              </button>
            )}
          </div>
        </div>

        {/* Hier */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              Ventes d'Hier
            </span>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold">
              {yesterdaySales.length} {yesterdaySales.length > 1 ? 'ventes' : 'vente'}
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {formatMoney(yesterdayRevenue, settings.currency)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>Rapprochement journalier</span>
            {yesterdaySales.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const { fullLabel } = formatDayLabel(yesterdayKey);
                  setDailyReportModalDate({
                    key: yesterdayKey,
                    label: fullLabel,
                    sales: yesterdaySales,
                  });
                }}
                className="text-indigo-600 hover:text-indigo-800 font-bold underline text-[10px] flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3 h-3" />
                Rapport d'hier
              </button>
            )}
          </div>
        </div>

        {/* Total Sélection Active */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              Total Période Sélectionnée
            </span>
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-bold">
              {filteredSales.filter((s) => s.status === 'COMPLETEE').length} encaissées
            </span>
          </div>
          <p className="text-2xl font-black text-indigo-700">
            {formatMoney(filteredTotalRevenue, settings.currency)}
          </p>
          <p className="text-[11px] text-slate-400 pt-1">
            {datePeriod === 'all' ? 'Toutes dates confondues' : `Filtre actif : ${datePeriod}`}
          </p>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Mode Selector and Quick Date Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Main View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setViewMode('by_day')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'by_day'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Ventes par Jour (Journalier)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('all_invoices')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'all_invoices'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Toutes les Factures (Détail)</span>
            </button>
          </div>

          {/* Quick Date Period Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 hidden sm:inline">Période :</span>
            {[
              { id: 'all', label: 'Toutes dates' },
              { id: 'today', label: "Aujourd'hui" },
              { id: 'yesterday', label: 'Hier' },
              { id: 'week', label: '7 derniers jours' },
              { id: 'month', label: 'Ce mois-ci' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setDatePeriod(p.id as DatePeriodFilter);
                  setCustomDate('');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  datePeriod === p.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}

            {/* Specific Date Picker */}
            <div className="flex items-center gap-1 pl-1">
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  if (e.target.value) {
                    setDatePeriod('custom');
                  } else {
                    setDatePeriod('all');
                  }
                }}
                className={`py-1 px-2 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  datePeriod === 'custom' && customDate
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-950 font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
                title="Filtrer par date spécifique"
              />
              {customDate && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomDate('');
                    setDatePeriod('all');
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 text-xs"
                  title="Effacer la date spécifique"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Search & Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher facture, client, caissier, article..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="all">Tous les modes de paiement</option>
            <option value="ESPECES">Espèces</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="CARTE_BANCAIRE">Carte Bancaire</option>
            <option value="CREDIT">À Crédit (Dette)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="all">Tous les statuts</option>
            <option value="COMPLETEE">Complétée (Encaissée)</option>
            <option value="ANNULEE">Annulée (Restockée)</option>
          </select>
        </div>
      </div>

      {/* VIEW 1: VENTES PAR JOUR (Groupement Journalier) */}
      {viewMode === 'by_day' && (
        <div className="space-y-4">
          {salesByDay.length > 0 ? (
            salesByDay.map((dayGroup) => {
              const { fullLabel, badge } = formatDayLabel(dayGroup.dateKey);
              const isExpanded = expandedDays[dayGroup.dateKey] ?? (dayGroup.dateKey === todayKey); // Open today by default
              const avgTicket =
                dayGroup.salesCount > 0 ? Math.round(dayGroup.totalRevenue / dayGroup.salesCount) : 0;

              return (
                <div
                  key={dayGroup.dateKey}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
                >
                  {/* Day Header Banner */}
                  <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleDayExpansion(dayGroup.dateKey)}
                        className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer"
                        title={isExpanded ? 'Replier la journée' : 'Déplier le détail des ventes'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-black text-slate-900 tracking-tight">
                            {fullLabel}
                          </h2>
                          {badge && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                badge === "Aujourd'hui"
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {dayGroup.salesCount} {dayGroup.salesCount > 1 ? 'ventes encaissées' : 'vente encaissée'} • {dayGroup.totalItemsSold} articles vendus • Panier moyen : <strong>{formatMoney(avgTicket, settings.currency)}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Revenue for this day */}
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Chiffre d'Affaires du Jour</span>
                        <span className="text-xl font-black text-emerald-600">
                          {formatMoney(dayGroup.totalRevenue, settings.currency)}
                        </span>
                      </div>

                      {/* Print Daily Report Button */}
                      <button
                        type="button"
                        onClick={() =>
                          setDailyReportModalDate({
                            key: dayGroup.dateKey,
                            label: fullLabel,
                            sales: dayGroup.sales,
                          })
                        }
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                        title="Imprimer le rapport récapitulatif des ventes de ce jour"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span>Rapport du Jour</span>
                      </button>
                    </div>
                  </div>

                  {/* Payment Breakdown Bar */}
                  <div className="px-4 py-2.5 bg-slate-100/60 border-b border-slate-200 flex flex-wrap items-center gap-4 text-xs">
                    <span className="text-slate-500 text-[11px] font-semibold">Encaissements du jour :</span>
                    <span className="inline-flex items-center gap-1 text-slate-800 font-medium">
                      <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                      Espèces : <strong>{formatMoney(dayGroup.cashTotal, settings.currency)}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-800 font-medium">
                      <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                      Mobile Money : <strong>{formatMoney(dayGroup.mobileTotal, settings.currency)}</strong>
                    </span>
                    {dayGroup.cardTotal > 0 && (
                      <span className="inline-flex items-center gap-1 text-slate-800 font-medium">
                        <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                        Carte : <strong>{formatMoney(dayGroup.cardTotal, settings.currency)}</strong>
                      </span>
                    )}
                    {dayGroup.creditTotal > 0 && (
                      <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
                        À Crédit : <strong>{formatMoney(dayGroup.creditTotal, settings.currency)}</strong>
                      </span>
                    )}
                    {!isVendeur && dayGroup.totalMargin > 0 && (
                      <span className="ml-auto inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                        Bénéfice : +{formatMoney(dayGroup.totalMargin, settings.currency)}
                      </span>
                    )}
                  </div>

                  {/* Expandable Sales Table for this specific day */}
                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="p-3">Heure</th>
                            <th className="p-3">N° Facture</th>
                            <th className="p-3">Client</th>
                            <th className="p-3 text-center">Articles</th>
                            <th className="p-3">Paiement</th>
                            <th className="p-3 text-right">Total Net</th>
                            {!isVendeur && <th className="p-3 text-right">Marge</th>}
                            <th className="p-3">Caissier</th>
                            <th className="p-3">Statut</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dayGroup.sales.map((sale) => {
                            const isCancelled = sale.status === 'ANNULEE';
                            return (
                              <tr
                                key={sale.id}
                                className={`hover:bg-slate-50 transition-colors ${
                                  isCancelled ? 'bg-slate-50/70 opacity-65' : ''
                                }`}
                              >
                                <td className="p-3 text-slate-500 font-mono text-[11px]">
                                  {formatTimeOnly(sale.date)}
                                </td>
                                <td className="p-3 font-bold font-mono text-indigo-700">
                                  {sale.invoiceNumber}
                                </td>
                                <td className="p-3 font-medium text-slate-800">
                                  {sale.customerName || (
                                    <span className="text-slate-400 italic">Comptoir</span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold">
                                    {(sale.items || []).reduce((s, it) => s + it.quantity, 0)} art.
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                                    {getPaymentMethodLabel(sale.paymentMethod)}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-black text-slate-900">
                                  {formatMoney(sale.totalAmount, settings.currency)}
                                </td>
                                {!isVendeur && (
                                  <td className="p-3 text-right font-bold text-emerald-600">
                                    +{formatMoney(sale.totalMargin, settings.currency)}
                                  </td>
                                )}
                                <td className="p-3 text-slate-600 text-[11px]">{sale.userName}</td>
                                <td className="p-3">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                      isCancelled
                                        ? 'bg-rose-100 text-rose-700'
                                        : 'bg-emerald-100 text-emerald-700'
                                    }`}
                                  >
                                    {isCancelled ? 'Annulée' : 'Validée'}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => {
                                        setSelectedSaleForReceipt(sale);
                                        setShowReceiptModal(true);
                                      }}
                                      className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                                      title="Imprimer / Afficher le ticket"
                                    >
                                      <Printer className="w-4 h-4" />
                                    </button>
                                    {!isCancelled && (
                                      <button
                                        onClick={() => handleOpenCancelModal(sale)}
                                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                                        title="Annuler cette vente & restocker"
                                      >
                                        <RotateCcw className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
              Aucune vente trouvée pour les filtres sélectionnés.
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: TOUTES LES FACTURES (Tableau complet chronologique) */}
      {viewMode === 'all_invoices' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">N° Facture</th>
                  <th className="p-3.5">Date & Heure</th>
                  <th className="p-3.5">Client</th>
                  <th className="p-3.5 text-center">Articles</th>
                  <th className="p-3.5">Mode de Paiement</th>
                  <th className="p-3.5 text-right">Total Net</th>
                  {!isVendeur && <th className="p-3.5 text-right">Marge Brute</th>}
                  <th className="p-3.5">Caissier</th>
                  <th className="p-3.5">Statut</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.length > 0 ? (
                  filteredSales.map((sale) => {
                    const isCancelled = sale.status === 'ANNULEE';
                    return (
                      <tr
                        key={sale.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          isCancelled ? 'bg-slate-50/70 opacity-65' : ''
                        }`}
                      >
                        <td className="p-3.5 font-bold font-mono text-indigo-700">
                          {sale.invoiceNumber}
                        </td>
                        <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                          {formatDateTime(sale.date)}
                        </td>
                        <td className="p-3.5 font-medium text-slate-800">
                          {sale.customerName || (
                            <span className="text-slate-400 italic">Comptoir</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold">
                            {(sale.items || []).reduce((s, it) => s + it.quantity, 0)} art.
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {getPaymentMethodLabel(sale.paymentMethod)}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-black text-slate-900">
                          {formatMoney(sale.totalAmount, settings.currency)}
                        </td>
                        {!isVendeur && (
                          <td className="p-3.5 text-right font-bold text-emerald-600">
                            +{formatMoney(sale.totalMargin, settings.currency)}
                          </td>
                        )}
                        <td className="p-3.5 text-slate-600 text-[11px]">{sale.userName}</td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCancelled
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {isCancelled ? 'Annulée' : 'Validée'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedSaleForReceipt(sale);
                                setShowReceiptModal(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="Imprimer / Afficher le ticket"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {!isCancelled && (
                              <button
                                onClick={() => handleOpenCancelModal(sale)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                                title="Annuler cette vente & restocker"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 text-xs">
                      Aucune vente trouvée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CANCEL SALE MODAL */}
      {showCancelModal && saleToCancel && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmCancel}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in"
          >
            <div className="p-4 bg-rose-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-white" />
                Annulation de Vente : {saleToCancel.invoiceNumber}
              </h3>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="text-white hover:opacity-80 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              {errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
                  ⚠️ {errorMessage}
                </div>
              )}

              <p className="text-slate-600">
                L'annulation de cette vente va automatiquement :
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <li>Réintégrer les {saleToCancel.items.reduce((s, it) => s + it.quantity, 0)} articles dans le stock disponible.</li>
                <li>Créer un mouvement de type "Retour Client".</li>
                {saleToCancel.paymentMethod === 'ESPECES' && (
                  <li>Enregistrer une sortie de caisse de remboursement ({formatMoney(saleToCancel.totalAmount, settings.currency)}).</li>
                )}
                {saleToCancel.customerId && saleToCancel.paymentMethod === 'CREDIT' && (
                  <li>Déduire la dette du compte client.</li>
                )}
              </ul>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Motif d'annulation obligatoire *
                </label>
                <textarea
                  required
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  placeholder="Ex: Client s'est trompé de modèle, produit défectueux..."
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Retour
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirmer l'Annulation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* INVOICE & RECEIPT MODAL */}
      <InvoiceModal
        sale={selectedSaleForReceipt}
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
      />

      {/* PRINTABLE DAILY REPORT MODAL */}
      {dailyReportModalDate && (
        <DailyReportModal
          isOpen={Boolean(dailyReportModalDate)}
          onClose={() => setDailyReportModalDate(null)}
          dateKey={dailyReportModalDate.key}
          dateLabel={dailyReportModalDate.label}
          sales={dailyReportModalDate.sales}
          settings={settings}
          isVendeur={isVendeur}
        />
      )}
    </div>
  );
};
