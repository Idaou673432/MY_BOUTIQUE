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
  Download,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Sale } from '../../types';
import { formatMoney, formatDateTime, getPaymentMethodLabel } from '../../utils/formatters';
import { InvoiceModal } from '../common/InvoiceModal';

interface SalesHistoryViewProps {
  onNavigate?: (tab: string) => void;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({ onNavigate }) => {
  const { sales, cancelSale, settings, currentUser } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtered sales
  const filteredSales = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return (sales || []).filter((s) => {
      if (!s) return false;
      const invNum = (s.invoiceNumber || '').toLowerCase();
      const custName = (s.customerName || '').toLowerCase();
      const userName = (s.userName || '').toLowerCase();
      const matchesSearch =
        invNum.includes(q) ||
        custName.includes(q) ||
        userName.includes(q);

      const matchesPayment = paymentFilter === 'all' || s.paymentMethod === paymentFilter;
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

      return matchesSearch && matchesPayment && matchesStatus;
    });
  }, [sales, searchTerm, paymentFilter, statusFilter]);

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

  const isVendeur = currentUser.role === 'VENDEUR';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            Historique des Ventes & Factures
          </h1>
          <p className="text-xs text-slate-500">
            Recherche, réimpression des tickets et gestion des annulations / retours articles.
          </p>
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('pos')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nouvelle Vente (POS)</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Recherche par n° facture, client ou caissier..."
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

      {/* Sales Table */}
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
                          {sale.items.reduce((s, it) => s + it.quantity, 0)} art.
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
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg"
                            title="Imprimer / Afficher le ticket"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {!isCancelled && (
                            <button
                              onClick={() => handleOpenCancelModal(sale)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg"
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
                className="text-white hover:opacity-80"
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
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Retour
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs"
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
    </div>
  );
};
