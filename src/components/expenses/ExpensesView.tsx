import React, { useState, useMemo } from 'react';
import {
  TrendingDown,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Calendar,
  DollarSign,
  Tag,
  Receipt,
  Building,
  CreditCard,
  Smartphone,
  Banknote
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Expense, ExpenseCategory, PaymentMethod } from '../../types';
import { formatMoney, formatDate, formatDateTime, getPaymentMethodLabel } from '../../utils/formatters';

export const ExpensesView: React.FC = () => {
  const { expenses, addExpense, deleteExpense, settings, currentUser } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [category, setCategory] = useState<ExpenseCategory>('ELECTRICITE_EAU');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ESPECES');
  const [beneficiary, setBeneficiary] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredExpenses = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return (expenses || []).filter((e) => {
      if (!e) return false;
      const desc = (e.description || '').toLowerCase();
      const beneficiary = (e.beneficiary || '').toLowerCase();
      const receipt = (e.receiptNumber || '').toLowerCase();
      const matchesSearch =
        desc.includes(q) ||
        beneficiary.includes(q) ||
        receipt.includes(q);
      const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, categoryFilter]);

  const totalFilteredAmount = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (amount <= 0) {
      setErrorMessage('Le montant de la dépense doit être supérieur à zéro.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Veuillez saisir une description pour cette dépense.');
      return;
    }

    addExpense({
      category,
      description: description.trim(),
      amount: Number(amount),
      paymentMethod,
      beneficiary: beneficiary.trim() || undefined,
      receiptNumber: receiptNumber.trim() || undefined,
    });

    setShowAddModal(false);
    setDescription('');
    setAmount(0);
    setBeneficiary('');
    setReceiptNumber('');
  };

  const getCategoryLabel = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'LOYER':
        return 'Loyer Commercial';
      case 'ELECTRICITE_EAU':
        return 'Électricité / Eau / Internet';
      case 'SALAIRES':
        return 'Salaires & Rémunérations';
      case 'TRANSPORT':
        return 'Transport & Logistique';
      case 'EMBALLAGE':
        return 'Sacs & Emballages';
      case 'ENTRETIEN':
        return 'Entretien & Maintenance';
      case 'IMPOTS_TAXES':
        return 'Impôts & Taxes';
      case 'AUTRE':
        return 'Autres Dépenses';
      default:
        return cat;
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Catégorie', 'Description', 'Montant', 'Mode de Paiement', 'Bénéficiaire', 'N° Reçu', 'Enregistré par'];
    const rows = filteredExpenses.map((e) => [
      `"${formatDate(e.date)}"`,
      `"${getCategoryLabel(e.category)}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      e.amount,
      `"${getPaymentMethodLabel(e.paymentMethod)}"`,
      `"${e.beneficiary || ''}"`,
      `"${e.receiptNumber || ''}"`,
      `"${e.userName}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `journal_depenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isVendeur = currentUser.role === 'VENDEUR';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-rose-600" />
            Gestion des Dépenses ({expenses.length})
          </h1>
          <p className="text-xs text-slate-500">
            Suivi des charges d'exploitation, factures et salaires pour le calcul du bénéfice net réel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter CSV
          </button>
          {!isVendeur && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Dépense
            </button>
          )}
        </div>
      </div>

      {/* FILTER & SUMMARY BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par libellé, bénéficiaire..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="all">Toutes les catégories</option>
            <option value="LOYER">Loyer Commercial</option>
            <option value="ELECTRICITE_EAU">Électricité / Eau / Internet</option>
            <option value="SALAIRES">Salaires</option>
            <option value="TRANSPORT">Transport</option>
            <option value="EMBALLAGE">Emballages</option>
            <option value="ENTRETIEN">Entretien</option>
            <option value="IMPOTS_TAXES">Impôts & Taxes</option>
            <option value="AUTRE">Autres</option>
          </select>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col justify-center">
          <span className="text-xs text-rose-700 font-semibold">Total Dépenses Filtrées</span>
          <span className="text-2xl font-black text-rose-900 mt-1">
            {formatMoney(totalFilteredAmount, settings.currency)}
          </span>
        </div>
      </div>

      {/* EXPENSES TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Catégorie</th>
                <th className="p-3.5">Description & Motif</th>
                <th className="p-3.5">Bénéficiaire</th>
                <th className="p-3.5">Paiement</th>
                <th className="p-3.5 text-right">Montant</th>
                <th className="p-3.5">Opérateur</th>
                {!isVendeur && <th className="p-3.5 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDate(expense.date)}
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                        {getCategoryLabel(expense.category)}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">{expense.description}</td>
                    <td className="p-3.5 text-slate-600">{expense.beneficiary || '—'}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-medium text-slate-700">
                        {getPaymentMethodLabel(expense.paymentMethod)}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-black text-rose-600">
                      -{formatMoney(expense.amount, settings.currency)}
                    </td>
                    <td className="p-3.5 text-slate-500 text-[11px]">{expense.userName}</td>
                    {!isVendeur && (
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    Aucune dépense enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD EXPENSE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveExpense}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in"
          >
            <div className="p-4 bg-rose-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Enregistrer une Dépense
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
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

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catégorie de Dépense *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="ELECTRICITE_EAU">Électricité / Eau / Internet</option>
                  <option value="LOYER">Loyer Commercial</option>
                  <option value="SALAIRES">Salaires & Rémunérations</option>
                  <option value="TRANSPORT">Transport & Logistique</option>
                  <option value="EMBALLAGE">Sacs & Emballages</option>
                  <option value="ENTRETIEN">Entretien & Maintenance</option>
                  <option value="IMPOTS_TAXES">Impôts & Taxes</option>
                  <option value="AUTRE">Autre Dépense</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Libellé / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Facture Senelec Mars, Achat sacs plastique 1000 pcs..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Montant ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount || ''}
                    placeholder="0"
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-black text-sm text-rose-700 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mode de Paiement *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="ESPECES">Espèces (Déduit de la caisse)</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                    <option value="VIREMENT">Virement Bancaire</option>
                    <option value="CARTE_BANCAIRE">Carte Bancaire</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Bénéficiaire</label>
                  <input
                    type="text"
                    placeholder="Ex: Senelec, Propriétaire..."
                    value={beneficiary}
                    onChange={(e) => setBeneficiary(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">N° Reçu / Facture</label>
                  <input
                    type="text"
                    placeholder="Ex: REC-8823"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Enregistrer la Dépense
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
