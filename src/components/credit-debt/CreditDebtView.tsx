import React, { useState, useMemo } from 'react';
import {
  Landmark,
  Users,
  Truck,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Banknote,
  DollarSign,
  Smartphone,
  CreditCard,
  Building,
  Printer,
  FileText,
  Trash2,
  Eye,
  ChevronRight,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  Check,
  Phone,
  Mail,
  Receipt,
  RotateCcw,
  History
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CreditDebtRecord, CreditPayment, PaymentMethod, Customer, Supplier } from '../../types';
import { formatMoney, formatDate, formatDateTime, getPaymentMethodLabel } from '../../utils/formatters';
import {
  generateCreditDebtThermalTicketHtml,
  generateCreditPaymentThermalTicketHtml,
  generateCreditDebtSummaryReportThermalTicketHtml,
  printTicketIn80mm
} from '../../utils/printService';

interface CreditDebtViewProps {
  initialType?: 'ALL' | 'CLIENT_CREDIT' | 'SUPPLIER_DEBT';
}

export const CreditDebtView: React.FC<CreditDebtViewProps> = ({ initialType = 'ALL' }) => {
  const {
    creditDebtRecords,
    customers,
    suppliers,
    addCreditDebtRecord,
    recordCreditPayment,
    cancelCreditPayment,
    deleteCreditDebtRecord,
    settings,
    currentUser,
  } = useStore();

  const [activeTypeTab, setActiveTypeTab] = useState<'ALL' | 'CLIENT_CREDIT' | 'SUPPLIER_DEBT'>(initialType);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'EN_COURS' | 'SOLDE' | 'OVERDUE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal: Create new credit / debt record
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecordType, setNewRecordType] = useState<'CLIENT_CREDIT' | 'SUPPLIER_DEBT'>('CLIENT_CREDIT');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [customPartyName, setCustomPartyName] = useState('');
  const [customPartyPhone, setCustomPartyPhone] = useState('');
  const [recordTitle, setRecordTitle] = useState('');
  const [recordAmount, setRecordAmount] = useState('');
  const [recordDueDate, setRecordDueDate] = useState('');
  const [recordNotes, setRecordNotes] = useState('');

  // Modal: Record payment
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRecordForPayment, setSelectedRecordForPayment] = useState<CreditDebtRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ESPECES');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentMessage, setPaymentMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    receipt?: CreditPayment;
    newRemaining?: number;
    updatedRecord?: CreditDebtRecord;
  } | null>(null);

  // Modal: View record details & history
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<CreditDebtRecord | null>(null);

  // Modal: Global payments journal & cancellation
  const [showPaymentsJournalModal, setShowPaymentsJournalModal] = useState(false);
  const [journalFilterType, setJournalFilterType] = useState<'ALL' | 'CLIENT_CREDIT' | 'SUPPLIER_DEBT'>('ALL');
  const [journalSearch, setJournalSearch] = useState('');

  // Modal: Prompt after creating new credit/debt record
  const [newlyCreatedRecord, setNewlyCreatedRecord] = useState<CreditDebtRecord | null>(null);
  const [showCreatedSuccessModal, setShowCreatedSuccessModal] = useState(false);

  // Statistics calculation
  const stats = useMemo(() => {
    const records = creditDebtRecords || [];
    const clientCredits = records.filter(r => r.type === 'CLIENT_CREDIT');
    const supplierDebts = records.filter(r => r.type === 'SUPPLIER_DEBT');

    const totalClientCredit = clientCredits.reduce((acc, r) => acc + r.initialAmount, 0);
    const totalClientRemaining = clientCredits.reduce((acc, r) => acc + r.remainingAmount, 0);
    const totalClientPaid = clientCredits.reduce((acc, r) => acc + r.paidAmount, 0);

    const totalSupplierDebt = supplierDebts.reduce((acc, r) => acc + r.initialAmount, 0);
    const totalSupplierRemaining = supplierDebts.reduce((acc, r) => acc + r.remainingAmount, 0);
    const totalSupplierPaid = supplierDebts.reduce((acc, r) => acc + r.paidAmount, 0);

    const pendingCount = records.filter(r => r.status === 'EN_COURS').length;
    const settledCount = records.filter(r => r.status === 'SOLDE').length;

    return {
      totalClientCredit,
      totalClientRemaining,
      totalClientPaid,
      totalSupplierDebt,
      totalSupplierRemaining,
      totalSupplierPaid,
      pendingCount,
      settledCount,
      netBalance: totalClientRemaining - totalSupplierRemaining,
    };
  }, [creditDebtRecords]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const q = (searchTerm || '').toLowerCase().trim();

    return (creditDebtRecords || []).filter(r => {
      // Type filter
      if (activeTypeTab === 'CLIENT_CREDIT' && r.type !== 'CLIENT_CREDIT') return false;
      if (activeTypeTab === 'SUPPLIER_DEBT' && r.type !== 'SUPPLIER_DEBT') return false;

      // Status filter
      if (statusFilter === 'EN_COURS' && r.status !== 'EN_COURS') return false;
      if (statusFilter === 'SOLDE' && r.status !== 'SOLDE') return false;
      if (statusFilter === 'OVERDUE') {
        if (r.status === 'SOLDE') return false;
        if (!r.dueDate || r.dueDate >= today) return false;
      }

      // Search filter
      if (q) {
        const titleMatch = (r.title || '').toLowerCase().includes(q);
        const nameMatch = (r.partyName || '').toLowerCase().includes(q);
        const phoneMatch = (r.partyPhone || '').toLowerCase().includes(q);
        const notesMatch = (r.notes || '').toLowerCase().includes(q);
        return titleMatch || nameMatch || phoneMatch || notesMatch;
      }

      return true;
    });
  }, [creditDebtRecords, activeTypeTab, statusFilter, searchTerm]);

    // Open add record modal
  const handleOpenAddModal = (type: 'CLIENT_CREDIT' | 'SUPPLIER_DEBT') => {
    setNewRecordType(type);
    setSelectedPartyId('');
    setCustomPartyName('');
    setCustomPartyPhone('');
    setRecordTitle('');
    setRecordAmount('');
    // Default due date: +15 days
    const next15Days = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setRecordDueDate(next15Days);
    setRecordNotes('');
    setShowAddModal(true);
  };

  // Submit add record
  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(recordAmount);
    if (!amount || amount <= 0) {
      alert('Veuillez saisir un montant supérieur à 0.');
      return;
    }

    let partyName = customPartyName.trim();
    let partyPhone = customPartyPhone.trim();
    let partyId = selectedPartyId;

    if (newRecordType === 'CLIENT_CREDIT') {
      if (selectedPartyId) {
        const cust = (customers || []).find(c => c.id === selectedPartyId);
        if (cust) {
          partyName = cust.name;
          partyPhone = cust.phone;
        }
      }
    } else {
      if (selectedPartyId) {
        const sup = (suppliers || []).find(s => s.id === selectedPartyId);
        if (sup) {
          partyName = sup.companyName;
          partyPhone = sup.phone;
        }
      }
    }

    if (!partyName) {
      alert('Veuillez sélectionner ou renseigner le nom du client ou fournisseur.');
      return;
    }

    const title = recordTitle.trim() || (newRecordType === 'CLIENT_CREDIT' ? 'Crédit accordé' : 'Dette fournisseur');

    const created = addCreditDebtRecord({
      type: newRecordType,
      partyId: partyId || undefined,
      partyName,
      partyPhone: partyPhone || undefined,
      title,
      initialAmount: amount,
      dueDate: recordDueDate || undefined,
      notes: recordNotes || undefined,
      createdAt: new Date().toISOString(),
    });

    setShowAddModal(false);
    setNewlyCreatedRecord(created);
    setShowCreatedSuccessModal(true);
  };

  // Open payment modal
  const handleOpenPayment = (record: CreditDebtRecord) => {
    setSelectedRecordForPayment(record);
    setPaymentAmount(String(record.remainingAmount));
    setPaymentMethod('ESPECES');
    setPaymentNotes('');
    setPaymentMessage(null);
    setShowPaymentModal(true);
  };

  // Submit payment
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForPayment) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setPaymentMessage({ type: 'error', text: 'Le montant du règlement doit être supérieur à zéro.' });
      return;
    }

    const res = recordCreditPayment(
      selectedRecordForPayment.id,
      amount,
      paymentMethod,
      paymentNotes.trim() || undefined
    );

    if (res.success) {
      const newRemaining = Math.max(0, Math.round((selectedRecordForPayment.remainingAmount - amount) * 100) / 100);
      const updatedRecord: CreditDebtRecord = {
        ...selectedRecordForPayment,
        paidAmount: selectedRecordForPayment.paidAmount + amount,
        remainingAmount: newRemaining,
        status: newRemaining <= 0.001 ? 'SOLDE' : 'EN_COURS',
        payments: res.receipt ? [res.receipt, ...selectedRecordForPayment.payments] : selectedRecordForPayment.payments,
      };

      setSelectedRecordForPayment(updatedRecord);
      setPaymentMessage({
        type: 'success',
        text: res.message || 'Règlement enregistré avec succès !',
        receipt: res.receipt,
        newRemaining,
        updatedRecord,
      });

      // Also refresh detail if detail modal is open
      if (selectedRecordDetail && selectedRecordDetail.id === selectedRecordForPayment.id) {
        setSelectedRecordDetail(updatedRecord);
      }
    } else {
      setPaymentMessage({ type: 'error', text: res.message || 'Erreur lors du versement.' });
    }
  };

  // Print official debt acknowledgment receipt in 80mm thermal format
  const printDebtReceipt = (record: CreditDebtRecord) => {
    const html = generateCreditDebtThermalTicketHtml(record, settings, 80);
    printTicketIn80mm(html);
  };

  // Print payment receipt in 80mm thermal format
  const printPaymentReceipt = (record: CreditDebtRecord, paymentIndex: number) => {
    const payment = record.payments[paymentIndex];
    if (!payment) return;

    const html = generateCreditPaymentThermalTicketHtml(
      payment,
      record.partyName,
      record.type === 'CLIENT_CREDIT' ? 'CLIENT' : 'FOURNISSEUR',
      record.remainingAmount,
      settings,
      payment.notes,
      80
    );
    printTicketIn80mm(html);
  };

  // Direct payment printer by reference
  const printSpecificPaymentReceipt = (record: CreditDebtRecord, payment: CreditPayment) => {
    const html = generateCreditPaymentThermalTicketHtml(
      payment,
      record.partyName,
      record.type === 'CLIENT_CREDIT' ? 'CLIENT' : 'FOURNISSEUR',
      record.remainingAmount,
      settings,
      payment.notes,
      80
    );
    printTicketIn80mm(html);
  };

  // Cancel an accidental payment / encaissement
  const handleCancelPayment = (record: CreditDebtRecord, payment: CreditPayment) => {
    const isClient = record.type === 'CLIENT_CREDIT';
    const partyType = isClient ? 'client' : 'fournisseur';
    const actionName = isClient ? 'cet encaissement de dette client' : 'ce règlement de dette fournisseur';
    const balanceEffect = isClient
      ? `La dette du client "${record.partyName}" sera réactivée (+${formatMoney(payment.amount, settings.currency)}).`
      : `La dette envers le fournisseur "${record.partyName}" sera réactivée (+${formatMoney(payment.amount, settings.currency)}).`;

    const cashEffect = payment.paymentMethod === 'ESPECES'
      ? isClient
        ? `\n- La caisse sera ajustée de -${formatMoney(payment.amount, settings.currency)} (Sortie de caisse compensatoire).`
        : `\n- La caisse sera ajustée de +${formatMoney(payment.amount, settings.currency)} (Entrée de caisse compensatoire).`
      : '';

    const confirmMsg = `ATTENTION : Souhaitez-vous annuler ${actionName} effectué par erreur ?\n\n` +
      `• Tiers : ${record.partyName} (${isClient ? 'Client' : 'Fournisseur'})\n` +
      `• Montant : ${formatMoney(payment.amount, settings.currency)}\n` +
      `• N° Reçu : ${payment.receiptNumber || 'N/A'}\n` +
      `• Mode : ${getPaymentMethodLabel(payment.paymentMethod)}\n` +
      `• Date : ${formatDateTime(payment.date)}\n\n` +
      `Conséquences :\n` +
      `- ${balanceEffect}${cashEffect}\n` +
      `- Le versement sera retiré de l'historique.`;

    if (!window.confirm(confirmMsg)) return;

    const reason = window.prompt("Motif de l'annulation :", "Encaissement enregistré par erreur");
    if (reason === null) return; // User clicked Cancel on prompt

    const res = cancelCreditPayment(record.id, payment.id, reason.trim() || "Encaissement enregistré par erreur");
    if (res.success) {
      // If detail modal is open for this record, update its state
      if (selectedRecordDetail && selectedRecordDetail.id === record.id) {
        const updatedRecord = (creditDebtRecords || []).find(r => r.id === record.id);
        if (updatedRecord) {
          setSelectedRecordDetail({
            ...updatedRecord,
            payments: (updatedRecord.payments || []).filter(p => p.id !== payment.id),
            paidAmount: Math.max(0, Math.round(((updatedRecord.paidAmount || 0) - payment.amount) * 100) / 100),
            remainingAmount: Math.round(((updatedRecord.remainingAmount || 0) + payment.amount) * 100) / 100,
            status: 'EN_COURS',
          });
        }
      }
      // If payment modal is open, clear payment message
      if (selectedRecordForPayment && selectedRecordForPayment.id === record.id) {
        setShowPaymentModal(false);
        setPaymentMessage(null);
      }
      alert(res.message || 'Encaissement annulé avec succès.');
    } else {
      alert(res.message || "Erreur lors de l'annulation de l'encaissement.");
    }
  };

  // All payments aggregated for the payments journal
  const allPaymentsWithRecord = useMemo(() => {
    const list: Array<{ record: CreditDebtRecord; payment: CreditPayment }> = [];
    (creditDebtRecords || []).forEach(r => {
      (r.payments || []).forEach(p => {
        list.push({ record: r, payment: p });
      });
    });
    // Sort descending by date
    list.sort((a, b) => new Date(b.payment.date).getTime() - new Date(a.payment.date).getTime());
    return list;
  }, [creditDebtRecords]);

  const filteredJournalPayments = useMemo(() => {
    return allPaymentsWithRecord.filter(item => {
      if (journalFilterType !== 'ALL' && item.record.type !== journalFilterType) return false;
      if (journalSearch.trim()) {
        const q = journalSearch.toLowerCase();
        const party = item.record.partyName.toLowerCase();
        const recNum = (item.payment.receiptNumber || '').toLowerCase();
        const title = item.record.title.toLowerCase();
        const notes = (item.payment.notes || '').toLowerCase();
        return party.includes(q) || recNum.includes(q) || title.includes(q) || notes.includes(q);
      }
      return true;
    });
  }, [allPaymentsWithRecord, journalFilterType, journalSearch]);

  // Print balance summary of records in 80mm thermal roll format
  const handlePrintBalancesSummary80mm = () => {
    const html = generateCreditDebtSummaryReportThermalTicketHtml({
      records: filteredRecords,
      filterType: activeTypeTab,
      settings,
      generatedBy: currentUser?.name || currentUser?.username || 'Gérant',
      widthMm: 80,
    });
    printTicketIn80mm(html);
  };

  return (
    <div className="space-y-5">
      {/* HEADER WITH SUMMARY & FAST ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Landmark className="w-5 h-5 text-indigo-600" />
            Gestion des Crédits Clients & Dettes Fournisseurs
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi complet des créances à recouvrer, dettes fournisseurs et enregistrement des versements partiels ou totaux.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setJournalSearch('');
              setJournalFilterType('ALL');
              setShowPaymentsJournalModal(true);
            }}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Consulter et annuler un encaissement ou versement effectué par erreur"
          >
            <History className="w-4 h-4 text-indigo-600" />
            <span>Journal des Règlements ({allPaymentsWithRecord.length})</span>
          </button>
          <button
            type="button"
            onClick={handlePrintBalancesSummary80mm}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Imprimer le bilan des soldes de crédit et dettes en format ticket 80mm"
          >
            <Printer className="w-4 h-4 text-indigo-600" />
            <span>Imprimer Soldes (80mm)</span>
          </button>
          <button
            onClick={() => handleOpenAddModal('CLIENT_CREDIT')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Crédit Client
          </button>
          <button
            onClick={() => handleOpenAddModal('SUPPLIER_DEBT')}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Dette Fournisseur
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Créances Clients */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Créances Clients Dues
            </span>
            <span className="text-lg font-black text-emerald-700 block mt-0.5">
              {formatMoney(stats.totalClientRemaining, settings.currency)}
            </span>
            <span className="text-[10px] text-slate-400">
              Déjà encaissé : {formatMoney(stats.totalClientPaid, settings.currency)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        {/* Total Dettes Fournisseurs */}
        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Dettes Fournisseurs Dues
            </span>
            <span className="text-lg font-black text-rose-700 block mt-0.5">
              {formatMoney(stats.totalSupplierRemaining, settings.currency)}
            </span>
            <span className="text-[10px] text-slate-400">
              Déjà réglé : {formatMoney(stats.totalSupplierPaid, settings.currency)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Balance Nette */}
        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Balance Nette (Créances - Dettes)
            </span>
            <span className={`text-lg font-black block mt-0.5 ${stats.netBalance >= 0 ? 'text-indigo-700' : 'text-amber-700'}`}>
              {formatMoney(stats.netBalance, settings.currency)}
            </span>
            <span className="text-[10px] text-slate-400">
              {stats.netBalance >= 0 ? 'Solde net positif' : 'Engagements supérieurs'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Dossiers Actifs */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Dossiers en cours
            </span>
            <span className="text-lg font-black text-slate-800 block mt-0.5">
              {stats.pendingCount} <span className="text-xs font-normal text-slate-400">/ {stats.pendingCount + stats.settledCount}</span>
            </span>
            <span className="text-[10px] text-slate-400">
              {stats.settledCount} dossiers entièrement soldés
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FILTER TABS & SEARCH */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTypeTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTypeTab === 'ALL'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous ({creditDebtRecords.length})
            </button>
            <button
              onClick={() => setActiveTypeTab('CLIENT_CREDIT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTypeTab === 'CLIENT_CREDIT'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Crédits Clients ({creditDebtRecords.filter(r => r.type === 'CLIENT_CREDIT').length})
            </button>
            <button
              onClick={() => setActiveTypeTab('SUPPLIER_DEBT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTypeTab === 'SUPPLIER_DEBT'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Dettes Fournisseurs ({creditDebtRecords.filter(r => r.type === 'SUPPLIER_DEBT').length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
            >
              <option value="ALL">Tous les états</option>
              <option value="EN_COURS">En cours (Non soldé)</option>
              <option value="SOLDE">Soldé (100% payé)</option>
              <option value="OVERDUE">En retard d'échéance</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par client, fournisseur, téléphone, motif ou note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* RECORDS LISTING TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Type & Tiers</th>
                <th className="p-3.5">Titre / Objet</th>
                <th className="p-3.5">Date & Échéance</th>
                <th className="p-3.5 text-right">Montant Initial</th>
                <th className="p-3.5 text-right">Déjà Versé</th>
                <th className="p-3.5 text-right">Reste Dû</th>
                <th className="p-3.5 text-center">Progression</th>
                <th className="p-3.5">Statut</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => {
                  const isClient = record.type === 'CLIENT_CREDIT';
                  const isSettled = record.status === 'SOLDE';
                  const percentPaid = record.initialAmount > 0
                    ? Math.min(100, Math.round((record.paidAmount / record.initialAmount) * 100))
                    : 100;
                  const isOverdue = !isSettled && record.dueDate && record.dueDate < new Date().toISOString().split('T')[0];

                  return (
                    <tr
                      key={record.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSettled ? 'bg-slate-50/50' : isOverdue ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Tiers */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                              isClient
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {isClient ? <Users className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{record.partyName}</p>
                            <span className="text-[10px] text-slate-400">
                              {isClient ? 'Client' : 'Fournisseur'}
                              {record.partyPhone && ` • ${record.partyPhone}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Titre */}
                      <td className="p-3.5">
                        <p className="font-semibold text-slate-800">{record.title}</p>
                        {record.notes && (
                          <p className="text-[10px] text-slate-500 truncate max-w-xs">{record.notes}</p>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="p-3.5">
                        <p className="text-slate-700">{formatDate(record.createdAt)}</p>
                        {record.dueDate && (
                          <p className={`text-[10px] font-medium ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                            Échéance: {formatDate(record.dueDate)} {isOverdue && '(Retard)'}
                          </p>
                        )}
                      </td>

                      {/* Montant Initial */}
                      <td className="p-3.5 text-right font-medium text-slate-600">
                        {formatMoney(record.initialAmount, settings.currency)}
                      </td>

                      {/* Déjà Versé */}
                      <td className="p-3.5 text-right font-semibold text-emerald-700">
                        {formatMoney(record.paidAmount, settings.currency)}
                      </td>

                      {/* Reste Dû */}
                      <td className="p-3.5 text-right font-black text-sm">
                        <span className={isSettled ? 'text-slate-400' : isClient ? 'text-emerald-800' : 'text-rose-800'}>
                          {formatMoney(record.remainingAmount, settings.currency)}
                        </span>
                      </td>

                      {/* Progression */}
                      <td className="p-3.5 text-center">
                        <div className="w-24 mx-auto space-y-1">
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isSettled ? 'bg-emerald-500' : isClient ? 'bg-emerald-600' : 'bg-rose-600'
                              }`}
                              style={{ width: `${percentPaid}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold">{percentPaid}%</span>
                        </div>
                      </td>

                      {/* Statut */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSettled
                              ? 'bg-emerald-100 text-emerald-800'
                              : isOverdue
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isSettled ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Soldé
                            </>
                          ) : isOverdue ? (
                            <>
                              <AlertTriangle className="w-3 h-3" /> En retard
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" /> En cours
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isSettled && (
                            <button
                              onClick={() => handleOpenPayment(record)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                              title="Enregistrer un versement"
                            >
                              <Banknote className="w-3 h-3" />
                              Régler
                            </button>
                          )}
                          <button
                            onClick={() => printDebtReceipt(record)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                            title={
                              record.type === 'CLIENT_CREDIT'
                                ? 'Imprimer le reçu de créance & engagement'
                                : 'Imprimer la reconnaissance de dette (pour le créancier)'
                            }
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRecordDetail(record);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg"
                            title="Historique des versements & détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Supprimer définitivement le dossier "${record.title}" ?`)) {
                                deleteCreditDebtRecord(record.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                    Aucun dossier de crédit ou dette trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD NEW CREDIT / DEBT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveRecord}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in"
          >
            <div className={`p-4 text-white flex items-center justify-between ${newRecordType === 'CLIENT_CREDIT' ? 'bg-emerald-700' : 'bg-rose-700'}`}>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {newRecordType === 'CLIENT_CREDIT' ? 'Nouveau Crédit Client (Créance)' : 'Nouvelle Dette Fournisseur'}
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
              {/* Type Switch */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catégorie du dossier</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRecordType('CLIENT_CREDIT')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition-all ${
                      newRecordType === 'CLIENT_CREDIT'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    Crédit Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRecordType('SUPPLIER_DEBT')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition-all ${
                      newRecordType === 'SUPPLIER_DEBT'
                        ? 'border-rose-600 bg-rose-50 text-rose-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    Dette Fournisseur
                  </button>
                </div>
              </div>

              {/* Tiers selection */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {newRecordType === 'CLIENT_CREDIT' ? 'Client du carnet' : 'Fournisseur enregistré'}
                </label>
                <select
                  value={selectedPartyId}
                  onChange={(e) => {
                    setSelectedPartyId(e.target.value);
                    if (e.target.value) {
                      setCustomPartyName('');
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Ou saisir un nouveau nom ci-dessous --</option>
                  {newRecordType === 'CLIENT_CREDIT'
                    ? (customers || []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone || 'Pas de numéro'})
                        </option>
                      ))
                    : (suppliers || []).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.companyName} ({s.contactName || s.phone})
                        </option>
                      ))}
                </select>
              </div>

              {/* Or manual name */}
              {!selectedPartyId && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Nom / Société *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Mamadou Diallo"
                      value={customPartyName}
                      onChange={(e) => setCustomPartyName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Téléphone</label>
                    <input
                      type="tel"
                      placeholder="Ex: +223 70 00 00 00"
                      value={customPartyPhone}
                      onChange={(e) => setCustomPartyPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Title & Amount */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Motif / Titre *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Achat marchandises, Reste facture..."
                    value={recordTitle}
                    onChange={(e) => setRecordTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Montant ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Ex: 50000"
                    value={recordAmount}
                    onChange={(e) => setRecordAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Due date */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Date d'échéance de paiement (optionnel)
                </label>
                <input
                  type="date"
                  value={recordDueDate}
                  onChange={(e) => setRecordDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes / Détails complémentaires</label>
                <textarea
                  rows={2}
                  placeholder="Informations supplémentaires, accord convenu..."
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white font-bold rounded-xl shadow-xs ${
                    newRecordType === 'CLIENT_CREDIT'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Enregistrer le Dossier
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: RECORD PAYMENT (VERSEMENT) */}
      {showPaymentModal && selectedRecordForPayment && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSavePayment}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in"
          >
            <div className="p-4 bg-indigo-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-400" />
                Enregistrer un Versement
              </h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {paymentMessage?.type === 'success' ? (
                <div className="space-y-4 text-center py-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Règlement enregistré avec succès !</h4>
                    <p className="text-xs text-slate-500 mt-1">{paymentMessage.text}</p>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2 text-left">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tiers concerné :</span>
                      <strong className="text-slate-800">{selectedRecordForPayment.partyName}</strong>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                      <span className="text-slate-600">Nouveau solde restant dû :</span>
                      <strong className={`text-sm font-black ${paymentMessage.newRemaining && paymentMessage.newRemaining > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {formatMoney(paymentMessage.newRemaining || 0, settings.currency)}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    {paymentMessage.receipt && (
                      <button
                        type="button"
                        onClick={() => {
                          const rec = paymentMessage.updatedRecord || selectedRecordForPayment;
                          printPaymentReceipt(rec, 0);
                        }}
                        className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                        Imprimer le Reçu de ce Versement
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const rec = paymentMessage.updatedRecord || selectedRecordForPayment;
                        printDebtReceipt(rec);
                      }}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      {selectedRecordForPayment.type === 'SUPPLIER_DEBT'
                        ? 'Imprimer la Reconnaissance de Dette (pour le créancier)'
                        : 'Imprimer l\'État de Créance & Engagement'}
                    </button>

                    {paymentMessage.receipt && (
                      <button
                        type="button"
                        onClick={() => {
                          const rec = paymentMessage.updatedRecord || selectedRecordForPayment;
                          handleCancelPayment(rec, paymentMessage.receipt!);
                        }}
                        className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        title="Annuler ce versement enregistré par erreur"
                      >
                        <RotateCcw className="w-4 h-4 text-rose-600" />
                        Annuler ce versement (enregistré par erreur)
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowPaymentModal(false);
                        setPaymentMessage(null);
                      }}
                      className="w-full py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Fermer la fenêtre
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Record Summary Box */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex justify-between items-center font-bold text-slate-800">
                      <span>{selectedRecordForPayment.partyName}</span>
                      <span className="text-[10px] uppercase px-1.5 py-0.5 bg-slate-200 rounded">
                        {selectedRecordForPayment.type === 'CLIENT_CREDIT' ? 'Crédit Client' : 'Dette Fournisseur'}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">{selectedRecordForPayment.title}</p>
                    <div className="pt-1 flex items-center justify-between text-xs">
                      <span className="text-slate-600">Reste à payer :</span>
                      <strong className="text-sm font-black text-indigo-900">
                        {formatMoney(selectedRecordForPayment.remainingAmount, settings.currency)}
                      </strong>
                    </div>
                  </div>

                  {paymentMessage && (
                    <div className="p-3 rounded-xl flex items-center gap-2 bg-rose-50 text-rose-800 border border-rose-200">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{paymentMessage.text}</span>
                    </div>
                  )}

                  {/* Amount input */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Montant du versement ({settings.currency}) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedRecordForPayment.remainingAmount}
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-base font-black text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <div className="flex gap-1.5 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(String(selectedRecordForPayment.remainingAmount))}
                        className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold hover:bg-indigo-100 cursor-pointer"
                      >
                        Tout solder ({formatMoney(selectedRecordForPayment.remainingAmount, '')})
                      </button>
                      {selectedRecordForPayment.remainingAmount > 10000 && (
                        <button
                          type="button"
                          onClick={() => setPaymentAmount(String(Math.round(selectedRecordForPayment.remainingAmount / 2)))}
                          className="px-2 py-0.5 bg-slate-50 text-slate-700 border border-slate-200 rounded text-[10px] font-semibold hover:bg-slate-100 cursor-pointer"
                        >
                          50% ({formatMoney(Math.round(selectedRecordForPayment.remainingAmount / 2), '')})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Mode de règlement</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'ESPECES', label: 'Espèces (Caisse)', icon: Banknote },
                        { id: 'MOBILE_MONEY', label: 'Orange / Wave', icon: Smartphone },
                        { id: 'VIREMENT', label: 'Virement bancaire', icon: CreditCard },
                        { id: 'CHEQUE', label: 'Chèque', icon: Building },
                      ].map((m) => {
                        const Icon = m.icon;
                        const isSel = paymentMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                            className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                              isSel
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            <span className="text-[11px] truncate">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Note de versement (optionnel)</label>
                    <input
                      type="text"
                      placeholder="Ex: Acompte 1er versement, N° de transaction..."
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Action */}
                  <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      Valider le Versement
                    </button>
                  </div>
                </>
              )}
            </div>
          </form>
        </div>
      )}

      {/* MODAL: DETAIL & PAYMENT HISTORY */}
      {showDetailModal && selectedRecordDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Fiche de Suivi : {selectedRecordDetail.partyName}
              </h3>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Main Information */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-500 block">Type de dossier</span>
                  <strong className="text-slate-800">
                    {selectedRecordDetail.type === 'CLIENT_CREDIT' ? 'Crédit Client (Créance)' : 'Dette Fournisseur'}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Date d'ouverture</span>
                  <strong className="text-slate-800">{formatDate(selectedRecordDetail.createdAt)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Montant Initial</span>
                  <strong className="text-slate-800">
                    {formatMoney(selectedRecordDetail.initialAmount, settings.currency)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Solde Restant Dû</span>
                  <strong className={`text-sm ${selectedRecordDetail.remainingAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {formatMoney(selectedRecordDetail.remainingAmount, settings.currency)}
                  </strong>
                </div>
              </div>

              {/* Payments History */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2 flex items-center justify-between">
                  <span>Historique des Versements ({selectedRecordDetail.payments.length})</span>
                  {selectedRecordDetail.remainingAmount > 0 && (
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        handleOpenPayment(selectedRecordDetail);
                      }}
                      className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold"
                    >
                      + Nouveau Versement
                    </button>
                  )}
                </h4>

                {selectedRecordDetail.payments.length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {selectedRecordDetail.payments.map((p, idx) => (
                      <div key={p.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-emerald-700 text-xs">
                              +{formatMoney(p.amount, settings.currency)}
                            </strong>
                            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600">
                              {getPaymentMethodLabel(p.paymentMethod)}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {formatDateTime(p.date)} {p.receivedBy && `• Encaissé par ${p.receivedBy}`}
                          </p>
                          {p.notes && <p className="text-[10px] text-slate-600 italic">{p.notes}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => printPaymentReceipt(selectedRecordDetail, idx)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Imprimer le reçu de ce versement"
                          >
                            <Printer className="w-3 h-3" /> Reçu
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelPayment(selectedRecordDetail, p)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Annuler ce versement enregistré par erreur (réactive la dette)"
                          >
                            <RotateCcw className="w-3 h-3 text-rose-600" /> Annuler
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Aucun versement enregistré pour le moment.
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => printDebtReceipt(selectedRecordDetail)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {selectedRecordDetail.type === 'SUPPLIER_DEBT'
                    ? 'Imprimer la Reconnaissance de Dette (pour le créancier)'
                    : 'Imprimer le Reçu de Créance Client'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUCCESS PROMPT AFTER CREATING NEW RECORD */}
      {showCreatedSuccessModal && newlyCreatedRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                Dossier Enregistré avec Succès
              </h3>
              <button
                type="button"
                onClick={() => setShowCreatedSuccessModal(false)}
                className="text-emerald-200 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-slate-800">
                  {newlyCreatedRecord.type === 'SUPPLIER_DEBT'
                    ? 'Dette Fournisseur enregistrée !'
                    : 'Crédit Client accordé !'}
                </h4>
                <p className="text-slate-500">
                  Le dossier a été synchronisé avec la fiche du tiers et la comptabilité.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    {newlyCreatedRecord.type === 'SUPPLIER_DEBT' ? 'Créancier (Fournisseur) :' : 'Client (Débiteur) :'}
                  </span>
                  <strong className="text-slate-800 font-bold">{newlyCreatedRecord.partyName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Montant total :</span>
                  <strong className="text-indigo-900 font-black text-sm">
                    {formatMoney(newlyCreatedRecord.initialAmount, settings.currency)}
                  </strong>
                </div>
                {newlyCreatedRecord.dueDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date d'échéance :</span>
                    <strong className="text-rose-700">{formatDate(newlyCreatedRecord.dueDate)}</strong>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    printDebtReceipt(newlyCreatedRecord);
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  {newlyCreatedRecord.type === 'SUPPLIER_DEBT'
                    ? 'Imprimer le Reçu de Dette (à donner au Créancier)'
                    : 'Imprimer le Reçu de Créance (pour le Client)'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowCreatedSuccessModal(false)}
                  className="w-full py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Terminer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PAYMENTS JOURNAL & CANCELLATION */}
      {showPaymentsJournalModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    Journal des Règlements & Encaissements
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs font-bold">
                      {filteredJournalPayments.length} versement(s)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Consultez l'historique complet des versements et annulez tout encaissement ou règlement effectué par erreur.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentsJournalModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Type Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setJournalFilterType('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    journalFilterType === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tous ({allPaymentsWithRecord.length})
                </button>
                <button
                  type="button"
                  onClick={() => setJournalFilterType('CLIENT_CREDIT')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    journalFilterType === 'CLIENT_CREDIT'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  Encaissements Clients
                </button>
                <button
                  type="button"
                  onClick={() => setJournalFilterType('SUPPLIER_DEBT')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    journalFilterType === 'SUPPLIER_DEBT'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  Règlements Fournisseurs
                </button>
              </div>

              {/* Search input */}
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  placeholder="Rechercher par tiers, n° reçu, note..."
                  value={journalSearch}
                  onChange={(e) => setJournalSearch(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                {journalSearch && (
                  <button
                    type="button"
                    onClick={() => setJournalSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Payments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredJournalPayments.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {filteredJournalPayments.map(({ record, payment }) => {
                    const isClient = record.type === 'CLIENT_CREDIT';
                    return (
                      <div
                        key={payment.id}
                        className="p-3.5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase tracking-wider ${
                                isClient
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isClient ? 'Encaissement Client' : 'Règlement Fournisseur'}
                            </span>
                            <strong className="text-slate-900 text-sm font-black truncate">
                              {record.partyName}
                            </strong>
                            <span className="text-[11px] font-mono font-bold text-slate-500">
                              {payment.receiptNumber || 'N° Reçu non renseigné'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {formatDateTime(payment.date)}
                            </span>
                            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-semibold text-slate-600">
                              {getPaymentMethodLabel(payment.paymentMethod)}
                            </span>
                            {payment.receivedBy && (
                              <span className="text-[11px] text-slate-600">
                                Encaissé par : <strong>{payment.receivedBy}</strong>
                              </span>
                            )}
                            <span className="text-slate-400 text-[11px] italic truncate">
                              Dossier : {record.title}
                            </span>
                          </div>

                          {payment.notes && (
                            <p className="text-[11px] text-slate-600 italic bg-slate-100/70 px-2 py-1 rounded-lg">
                              Note : {payment.notes}
                            </p>
                          )}
                        </div>

                        {/* Amount & Actions */}
                        <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <div className="text-left sm:text-right">
                            <span
                              className={`text-base font-black ${
                                isClient ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {isClient ? '+' : '-'}{formatMoney(payment.amount, settings.currency)}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              Solde restant du dossier : {formatMoney(record.remainingAmount, settings.currency)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => printSpecificPaymentReceipt(record, payment)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              title="Imprimer le ticket de ce versement (80mm)"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Ticket</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelPayment(record, payment)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              title="Annuler ce versement effectué par erreur (réactive la dette)"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                              <span>Annuler</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-sm text-slate-600">Aucun versement trouvé</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {journalSearch
                      ? 'Aucun règlement ne correspond à votre recherche.'
                      : 'Aucun versement n\'a encore été enregistré.'}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                L'annulation d'un encaissement réactive automatiquement le montant sur la dette du tiers et ajuste la caisse.
              </span>
              <button
                type="button"
                onClick={() => setShowPaymentsJournalModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
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
