import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Building2,
  DollarSign,
  Trash2,
  Eye,
  FileText
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Purchase, PurchaseItem, PurchaseStatus, PaymentMethod } from '../../types';
import { formatMoney, formatDate, formatDateTime, getPaymentMethodLabel } from '../../utils/formatters';

export const PurchasesView: React.FC = () => {
  const {
    purchases,
    suppliers,
    products,
    createPurchase,
    updatePurchaseStatus,
    paySupplierDebt,
    settings,
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');

  // New Purchase Modal State
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('VIREMENT');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Line item add inputs
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemUnitCost, setItemUnitCost] = useState<number>(0);

  // Details Modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return (purchases || []).filter((p) => {
      if (!p) return false;
      const orderNum = (p.orderNumber || '').toLowerCase();
      const suppName = (p.supplierName || '').toLowerCase();
      const matchesSearch = orderNum.includes(q) || suppName.includes(q);
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesSupplier = supplierFilter === 'all' || p.supplierId === supplierFilter;
      return matchesSearch && matchesStatus && matchesSupplier;
    });
  }, [purchases, searchTerm, statusFilter, supplierFilter]);

  const handleOpenNewModal = () => {
    setSelectedSupplierId(suppliers[0]?.id || '');
    setPurchaseItems([]);
    setPaidAmount(0);
    setPaymentMethod('VIREMENT');
    setNotes('');
    setErrorMessage(null);
    if (products[0]) {
      setSelectedProductId(products[0].id);
      setItemQty(10);
      setItemUnitCost(products[0].purchasePrice);
    }
    setShowNewPurchaseModal(true);
  };

  const handleProductSelectChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = (products || []).find((p) => p.id === prodId);
    if (prod) {
      setItemUnitCost(prod.purchasePrice);
    }
  };

  const handleAddItemToPurchase = () => {
    if (!selectedProductId || itemQty <= 0) return;
    const prod = (products || []).find((p) => p.id === selectedProductId);
    if (!prod) return;

    const existingIndex = purchaseItems.findIndex((it) => it.productId === selectedProductId);
    if (existingIndex >= 0) {
      const updated = [...purchaseItems];
      updated[existingIndex].quantity += itemQty;
      updated[existingIndex].unitCost = itemUnitCost;
      updated[existingIndex].totalCost = updated[existingIndex].quantity * itemUnitCost;
      setPurchaseItems(updated);
    } else {
      setPurchaseItems([
        ...purchaseItems,
        {
          productId: prod.id,
          productName: prod.name,
          quantity: itemQty,
          unitCost: itemUnitCost,
          totalCost: itemQty * itemUnitCost,
        },
      ]);
    }
  };

  const handleRemoveItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, idx) => idx !== index));
  };

  const totalPurchaseAmount = useMemo(
    () => purchaseItems.reduce((sum, it) => sum + it.totalCost, 0),
    [purchaseItems]
  );

  const handleCreatePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      setErrorMessage('Veuillez sélectionner un fournisseur.');
      return;
    }
    if (purchaseItems.length === 0) {
      setErrorMessage('Veuillez ajouter au moins un produit à la commande.');
      return;
    }

    createPurchase(
      selectedSupplierId,
      purchaseItems,
      Number(paidAmount),
      paymentMethod,
      notes || undefined
    );

    setShowNewPurchaseModal(false);
  };

  const handleUpdateStatus = (purchase: Purchase, newStatus: PurchaseStatus) => {
    updatePurchaseStatus(purchase.id, newStatus);
    if (selectedPurchase && selectedPurchase.id === purchase.id) {
      setSelectedPurchase({ ...selectedPurchase, status: newStatus });
    }
  };

  const getStatusBadge = (status: PurchaseStatus) => {
    switch (status) {
      case 'RECU':
        return { label: 'Reçu & Entré en Stock', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
      case 'COMMANDE':
        return { label: 'Commandé (En attente)', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock };
      case 'BROUILLON':
        return { label: 'Brouillon', bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: FileText };
      case 'PARTIEL':
        return { label: 'Partiellement Reçu', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertCircle };
      case 'ANNULE':
        return { label: 'Annulé', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle };
      default:
        return { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: Clock };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-600" />
            Achats & Approvisionnements
          </h1>
          <p className="text-xs text-slate-500">
            Gestion des commandes fournisseurs et augmentation automatique des stocks à réception.
          </p>
        </div>

        <button
          onClick={handleOpenNewModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Nouveau Bon de Commande
        </button>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Recherche par n° de bon ou fournisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="all">Tous les statuts</option>
            <option value="COMMANDE">Commandé (En cours)</option>
            <option value="RECU">Reçu (En stock)</option>
            <option value="BROUILLON">Brouillon</option>
            <option value="ANNULE">Annulé</option>
          </select>

          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="all">Tous les fournisseurs</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.companyName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">N° Commande</th>
                <th className="p-3.5">Fournisseur</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5 text-center">Nb Articles</th>
                <th className="p-3.5 text-right">Montant Total</th>
                <th className="p-3.5 text-right">Payé</th>
                <th className="p-3.5 text-right">Reste à payer</th>
                <th className="p-3.5">Statut</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.length > 0 ? (
                filteredPurchases.map((purchase) => {
                  const badge = getStatusBadge(purchase.status);
                  const Icon = badge.icon;

                  return (
                    <tr key={purchase.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold font-mono text-indigo-700">
                        {purchase.orderNumber}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-800">
                        {purchase.supplierName}
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {formatDate(purchase.date)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold">
                          {purchase.items.length} art.
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-black text-slate-900">
                        {formatMoney(purchase.totalAmount, settings.currency)}
                      </td>
                      <td className="p-3.5 text-right font-semibold text-emerald-600">
                        {formatMoney(purchase.paidAmount, settings.currency)}
                      </td>
                      <td className="p-3.5 text-right font-semibold text-rose-600">
                        {formatMoney(purchase.remainingAmount, settings.currency)}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.bg}`}
                        >
                          <Icon className="w-3 h-3" />
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {purchase.status !== 'RECU' && purchase.status !== 'ANNULE' && (
                            <button
                              onClick={() => handleUpdateStatus(purchase, 'RECU')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-xs flex items-center gap-1"
                              title="Marquer comme reçu et mettre le stock à jour"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Réceptionner
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedPurchase(purchase);
                              setShowDetailsModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                    Aucun bon de commande trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW PURCHASE ORDER MODAL */}
      {showNewPurchaseModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePurchaseSubmit}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in"
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-400" />
                Nouveau Bon de Commande Fournisseur
              </h3>
              <button
                type="button"
                onClick={() => setShowNewPurchaseModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
                  ⚠️ {errorMessage}
                </div>
              )}

              {/* Supplier & Payment Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Fournisseur *</label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName} ({s.contactName})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mode de Paiement</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="VIREMENT">Virement Bancaire</option>
                    <option value="ESPECES">Espèces</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                    <option value="CARTE_BANCAIRE">Carte Bancaire</option>
                  </select>
                </div>
              </div>

              {/* Add item to line */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="font-bold text-slate-800">Ajouter des articles à commander</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500 block">Article</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => handleProductSelectChange(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Achat act: {p.purchasePrice})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Quantité</label>
                    <input
                      type="number"
                      min="1"
                      value={itemQty}
                      onChange={(e) => setItemQty(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Prix Achat Unit.</label>
                    <input
                      type="number"
                      min="0"
                      value={itemUnitCost}
                      onChange={(e) => setItemUnitCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddItemToPurchase}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
                  >
                    + Ajouter à la ligne
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-2.5">Article</th>
                      <th className="p-2.5 text-center">Quantité</th>
                      <th className="p-2.5 text-right">P.U Achat</th>
                      <th className="p-2.5 text-right">Total</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchaseItems.length > 0 ? (
                      purchaseItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-medium">{item.productName}</td>
                          <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                          <td className="p-2.5 text-right text-slate-600">
                            {formatMoney(item.unitCost, '')}
                          </td>
                          <td className="p-2.5 text-right font-black text-slate-900">
                            {formatMoney(item.totalCost, settings.currency)}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">
                          Aucun article ajouté pour l'instant.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals & Payments */}
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2">
                <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                  <span>TOTAL COMMANDE :</span>
                  <span className="text-base font-black text-indigo-700">
                    {formatMoney(totalPurchaseAmount, settings.currency)}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-indigo-100">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Acompte / Montant payé ({settings.currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={totalPurchaseAmount}
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <span className="text-[11px] text-slate-500">Reste à payer (Dette fournisseur) :</span>
                    <span className="text-xs font-bold text-rose-600 mt-1">
                      {formatMoney(Math.max(0, totalPurchaseAmount - paidAmount), settings.currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes / Instructions</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Conditions de livraison, délais, etc..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewPurchaseModal(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Enregistrer le Bon de Commande
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PURCHASE DETAILS MODAL */}
      {showDetailsModal && selectedPurchase && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">{selectedPurchase.orderNumber}</h3>
                <p className="text-[11px] text-slate-400">
                  Fournisseur : {selectedPurchase.supplierName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <p><span className="text-slate-500">Date de commande :</span> {formatDate(selectedPurchase.date)}</p>
                <p><span className="text-slate-500">Créé par :</span> {selectedPurchase.createdBy}</p>
                <p><span className="text-slate-500">Règlement :</span> {getPaymentMethodLabel(selectedPurchase.paymentMethod)}</p>
                {selectedPurchase.receivedDate && (
                  <p><span className="text-slate-500">Réceptionné le :</span> {formatDateTime(selectedPurchase.receivedDate)}</p>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-2">Article</th>
                      <th className="p-2 text-center">Qté</th>
                      <th className="p-2 text-right">P.U Achat</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPurchase.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium">{it.productName}</td>
                        <td className="p-2 text-center">{it.quantity}</td>
                        <td className="p-2 text-right text-slate-600">{formatMoney(it.unitCost, '')}</td>
                        <td className="p-2 text-right font-bold">{formatMoney(it.totalCost, settings.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Montant Total :</span>
                  <strong className="text-slate-900">{formatMoney(selectedPurchase.totalAmount, settings.currency)}</strong>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Payé :</span>
                  <strong>{formatMoney(selectedPurchase.paidAmount, settings.currency)}</strong>
                </div>
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Reste à Payer :</span>
                  <span>{formatMoney(selectedPurchase.remainingAmount, settings.currency)}</span>
                </div>
              </div>

              {selectedPurchase.notes && (
                <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {selectedPurchase.notes}
                </p>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
