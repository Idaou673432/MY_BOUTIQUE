import React, { useRef } from 'react';
import { Printer, X, Calendar, DollarSign, ShoppingBag, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { Sale, StoreSettings } from '../../types';
import { formatMoney, formatDateTime, formatTimeOnly, getPaymentMethodLabel } from '../../utils/formatters';

interface DailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateKey: string; // YYYY-MM-DD
  dateLabel: string;
  sales: Sale[];
  settings: StoreSettings;
  isVendeur?: boolean;
}

export const DailyReportModal: React.FC<DailyReportModalProps> = ({
  isOpen,
  onClose,
  dateKey,
  dateLabel,
  sales,
  settings,
  isVendeur = false,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const validSales = sales.filter((s) => s.status === 'COMPLETEE');
  const cancelledSales = sales.filter((s) => s.status === 'ANNULEE');

  const totalRevenue = validSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalMargin = validSales.reduce((sum, s) => sum + s.totalMargin, 0);
  const totalItemsSold = validSales.reduce((sum, s) => sum + s.items.reduce((acc, it) => acc + it.quantity, 0), 0);
  const salesCount = validSales.length;
  const avgTicket = salesCount > 0 ? Math.round(totalRevenue / salesCount) : 0;

  // Breakdown by payment method
  const cashTotal = validSales
    .filter((s) => s.paymentMethod === 'ESPECES')
    .reduce((sum, s) => sum + s.totalAmount, 0);
  const mobileTotal = validSales
    .filter((s) => s.paymentMethod === 'MOBILE_MONEY')
    .reduce((sum, s) => sum + s.totalAmount, 0);
  const cardTotal = validSales
    .filter((s) => s.paymentMethod === 'CARTE_BANCAIRE')
    .reduce((sum, s) => sum + s.totalAmount, 0);
  const creditTotal = validSales
    .filter((s) => s.paymentMethod === 'CREDIT')
    .reduce((sum, s) => sum + s.totalAmount, 0);

  // Products aggregation
  const productMap = new Map<string, { name: string; quantity: number; total: number }>();
  validSales.forEach((s) => {
    s.items.forEach((it) => {
      const existing = productMap.get(it.productId) || { name: it.productName, quantity: 0, total: 0 };
      existing.quantity += it.quantity;
      existing.total += it.total;
      productMap.set(it.productId, existing);
    });
  });
  const topProducts = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-sm">Rapport Journalier des Ventes</h3>
              <p className="text-xs text-slate-400">{dateLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer le Rapport</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div ref={printRef} className="p-6 space-y-6 overflow-y-auto text-slate-800 printable-report text-xs">
          {/* Business Header */}
          <div className="text-center pb-4 border-b border-slate-200">
            <h1 className="text-lg font-black text-slate-900 uppercase tracking-wide">
              {settings.storeName || 'Boutique Manager Pro'}
            </h1>
            {settings.address && <p className="text-slate-500 text-[11px]">{settings.address}</p>}
            {settings.phone && <p className="text-slate-500 text-[11px]">Tél : {settings.phone}</p>}
            <div className="mt-3 inline-block px-3 py-1 bg-slate-100 rounded-full text-slate-900 font-black text-xs uppercase tracking-wider">
              Journal des Ventes du {dateLabel}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Édité le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
              <span className="text-[10px] text-indigo-700 font-bold uppercase block">Chiffre d'Affaires</span>
              <strong className="text-base font-black text-indigo-950">
                {formatMoney(totalRevenue, settings.currency)}
              </strong>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Nombre de Ventes</span>
              <strong className="text-base font-black text-slate-900">
                {salesCount} {salesCount > 1 ? 'tickets' : 'ticket'}
              </strong>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Panier Moyen</span>
              <strong className="text-base font-black text-slate-900">
                {formatMoney(avgTicket, settings.currency)}
              </strong>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
              <span className="text-[10px] text-emerald-700 font-bold uppercase block">Articles Vendus</span>
              <strong className="text-base font-black text-emerald-950">
                {totalItemsSold} unités
              </strong>
            </div>
          </div>

          {!isVendeur && totalMargin > 0 && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-900">Marge Brute Réalisée ce Jour :</span>
                <span className="text-xs text-emerald-700 ml-2">
                  (Taux de marge : {totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 100) : 0}%)
                </span>
              </div>
              <strong className="text-base font-black text-emerald-700">
                +{formatMoney(totalMargin, settings.currency)}
              </strong>
            </div>
          )}

          {/* Payment Breakdown */}
          <div className="space-y-2">
            <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
              Répartition par Mode d'Encaissement
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-1 text-slate-500 text-[10px] font-semibold">
                  <Banknote className="w-3 h-3 text-emerald-600" />
                  <span>Espèces</span>
                </div>
                <div className="font-black text-xs text-slate-900 mt-1">
                  {formatMoney(cashTotal, settings.currency)}
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-1 text-slate-500 text-[10px] font-semibold">
                  <Smartphone className="w-3 h-3 text-amber-600" />
                  <span>Mobile Money</span>
                </div>
                <div className="font-black text-xs text-slate-900 mt-1">
                  {formatMoney(mobileTotal, settings.currency)}
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-1 text-slate-500 text-[10px] font-semibold">
                  <CreditCard className="w-3 h-3 text-blue-600" />
                  <span>Carte Bancaire</span>
                </div>
                <div className="font-black text-xs text-slate-900 mt-1">
                  {formatMoney(cardTotal, settings.currency)}
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-1 text-slate-500 text-[10px] font-semibold">
                  <span>À Crédit</span>
                </div>
                <div className="font-black text-xs text-rose-700 mt-1">
                  {formatMoney(creditTotal, settings.currency)}
                </div>
              </div>
            </div>
          </div>

          {/* Top Products of the Day */}
          {topProducts.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
                Articles Vendus dans la Journée ({topProducts.length} références)
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[9px] font-bold">
                    <tr>
                      <th className="p-2">Désignation</th>
                      <th className="p-2 text-center">Quantité</th>
                      <th className="p-2 text-right">Chiffre d'Affaires</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topProducts.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-medium text-slate-800">{p.name}</td>
                        <td className="p-2 text-center font-bold">{p.quantity}</td>
                        <td className="p-2 text-right font-black text-slate-900">
                          {formatMoney(p.total, settings.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sales List Table */}
          <div className="space-y-2">
            <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider">
              Détail des Factures & Tickets de la Journée ({validSales.length})
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[9px] font-bold">
                  <tr>
                    <th className="p-2">Heure</th>
                    <th className="p-2">N° Facture</th>
                    <th className="p-2">Client</th>
                    <th className="p-2">Règlement</th>
                    <th className="p-2">Caissier</th>
                    <th className="p-2 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {validSales.map((s) => (
                    <tr key={s.id}>
                      <td className="p-2 font-mono text-[10px] text-slate-500">{formatTimeOnly(s.date)}</td>
                      <td className="p-2 font-mono font-bold text-indigo-700">{s.invoiceNumber}</td>
                      <td className="p-2 text-slate-700">{s.customerName || 'Comptoir'}</td>
                      <td className="p-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium">
                          {getPaymentMethodLabel(s.paymentMethod)}
                        </span>
                      </td>
                      <td className="p-2 text-slate-600 text-[10px]">{s.userName}</td>
                      <td className="p-2 text-right font-black text-slate-900">
                        {formatMoney(s.totalAmount, settings.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {cancelledSales.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
              <span className="font-bold block">⚠️ {cancelledSales.length} vente(s) annulée(s) ce jour :</span>
              <p className="text-[10px] text-rose-700 mt-0.5">
                Total des ventes annulées : {formatMoney(cancelledSales.reduce((acc, s) => acc + s.totalAmount, 0), settings.currency)}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
