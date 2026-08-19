import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Download,
  Search,
  Filter,
  Layers,
  FileSpreadsheet,
  FileCheck,
  Building2,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Clock
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product, Category, Sale, Purchase, Inventory, StockMovement } from '../../types';
import { formatMoney, formatDate, formatDateTime, formatQuantity } from '../../utils/formatters';
import {
  AnnualInventorySummary,
  generateAnnualInventoryReportHtml,
  executeDirectPrint,
  downloadHtmlFile
} from '../../utils/printService';

export const AnnualInventoryBalance: React.FC = () => {
  const {
    products = [],
    categories = [],
    sales = [],
    purchases = [],
    inventories = [],
    inventorySessions = [],
    stockMovements = [],
    settings,
    currentUser
  } = useStore();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'CATEGORIES' | 'SESSIONS' | 'PV'>('LEDGER');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HEALTHY' | 'FAST' | 'LOW' | 'OUT' | 'ECART'>('ALL');
  const [isPrinting, setIsPrinting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const sessionsList: Inventory[] = inventorySessions.length > 0 ? inventorySessions : inventories;

  // Available fiscal years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([currentYear, currentYear - 1, currentYear - 2]);
    sales.forEach((s) => {
      if (s.date) {
        const y = new Date(s.date).getFullYear();
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    sessionsList.forEach((inv) => {
      if (inv.date) {
        const y = new Date(inv.date).getFullYear();
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [sales, sessionsList, currentYear]);

  // Compute Comprehensive Annual Summary Data
  const annualData: AnnualInventorySummary = useMemo(() => {
    const yearSales = sales.filter((s) => {
      if (!s.date || s.status === 'ANNULEE') return false;
      return new Date(s.date).getFullYear() === selectedYear;
    });

    const yearPurchases = purchases.filter((p) => {
      if (!p.date || p.status === 'ANNULE') return false;
      return new Date(p.date).getFullYear() === selectedYear;
    });

    const yearInventories = sessionsList.filter((inv) => {
      if (!inv.date) return false;
      return new Date(inv.date).getFullYear() === selectedYear;
    });

    // Map sales qty per product
    const productSalesMap = new Map<string, { qty: number; revenue: number; margin: number }>();
    yearSales.forEach((sale) => {
      sale.items.forEach((it) => {
        const existing = productSalesMap.get(it.productId) || { qty: 0, revenue: 0, margin: 0 };
        existing.qty += it.quantity;
        existing.revenue += it.total;
        existing.margin += it.margin || 0;
        productSalesMap.set(it.productId, existing);
      });
    });

    // Map purchases qty per product
    const productPurchasesMap = new Map<string, { qty: number; cost: number }>();
    yearPurchases.forEach((p) => {
      p.items.forEach((it) => {
        const existing = productPurchasesMap.get(it.productId) || { qty: 0, cost: 0 };
        existing.qty += it.quantity;
        existing.cost += it.totalCost || it.quantity * it.unitCost;
        productPurchasesMap.set(it.productId, existing);
      });
    });

    // Map inventory discrepancies per product for the year
    const productEcartMap = new Map<string, { diffQty: number; lossesVal: number; surplusVal: number }>();
    yearInventories.forEach((inv) => {
      if (inv.status === 'VALIDE') {
        inv.items.forEach((it) => {
          const existing = productEcartMap.get(it.productId) || { diffQty: 0, lossesVal: 0, surplusVal: 0 };
          existing.diffQty += it.difference;
          const finDiff = it.financialDifference || it.difference * it.unitCost;
          if (finDiff < 0) {
            existing.lossesVal += Math.abs(finDiff);
          } else if (finDiff > 0) {
            existing.surplusVal += finDiff;
          }
          productEcartMap.set(it.productId, existing);
        });
      }
    });

    let totalQuantityInStock = 0;
    let totalStockPurchaseValue = 0;
    let totalStockSaleValue = 0;

    let totalPurchasesQuantity = 0;
    let totalPurchasesCost = 0;
    yearPurchases.forEach((p) => {
      p.items.forEach((it) => {
        totalPurchasesQuantity += it.quantity;
        totalPurchasesCost += it.totalCost || it.quantity * it.unitCost;
      });
    });

    let totalSalesQuantity = 0;
    let totalSalesRevenue = 0;
    let totalSalesGrossMargin = 0;
    yearSales.forEach((s) => {
      totalSalesRevenue += s.totalAmount;
      totalSalesGrossMargin += s.totalMargin || (s.totalAmount - (s.totalCost || 0));
      s.items.forEach((it) => {
        totalSalesQuantity += it.quantity;
      });
    });

    let totalInventoryLossesValue = 0;
    let totalInventorySurplusValue = 0;

    // Build Detailed Product Ledger
    const productLedger = products.map((p) => {
      const cat = categories.find((c) => c.id === p.categoryId);
      const salesInfo = productSalesMap.get(p.id) || { qty: 0, revenue: 0, margin: 0 };
      const purchasesInfo = productPurchasesMap.get(p.id) || { qty: 0, cost: 0 };
      const ecartInfo = productEcartMap.get(p.id) || { diffQty: 0, lossesVal: 0, surplusVal: 0 };

      const costVal = p.currentStock * p.purchasePrice;
      const saleVal = p.currentStock * p.salePrice;

      totalQuantityInStock += p.currentStock;
      totalStockPurchaseValue += costVal;
      totalStockSaleValue += saleVal;

      totalInventoryLossesValue += ecartInfo.lossesVal;
      totalInventorySurplusValue += ecartInfo.surplusVal;

      // Calculate turnover
      const avgStock = Math.max(1, p.currentStock + salesInfo.qty / 2);
      const rotationRate = salesInfo.qty / avgStock;

      // Health status
      let healthStatus: 'HEALTHY' | 'LOW' | 'OUT_OF_STOCK' | 'OVERSTOCK' | 'FAST_MOVING' = 'HEALTHY';
      if (p.currentStock <= 0) {
        healthStatus = 'OUT_OF_STOCK';
      } else if (p.currentStock <= p.minStock) {
        healthStatus = 'LOW';
      } else if (salesInfo.qty >= 12) {
        healthStatus = 'FAST_MOVING';
      } else if (p.currentStock > p.maxStock || (p.currentStock > 15 && salesInfo.qty === 0)) {
        healthStatus = 'OVERSTOCK';
      }

      return {
        productId: p.id,
        productCode: p.code || '',
        barcode: p.barcode || '',
        productName: p.name,
        categoryName: cat?.name || 'Général',
        unit: p.unit || 'pièce',
        purchasePrice: p.purchasePrice,
        salePrice: p.salePrice,
        initialEstimatedStock: Math.max(0, p.currentStock + salesInfo.qty - purchasesInfo.qty - ecartInfo.diffQty),
        yearEntriesQty: purchasesInfo.qty,
        yearSalesQty: salesInfo.qty,
        currentPhysicalStock: p.currentStock,
        stockCostValue: costVal,
        stockSaleValue: saleVal,
        yearDifferencesQty: ecartInfo.diffQty,
        yearLossesValue: ecartInfo.lossesVal,
        rotationRate,
        healthStatus,
      };
    });

    // Category Summaries
    const categorySummaries = categories.map((cat) => {
      const catProducts = productLedger.filter((p) => {
        const prod = products.find((pr) => pr.id === p.productId);
        return prod?.categoryId === cat.id;
      });

      const productCount = catProducts.length;
      let totalStockQty = 0;
      let stockCostValue = 0;
      let stockSaleValue = 0;
      let yearSalesQty = 0;
      let yearSalesRevenue = 0;
      let yearLossesValue = 0;

      catProducts.forEach((p) => {
        totalStockQty += p.currentPhysicalStock;
        stockCostValue += p.stockCostValue;
        stockSaleValue += p.stockSaleValue;
        yearSalesQty += p.yearSalesQty;
        yearLossesValue += p.yearLossesValue;
        const sInfo = productSalesMap.get(p.productId);
        if (sInfo) yearSalesRevenue += sInfo.revenue;
      });

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        productCount,
        totalStockQty,
        stockCostValue,
        stockSaleValue,
        yearSalesQty,
        yearSalesRevenue,
        yearLossesValue,
      };
    });

    const potentialMarginValue = totalStockSaleValue - totalStockPurchaseValue;
    const potentialMarginPercent =
      totalStockSaleValue > 0 ? Math.round((potentialMarginValue / totalStockSaleValue) * 100) : 0;
    const netInventoryDifferenceValue = totalInventorySurplusValue - totalInventoryLossesValue;

    const avgAnnualStockValue = totalStockPurchaseValue;
    const turnoverRatio = avgAnnualStockValue > 0 ? totalSalesRevenue / avgAnnualStockValue : 0;
    const averageHoldingDays = turnoverRatio > 0 ? Math.round(365 / turnoverRatio) : 365;

    const inventorySessionsSummary = yearInventories.map((inv) => {
      let discrepancies = 0;
      let losses = 0;
      let surplus = 0;
      inv.items.forEach((it) => {
        if (it.difference !== 0) discrepancies++;
        const fin = it.financialDifference || it.difference * it.unitCost;
        if (fin < 0) losses += Math.abs(fin);
        else if (fin > 0) surplus += fin;
      });
      return {
        id: inv.id,
        title: inv.title || `Inventaire ${formatDate(inv.date)}`,
        date: inv.date,
        status: inv.status,
        responsibleName: inv.responsibleName || 'Magasinier',
        totalItems: inv.items.length,
        discrepancyCount: discrepancies,
        lossesValue: losses,
        surplusValue: surplus,
      };
    });

    return {
      year: selectedYear,
      totalProducts: products.length,
      totalQuantityInStock,
      totalStockPurchaseValue,
      totalStockSaleValue,
      potentialMarginValue,
      potentialMarginPercent,
      totalPurchasesQuantity,
      totalPurchasesCost,
      totalSalesQuantity,
      totalSalesRevenue,
      totalSalesGrossMargin,
      totalInventoryLossesValue,
      totalInventorySurplusValue,
      netInventoryDifferenceValue,
      turnoverRatio,
      averageHoldingDays,
      categorySummaries,
      productLedger,
      inventorySessionsSummary,
    };
  }, [selectedYear, products, categories, sales, purchases, sessionsList]);

  // Filtered ledger articles
  const filteredLedger = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return annualData.productLedger.filter((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const matchesSearch =
        !q ||
        item.productName.toLowerCase().includes(q) ||
        item.productCode.toLowerCase().includes(q) ||
        item.barcode.toLowerCase().includes(q);

      const matchesCat = selectedCategory === 'all' || prod?.categoryId === selectedCategory;

      let matchesStatus = true;
      if (statusFilter === 'HEALTHY') matchesStatus = item.healthStatus === 'HEALTHY';
      else if (statusFilter === 'FAST') matchesStatus = item.healthStatus === 'FAST_MOVING';
      else if (statusFilter === 'LOW') matchesStatus = item.healthStatus === 'LOW';
      else if (statusFilter === 'OUT') matchesStatus = item.healthStatus === 'OUT_OF_STOCK';
      else if (statusFilter === 'ECART') matchesStatus = item.yearDifferencesQty !== 0 || item.yearLossesValue > 0;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [annualData, searchTerm, selectedCategory, statusFilter, products]);

  // Actions
  const handlePrintReport = async () => {
    setIsPrinting(true);
    setFeedbackMessage("Génération du rapport d'inventaire annuel...");
    try {
      const html = generateAnnualInventoryReportHtml(annualData, settings);
      await executeDirectPrint(html);
      setFeedbackMessage('Bilan annuel envoyé à l’imprimante !');
    } catch (err) {
      console.error('Print error:', err);
      window.print();
    } finally {
      setIsPrinting(false);
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Exercice',
      'Code Article',
      'Code-Barres',
      'Nom de l Article',
      'Catégorie',
      'Unité',
      'Prix Achat Unitaire (FCFA)',
      'Prix Vente Unitaire (FCFA)',
      'Stock Initial Estimé',
      'Entrées Année (Achats)',
      'Sorties Année (Ventes)',
      'Écart Inventaire (Qté)',
      'Pertes Inventaire (FCFA)',
      'Stock Physique Final',
      'Valeur Stock Achat (FCFA)',
      'Valeur Stock Vente (FCFA)',
      'Rotation Stock',
      'Statut Santé Stock',
    ];

    const rows = annualData.productLedger.map((p) => [
      annualData.year,
      `"${p.productCode}"`,
      `"${p.barcode}"`,
      `"${p.productName.replace(/"/g, '""')}"`,
      `"${p.categoryName.replace(/"/g, '""')}"`,
      `"${p.unit}"`,
      p.purchasePrice,
      p.salePrice,
      p.initialEstimatedStock,
      p.yearEntriesQty,
      p.yearSalesQty,
      p.yearDifferencesQty,
      p.yearLossesValue,
      p.currentPhysicalStock,
      p.stockCostValue,
      p.stockSaleValue,
      p.rotationRate.toFixed(2),
      `"${p.healthStatus}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bilan_annuel_inventaire_${annualData.year}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setFeedbackMessage('Fichier Excel / CSV exporté avec succès !');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Year Selector */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold uppercase tracking-wider">
              Audit & Clôture Comptable
            </span>
            <span className="text-xs text-slate-400 font-mono">Exercice {selectedYear}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            Bilan Annuel d'Inventaire & Valorisation du Stock
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Synthèse comptable annuelle : valorisation au coût d'achat et au prix de vente, contrôle des flux
            (entrées/sorties), identification des pertes/écarts et calcul du taux de rotation annuel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Year Picker */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <Calendar className="w-4 h-4 text-slate-400 ml-2" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-white text-xs font-bold px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              {availableYears.map((y) => (
                <option key={y} value={y} className="bg-slate-900 text-white">
                  Année {y} {y === currentYear ? '(En cours)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            title="Exporter l'intégralité du grand livre d'inventaire en format Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            disabled={isPrinting}
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
            title="Imprimer le Bilan Officiel d'Inventaire au format A4 certifié"
          >
            <Printer className="w-4 h-4" />
            <span>{isPrinting ? 'Impression...' : 'Imprimer le Bilan Officiel'}</span>
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Primary KPI Grid (6 Big Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* Valeur Stock Achat */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Valeur Stock (Achat)</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 tracking-tight">
              {formatMoney(annualData.totalStockPurchaseValue, settings.currency)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {annualData.totalQuantityInStock} articles physiques en stock
            </p>
          </div>
          <div className="text-[10px] text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md font-semibold inline-block">
            Actif immobilisé en magasin
          </div>
        </div>

        {/* Valeur Stock Vente */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Valeur Stock (Vente)</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-emerald-700 tracking-tight">
              {formatMoney(annualData.totalStockSaleValue, settings.currency)}
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5 font-bold">
              Marge potentielle: +{annualData.potentialMarginPercent}%
            </p>
          </div>
          <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold inline-block">
            +{formatMoney(annualData.potentialMarginValue, settings.currency)}
          </div>
        </div>

        {/* Chiffre d'Affaires Année */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ventes {selectedYear}</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 tracking-tight">
              {formatMoney(annualData.totalSalesRevenue, settings.currency)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {annualData.totalSalesQuantity} unités écoulées
            </p>
          </div>
          <div className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-semibold inline-block">
            Marge brute: {formatMoney(annualData.totalSalesGrossMargin, settings.currency)}
          </div>
        </div>

        {/* Achats & Réceptions de l'Année */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Achats {selectedYear}</span>
            <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 tracking-tight">
              {formatMoney(annualData.totalPurchasesCost, settings.currency)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {annualData.totalPurchasesQuantity} unités approvisionnées
            </p>
          </div>
          <div className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md font-semibold inline-block">
            Flux d'approvisionnement
          </div>
        </div>

        {/* Pertes & Écarts Inventaire */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pertes d'Inventaire</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-rose-600 tracking-tight">
              -{formatMoney(annualData.totalInventoryLossesValue, settings.currency)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Casses, vols et écarts négatifs
            </p>
          </div>
          <div className="text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md font-semibold inline-block">
            Surplus: +{formatMoney(annualData.totalInventorySurplusValue, settings.currency)}
          </div>
        </div>

        {/* Rotation & Délai de détention */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rotation Annuelle</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 tracking-tight">
              {annualData.turnoverRatio.toFixed(2)}x <span className="text-xs font-normal text-slate-500">/ an</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Délai moyen: <strong>{annualData.averageHoldingDays} jours</strong>
            </p>
          </div>
          <div className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold inline-block">
            Vitesse d'écoulement du stock
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('LEDGER')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'LEDGER'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Grand Livre du Stock ({filteredLedger.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CATEGORIES')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'CATEGORIES'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Synthèse par Catégorie ({annualData.categorySummaries.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SESSIONS')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'SESSIONS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Comptages & Inventaires de l'Année ({annualData.inventorySessionsSummary.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PV')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'PV'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Procès-Verbal Officiel (PV)</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: GRAND LIVRE DU STOCK & VALORISATION PAR ARTICLE */}
      {/* ========================================================= */}
      {activeTab === 'LEDGER' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4 sm:p-5">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher par article, code, code-barres..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="all">Toutes les catégories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Status Tags */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tous
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('FAST')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  statusFilter === 'FAST' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                ⚡ Forte rotation
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ECART')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  statusFilter === 'ECART' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                ⚠️ Pertes / Écarts
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('LOW')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  statusFilter === 'LOW' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                🟡 Stock bas
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('OUT')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  statusFilter === 'OUT' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                🔴 Ruptures
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Article & Référence</th>
                  <th className="py-3 px-2">Catégorie</th>
                  <th className="py-3 px-2 text-center">Stock Phys.</th>
                  <th className="py-3 px-2 text-right">P.U Achat</th>
                  <th className="py-3 px-2 text-right">P.U Vente</th>
                  <th className="py-3 px-3 text-right">Val. Achat ({settings.currency})</th>
                  <th className="py-3 px-3 text-right">Val. Vente ({settings.currency})</th>
                  <th className="py-3 px-2 text-center">Ventes {selectedYear}</th>
                  <th className="py-3 px-2 text-right">Écarts Année</th>
                  <th className="py-3 px-3 text-center">Santé Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLedger.length > 0 ? (
                  filteredLedger.map((item) => (
                    <tr key={item.productId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900">{item.productName}</p>
                        <p className="text-[10px] font-mono text-slate-400">
                          {item.productCode} {item.barcode ? `• Barcode: ${item.barcode}` : ''}
                        </p>
                      </td>
                      <td className="py-2.5 px-2 text-slate-600 font-medium">{item.categoryName}</td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="font-bold text-slate-900 text-sm">
                          {formatQuantity(item.currentPhysicalStock)}
                        </span>{' '}
                        <span className="text-[10px] text-slate-500">{item.unit}</span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-600 font-mono">
                        {formatMoney(item.purchasePrice, '')}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-800 font-mono font-semibold">
                        {formatMoney(item.salePrice, '')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-indigo-700 font-mono">
                        {formatMoney(item.stockCostValue, '')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 font-mono">
                        {formatMoney(item.stockSaleValue, '')}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-blue-700">
                        {item.yearSalesQty > 0 ? (
                          <span className="px-2 py-0.5 bg-blue-50 rounded-md">{item.yearSalesQty}</span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        {item.yearLossesValue > 0 ? (
                          <span className="text-rose-600 font-bold font-mono">
                            -{formatMoney(item.yearLossesValue, '')}
                          </span>
                        ) : item.yearDifferencesQty > 0 ? (
                          <span className="text-emerald-600 font-bold font-mono">
                            +{item.yearDifferencesQty}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {item.healthStatus === 'HEALTHY' && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold">
                            🟢 Conforme
                          </span>
                        )}
                        {item.healthStatus === 'FAST_MOVING' && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-bold">
                            ⚡ Forte Rotation
                          </span>
                        )}
                        {item.healthStatus === 'LOW' && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold">
                            🟡 Stock Bas
                          </span>
                        )}
                        {item.healthStatus === 'OUT_OF_STOCK' && (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-[10px] font-bold">
                            🔴 Rupture
                          </span>
                        )}
                        {item.healthStatus === 'OVERSTOCK' && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-[10px] font-bold">
                            📦 Surstock
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                      Aucun article ne correspond aux filtres sélectionnés pour l'exercice {selectedYear}.
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredLedger.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={2} className="py-3 px-3 uppercase text-[11px]">
                      TOTAL DU GRAND LIVRE ({filteredLedger.length} articles affichés)
                    </td>
                    <td className="py-3 px-2 text-center">
                      {filteredLedger.reduce((acc, it) => acc + it.currentPhysicalStock, 0)}
                    </td>
                    <td colSpan={2}></td>
                    <td className="py-3 px-3 text-right text-indigo-700 font-mono">
                      {formatMoney(
                        filteredLedger.reduce((acc, it) => acc + it.stockCostValue, 0),
                        settings.currency
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-900 font-mono">
                      {formatMoney(
                        filteredLedger.reduce((acc, it) => acc + it.stockSaleValue, 0),
                        settings.currency
                      )}
                    </td>
                    <td className="py-3 px-2 text-center text-blue-700">
                      {filteredLedger.reduce((acc, it) => acc + it.yearSalesQty, 0)}
                    </td>
                    <td className="py-3 px-2 text-right text-rose-600">
                      -{formatMoney(
                        filteredLedger.reduce((acc, it) => acc + it.yearLossesValue, 0),
                        settings.currency
                      )}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: SYNTHÈSE DE VALORISATION PAR CATÉGORIE */}
      {/* ========================================================= */}
      {activeTab === 'CATEGORIES' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="font-black text-base text-slate-900">
                Répartition du Capital Stock & Performance par Rayon
              </h3>
              <p className="text-xs text-slate-500">
                Analyse de la valeur financière immobilisée par famille d'articles et chiffre d'affaires annuel généré.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {annualData.categorySummaries.map((cat) => {
                const sharePercent =
                  annualData.totalStockPurchaseValue > 0
                    ? Math.round((cat.stockCostValue / annualData.totalStockPurchaseValue) * 100)
                    : 0;

                return (
                  <div
                    key={cat.categoryId}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{cat.categoryName}</h4>
                        <p className="text-[11px] text-slate-500">{cat.productCount} références de produits</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-200 text-slate-800 text-xs font-bold font-mono">
                        {sharePercent}% du stock
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, sharePercent))}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Valeur Achat</span>
                        <span className="font-bold text-slate-900 font-mono">
                          {formatMoney(cat.stockCostValue, settings.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Valeur Vente</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          {formatMoney(cat.stockSaleValue, settings.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Ventes {selectedYear}</span>
                        <span className="font-bold text-blue-700 font-mono">
                          {formatMoney(cat.yearSalesRevenue, settings.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Pertes / Casses</span>
                        <span className="font-bold text-rose-600 font-mono">
                          {cat.yearLossesValue > 0 ? `-${formatMoney(cat.yearLossesValue, settings.currency)}` : '0 FCFA'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: COMPTAGES & SESSIONS D'INVENTAIRE DE L'ANNÉE */}
      {/* ========================================================= */}
      {activeTab === 'SESSIONS' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-black text-base text-slate-900">
              Historique des Sessions de Comptage Physique de l'Année {selectedYear}
            </h3>
            <p className="text-xs text-slate-500">
              Traçabilité des opérations de comptage en magasin et état de régularisation du stock.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Titre de la Session</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Responsable</th>
                  <th className="py-3 px-3 text-center">Articles Contrôlés</th>
                  <th className="py-3 px-3 text-center">Nb Écarts</th>
                  <th className="py-3 px-3 text-right">Pertes Constatées</th>
                  <th className="py-3 px-3 text-right">Surplus</th>
                  <th className="py-3 px-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {annualData.inventorySessionsSummary.length > 0 ? (
                  annualData.inventorySessionsSummary.map((session) => (
                    <tr key={session.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900">{session.title}</td>
                      <td className="py-3 px-3 text-slate-600">{formatDate(session.date)}</td>
                      <td className="py-3 px-3 text-slate-700">{session.responsibleName}</td>
                      <td className="py-3 px-3 text-center font-semibold">{session.totalItems}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            session.discrepancyCount > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {session.discrepancyCount}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-600 font-mono">
                        -{formatMoney(session.lossesValue, settings.currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-600 font-mono">
                        +{formatMoney(session.surplusValue, settings.currency)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                            session.status === 'VALIDE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : session.status === 'ANNULE'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {session.status === 'VALIDE' ? 'Validé' : session.status === 'ANNULE' ? 'Annulé' : 'En cours'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      Aucune session d'inventaire enregistrée sur l'exercice {selectedYear}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: PROCÈS-VERBAL (PV) DE CLÔTURE D'INVENTAIRE ANNUEL */}
      {/* ========================================================= */}
      {activeTab === 'PV' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-900">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Document Comptable & Juridique
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase">
                Procès-Verbal de Clôture d'Inventaire Annuel
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Exercice Fiscal Clôturé au 31 Décembre {selectedYear} • Établissement :{' '}
                <strong>{settings.storeName || 'Boutique Mali'}</strong>
              </p>
            </div>

            <button
              type="button"
              onClick={handlePrintReport}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimer le PV Officiel
            </button>
          </div>

          {/* Attestation Text */}
          <div className="space-y-3 text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p>
              Je soussigné, <strong>{currentUser.fullName || currentUser.name || 'Le Gérant'}</strong>, agissant en
              qualité de responsable légal / gestionnaire de l'établissement{' '}
              <strong>{settings.storeName || 'Boutique'}</strong> (NIF / RCCM : {settings.nifRccm || 'Non renseigné'}),
              certifie avoir procédé au recensement physique exhaustif et à la valorisation méthodique des stocks de
              marchandises présents dans les magasins et rayons de l'entreprise au titre de l'exercice{' '}
              <strong>{selectedYear}</strong>.
            </p>
            <p>
              Les comptages physiques ont été exécutés conformément aux règles comptables et commerciales en vigueur en
              République du Mali et dans l'espace OHADA.
            </p>
          </div>

          {/* Synthese des Masses Bilancielles */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">
              Synthèse des Masses Bilancielles de Stock au 31/12/{selectedYear}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600">Valeur d'Acquisition (Coût d'Achat Réel) :</span>
                <span className="font-black text-slate-900 font-mono text-sm">
                  {formatMoney(annualData.totalStockPurchaseValue, settings.currency)}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600">Valeur Commerciale (Prix de Vente TTC) :</span>
                <span className="font-black text-emerald-700 font-mono text-sm">
                  {formatMoney(annualData.totalStockSaleValue, settings.currency)}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600">Total des Pertes / Dépréciations Constatées :</span>
                <span className="font-black text-rose-600 font-mono text-sm">
                  -{formatMoney(annualData.totalInventoryLossesValue, settings.currency)}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600">Plus-value / Marge Brute Potentielle :</span>
                <span className="font-black text-indigo-700 font-mono text-sm">
                  +{formatMoney(annualData.potentialMarginValue, settings.currency)} (+
                  {annualData.potentialMarginPercent}%)
                </span>
              </div>
            </div>
          </div>

          {/* Signatures 3 Blocks */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-xs">
            <div className="border border-dashed border-slate-300 rounded-xl p-4 min-h-[120px] flex flex-col justify-between">
              <p className="font-bold text-slate-800 uppercase text-[10px]">
                1. Le Responsable du Stock / Magasinier
              </p>
              <p className="text-[10px] text-slate-400 italic">Mention "Comptage certifié conforme"</p>
              <p className="text-[10px] text-slate-400">Date & Signature</p>
            </div>

            <div className="border border-dashed border-slate-300 rounded-xl p-4 min-h-[120px] flex flex-col justify-between">
              <p className="font-bold text-slate-800 uppercase text-[10px]">
                2. L'Auditeur / Comptable
              </p>
              <p className="text-[10px] text-slate-400 italic">Visa & Vérification arithmétique</p>
              <p className="text-[10px] text-slate-400">Date & Signature</p>
            </div>

            <div className="border border-dashed border-slate-300 rounded-xl p-4 min-h-[120px] flex flex-col justify-between">
              <p className="font-bold text-slate-800 uppercase text-[10px]">
                3. La Direction Générale / Le Gérant
              </p>
              <p className="text-[10px] text-slate-400 italic">Cachet & Approbation définitive</p>
              <p className="text-[10px] text-slate-400">Date & Cachet</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
