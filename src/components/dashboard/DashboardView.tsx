import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Users,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  HeartPulse,
  PlusCircle,
  Clock,
  CheckCircle,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatMoney, formatDate } from '../../utils/formatters';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { 
    settings, 
    metrics, 
    sales, 
    products, 
    expenses, 
    categories, 
    purchases, 
    customers, 
    suppliers,
    cashRegister,
    currentUser
  } = useStore();

  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'prev_month' | 'year'>('month');

  // Filtered dataset according to dateFilter
  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    if (dateFilter === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (dateFilter === 'week') {
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
    } else if (dateFilter === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (dateFilter === 'prev_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    } else if (dateFilter === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const filteredSales = sales.filter(s => {
      const d = new Date(s.date);
      if (dateFilter === 'prev_month') {
        const prevMonth = now.getMonth() - 1;
        const prevYear = prevMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const adjustedMonth = (prevMonth + 12) % 12;
        return d.getMonth() === adjustedMonth && d.getFullYear() === prevYear && s.status === 'COMPLETEE';
      }
      return d >= startDate && s.status === 'COMPLETEE';
    });

    const filteredExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d >= startDate;
    });

    const revenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const costOfGoods = filteredSales.reduce((sum, s) => sum + s.totalCost, 0);
    const totalExp = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const grossMargin = revenue - costOfGoods;
    const netProfit = grossMargin - totalExp;
    const salesCount = filteredSales.length;
    const marginRate = revenue > 0 ? Math.round((grossMargin / revenue) * 100) : 0;

    // Top selling products in this filtered period
    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number; margin: number }> = {};
    filteredSales.forEach(s => {
      s.items.forEach(it => {
        if (!productSalesMap[it.productId]) {
          productSalesMap[it.productId] = { name: it.productName, quantity: 0, revenue: 0, margin: 0 };
        }
        productSalesMap[it.productId].quantity += it.quantity;
        productSalesMap[it.productId].revenue += it.total;
        productSalesMap[it.productId].margin += it.margin;
      });
    });

    const topSelling = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Sales by category
    const categorySalesMap: Record<string, number> = {};
    (filteredSales || []).forEach(s => {
      (s.items || []).forEach(it => {
        const prod = (products || []).find(p => p.id === it.productId);
        const catName = (categories || []).find(c => c.id === prod?.categoryId)?.name || 'Autres';
        categorySalesMap[catName] = (categorySalesMap[catName] || 0) + it.total;
      });
    });

    return {
      revenue,
      costOfGoods,
      grossMargin,
      totalExpenses: totalExp,
      netProfit,
      salesCount,
      marginRate,
      topSelling,
      categorySalesMap,
    };
  }, [sales, expenses, products, categories, dateFilter]);

  // Last 7 days sales data for chart
  const weeklySalesData = useMemo(() => {
    const days: { label: string; dateStr: string; amount: number }[] = [];
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = dayNames[d.getDay()];
      
      const dayTotal = sales
        .filter(s => s.status === 'COMPLETEE' && s.date.startsWith(dateStr))
        .reduce((sum, s) => sum + s.totalAmount, 0);

      days.push({ label: dayLabel, dateStr, amount: dayTotal });
    }

    const maxAmount = Math.max(...days.map(d => d.amount), 50000);
    return { days, maxAmount };
  }, [sales]);

  // Ruptures & low stock items list for stock health widget
  const criticalStockItems = useMemo(() => {
    return products
      .filter(p => p.currentStock <= p.minStock)
      .sort((a, b) => a.currentStock - b.currentStock)
      .slice(0, 5);
  }, [products]);

  // Recent 5 sales
  const recentSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [sales]);

  const isVendeur = currentUser.role === 'VENDEUR';
  const totalStockAlerts = metrics.outOfStockCount + metrics.lowStockCount;

  return (
    <div className="space-y-5 pb-10">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-xs">
        <div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <span>Tableau de Bord</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wide">
              Temps Réel
            </span>
          </h1>
          <p className="text-xs text-gray-500">
            Aperçu haute densité de votre rentabilité, caisse et stock.
          </p>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'today', label: "Aujourd'hui" },
            { id: 'week', label: 'Cette semaine' },
            { id: 'month', label: 'Ce mois' },
            { id: 'prev_month', label: 'Mois dernier' },
            { id: 'year', label: 'Cette année' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                dateFilter === f.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 PRIMARY METRIC CARDS (High Density Design Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: CA */}
        <div 
          onClick={() => onNavigate('sales')}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="text-[11px] uppercase text-gray-500 font-bold mb-1 tracking-wider flex items-center justify-between">
            <span>CA {dateFilter === 'today' ? 'DU JOUR' : 'PÉRIODE'}</span>
            <TrendingUp className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-gray-900 tracking-tight">
            {formatMoney(filteredData.revenue, settings.currency)}
          </div>
          <div className="text-[10px] text-emerald-600 mt-1 font-bold flex items-center gap-1">
            <span>▲</span> {filteredData.salesCount} ventes finalisées
          </div>
        </div>

        {/* Card 2: Bénéfice estimé */}
        <div 
          onClick={() => !isVendeur && onNavigate('reports')}
          className={`bg-white p-4 rounded-xl border border-gray-200 shadow-xs transition-all ${!isVendeur ? 'hover:border-indigo-300 cursor-pointer' : ''}`}
        >
          <div className="text-[11px] uppercase text-gray-500 font-bold mb-1 tracking-wider flex items-center justify-between">
            <span>BÉNÉFICE ESTIMÉ</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600 tracking-tight">
            {formatMoney(filteredData.netProfit, settings.currency)}{' '}
            <span className="text-xs font-normal text-gray-400 italic">net</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-1 font-bold">
            Marge brute: {filteredData.marginRate}%
          </div>
        </div>

        {/* Card 3: Dispo Caisse */}
        <div 
          onClick={() => onNavigate('cash')}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="text-[11px] uppercase text-gray-500 font-bold mb-1 tracking-wider flex items-center justify-between">
            <span>DISPO. CAISSE</span>
            <Wallet className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">
            {formatMoney(metrics.currentCashBalance, settings.currency)}
          </div>
          <div className="text-[10px] text-gray-500 mt-1 font-bold">
            {cashRegister?.isOpen ? '● Caisse active en cours' : '○ Caisse fermée'}
          </div>
        </div>

        {/* Card 4: Alertes Stock */}
        <div 
          onClick={() => onNavigate('stock')}
          className={`p-4 rounded-xl border shadow-xs transition-all cursor-pointer group ${
            totalStockAlerts > 0
              ? 'bg-red-50/50 border-red-200 hover:border-red-300'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-[11px] uppercase text-red-600 font-bold mb-1 tracking-wider flex items-center justify-between">
            <span>ALERTES STOCK</span>
            <AlertTriangle className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-red-700 tracking-tight">
            {totalStockAlerts.toString().padStart(2, '0')}{' '}
            <span className="text-xs font-normal opacity-70">références</span>
          </div>
          <div className="text-[10px] text-red-600 mt-1 font-bold">
            {metrics.outOfStockCount > 0 ? `⚠️ ${metrics.outOfStockCount} rupture(s) totale(s)` : 'Approvisionnement normal'}
          </div>
        </div>
      </div>

      {/* MAIN 2-COLUMN / 3-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Span 2): Evolution Chart + Recent Sales */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Chart: Évolution des ventes */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-xs sm:text-sm text-gray-900 uppercase tracking-wide">
                ÉVOLUTION DES VENTES (7 DERNIERS JOURS)
              </h2>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                Total : {formatMoney(weeklySalesData.days.reduce((acc, d) => acc + d.amount, 0), settings.currency)}
              </span>
            </div>

            {/* Custom Bar Graph */}
            <div className="h-44 sm:h-52 flex items-end justify-between gap-2 px-2 pb-2 pt-4 border-b border-gray-100">
              {weeklySalesData.days.map((day, idx) => {
                const heightPercent = weeklySalesData.maxAmount > 0 
                  ? Math.max(8, Math.round((day.amount / weeklySalesData.maxAmount) * 100))
                  : 8;
                const isToday = idx === weeklySalesData.days.length - 1;

                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5 w-full h-full justify-end group">
                    <span className="text-[9px] font-bold text-gray-400 group-hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100 truncate">
                      {formatMoney(day.amount, settings.currency)}
                    </span>
                    <div 
                      className={`w-full rounded-t transition-all duration-300 ${
                        isToday 
                          ? 'bg-indigo-600 shadow-xs' 
                          : 'bg-indigo-100 hover:bg-indigo-300'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className={`text-[10px] ${isToday ? 'font-black text-indigo-700' : 'text-gray-400 font-medium'}`}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ventes Récentes High Density Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-xs sm:text-sm text-gray-900 uppercase tracking-wide">
                VENTES RÉCENTES
              </h2>
              <button
                onClick={() => onNavigate('sales')}
                className="text-indigo-600 text-xs font-bold hover:underline"
              >
                Voir tout l'historique
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase text-[9px] font-bold tracking-wider">
                  <tr>
                    <th className="px-3 py-2">Facture</th>
                    <th className="px-3 py-2">Client</th>
                    <th className="px-3 py-2 text-center">Articles</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Paiement</th>
                    <th className="px-3 py-2 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentSales.length > 0 ? (
                    recentSales.map((s) => {
                      const totalQty = s.items.reduce((sum, it) => sum + it.quantity, 0);
                      return (
                        <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-3 py-2 font-mono font-bold text-gray-900">
                            #{s.invoiceNumber}
                          </td>
                          <td className="px-3 py-2 text-gray-700 font-medium truncate max-w-[120px]">
                            {s.customerName || 'Client Comptoir'}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-500">
                            {totalQty.toString().padStart(2, '0')}
                          </td>
                          <td className="px-3 py-2 text-right font-black text-gray-900">
                            {formatMoney(s.totalAmount, settings.currency)}
                          </td>
                          <td className="px-3 py-2 text-right text-[10px] text-gray-500">
                            {s.paymentMethod}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {s.paymentMethod === 'CREDIT' ? (
                              <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                CRÉDIT
                              </span>
                            ) : s.status === 'COMPLETEE' ? (
                              <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                PAYÉ
                              </span>
                            ) : (
                              <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                {s.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                        Aucune vente récente enregistrée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Santé du stock + Santé de ma boutique widget */}
        <div className="flex flex-col gap-6">
          {/* Santé du Stock Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-4 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="font-bold text-xs sm:text-sm text-gray-900 uppercase tracking-wide">
                SANTÉ DU STOCK
              </h2>
              <button 
                onClick={() => onNavigate('stock')}
                className="text-indigo-600 text-[10px] font-bold hover:underline"
              >
                VOIR TOUT
              </button>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-60 pr-1">
              {criticalStockItems.length > 0 ? (
                criticalStockItems.map((item) => {
                  const isOut = item.currentStock <= 0;
                  return (
                    <div 
                      key={item.id}
                      onClick={() => onNavigate('stock')}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                        isOut 
                          ? 'bg-red-50 border-red-100 hover:border-red-200' 
                          : 'bg-orange-50 border-orange-100 hover:border-orange-200'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-xs font-bold text-gray-900 truncate">{item.name}</span>
                        <span className={`text-[10px] font-medium ${isOut ? 'text-red-600' : 'text-orange-600'}`}>
                          {isOut ? 'Rupture de stock' : `Stock faible (Seuil ${item.minStock})`}
                        </span>
                      </div>
                      <span className={`text-xs font-black shrink-0 ${isOut ? 'text-red-700' : 'text-orange-700'}`}>
                        {item.currentStock} {item.unit}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 text-center">
                  <p className="text-xs font-bold text-emerald-800">Stock Parfaitement Approvisionné</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">Aucun article sous le seuil critique</p>
                </div>
              )}
            </div>
          </div>

          {/* Dark Widget: SANTÉ DE MA BOUTIQUE */}
          <div className="bg-[#2D3748] rounded-xl shadow-lg p-5 text-white flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                SANTÉ DE MA BOUTIQUE
              </h3>
              
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${
                  metrics.shopHealth === 'GOOD'
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                    : metrics.shopHealth === 'WARNING'
                    ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                    : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                }`} />
                <span className="text-sm font-bold text-white">
                  {metrics.shopHealth === 'GOOD' ? 'Boutique Très Rentable' : metrics.shopHealth === 'WARNING' ? 'Attention Vigilance' : 'Alerte Finance'}
                </span>
              </div>

              <div className="space-y-4">
                {/* Objectif Mensuel Bar */}
                <div>
                  <div className="flex justify-between text-[10px] font-bold mb-1 text-gray-300">
                    <span>Objectif Mensuel Estimé</span>
                    <span>{Math.min(100, Math.round((filteredData.revenue / 500000) * 100))}%</span>
                  </div>
                  <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.round((filteredData.revenue / 500000) * 100))}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center py-2 border-t border-gray-700 text-xs">
                  <span className="text-gray-400">Valeur Totale Stock</span>
                  <span className="font-bold text-white">
                    {formatMoney(metrics.totalStockValue, settings.currency)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-t border-gray-700 text-xs">
                  <span className="text-gray-400">Créances à Récupérer</span>
                  <span className="font-bold text-amber-400">
                    {formatMoney(metrics.totalCustomerDebt, settings.currency)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('pos')}
              className="mt-5 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Ouvrir la Caisse POS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

