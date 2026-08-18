import React, { useState, useMemo } from 'react';
import {
  Boxes,
  PlusCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Filter,
  Download,
  Calendar,
  Layers,
  History,
  FileCheck,
  TrendingDown,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { MovementType, Product } from '../../types';
import { formatMoney, formatDateTime, getMovementTypeBadge } from '../../utils/formatters';

export const StockView: React.FC = () => {
  const {
    products,
    categories,
    stockMovements,
    createStockMovement,
    settings,
    currentUser,
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all');
  const [selectedProductIdFilter, setSelectedProductIdFilter] = useState<string>('all');

  // Manual Movement Modal
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [movementType, setMovementType] = useState<MovementType>('ENTREE');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtered stock movements
  const filteredMovements = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return (stockMovements || []).filter((m) => {
      if (!m) return false;
      const prodName = (m.productName || '').toLowerCase();
      const reason = (m.reason || '').toLowerCase();
      const userName = (m.userName || '').toLowerCase();
      const matchesSearch =
        prodName.includes(q) ||
        reason.includes(q) ||
        userName.includes(q);

      const matchesType = movementTypeFilter === 'all' || m.type === movementTypeFilter;
      const matchesProduct =
        selectedProductIdFilter === 'all' || m.productId === selectedProductIdFilter;

      return matchesSearch && matchesType && matchesProduct;
    });
  }, [stockMovements, searchTerm, movementTypeFilter, selectedProductIdFilter]);

  // Stock status lists
  const outOfStockList = useMemo(() => products.filter((p) => p.currentStock <= 0), [products]);
  const lowStockList = useMemo(
    () => products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStock),
    [products]
  );

  const handleOpenMovementModal = (productId?: string) => {
    setSelectedProductId(productId || (products[0]?.id ?? ''));
    setMovementType('ENTREE');
    setQuantity(1);
    setReason('');
    setErrorMessage(null);
    setShowMovementModal(true);
  };

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedProductId) {
      setErrorMessage('Veuillez sélectionner un produit.');
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('Veuillez préciser le motif du mouvement.');
      return;
    }

    const prod = (products || []).find((p) => p.id === selectedProductId);
    if (!prod) return;

    // Determine sign of quantity based on movement type
    let finalQty = Math.abs(quantity);
    const negativeTypes: MovementType[] = ['VENTE', 'PERTE', 'CASSE', 'RETOUR_FOURNISSEUR'];
    if (negativeTypes.includes(movementType)) {
      finalQty = -finalQty;
    }

    const success = createStockMovement(
      selectedProductId,
      finalQty,
      movementType,
      reason.trim()
    );

    if (success) {
      setShowMovementModal(false);
    } else {
      setErrorMessage(
        `Impossible d'effectuer ce mouvement : le stock deviendrait négatif (${prod.currentStock + finalQty}).`
      );
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Produit', 'Type Mouvement', 'Quantité', 'Ancien Stock', 'Nouveau Stock', 'Utilisateur', 'Motif'];
    const rows = filteredMovements.map((m) => [
      `"${formatDateTime(m.date)}"`,
      `"${m.productName.replace(/"/g, '""')}"`,
      `"${m.type}"`,
      m.quantity,
      m.previousStock,
      m.newStock,
      `"${m.userName}"`,
      `"${m.reason.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `journal_mouvements_stock_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isVendeur = currentUser.role === 'VENDEUR';
  const selectedProdForModal = (products || []).find((p) => p.id === selectedProductId);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-5 h-5 text-indigo-600" />
            Gestion du Stock & Mouvements
          </h1>
          <p className="text-xs text-slate-500">
            Traçabilité intégrale de toutes les entrées, sorties, pertes, casses et ajustements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter Journal
          </button>
          {!isVendeur && (
            <button
              onClick={() => handleOpenMovementModal()}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              Nouveau Mouvement Manuel
            </button>
          )}
        </div>
      </div>

      {/* ALERT CARDS: RUPTURES & FAIBLES */}
      {(outOfStockList.length > 0 || lowStockList.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ruptures */}
          {outOfStockList.length > 0 && (
            <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  🔴 RUPTURES DE STOCK ({outOfStockList.length})
                </span>
                <span className="text-[10px] text-rose-700 font-semibold uppercase">Urgent</span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {outOfStockList.map((p) => (
                  <div
                    key={p.id}
                    className="p-2 bg-white rounded-lg border border-rose-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{p.code}</p>
                    </div>
                    {!isVendeur && (
                      <button
                        onClick={() => handleOpenMovementModal(p.id)}
                        className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-bold"
                      >
                        Réapprovisionner
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stock Faible */}
          {lowStockList.length > 0 && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  ⚠️ STOCKS FAIBLES ({lowStockList.length})
                </span>
                <span className="text-[10px] text-amber-700 font-semibold uppercase">
                  Seuil d'alerte atteint
                </span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {lowStockList.map((p) => (
                  <div
                    key={p.id}
                    className="p-2 bg-white rounded-lg border border-amber-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <p className="text-[10px] text-amber-700 font-semibold">
                        Actuel : {p.currentStock} {p.unit}s (Min : {p.minStock})
                      </p>
                    </div>
                    {!isVendeur && (
                      <button
                        onClick={() => handleOpenMovementModal(p.id)}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-[10px] font-bold"
                      >
                        Ajuster / Entrée
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FILTER & SEARCH */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par produit, motif ou utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <select
            value={movementTypeFilter}
            onChange={(e) => setMovementTypeFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="all">Tous les types de mouvements</option>
            <option value="ENTREE">Entrées stock</option>
            <option value="VENTE">Ventes POS</option>
            <option value="RETOUR_CLIENT">Retours clients</option>
            <option value="RETOUR_FOURNISSEUR">Retours fournisseurs</option>
            <option value="PERTE">Pertes</option>
            <option value="CASSE">Casses / Avariés</option>
            <option value="AJUSTEMENT_INVENTAIRE">Ajustements d'inventaire</option>
            <option value="CORRECTION_MANUELLE">Corrections manuelles</option>
          </select>

          <select
            value={selectedProductIdFilter}
            onChange={(e) => setSelectedProductIdFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="all">Tous les articles</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MOVEMENTS AUDIT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Date & Heure</th>
                <th className="p-3.5">Article concerné</th>
                <th className="p-3.5">Type de mouvement</th>
                <th className="p-3.5 text-center">Quantité</th>
                <th className="p-3.5 text-center">Évolution Stock</th>
                <th className="p-3.5">Motif / Justification</th>
                <th className="p-3.5">Opérateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length > 0 ? (
                filteredMovements.map((mov) => {
                  const badge = getMovementTypeBadge(mov.type);
                  return (
                    <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDateTime(mov.date)}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">{mov.productName}</td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`font-black ${
                            mov.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                        </span>
                      </td>
                      <td className="p-3.5 text-center text-slate-600 font-mono text-[11px]">
                        {mov.previousStock} → <strong className="text-slate-900">{mov.newStock}</strong>
                      </td>
                      <td className="p-3.5 text-slate-700">{mov.reason}</td>
                      <td className="p-3.5 text-slate-500 text-[11px] whitespace-nowrap">
                        {mov.userName}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    Aucun mouvement trouvé avec ces critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MANUAL MOVEMENT MODAL */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveMovement}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in"
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Nouveau Mouvement de Stock</h3>
              <button
                type="button"
                onClick={() => setShowMovementModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              {errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
                  ⚠️ {errorMessage}
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Article *</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-900"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock actuel: {p.currentStock} {p.unit}s)
                    </option>
                  ))}
                </select>
              </div>

              {selectedProdForModal && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between">
                  <span className="text-slate-500">Stock Actuel :</span>
                  <strong className="text-slate-900">
                    {selectedProdForModal.currentStock} {selectedProdForModal.unit}s
                  </strong>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Type de Mouvement *</label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as MovementType)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
                >
                  <option value="ENTREE">➕ Entrée Marchandise</option>
                  <option value="RETOUR_CLIENT">➕ Retour Client</option>
                  <option value="PERTE">➖ Perte</option>
                  <option value="CASSE">➖ Casse / Produit Périmé ou Avarié</option>
                  <option value="RETOUR_FOURNISSEUR">➖ Retour au Fournisseur</option>
                  <option value="CORRECTION_MANUELLE">⚖️ Correction Manuelle</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Quantité *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-black text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Motif / Justification Obligatoire *
                </label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Réception livraison sans bon, produit écrasé au déchargement..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowMovementModal(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Valider le Mouvement
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
