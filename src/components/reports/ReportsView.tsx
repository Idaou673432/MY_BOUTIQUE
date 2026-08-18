import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Download,
  Calendar,
  Layers,
  PieChart,
  UserCheck,
  CreditCard,
  Percent,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatMoney, formatDate, getPaymentMethodLabel } from '../../utils/formatters';

export const ReportsView: React.FC = () => {
  const { sales, expenses, products, categories, users, settings } = useStore();

  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('month');

  // Filter sales and expenses by selected period
  const { periodSales, periodExpenses } = useMemo(() => {
    const now = new Date();
    let startDate = new Date(0);

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const filteredSales = sales.filter(
      (s) => new Date(s.date) >= startDate && s.status === 'COMPLETEE'
    );
    const filteredExpenses = expenses.filter((e) => new Date(e.date) >= startDate);

    return { periodSales: filteredSales, periodExpenses: filteredExpenses };
  }, [sales, expenses, period]);

  // Aggregate Key Performance Indicators
  const metrics = useMemo(() => {
    const totalRevenue = periodSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalGrossMargin = periodSales.reduce((sum, s) => sum + s.totalMargin, 0);
    const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalGrossMargin - totalExpenses;
    const marginRate = totalRevenue > 0 ? (totalGrossMargin / totalRevenue) * 100 : 0;
    const salesCount = periodSales.length;
    const averageTicket = salesCount > 0 ? totalRevenue / salesCount : 0;

    return {
      totalRevenue,
      totalGrossMargin,
      totalExpenses,
      netProfit,
      marginRate,
      salesCount,
      averageTicket,
    };
  }, [periodSales, periodExpenses]);

  // Top Selling Products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number; margin: number }>();

    periodSales.forEach((s) => {
      s.items.forEach((it) => {
        const existing = map.get(it.productId) || {
          name: it.productName,
          qty: 0,
          revenue: 0,
          margin: 0,
        };
        existing.qty += it.quantity;
        existing.revenue += it.total;
        existing.margin += it.margin;
        map.set(it.productId, existing);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [periodSales]);

  // Sales by Payment Method
  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    periodSales.forEach((s) => {
      const current = map.get(s.paymentMethod) || 0;
      map.set(s.paymentMethod, current + s.totalAmount);
    });
    return Array.from(map.entries()).map(([method, total]) => ({
      method,
      total,
      percent: metrics.totalRevenue > 0 ? (total / metrics.totalRevenue) * 100 : 0,
    }));
  }, [periodSales, metrics.totalRevenue]);

  // Sales by Seller
  const sellerBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; count: number; total: number }>();
    periodSales.forEach((s) => {
      const existing = map.get(s.userId) || { name: s.userName, count: 0, total: 0 };
      existing.count += 1;
      existing.total += s.totalAmount;
      map.set(s.userId, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [periodSales]);

  // Export full report CSV
  const handleExportReportCSV = () => {
    const lines = [
      `RAPPORT COMMERCIAL DE GESTION (${period.toUpperCase()})`,
      `Généré le : ${new Date().toLocaleDateString('fr-FR')}`,
      '',
      `Chiffre d'Affaires Brut : ${metrics.totalRevenue} ${settings.currency}`,
      `Marge Brute Globale : ${metrics.totalGrossMargin} ${settings.currency}`,
      `Total Dépenses : ${metrics.totalExpenses} ${settings.currency}`,
      `Bénéfice Net : ${metrics.netProfit} ${settings.currency}`,
      `Taux de Marge Moyen : ${metrics.marginRate.toFixed(1)}%`,
      `Nombre de Ventes : ${metrics.salesCount}`,
      `Panier Moyen : ${Math.round(metrics.averageTicket)} ${settings.currency}`,
      '',
      'TOP ARTICLES VENDUS :',
      'Article,Quantité Vendue,CA Généré,Marge Réalisée',
      ...topProducts.map((p) => `"${p.name}",${p.qty},${p.revenue},${p.margin}`),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + lines.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rapport_commercial_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Period Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Rapports Commerciaux & Statistiques
          </h1>
          <p className="text-xs text-slate-500">
            Analyse détaillée du chiffre d'affaires, de la marge brute et du résultat net réel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              7 Jours
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Ce Mois
            </button>
            <button
              onClick={() => setPeriod('year')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'year' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Année
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Tout
            </button>
          </div>

          <button
            onClick={handleExportReportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter Rapport
          </button>
        </div>
      </div>

      {/* FINANCIAL SUMMARY HIGHLIGHT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Chiffre d'affaires */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Chiffre d'Affaires</span>
          <p className="text-2xl font-black text-slate-900">
            {formatMoney(metrics.totalRevenue, settings.currency)}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">
            {metrics.salesCount} ventes enregistrées
          </p>
        </div>

        {/* Marge Brute */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Marge Brute Commerciale</span>
          <p className="text-2xl font-black text-indigo-700">
            {formatMoney(metrics.totalGrossMargin, settings.currency)}
          </p>
          <p className="text-[11px] text-indigo-600 font-bold">
            Taux de marge : {metrics.marginRate.toFixed(1)}%
          </p>
        </div>

        {/* Total Dépenses */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Dépenses d'Exploitation</span>
          <p className="text-2xl font-black text-rose-600">
            -{formatMoney(metrics.totalExpenses, settings.currency)}
          </p>
          <p className="text-[11px] text-slate-500">
            {periodExpenses.length} charges déduites
          </p>
        </div>

        {/* Bénéfice Net Réel */}
        <div
          className={`p-4 rounded-2xl border shadow-xs space-y-1 ${
            metrics.netProfit >= 0
              ? 'bg-emerald-50/80 border-emerald-200'
              : 'bg-rose-50/80 border-rose-200'
          }`}
        >
          <span className="text-xs font-bold text-slate-700">
            Bénéfice Net Réel (Marge - Dépenses)
          </span>
          <p
            className={`text-2xl font-black ${
              metrics.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {metrics.netProfit >= 0 ? '+' : ''}
            {formatMoney(metrics.netProfit, settings.currency)}
          </p>
          <p className="text-[11px] text-slate-600 font-medium">
            Panier moyen : {formatMoney(metrics.averageTicket, settings.currency)}
          </p>
        </div>
      </div>

      {/* 2-COL ANALYSIS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TOP SELLING PRODUCTS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Top 5 Produits les Plus Vendus
          </h3>

          <div className="space-y-3">
            {topProducts.length > 0 ? (
              topProducts.map((p, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <strong className="text-slate-900">{p.name}</strong>
                    </div>
                    <span className="font-black text-indigo-700">
                      {formatMoney(p.revenue, settings.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                    <span>Quantité écoulée : <strong>{p.qty}</strong></span>
                    <span className="text-emerald-600 font-semibold">
                      Marge : +{formatMoney(p.margin, settings.currency)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-400 text-xs py-8">
                Aucune vente sur cette période.
              </p>
            )}
          </div>
        </div>

        {/* PAYMENT METHODS & SELLER PERFORMANCE */}
        <div className="space-y-6">
          {/* Payment Methods */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Répartition par Mode de Règlement
            </h3>

            <div className="space-y-2.5">
              {paymentBreakdown.length > 0 ? (
                paymentBreakdown.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        {getPaymentMethodLabel(item.method as any)}
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatMoney(item.total, settings.currency)} ({item.percent.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-400 text-xs py-4">Aucune transaction.</p>
              )}
            </div>
          </div>

          {/* Performance Sellers */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-500" />
              Performances des Vendeurs / Caissiers
            </h3>

            <div className="divide-y divide-slate-100">
              {sellerBreakdown.map((s, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{s.name}</p>
                    <p className="text-[10px] text-slate-500">{s.count} tickets encaissés</p>
                  </div>
                  <strong className="text-sm font-black text-slate-900">
                    {formatMoney(s.total, settings.currency)}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
