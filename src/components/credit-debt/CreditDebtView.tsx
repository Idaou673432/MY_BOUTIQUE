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
  Receipt
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CreditDebtRecord, CreditPayment, PaymentMethod, Customer, Supplier } from '../../types';
import { formatMoney, formatDate, formatDateTime, getPaymentMethodLabel } from '../../utils/formatters';

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

  // Print official debt acknowledgment receipt (Reconnaissance de dette / Reçu de créance)
  const printDebtReceipt = (record: CreditDebtRecord) => {
    const isClientCredit = record.type === 'CLIENT_CREDIT';
    const docTitle = isClientCredit
      ? 'REÇU DE CRÉANCE & ENGAGEMENT DE PAIEMENT'
      : 'RECONNAISSANCE DE DETTE & BON D\'ENGAGEMENT';
    const docSubtitle = isClientCredit
      ? 'Document officiel délivré au client (créance)'
      : 'Document officiel remis au fournisseur (créancier)';
    const creditorName = isClientCredit ? (settings.shopName || 'COMMERCE GESTION') : record.partyName;
    const creditorPhone = isClientCredit ? (settings.phone || '—') : (record.partyPhone || '—');
    const debtorName = isClientCredit ? record.partyName : (settings.shopName || 'COMMERCE GESTION');
    const debtorPhone = isClientCredit ? (record.partyPhone || '—') : (settings.phone || '—');
    const isSettled = record.status === 'SOLDE' || record.remainingAmount <= 0.001;

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${docTitle} - CD-${record.id.slice(-6).toUpperCase()}</title>
        <style>
          @page { size: auto; margin: 12mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            max-width: 550px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.4;
            font-size: 12px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .shop-name {
            font-size: 18px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .shop-meta {
            font-size: 11px;
            color: #475569;
            margin-top: 2px;
          }
          .doc-badge {
            display: inline-block;
            margin-top: 8px;
            padding: 5px 12px;
            background: #0f172a;
            color: #ffffff;
            font-size: 12px;
            font-weight: 800;
            border-radius: 6px;
            letter-spacing: 0.5px;
          }
          .doc-subtitle {
            font-size: 11px;
            color: #64748b;
            margin-top: 4px;
            font-style: italic;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin: 14px 0;
            padding: 10px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
          }
          .meta-item strong {
            display: block;
            color: #0f172a;
            font-size: 12px;
          }
          .parties-box {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 14px;
          }
          .party-card {
            border: 1px solid #cbd5e1;
            padding: 9px;
            border-radius: 8px;
          }
          .party-title {
            font-weight: 800;
            text-transform: uppercase;
            font-size: 10px;
            color: #475569;
            margin-bottom: 3px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 3px;
          }
          .amount-box {
            border: 2px solid #0f172a;
            background: #f1f5f9;
            border-radius: 8px;
            padding: 12px;
            margin: 14px 0;
          }
          .amount-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            margin: 3px 0;
          }
          .due-highlight {
            font-size: 16px;
            font-weight: 900;
            color: ${isSettled ? '#059669' : '#dc2626'};
            border-top: 1px solid #cbd5e1;
            padding-top: 6px;
            margin-top: 6px;
          }
          .legal-statement {
            font-size: 11px;
            color: #334155;
            background: #ffffff;
            border-left: 3px solid #0f172a;
            padding: 8px 10px;
            margin: 12px 0;
            line-height: 1.45;
          }
          .payments-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin: 12px 0;
          }
          .payments-table th {
            background: #e2e8f0;
            text-align: left;
            padding: 5px;
            border: 1px solid #cbd5e1;
          }
          .payments-table td {
            padding: 5px;
            border: 1px solid #cbd5e1;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-top: 22px;
            padding-top: 8px;
          }
          .sig-box {
            border: 1px dashed #94a3b8;
            border-radius: 6px;
            padding: 8px;
            text-align: center;
            min-height: 80px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .sig-title {
            font-weight: bold;
            font-size: 10px;
            color: #1e293b;
          }
          .sig-hint {
            font-size: 9px;
            color: #94a3b8;
          }
          .sig-space {
            height: 40px;
          }
          .footer-note {
            text-align: center;
            font-size: 9px;
            color: #64748b;
            margin-top: 20px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 6px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">${settings.shopName || 'COMMERCE GESTION'}</div>
          <div class="shop-meta">${settings.address ? settings.address + ' • ' : ''}Tél: ${settings.phone || '—'}</div>
          <div class="doc-badge">${docTitle}</div>
          <div class="doc-subtitle">${docSubtitle}</div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <span style="color:#64748b; font-size:10px;">N° DOSSIER :</span>
            <strong>CD-${record.id.slice(-6).toUpperCase()}</strong>
          </div>
          <div class="meta-item">
            <span style="color:#64748b; font-size:10px;">DATE D'ÉMISSION :</span>
            <strong>${formatDate(record.createdAt || record.date)}</strong>
          </div>
          <div class="meta-item">
            <span style="color:#64748b; font-size:10px;">DATE D'ÉCHÉANCE :</span>
            <strong style="color: ${isSettled ? '#059669' : '#b91c1c'};">${record.dueDate ? formatDate(record.dueDate) : 'Non définie'}</strong>
          </div>
          <div class="meta-item">
            <span style="color:#64748b; font-size:10px;">STATUT :</span>
            <strong style="color: ${isSettled ? '#059669' : '#d97706'};">${isSettled ? 'SOLDÉ (PAYÉ)' : 'EN COURS'}</strong>
          </div>
        </div>

        <div class="parties-box">
          <div class="party-card">
            <div class="party-title">CRÉANCIER (Bénéficiaire)</div>
            <div style="font-weight:bold; font-size:12px; color:#0f172a;">${creditorName}</div>
            <div>Tél : ${creditorPhone}</div>
          </div>
          <div class="party-card">
            <div class="party-title">DÉBITEUR (Engagé à payer)</div>
            <div style="font-weight:bold; font-size:12px; color:#0f172a;">${debtorName}</div>
            <div>Tél : ${debtorPhone}</div>
            ${record.partyAddress ? `<div>Adresse : ${record.partyAddress}</div>` : ''}
          </div>
        </div>

        <div style="margin: 8px 0; font-size: 11px;">
          <strong>Objet / Motif :</strong> ${record.title}
          ${record.notes ? `<div style="font-style:italic; color:#475569; margin-top:2px;">${record.notes}</div>` : ''}
        </div>

        <div class="amount-box">
          <div class="amount-row">
            <span>Montant Initial :</span>
            <strong style="font-size:13px;">${formatMoney(record.initialAmount, settings.currency)}</strong>
          </div>
          <div class="amount-row">
            <span>Montant Déjà Réglé :</span>
            <strong style="color:#059669; font-size:13px;">${formatMoney(record.paidAmount, settings.currency)}</strong>
          </div>
          <div class="amount-row due-highlight">
            <span>SOLDE RESTANT DÛ :</span>
            <span>${formatMoney(record.remainingAmount, settings.currency)}</span>
          </div>
        </div>

        ${record.payments && record.payments.length > 0 ? `
          <div style="font-weight:bold; font-size:10px; margin-bottom:3px; text-transform:uppercase; color:#475569;">
            Détail des versements effectués (${record.payments.length}) :
          </div>
          <table class="payments-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Reçu N°</th>
                <th>Mode</th>
                <th style="text-align:right;">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${record.payments.map(p => `
                <tr>
                  <td>${formatDateTime(p.date)}</td>
                  <td>${p.receiptNumber || 'REC'}</td>
                  <td>${getPaymentMethodLabel(p.paymentMethod)}</td>
                  <td style="text-align:right; font-weight:bold; color:#059669;">${formatMoney(p.amount, settings.currency)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="legal-statement">
          <strong>ENGAGEMENT FORMEL :</strong> Le Débiteur désigné reconnaît expressément et valablement devoir au Créancier 
          la somme restante de <strong>${formatMoney(record.remainingAmount, settings.currency)}</strong>. 
          ${isSettled 
            ? 'Ce dossier est intégralement SOLDÉ. Les parties sont quittes de toute obligation financière relative à cette créance.' 
            : `Le Débiteur s'engage solennellement à rembourser la totalité du solde au plus tard le ${record.dueDate ? formatDate(record.dueDate) : 'dans les délais convenus'}.`
          }
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-title">Signature du Débiteur</div>
            <div class="sig-hint">"Lu et approuvé - Bon pour accord"</div>
            <div class="sig-space"></div>
          </div>
          <div class="sig-box">
            <div class="sig-title">Signature & Cachet du Créancier</div>
            <div class="sig-hint">"Pour accord / Accusé de réception"</div>
            <div class="sig-space"></div>
          </div>
        </div>

        <div class="footer-note">
          Document édité le ${formatDateTime(new Date().toISOString())} • Établi pour servir et valoir ce que de droit.
        </div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=650,height=750');
    if (printWin) {
      printWin.document.write(receiptHtml);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
      }, 350);
    }
  };

  // Print payment receipt
  const printPaymentReceipt = (record: CreditDebtRecord, paymentIndex: number) => {
    const payment = record.payments[paymentIndex];
    if (!payment) return;

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reçu de Versement - ${payment.receiptNumber || 'REC'}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 20px; color: #111; max-width: 400px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 1px dashed #444; padding-bottom: 10px; margin-bottom: 15px; }
          .shop-name { font-size: 16px; font-weight: bold; }
          .title { font-size: 13px; font-weight: bold; margin: 10px 0 5px; text-transform: uppercase; }
          .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 12px; }
          .total-box { border-top: 1px dashed #444; border-bottom: 1px dashed #444; padding: 8px 0; margin: 12px 0; }
          .footer { text-align: center; font-size: 10px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">${settings.shopName || 'BOUTIQUE'}</div>
          <div>${settings.address || ''}</div>
          <div>Tél: ${settings.phone || ''}</div>
          <div class="title">REÇU DE RÈGLEMENT</div>
          <div>N°: ${payment.receiptNumber || 'REC-001'}</div>
          <div>Date: ${formatDateTime(payment.date)}</div>
        </div>
        <div class="row"><span>Tiers:</span> <strong>${record.partyName}</strong></div>
        <div class="row"><span>Type:</span> <span>${record.type === 'CLIENT_CREDIT' ? 'Règlement Crédit Client' : 'Paiement Dette Fournisseur'}</span></div>
        <div class="row"><span>Objet:</span> <span>${record.title}</span></div>
        <div class="row"><span>Mode de règlement:</span> <strong>${getPaymentMethodLabel(payment.paymentMethod)}</strong></div>
        ${payment.receivedBy ? `<div class="row"><span>Encaissé par:</span> <span>${payment.receivedBy}</span></div>` : ''}
        
        <div class="total-box">
          <div class="row" style="font-size: 14px; font-weight: bold;">
            <span>MONTANT VERSÉ:</span>
            <span>${formatMoney(payment.amount, settings.currency)}</span>
          </div>
          <div class="row" style="font-size: 11px; margin-top: 4px;">
            <span>Solde restant dû:</span>
            <span>${formatMoney(record.remainingAmount, settings.currency)}</span>
          </div>
        </div>

        ${payment.notes ? `<div style="font-size: 11px; font-style: italic; margin-bottom: 10px;">Note: ${payment.notes}</div>` : ''}

        <div class="footer">
          Merci pour votre confiance !<br>
          Ce reçu fait foi de paiement.
        </div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=450,height=600');
    if (printWin) {
      printWin.document.write(receiptHtml);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
      }, 300);
    }
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

        <div className="flex items-center gap-2">
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
                        <button
                          onClick={() => printPaymentReceipt(selectedRecordDetail, idx)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold flex items-center gap-1"
                          title="Imprimer le reçu de ce versement"
                        >
                          <Printer className="w-3 h-3" /> Reçu
                        </button>
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
    </div>
  );
};
