import React, { useState, useMemo } from 'react';
import {
  Users,
  Truck,
  Plus,
  Search,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Building,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  Banknote
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Customer, Supplier, PaymentMethod } from '../../types';
import { formatMoney, formatDate } from '../../utils/formatters';

interface ThirdPartiesViewProps {
  initialTab?: 'customers' | 'suppliers';
}

export const ThirdPartiesView: React.FC<ThirdPartiesViewProps> = ({ initialTab = 'customers' }) => {
  const {
    customers,
    suppliers,
    addCustomer,
    updateCustomer,
    addSupplier,
    updateSupplier,
    payCustomerCredit,
    paySupplierDebt,
    settings,
    currentUser,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');

  // Customer Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    creditLimit: 50000,
    notes: '',
  });

  // Customer Debt Pay Modal
  const [showPayCreditModal, setShowPayCreditModal] = useState(false);
  const [selectedCustomerForPay, setSelectedCustomerForPay] = useState<Customer | null>(null);
  const [creditPayAmount, setCreditPayAmount] = useState<number>(0);
  const [creditPayMethod, setCreditPayMethod] = useState<PaymentMethod>('ESPECES');

  // Supplier Modals
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    companyName: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  // Supplier Debt Pay Modal
  const [showPaySupplierDebtModal, setShowPaySupplierDebtModal] = useState(false);
  const [selectedSupplierForPay, setSelectedSupplierForPay] = useState<Supplier | null>(null);
  const [supplierPayAmount, setSupplierPayAmount] = useState<number>(0);
  const [supplierPayMethod, setSupplierPayMethod] = useState<PaymentMethod>('VIREMENT');

  // Filtered lists
  const filteredCustomers = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return (customers || []).filter((c) => {
      if (!c) return false;
      const name = (c.name || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [customers, searchTerm]);

  const filteredSuppliers = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return (suppliers || []).filter((s) => {
      if (!s) return false;
      const company = (s.companyName || '').toLowerCase();
      const contact = (s.contactName || '').toLowerCase();
      const phone = (s.phone || '').toLowerCase();
      return company.includes(q) || contact.includes(q) || phone.includes(q);
    });
  }, [suppliers, searchTerm]);

  // Customer Handlers
  const handleOpenAddCustomer = () => {
    setEditingCustomer(null);
    setCustomerForm({
      name: '',
      phone: '',
      email: '',
      address: '',
      creditLimit: 100000,
      notes: '',
    });
    setShowCustomerModal(true);
  };

  const handleOpenEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setCustomerForm({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      address: c.address || '',
      creditLimit: c.creditLimit || 100000,
      notes: c.notes || '',
    });
    setShowCustomerModal(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name.trim()) return;

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, {
        ...customerForm,
        creditLimit: Number(customerForm.creditLimit),
      });
    } else {
      addCustomer({
        ...customerForm,
        creditLimit: Number(customerForm.creditLimit),
      });
    }
    setShowCustomerModal(false);
  };

  const handlePayCreditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForPay || creditPayAmount <= 0) return;
    payCustomerCredit(selectedCustomerForPay.id, Number(creditPayAmount), creditPayMethod);
    setShowPayCreditModal(false);
  };

  // Supplier Handlers
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({
      companyName: '',
      contactName: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    });
    setShowSupplierModal(true);
  };

  const handleOpenEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierForm({
      companyName: s.companyName,
      contactName: s.contactName,
      phone: s.phone,
      email: s.email || '',
      address: s.address || '',
      notes: s.notes || '',
    });
    setShowSupplierModal(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.companyName.trim()) return;

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, supplierForm);
    } else {
      addSupplier(supplierForm);
    }
    setShowSupplierModal(false);
  };

  const handlePaySupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForPay || supplierPayAmount <= 0) return;
    paySupplierDebt(selectedSupplierForPay.id, Number(supplierPayAmount), supplierPayMethod);
    setShowPaySupplierDebtModal(false);
  };

  const totalCustomerDebt = useMemo(
    () => customers.reduce((sum, c) => sum + c.creditBalance, 0),
    [customers]
  );
  const totalSupplierDebt = useMemo(
    () => suppliers.reduce((sum, s) => sum + (s.debtBalance || s.balanceDue || 0), 0),
    [suppliers]
  );

  const isVendeur = currentUser.role === 'VENDEUR';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Clients & Fournisseurs (Tiers)
          </h1>
          <p className="text-xs text-slate-500">
            Gestion du répertoire commercial, suivi des créances clients et dettes fournisseurs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'customers' ? (
            <button
              onClick={handleOpenAddCustomer}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Nouveau Client
            </button>
          ) : (
            !isVendeur && (
              <button
                onClick={handleOpenAddSupplier}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Nouveau Fournisseur
              </button>
            )
          )}
        </div>
      </div>

      {/* TABS & SEARCH & SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'customers'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Clients ({customers.length})
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'suppliers'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Fournisseurs ({suppliers.length})
            </button>
          </div>

          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeTab === 'customers'
                  ? 'Rechercher un client par nom, tel...'
                  : 'Rechercher un fournisseur...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Global Debt KPI */}
        <div
          className={`rounded-2xl p-4 border flex items-center justify-between ${
            activeTab === 'customers'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div>
            <p className="text-xs font-bold">
              {activeTab === 'customers' ? 'Créances Clients à Recouvrer' : 'Dettes Fournisseurs Dues'}
            </p>
            <p className="text-xl font-black mt-0.5">
              {formatMoney(
                activeTab === 'customers' ? totalCustomerDebt : totalSupplierDebt,
                settings.currency
              )}
            </p>
          </div>
          <DollarSign className="w-8 h-8 opacity-40" />
        </div>
      </div>

      {/* CUSTOMERS TABLE */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Nom du Client</th>
                  <th className="p-3.5">Téléphone</th>
                  <th className="p-3.5">Adresse / Email</th>
                  <th className="p-3.5 text-center">Achats Réalisés</th>
                  <th className="p-3.5 text-right">Dette en cours</th>
                  <th className="p-3.5 text-right">Plafond Crédit</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">{cust.name}</td>
                      <td className="p-3.5 text-slate-600 font-mono text-[11px]">{cust.phone}</td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {cust.address || cust.email || '—'}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md font-semibold text-slate-700">
                          {cust.salesCount ?? cust.totalPurchasesCount ?? 0} achats
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <span
                          className={`font-black ${
                            cust.creditBalance > 0 ? 'text-amber-700' : 'text-slate-400'
                          }`}
                        >
                          {formatMoney(cust.creditBalance, settings.currency)}
                        </span>
                      </td>
                      <td className="p-3.5 text-right text-slate-500">
                        {formatMoney(cust.creditLimit || 0, settings.currency)}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {cust.creditBalance > 0 && (
                            <button
                              onClick={() => {
                                setSelectedCustomerForPay(cust);
                                setCreditPayAmount(cust.creditBalance);
                                setShowPayCreditModal(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-xs"
                              title="Encaisser un remboursement"
                            >
                              Encaisser dette
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditCustomer(cust)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg text-xs"
                          >
                            Modifier
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                      Aucun client trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUPPLIERS TABLE */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Entreprise / Raison Sociale</th>
                  <th className="p-3.5">Contact Référent</th>
                  <th className="p-3.5">Téléphone</th>
                  <th className="p-3.5">Adresse / Email</th>
                  <th className="p-3.5 text-right">Dette Due au Fournisseur</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.length > 0 ? (
                  filteredSuppliers.map((sup) => (
                    <tr key={sup.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">{sup.companyName}</td>
                      <td className="p-3.5 text-slate-700 font-medium">{sup.contactName}</td>
                      <td className="p-3.5 text-slate-600 font-mono text-[11px]">{sup.phone}</td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {sup.address || sup.email || '—'}
                      </td>
                      <td className="p-3.5 text-right">
                        <span
                          className={`font-black ${
                            (sup.debtBalance || sup.balanceDue || 0) > 0 ? 'text-rose-600' : 'text-slate-400'
                          }`}
                        >
                          {formatMoney(sup.debtBalance ?? sup.balanceDue ?? 0, settings.currency)}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {(sup.debtBalance || sup.balanceDue || 0) > 0 && !isVendeur && (
                            <button
                              onClick={() => {
                                setSelectedSupplierForPay(sup);
                                setSupplierPayAmount(sup.debtBalance ?? sup.balanceDue ?? 0);
                                setShowPaySupplierDebtModal(true);
                              }}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold shadow-xs"
                              title="Payer la dette fournisseur"
                            >
                              Régler dette
                            </button>
                          )}
                          {!isVendeur && (
                            <button
                              onClick={() => handleOpenEditSupplier(sup)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg text-xs"
                            >
                              Modifier
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                      Aucun fournisseur trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CUSTOMER FORM MODAL */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCustomer}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in"
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingCustomer ? 'Modifier le Client' : 'Nouveau Client'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nom Complet / Raison Sociale *</label>
                <input
                  type="text"
                  required
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    required
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Adresse physique / Quartier</label>
                <input
                  type="text"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Plafond de Crédit Autorisé ({settings.currency})
                </label>
                <input
                  type="number"
                  min="0"
                  value={customerForm.creditLimit}
                  onChange={(e) => setCustomerForm({ ...customerForm, creditLimit: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Enregistrer le Client
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PAY CUSTOMER DEBT MODAL */}
      {showPayCreditModal && selectedCustomerForPay && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handlePayCreditSubmit}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in"
          >
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Remboursement Dette Client</h3>
              <button
                type="button"
                onClick={() => setShowPayCreditModal(false)}
                className="text-white hover:opacity-80"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-amber-900 font-bold">{selectedCustomerForPay.name}</p>
                <p className="text-xs text-amber-800 mt-1">
                  Dette actuelle : <strong>{formatMoney(selectedCustomerForPay.creditBalance, settings.currency)}</strong>
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Montant remboursé ({settings.currency}) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedCustomerForPay.creditBalance}
                  required
                  value={creditPayAmount}
                  onChange={(e) => setCreditPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mode d'encaissement</label>
                <select
                  value={creditPayMethod}
                  onChange={(e) => setCreditPayMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                >
                  <option value="ESPECES">Espèces (Entrée en caisse)</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="VIREMENT">Virement</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPayCreditModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                Valider l'Encaissement
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUPPLIER FORM MODAL */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSupplier}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in"
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingSupplier ? 'Modifier le Fournisseur' : 'Nouveau Fournisseur'}
              </h3>
              <button
                type="button"
                onClick={() => setShowSupplierModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Raison Sociale / Société *</label>
                <input
                  type="text"
                  required
                  value={supplierForm.companyName}
                  onChange={(e) => setSupplierForm({ ...supplierForm, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nom du Contact *</label>
                  <input
                    type="text"
                    required
                    value={supplierForm.contactName}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contactName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    required
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Adresse / Ville</label>
                <input
                  type="text"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSupplierModal(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Enregistrer le Fournisseur
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PAY SUPPLIER DEBT MODAL */}
      {showPaySupplierDebtModal && selectedSupplierForPay && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handlePaySupplierSubmit}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in"
          >
            <div className="p-4 bg-rose-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Règlement Dette Fournisseur</h3>
              <button
                type="button"
                onClick={() => setShowPaySupplierDebtModal(false)}
                className="text-white hover:opacity-80"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <p className="text-rose-900 font-bold">{selectedSupplierForPay.companyName}</p>
                <p className="text-xs text-rose-800 mt-1">
                  Dette due : <strong>{formatMoney(selectedSupplierForPay.balanceDue, settings.currency)}</strong>
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Montant réglé ({settings.currency}) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedSupplierForPay.balanceDue}
                  required
                  value={supplierPayAmount}
                  onChange={(e) => setSupplierPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mode de règlement</label>
                <select
                  value={supplierPayMethod}
                  onChange={(e) => setSupplierPayMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                >
                  <option value="VIREMENT">Virement Bancaire</option>
                  <option value="ESPECES">Espèces (Sortie de caisse)</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPaySupplierDebtModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Confirmer le Paiement
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
