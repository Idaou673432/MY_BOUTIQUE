import React, { useState, useMemo } from 'react';
import {
  Coins,
  ArrowDownRight,
  ArrowUpRight,
  Lock,
  Unlock,
  PlusCircle,
  MinusCircle,
  FileCheck,
  Calendar,
  DollarSign,
  AlertTriangle,
  History,
  CheckCircle2,
  Printer,
  RotateCcw,
  Sparkles,
  Inbox
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CashTransactionType } from '../../types';
import { formatMoney, formatDateTime, formatDate, getCashTransactionTypeBadge } from '../../utils/formatters';
import { openCashDrawerHardware } from '../../utils/printService';

interface CashRegisterViewProps {
  onNavigate?: (tab: string) => void;
}

export const CashRegisterView: React.FC<CashRegisterViewProps> = ({ onNavigate }) => {
  const {
    cashRegister,
    cashTransactions,
    openCashRegister,
    closeCashRegister,
    addCashTransaction,
    settings,
    currentUser,
  } = useStore();

  // Modals
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openingBalanceInput, setOpeningBalanceInput] = useState<number>(0);

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingNotes, setClosingNotes] = useState('');

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transType, setTransType] = useState<CashTransactionType>('DEPENSE');
  const [transAmount, setTransAmount] = useState<number>(0);
  const [transReason, setTransReason] = useState('');
  const [transError, setTransError] = useState<string | null>(null);

  // Success Feedback
  const [drawerStatusMessage, setDrawerStatusMessage] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Real-time Session Calculations
  const currentSessionTransactions = useMemo(() => {
    if (!cashRegister) return [];
    return (cashTransactions || []).filter(
      (t) => t.cashRegisterId === cashRegister.id || (cashRegister.isOpen && !t.cashRegisterId)
    );
  }, [cashTransactions, cashRegister]);

  const currentBalance = useMemo(() => {
    if (!cashRegister) return 0;
    if (!cashRegister.isOpen) {
      return cashRegister.closingBalanceReal ?? cashRegister.closingBalanceTheoretical ?? 0;
    }
    return currentSessionTransactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [cashRegister, currentSessionTransactions]);

  const totalInflows = useMemo(() => {
    return currentSessionTransactions
      .filter((t) => (Number(t.amount) || 0) > 0 && t.type !== 'OUVERTURE')
      .reduce((acc, t) => acc + Number(t.amount), 0);
  }, [currentSessionTransactions]);

  const totalOutflows = useMemo(() => {
    return currentSessionTransactions
      .filter((t) => (Number(t.amount) || 0) < 0)
      .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
  }, [currentSessionTransactions]);

  const [actualClosingBalanceInput, setActualClosingBalanceInput] = useState<number>(0);

  const filteredTransactions = useMemo(() => {
    return (cashTransactions || []).filter((t) => {
      if (typeFilter === 'all') return true;
      return t.type === typeFilter;
    });
  }, [cashTransactions, typeFilter]);

  const handleOpenRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const success = openCashRegister(Number(openingBalanceInput));
    setShowOpenModal(false);
    if (success) {
      setDrawerStatusMessage(`✅ Caisse ouverte avec succès ! Fond initial : ${formatMoney(Number(openingBalanceInput), settings.currency)}`);
      setTimeout(() => setDrawerStatusMessage(null), 5000);
    }
  };

  const handleTriggerDrawerHardware = async () => {
    setDrawerStatusMessage("⚡ Envoi du signal d'ouverture au tiroir-caisse...");
    const res = await openCashDrawerHardware(settings);
    setDrawerStatusMessage(res.message);
    setTimeout(() => setDrawerStatusMessage(null), 6000);
  };

  const handleCloseRegister = (e: React.FormEvent) => {
    e.preventDefault();
    closeCashRegister(Number(actualClosingBalanceInput), closingNotes);
    setShowCloseModal(false);
    setDrawerStatusMessage('🔒 Session de caisse clôturée.');
    setTimeout(() => setDrawerStatusMessage(null), 5000);
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    setTransError(null);

    if (transAmount <= 0) {
      setTransError('Le montant doit être supérieur à zéro.');
      return;
    }
    if (!transReason.trim()) {
      setTransError('Veuillez préciser le motif de cette opération.');
      return;
    }

    const signAmount = transType === 'DEPENSE' || transType === 'RETRAIT' ? -Math.abs(Number(transAmount)) : Math.abs(Number(transAmount));
    addCashTransaction(transType, signAmount, transReason.trim(), 'ESPECES');
    setShowTransactionModal(false);
    setTransAmount(0);
    setTransReason('');
  };

  const isVendeur = currentUser?.role === 'VENDEUR';
  const cashDifference = actualClosingBalanceInput - currentBalance;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert Message */}
      {drawerStatusMessage && (
        <div className="p-3.5 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-lg border border-slate-700 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{drawerStatusMessage}</span>
          </div>
          <button
            onClick={() => setDrawerStatusMessage(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Main Status Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full ${
                cashRegister?.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              Gestion de la Caisse
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                cashRegister?.isOpen
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {cashRegister?.isOpen ? 'Caisse Ouverte' : 'Caisse Clôturée'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {cashRegister?.isOpen
              ? `Ouverte le ${formatDateTime(cashRegister.openedAt)} par ${cashRegister.openedByName || cashRegister.openedBy || 'Caissier'}`
              : 'La caisse est actuellement fermée. Cliquez sur Ouvrir la Caisse pour démarrer la session.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Always accessible Hardware Cash Drawer button */}
          <button
            type="button"
            onClick={handleTriggerDrawerHardware}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
            title="Envoyer une impulsion électrique ESC/POS pour éjecter le tiroir-caisse physique"
          >
            <Inbox className="w-4 h-4" />
            Ouvrir Tiroir-Caisse
          </button>

          {cashRegister?.isOpen ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setTransType('ENTREE_MANUELLE');
                  setShowTransactionModal(true);
                }}
                className="flex items-center gap-1 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold border border-emerald-200"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Apport Cash
              </button>
              <button
                type="button"
                onClick={() => {
                  setTransType('DEPENSE');
                  setShowTransactionModal(true);
                }}
                className="flex items-center gap-1 px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold border border-rose-200"
              >
                <MinusCircle className="w-3.5 h-3.5" />
                Sortie / Dépense
              </button>
              {!isVendeur && (
                <button
                  type="button"
                  onClick={() => {
                    setActualClosingBalanceInput(currentBalance);
                    setShowCloseModal(true);
                  }}
                  className="flex items-center gap-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Clôturer (Z)
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowOpenModal(true)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer animate-pulse"
            >
              <Unlock className="w-4 h-4" />
              Ouvrir la Caisse
            </button>
          )}
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Solde Actuel en Caisse */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-xs text-slate-500 font-medium">Solde Réel en Caisse</p>
          <p className="text-2xl font-black text-slate-900">
            {formatMoney(currentBalance, settings.currency)}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 pt-1">
            <span>Fond de départ :</span>
            <strong className="text-slate-700">
              {formatMoney(cashRegister?.openingBalance || 0, settings.currency)}
            </strong>
          </div>
        </div>

        {/* Total Encaissé */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-xs text-slate-500 font-medium">Total Entrées & Ventes Cash</p>
          <p className="text-2xl font-black text-emerald-600">
            +{formatMoney(totalInflows, settings.currency)}
          </p>
          <p className="text-[11px] text-slate-400">Pendant la session courante</p>
        </div>

        {/* Total Sorties & Dépenses */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-xs text-slate-500 font-medium">Total Sorties & Dépenses Cash</p>
          <p className="text-2xl font-black text-rose-600">
            -{formatMoney(totalOutflows, settings.currency)}
          </p>
          <p className="text-[11px] text-slate-400">Pendant la session courante</p>
        </div>

        {/* Écart de Caisse Théorique */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-xs text-slate-500 font-medium">Contrôle de Caisse</p>
          <p className="text-2xl font-black text-indigo-700">
            {currentSessionTransactions.length}
          </p>
          <p className="text-[11px] text-slate-500">Mouvements dans cette session</p>
        </div>
      </div>

      {/* FILTER & TRANSACTIONS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            Journal des Mouvements de Caisse
          </h2>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="all">Tous les types de flux</option>
            <option value="VENTE">Encaissements Ventes</option>
            <option value="DEPENSE">Dépenses boutique</option>
            <option value="RETRAIT">Retraits propriétaire</option>
            <option value="ENTREE_MANUELLE">Apports / Entrées manuelles</option>
            <option value="OUVERTURE">Fonds d'ouverture</option>
            <option value="CLOTURE">Clôtures de caisse</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Date & Heure</th>
                <th className="p-3.5">Type d'opération</th>
                <th className="p-3.5">Motif / Justification</th>
                <th className="p-3.5 text-right">Montant</th>
                <th className="p-3.5 text-right">Solde Caisse après opération</th>
                <th className="p-3.5">Opérateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => {
                  const badge = getCashTransactionTypeBadge(tx.type);
                  const isPositive =
                    tx.type === 'VENTE' ||
                    tx.type === 'ENTREE_MANUELLE' ||
                    tx.type === 'REGLEMENT_CLIENT' ||
                    tx.type === 'OUVERTURE';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDateTime(tx.date)}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-800 font-medium">{tx.reason}</td>
                      <td className="p-3.5 text-right font-black">
                        <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                          {isPositive ? '+' : '-'}
                          {formatMoney(tx.amount, settings.currency)}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        {formatMoney(tx.balanceAfter, settings.currency)}
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">{tx.userName}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                    Aucun mouvement de caisse enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* OPEN CASH REGISTER MODAL */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleOpenRegister}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in"
          >
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Unlock className="w-4 h-4" />
                Ouverture de Caisse
              </h3>
              <button
                type="button"
                onClick={() => setShowOpenModal(false)}
                className="text-white hover:opacity-80"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Fond de caisse initial ({settings.currency}) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={openingBalanceInput}
                  onChange={(e) => setOpeningBalanceInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[0, 5000, 10000, 25000, 50000, 100000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setOpeningBalanceInput(val)}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-bold text-slate-700 text-center"
                  >
                    {val === 0 ? '0 FCFA' : formatMoney(val, '')}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowOpenModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirmer l'Ouverture
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CLOSE CASH REGISTER MODAL (RAPPORT Z) */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCloseRegister}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in"
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                Clôture de Caisse & Rapport Journalier (Z)
              </h3>
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Summary box */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Fond initial :</span>
                  <strong>{formatMoney(cashRegister?.openingBalance || 0, settings.currency)}</strong>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Total Encaissements :</span>
                  <strong>+{formatMoney(totalInflows, settings.currency)}</strong>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Total Décaissements :</span>
                  <strong>-{formatMoney(totalOutflows, settings.currency)}</strong>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                  <span>Solde Théorique attendu :</span>
                  <span className="text-sm font-black text-indigo-700">
                    {formatMoney(currentBalance, settings.currency)}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Montant réellement compté en caisse ({settings.currency}) *
                </label>
                <input
                  type="number"
                  required
                  value={actualClosingBalanceInput}
                  onChange={(e) => setActualClosingBalanceInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-black text-base text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Variance Alert */}
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                  cashDifference === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : cashDifference < 0
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <span>Écart de caisse calculé :</span>
                <span className="font-black text-sm">
                  {cashDifference === 0
                    ? 'Parfait (0.00)'
                    : `${cashDifference > 0 ? '+' : ''}${formatMoney(cashDifference, settings.currency)}`}
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Remarques de clôture (justification si écart)
                </label>
                <textarea
                  rows={2}
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Notes de fin de journée..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Valider & Clôturer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CASH INFLOW / OUTFLOW MODAL */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveTransaction}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in"
          >
            <div
              className={`p-4 text-white flex items-center justify-between ${
                transType === 'ENTREE_MANUELLE' ? 'bg-emerald-700' : 'bg-rose-700'
              }`}
            >
              <h3 className="font-bold text-sm">
                {transType === 'ENTREE_MANUELLE' ? 'Apport / Entrée de Cash' : 'Dépense / Sortie de Cash'}
              </h3>
              <button
                type="button"
                onClick={() => setShowTransactionModal(false)}
                className="text-white hover:opacity-80"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              {transError && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
                  ⚠️ {transError}
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Type d'opération</label>
                <select
                  value={transType}
                  onChange={(e) => setTransType(e.target.value as CashTransactionType)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold"
                >
                  <option value="DEPENSE">Dépense courante boutique</option>
                  <option value="RETRAIT">Retrait propriétaire</option>
                  <option value="REGLEMENT_FOURNISSEUR">Paiement direct fournisseur</option>
                  <option value="ENTREE_MANUELLE">Apport personnel en caisse</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Montant ({settings.currency}) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transAmount || ''}
                  placeholder="0"
                  onChange={(e) => setTransAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-black text-base focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Motif / Justification obligatoire *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Facture électricité Senelec, Achat sacs d'emballage..."
                  value={transReason}
                  onChange={(e) => setTransReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTransactionModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Annuler
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold shadow-xs ${
                  transType === 'ENTREE_MANUELLE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Enregistrer le Mouvement
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
