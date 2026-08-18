import React, { useState, useMemo, useRef } from 'react';
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Lock,
  Download,
  Search,
  Filter,
  Eye,
  Trash2,
  XCircle,
  Barcode,
  Check,
  RotateCcw,
  Sparkles,
  Printer,
  Package,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Inventory, InventoryItem } from '../../types';
import { formatMoney, formatDateTime, formatDate } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';

export const InventoryView: React.FC = () => {
  const {
    inventories = [],
    inventorySessions = [],
    products = [],
    categories = [],
    createInventorySession,
    updateInventoryItemCount,
    updateInventoryCount,
    validateInventory,
    cancelInventory,
    deleteInventory,
    settings,
    currentUser,
  } = useStore();

  const sessions: Inventory[] = inventorySessions.length > 0 ? inventorySessions : inventories;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ecartOnlyFilter, setEcartOnlyFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'EN_COURS' | 'VALIDE' | 'ANNULE'>('ALL');
  
  // Barcode rapid scan state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  // Item Justification Modal
  const [justificationModalItem, setJustificationModalItem] = useState<{ productId: string; name: string; text: string } | null>(null);

  // Confirmation modals
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [sessionToValidate, setSessionToValidate] = useState<Inventory | null>(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [sessionToCancel, setSessionToCancel] = useState<Inventory | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Inventory | null>(null);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return (sessions || []).filter((s) => {
      if (statusFilter === 'ALL') return true;
      return s.status === statusFilter;
    });
  }, [sessions, statusFilter]);

  // Active session
  const activeSession: Inventory | null = useMemo(() => {
    if (selectedSessionId) {
      const found = (sessions || []).find((s) => s.id === selectedSessionId);
      if (found) return found;
    }
    // Default to the latest 'EN_COURS' session or the first available
    const inProgress = (sessions || []).find((s) => s.status === 'EN_COURS');
    if (inProgress) return inProgress;
    return sessions && sessions.length > 0 ? sessions[0] : null;
  }, [sessions, selectedSessionId]);

  const handleStartNewSession = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newSessionTitle.trim() || `Inventaire du ${new Date().toLocaleDateString('fr-FR')}`;
    const created = createInventorySession(title);
    setSelectedSessionId(created.id);
    setShowNewModal(false);
    setNewSessionTitle('');
  };

  const handleCountChange = (productId: string, realStock: number, justification?: string) => {
    if (!activeSession || activeSession.status !== 'EN_COURS') return;
    const updater = updateInventoryItemCount || updateInventoryCount;
    if (updater) {
      updater(activeSession.id, productId, Math.max(0, realStock), justification);
    }
  };

  const handleQuickIncrement = (productId: string, currentReal: number) => {
    handleCountChange(productId, currentReal + 1);
  };

  const handleQuickDecrement = (productId: string, currentReal: number) => {
    handleCountChange(productId, Math.max(0, currentReal - 1));
  };

  const handleSetExactTheoretical = (productId: string, theoreticalStock: number) => {
    handleCountChange(productId, theoreticalStock);
  };

  const handleMarkAllConforme = () => {
    if (!activeSession || activeSession.status !== 'EN_COURS') return;
    activeSession.items.forEach((it) => {
      if (!it.counted) {
        handleCountChange(it.productId, it.theoreticalStock);
      }
    });
  };

  // Barcode Scanning Handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim() || !activeSession || activeSession.status !== 'EN_COURS') return;

    const raw = barcodeInput.trim().toLowerCase();
    const item = activeSession.items.find(
      (it) =>
        it.productCode.toLowerCase() === raw ||
        (products.find((p) => p.id === it.productId)?.barcode?.toLowerCase() === raw) ||
        it.productName.toLowerCase().includes(raw)
    );

    if (item) {
      const newStock = (item.counted ? item.realStock : 0) + 1;
      handleCountChange(item.productId, newStock);
      setScanFeedback(`+1 compté pour "${item.productName}" (Total: ${newStock})`);
      setBarcodeInput('');
      setTimeout(() => setScanFeedback(null), 3000);
    } else {
      setScanFeedback(`Article introuvable pour "${barcodeInput}"`);
      setTimeout(() => setScanFeedback(null), 3000);
    }
  };

  const handleSaveJustification = () => {
    if (!justificationModalItem || !activeSession) return;
    const currentItem = activeSession.items.find((it) => it.productId === justificationModalItem.productId);
    if (currentItem) {
      handleCountChange(currentItem.productId, currentItem.realStock, justificationModalItem.text);
    }
    setJustificationModalItem(null);
  };

  // Validation
  const handleConfirmValidation = () => {
    if (!sessionToValidate) return;
    validateInventory(sessionToValidate.id);
    setShowValidateModal(false);
    setSessionToValidate(null);
  };

  // Cancellation
  const handleConfirmCancel = () => {
    if (!sessionToCancel) return;
    cancelInventory(sessionToCancel.id);
    setShowCancelModal(false);
    setSessionToCancel(null);
  };

  // Deletion
  const handleConfirmDelete = () => {
    if (!sessionToDelete) return;
    if (deleteInventory) {
      deleteInventory(sessionToDelete.id);
    }
    if (selectedSessionId === sessionToDelete.id) {
      setSelectedSessionId(null);
    }
    setShowDeleteModal(false);
    setSessionToDelete(null);
  };

  // Filter items in active session
  const filteredSessionItems = useMemo(() => {
    if (!activeSession || !activeSession.items) return [];
    const q = (searchTerm || '').toLowerCase().trim();

    return activeSession.items.filter((item) => {
      if (!item) return false;
      const prod = (products || []).find((p) => p.id === item.productId);
      const name = (item.productName || '').toLowerCase();
      const code = (item.productCode || '').toLowerCase();
      const barcode = (prod?.barcode || '').toLowerCase();

      const matchesSearch = !q || name.includes(q) || code.includes(q) || barcode.includes(q);
      const matchesCat = categoryFilter === 'all' || prod?.categoryId === categoryFilter;
      const matchesEcart = !ecartOnlyFilter || item.difference !== 0;

      return matchesSearch && matchesCat && matchesEcart;
    });
  }, [activeSession, searchTerm, categoryFilter, ecartOnlyFilter, products]);

  // Calculations for current active session
  const sessionStats = useMemo(() => {
    if (!activeSession || !activeSession.items) {
      return {
        totalItems: 0,
        countedItems: 0,
        progressPercent: 0,
        itemsWithEcart: 0,
        totalLossesValue: 0,
        totalSurplusValue: 0,
        netDifferenceValue: 0,
        theoreticalValue: 0,
        realValue: 0,
      };
    }

    const totalItems = activeSession.items.length;
    let countedItems = 0;
    let itemsWithEcart = 0;
    let totalLossesValue = 0;
    let totalSurplusValue = 0;
    let theoreticalValue = 0;
    let realValue = 0;

    activeSession.items.forEach((it) => {
      if (it.counted) countedItems++;
      if (it.difference !== 0) itemsWithEcart++;
      
      const diffVal = it.financialDifference || (it.difference * it.unitCost);
      if (diffVal < 0) {
        totalLossesValue += Math.abs(diffVal);
      } else if (diffVal > 0) {
        totalSurplusValue += diffVal;
      }

      theoreticalValue += it.theoreticalStock * it.unitCost;
      realValue += (it.counted ? it.realStock : it.theoreticalStock) * it.unitCost;
    });

    const netDifferenceValue = totalSurplusValue - totalLossesValue;
    const progressPercent = totalItems > 0 ? Math.round((countedItems / totalItems) * 100) : 0;

    return {
      totalItems,
      countedItems,
      progressPercent,
      itemsWithEcart,
      totalLossesValue,
      totalSurplusValue,
      netDifferenceValue,
      theoreticalValue,
      realValue,
    };
  }, [activeSession]);

  const handleExportCSV = () => {
    if (!activeSession) return;
    const headers = [
      'Code Article',
      'Code-Barres',
      'Nom Article',
      'Catégorie',
      'Stock Théorique (Système)',
      'Comptage Physique Réel',
      'Écart (Qté)',
      'Coût Unitaire (Achat)',
      'Écart Financier Net',
      'Justification / Motif',
      'Statut Comptage',
    ];

    const rows = (activeSession.items || []).map((it) => {
      const prod = (products || []).find((p) => p.id === it.productId);
      const finDiff = it.financialDifference || (it.difference * it.unitCost);
      return [
        `"${it.productCode || prod?.code || ''}"`,
        `"${prod?.barcode || ''}"`,
        `"${(it.productName || '').replace(/"/g, '""')}"`,
        `"${it.categoryName || ''}"`,
        it.theoreticalStock,
        it.realStock,
        it.difference,
        it.unitCost,
        finDiff,
        `"${(it.justification || '').replace(/"/g, '""')}"`,
        it.counted ? 'Compté' : 'Non compté',
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const safeTitle = (activeSession.title || 'inventaire').replace(/\s+/g, '_').toLowerCase();
    link.setAttribute('download', `${safeTitle}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const isVendeur = currentUser.role === 'VENDEUR';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            Inventaires & Contrôle Physique du Stock
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Comptage physique, identification automatique des écarts (pertes/surplus) et régularisation du stock.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeSession && (
            <>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
                title="Imprimer la feuille d'inventaire"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimer
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Exporter Excel / CSV
              </button>
            </>
          )}

          {!isVendeur && (
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Lancer une Nouvelle Session
            </button>
          )}
        </div>
      </div>

      {/* SESSIONS PICKER / TABS */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap pl-1">Sessions :</span>
          {filteredSessions.length > 0 ? (
            filteredSessions.map((session) => {
              const isSelected = activeSession?.id === session.id;
              const isValidated = session.status === 'VALIDE';
              const isAnnule = session.status === 'ANNULE';
              const sessionTitle = session.title || `Inventaire #${session.id.slice(-4)}`;

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap border cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>{sessionTitle}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isValidated
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : isAnnule
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {isValidated ? 'Validé' : isAnnule ? 'Annulé' : 'En cours'}
                  </span>
                </button>
              );
            })
          ) : (
            <span className="text-xs text-slate-400 italic">Aucune session d'inventaire trouvée</span>
          )}
        </div>

        {/* Status filter buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Tous
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('EN_COURS')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              statusFilter === 'EN_COURS' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            En cours
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('VALIDE')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              statusFilter === 'VALIDE' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Validés
          </button>
        </div>
      </div>

      {activeSession ? (
        <div className="space-y-4">
          {/* ACTIVE SESSION BANNER & METRICS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-black text-slate-900">
                    {activeSession.title || `Inventaire #${activeSession.id.slice(-4)}`}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      activeSession.status === 'VALIDE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activeSession.status === 'ANNULE'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {activeSession.status === 'VALIDE'
                      ? `Validé le ${formatDateTime(activeSession.validatedAt || activeSession.date)} par ${activeSession.validatedBy || 'Admin'}`
                      : activeSession.status === 'ANNULE'
                      ? 'Session Annulée'
                      : 'Comptage en cours'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Initié le {formatDateTime(activeSession.date)} par {activeSession.responsibleName || 'Responsable'}
                  {activeSession.notes ? ` — "${activeSession.notes}"` : ''}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {!isVendeur && activeSession.status === 'EN_COURS' && (
                  <>
                    <button
                      type="button"
                      onClick={handleMarkAllConforme}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Remplir automatiquement les articles non comptés avec le stock théorique"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Tout marquer conforme
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSessionToCancel(activeSession);
                        setShowCancelModal(true);
                      }}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Annuler
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSessionToValidate(activeSession);
                        setShowValidateModal(true);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <Lock className="w-4 h-4" />
                      Valider & Ajuster le Stock Officiel
                    </button>
                  </>
                )}

                {!isVendeur && (
                  <button
                    type="button"
                    onClick={() => {
                      setSessionToDelete(activeSession);
                      setShowDeleteModal(true);
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Supprimer la session d'inventaire"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Progression du comptage</span>
                  <span className="font-bold text-slate-900">{sessionStats.progressPercent}%</span>
                </div>
                <p className="text-base font-black text-slate-900 mt-1">
                  {sessionStats.countedItems} / {sessionStats.totalItems} comptés
                </p>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${sessionStats.progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500">Articles avec écart constaté :</span>
                <p className="text-base font-black text-amber-700 mt-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  {sessionStats.itemsWithEcart} article{sessionStats.itemsWithEcart > 1 ? 's' : ''}
                </p>
                <span className="text-[11px] text-slate-400">
                  {sessionStats.totalItems - sessionStats.itemsWithEcart} conformes
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500">Valeur Théorique (Système) :</span>
                <p className="text-base font-black text-slate-900 mt-1">
                  {formatMoney(sessionStats.theoreticalValue, settings.currency)}
                </p>
                <span className="text-[11px] text-slate-500">
                  Constaté : {formatMoney(sessionStats.realValue, settings.currency)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500">Impact Financier Net :</span>
                <p
                  className={`text-base font-black mt-1 flex items-center gap-1 ${
                    sessionStats.netDifferenceValue < 0
                      ? 'text-rose-600'
                      : sessionStats.netDifferenceValue > 0
                      ? 'text-emerald-600'
                      : 'text-slate-900'
                  }`}
                >
                  {sessionStats.netDifferenceValue < 0 && <TrendingDown className="w-4 h-4" />}
                  {sessionStats.netDifferenceValue > 0 && <TrendingUp className="w-4 h-4" />}
                  {sessionStats.netDifferenceValue > 0 ? '+' : ''}
                  {formatMoney(sessionStats.netDifferenceValue, settings.currency)}
                </p>
                <span className="text-[11px] text-slate-400">
                  Pertes: {formatMoney(sessionStats.totalLossesValue, settings.currency)} | Surplus: {formatMoney(sessionStats.totalSurplusValue, settings.currency)}
                </span>
              </div>
            </div>

            {/* BARCODE SCANNER FAST INPUT FOR IN-PROGRESS SESSIONS */}
            {activeSession.status === 'EN_COURS' && (
              <form
                onSubmit={handleBarcodeSubmit}
                className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl flex flex-col sm:flex-row items-center gap-2"
              >
                <div className="flex items-center gap-2 text-indigo-950 text-xs font-bold shrink-0">
                  <Barcode className="w-4 h-4 text-indigo-600" />
                  <span>Saisie rapide / Douchette :</span>
                </div>

                <div className="relative flex-1 w-full">
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    placeholder="Scannez ou tapez un code-barres / code article puis appuyez sur Entrée..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors"
                >
                  +1 Valider
                </button>

                {scanFeedback && (
                  <span className="text-xs font-bold text-indigo-700 px-2 py-0.5 bg-indigo-100 rounded-md animate-in fade-in">
                    {scanFeedback}
                  </span>
                )}
              </form>
            )}
          </div>

          {/* SEARCH & FILTERS */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par nom, code article ou code-barres..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setEcartOnlyFilter(!ecartOnlyFilter)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                ecartOnlyFilter
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Écarts seulement ({sessionStats.itemsWithEcart})
            </button>
          </div>

          {/* INVENTORY COUNT SHEET */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5">Code / Article</th>
                    <th className="p-3.5">Catégorie</th>
                    <th className="p-3.5 text-center">Stock Théorique</th>
                    <th className="p-3.5 text-center">Comptage Physique Réel</th>
                    <th className="p-3.5 text-center">Écart (Qté)</th>
                    <th className="p-3.5 text-right">P.U Achat</th>
                    <th className="p-3.5 text-right">Valeur Écart</th>
                    <th className="p-3.5 text-center">Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSessionItems.length > 0 ? (
                    filteredSessionItems.map((item) => {
                      const prod = (products || []).find((p) => p.id === item.productId);
                      const hasEcart = item.difference !== 0;
                      const isNegative = item.difference < 0;
                      const finDiff = item.financialDifference || (item.difference * item.unitCost);

                      return (
                        <tr
                          key={item.productId}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            hasEcart ? (isNegative ? 'bg-rose-50/30' : 'bg-emerald-50/30') : ''
                          }`}
                        >
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{item.productName}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                              <span>{item.productCode || prod?.code || '—'}</span>
                              {prod?.barcode && (
                                <span className="bg-slate-100 px-1 rounded text-[10px] text-slate-600">
                                  {prod.barcode}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3.5 text-slate-600">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px]">
                              {item.categoryName || 'Général'}
                            </span>
                          </td>

                          <td className="p-3.5 text-center font-bold text-slate-700">
                            {item.theoreticalStock}
                          </td>

                          {/* Physical Count input & Fast buttons */}
                          <td className="p-3.5 text-center">
                            {activeSession.status === 'EN_COURS' ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleQuickDecrement(item.productId, item.realStock)}
                                  className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-black text-xs"
                                  title="-1"
                                >
                                  -
                                </button>

                                <input
                                  type="number"
                                  min="0"
                                  value={item.realStock}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                    handleCountChange(item.productId, isNaN(val) ? 0 : val);
                                  }}
                                  className="w-16 text-center py-1 px-1 bg-white border border-indigo-300 rounded-lg text-xs font-black text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />

                                <button
                                  type="button"
                                  onClick={() => handleQuickIncrement(item.productId, item.realStock)}
                                  className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-black text-xs"
                                  title="+1"
                                >
                                  +
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetExactTheoretical(item.productId, item.theoreticalStock)}
                                  className="px-1.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded text-[10px] font-bold border border-slate-200"
                                  title="Marquer conforme au stock théorique"
                                >
                                  =
                                </button>
                              </div>
                            ) : (
                              <span className="font-black text-slate-900 text-sm">
                                {item.realStock}
                              </span>
                            )}
                          </td>

                          {/* Difference qty */}
                          <td className="p-3.5 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                !hasEcart
                                  ? 'bg-slate-100 text-slate-600'
                                  : isNegative
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {item.difference > 0 ? `+${item.difference}` : item.difference}
                            </span>
                          </td>

                          <td className="p-3.5 text-right text-slate-600">
                            {formatMoney(item.unitCost, '')}
                          </td>

                          {/* Difference value */}
                          <td className="p-3.5 text-right font-black">
                            <span
                              className={
                                !hasEcart
                                  ? 'text-slate-400'
                                  : isNegative
                                  ? 'text-rose-600'
                                  : 'text-emerald-600'
                              }
                            >
                              {finDiff > 0 ? '+' : ''}
                              {formatMoney(finDiff, settings.currency)}
                            </span>
                          </td>

                          {/* Justification */}
                          <td className="p-3.5 text-center">
                            {activeSession.status === 'EN_COURS' ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setJustificationModalItem({
                                    productId: item.productId,
                                    name: item.productName,
                                    text: item.justification || '',
                                  })
                                }
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  item.justification
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : 'text-slate-400 hover:text-slate-700 border-transparent hover:border-slate-200'
                                }`}
                                title={item.justification || 'Ajouter une justification / motif'}
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">
                                {item.justification || '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">Aucun article ne correspond aux filtres.</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Modifiez votre recherche ou réinitialisez les filtres.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <ClipboardList className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Aucune session d'inventaire</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Lancez une nouvelle session d'inventaire mensuelle pour figer le stock théorique et saisir les comptages physiques réels de votre boutique.
            </p>
          </div>

          {!isVendeur && (
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Démarrer le premier inventaire
            </button>
          )}
        </div>
      )}

      {/* NEW INVENTORY SESSION MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleStartNewSession}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in"
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-400" />
                Démarrer une Nouvelle Session d'Inventaire
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1">
                <p className="font-bold text-indigo-900">📸 Snapshot instantané du stock</p>
                <p className="text-slate-600 text-[11px]">
                  {products.length > 0
                    ? `Les ${products.length} articles enregistrés dans votre catalogue seront importés avec leur stock théorique actuel.`
                    : "Votre catalogue ne contient pas encore de produits. Vous pouvez ajouter des produits d'abord dans l'onglet Produits & Stocks."}
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Titre / Libellé de la session d'inventaire
                </label>
                <input
                  type="text"
                  placeholder={`Ex: Inventaire Mensuel ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`}
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                Créer la Session
              </button>
            </div>
          </form>
        </div>
      )}

      {/* JUSTIFICATION MODAL */}
      {justificationModalItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                Justification d'écart : {justificationModalItem.name}
              </h3>
              <button
                type="button"
                onClick={() => setJustificationModalItem(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <label className="font-semibold text-slate-700 block">
                Motif / Explication de la différence de stock :
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Casse en rayon, produit périmé retiré, erreur de comptage précédent, vol présumé..."
                value={justificationModalItem.text}
                onChange={(e) =>
                  setJustificationModalItem({
                    ...justificationModalItem,
                    text: e.target.value,
                  })
                }
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
              />

              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Casse', 'Périmé', 'Vol', 'Don / Échantillon', 'Erreur saisie'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      setJustificationModalItem({
                        ...justificationModalItem,
                        text: preset,
                      })
                    }
                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-lg text-[11px] font-semibold border border-slate-200 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setJustificationModalItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveJustification}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                Enregistrer la note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM INVENTORY VALIDATION MODAL */}
      <ConfirmModal
        isOpen={showValidateModal}
        title="Validation Définitive de l'Inventaire"
        message={`Confirmez-vous la validation de la session "${sessionToValidate?.title || 'sélectionnée'}" ? Cette action va verrouiller les comptages, appliquer automatiquement tous les écarts (${sessionStats.itemsWithEcart} article${sessionStats.itemsWithEcart > 1 ? 's' : ''}) au stock réel du système et archiver l'audit complet.`}
        confirmLabel="Valider et Ajuster le Stock"
        isDanger={false}
        onConfirm={handleConfirmValidation}
        onCancel={() => setShowValidateModal(false)}
      />

      {/* CONFIRM CANCEL MODAL */}
      <ConfirmModal
        isOpen={showCancelModal}
        title="Annuler la Session d'Inventaire"
        message={`Voulez-vous vraiment annuler la session "${sessionToCancel?.title || 'sélectionnée'}" ? Les comptages saisis ne seront pas appliqués au stock.`}
        confirmLabel="Annuler la session"
        isDanger={true}
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelModal(false)}
      />

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Supprimer la Session d'Inventaire"
        message={`Voulez-vous supprimer définitivement la session "${sessionToDelete?.title || 'sélectionnée'}" de l'historique ? Cette action est irréversible.`}
        confirmLabel="Supprimer définitivement"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
};
