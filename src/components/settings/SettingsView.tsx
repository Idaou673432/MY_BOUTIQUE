import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  DollarSign,
  Receipt,
  Shield,
  Save,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Cloud,
  RefreshCw,
  Database,
  Building2,
  FileText,
  CreditCard,
  Smartphone,
  Tag,
  Sparkles,
  Layers,
  Check,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ConfirmModal } from '../common/ConfirmModal';
import { BUSINESS_PRESETS, BusinessPreset } from '../../data/industryPresets';
import { BusinessType, StoreSettings } from '../../types';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    loadBusinessPreset,
    exportFullDatabase,
    importFullDatabase,
    resetAllDataToZero,
    resetToDemoData,
    users,
    currentUser,
    switchUser,
    isCloudSynced,
    isSyncing,
    syncToCloudNow,
  } = useStore();

  const [showZeroModal, setShowZeroModal] = useState(false);

  const [formData, setFormData] = useState<StoreSettings>({
    ...settings,
    storeName: settings.storeName || (settings as any).shopName || 'Boutique & Négoce Pro',
    storeTagline: settings.storeTagline || 'Commerce Général & Vente au détail',
    address: settings.address || (settings as any).shopAddress || '',
    phone: settings.phone || (settings as any).shopPhone || '',
    email: settings.email || (settings as any).shopEmail || '',
    nifRccm: settings.nifRccm || '',
    bankDetails: settings.bankDetails || '',
    mobileMoneyNumber: settings.mobileMoneyNumber || '',
    invoicePrefix: settings.invoicePrefix || 'FAC-',
    defaultInvoiceFormat: settings.defaultInvoiceFormat || 'A4',
    invoiceLegalNotice:
      settings.invoiceLegalNotice ||
      'Facture établie conformément aux règles du commerce. Merci de votre fidélité.',
    businessType: settings.businessType || 'COMMERCE_GENERAL',
  });

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [selectedPresetForModal, setSelectedPresetForModal] = useState<BusinessPreset | null>(null);
  const [includeSampleProducts, setIncludeSampleProducts] = useState(true);
  const [presetSuccess, setPresetSuccess] = useState<string | null>(null);

  // Keep form data in sync if settings change from outside
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      ...settings,
      storeName: settings.storeName || (settings as any).shopName || prev.storeName,
      address: settings.address || (settings as any).shopAddress || prev.address,
      phone: settings.phone || (settings as any).shopPhone || prev.phone,
      email: settings.email || (settings as any).shopEmail || prev.email,
    }));
  }, [settings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      ...formData,
      taxRatePercent: Number(formData.taxRatePercent) || 0,
      lowStockThresholdDefault: Number(formData.lowStockThresholdDefault) || 5,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleApplyPreset = (preset: BusinessPreset) => {
    loadBusinessPreset(preset.id, includeSampleProducts);
    setSelectedPresetForModal(null);
    setPresetSuccess(`Le modèle "${preset.name}" a été appliqué avec succès !`);
    setTimeout(() => setPresetSuccess(null), 4000);
  };

  const handleExportDB = () => {
    const jsonString = exportFullDatabase();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sauvegarde_boutique_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const res = importFullDatabase(content);
      if (res.success) {
        setImportStatus('Base de données restaurée avec succès !');
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setImportStatus(`Erreur : ${res.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            Paramètres & Standardisation de la Boutique
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configurez le type d'activité (Alimentation, Quincaillerie, Shop...), vos mentions de facturation légale et la synchronisation.
          </p>
        </div>
      </div>

      {presetSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-900 flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{presetSuccess}</span>
        </div>
      )}

      {/* 1. INDUSTRY BUSINESS PRESETS SELECTION (ALIMENTATION, QUINCAILLERIE, SHOP, ETC.) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Standardisation : Choisissez votre Type de Commerce
            </h2>
            <p className="text-[11px] text-slate-500">
              Adapte en 1 clic les catégories, unités (kg, mètre, pièce, rouleau), stocks et entêtes de facturation à votre métier.
            </p>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
            Actuel : {(BUSINESS_PRESETS || []).find((p) => p.id === formData.businessType)?.name || 'Commerce Général'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {BUSINESS_PRESETS.map((preset) => {
            const isCurrent = formData.businessType === preset.id;
            return (
              <div
                key={preset.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{preset.icon}</span>
                    {isCurrent && (
                      <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" /> Actif
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-xs text-slate-900">{preset.name}</h3>
                  <p className="text-[11px] text-slate-600 leading-snug">{preset.description}</p>

                  <div className="pt-2">
                    <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                      Unités adaptées :
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {preset.suggestedUnits.slice(0, 5).map((u, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-700 rounded text-[10px] font-mono"
                        >
                          {u}
                        </span>
                      ))}
                      {preset.suggestedUnits.length > 5 && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +{preset.suggestedUnits.length - 5}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setSelectedPresetForModal(preset)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isCurrent
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isCurrent ? 'Ré-appliquer ce modèle' : 'Appliquer ce modèle'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. FIREBASE FIRESTORE CLOUD STATUS */}
      <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-sky-950">Base de Données Cloud Firebase Firestore</h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isCloudSynced ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isCloudSynced ? 'Synchronisé en direct' : 'Mise à jour en attente'}
              </span>
            </div>
            <p className="text-[11px] text-sky-800 mt-0.5">
              Vos articles, ventes, mouvements de stock et caisse sont sauvegardés automatiquement sur Firestore.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => syncToCloudNow?.()}
          disabled={isSyncing}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
        >
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Cloud className="w-3.5 h-3.5" />
          )}
          <span>{isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant'}</span>
        </button>
      </div>

      {/* 3. SIMULATE CURRENT USER SWITCHER (RBAC DEMO) */}
      <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-700" />
            <div>
              <h3 className="text-xs font-bold text-indigo-950">
                Utilisateur Actif / Session de Travail
              </h3>
              <p className="text-[11px] text-indigo-800">
                Connecté en tant que : <strong>{currentUser.fullName}</strong> ({currentUser.role})
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => switchUser(u.id)}
              className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                currentUser.id === u.id
                  ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                  : 'bg-white text-slate-800 border-slate-200 hover:bg-indigo-100/50'
              }`}
            >
              <div>
                <p className="text-xs font-bold">{u.fullName}</p>
                <p
                  className={`text-[10px] ${
                    currentUser.id === u.id ? 'text-indigo-200' : 'text-slate-400'
                  }`}
                >
                  {u.role}
                </p>
              </div>
              {currentUser.id === u.id && <CheckCircle2 className="w-4 h-4 text-white" />}
            </button>
          ))}
        </div>
      </div>

      {/* 4. MAIN SETTINGS FORM */}
      <form onSubmit={handleSave} className="space-y-6">
        {saveSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Paramètres et informations de facturation enregistrés avec succès !
          </div>
        )}

        {/* Store Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Store className="w-4 h-4 text-indigo-600" />
            Identité de l'Établissement & Coordonnées Commerciales
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Nom Commercial de la Boutique *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Quincaillerie & Matériaux Pro"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Slogan / Spécialité
              </label>
              <input
                type="text"
                placeholder="Ex: Bricolage, Plomberie, Gros Œuvre"
                value={formData.storeTagline || ''}
                onChange={(e) => setFormData({ ...formData, storeTagline: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Numéro de Téléphone Professionnel *
              </label>
              <input
                type="text"
                required
                placeholder="+223 76 00 00 00 / +223 66 00 00 00"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Email de Contact & Devis
              </label>
              <input
                type="email"
                placeholder="contact@boutique-bamako.ml"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">
                Adresse Géographique Complète (Affichée sur les Factures) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Grand Marché de Bamako, Rue 18 x 25, Bamako - Mali"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Fiscal & Invoice Customization Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-indigo-600" />
            Paramètres Fiscaux & Facturation Client (Mali)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                NIF / RCCM / N° Registre de Commerce (Mali)
              </label>
              <input
                type="text"
                placeholder="Ex: MA-BKO-2024-B-12345 / NIF: 085123456T"
                value={formData.nifRccm || ''}
                onChange={(e) => setFormData({ ...formData, nifRccm: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Obligatoire pour les factures professionnelles conformes aux normes du Mali.
              </p>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Préfixe des Numéros de Facture
              </label>
              <input
                type="text"
                placeholder="Ex: FAC-, INV-, BL-"
                value={formData.invoicePrefix || 'FAC-'}
                onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Exemple généré : {formData.invoicePrefix || 'FAC-'}2026-0042
              </p>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Format d'Impression Facture par Défaut
              </label>
              <select
                value={formData.defaultInvoiceFormat || 'A4'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultInvoiceFormat: e.target.value as 'A4' | 'TICKET',
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium"
              >
                <option value="A4">Facture Complète Grand Format (A4 Pro)</option>
                <option value="TICKET">Ticket de Caisse Compact (80mm Thermique)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Numéro Mobile Money (Orange Money / Wave / Moov Mali)
              </label>
              <input
                type="text"
                placeholder="Ex: +223 76 00 00 00 (Orange Money & Wave Mali)"
                value={formData.mobileMoneyNumber || ''}
                onChange={(e) => setFormData({ ...formData, mobileMoneyNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Apparaît sur la facture client pour les règlements à distance via Orange Money / Wave.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">
                Coordonnées Bancaires & RIB (Mali)
              </label>
              <input
                type="text"
                placeholder="Ex: BDM-SA (Banque de Développement du Mali) - Compte N° ML016 01001 012345678901 25"
                value={formData.bankDetails || ''}
                onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">
                Mentions Légales & Conditions de Vente au Pied de Facture
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Marchandises vendues conformes. Tout retour sous 48h sur présentation de facture."
                value={formData.invoiceLegalNotice || ''}
                onChange={(e) => setFormData({ ...formData, invoiceLegalNotice: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">
                Message de Remerciement (Bas de Ticket / Facture)
              </label>
              <input
                type="text"
                value={formData.receiptFooterMessage}
                onChange={(e) =>
                  setFormData({ ...formData, receiptFooterMessage: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-medium"
              />
            </div>
          </div>
        </div>

        {/* Currency & Financial Rules */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <DollarSign className="w-4 h-4 text-indigo-600" />
            Devise Monétaire, TVA & Règles de Caisse
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Devise Monétaire Principale *
              </label>
              <input
                type="text"
                required
                placeholder="FCFA, EUR, USD, GNF..."
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-black text-indigo-700 text-sm"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Seuil d'Alerte Stock Bas par Défaut
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={formData.lowStockThresholdDefault}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lowStockThresholdDefault: parseInt(e.target.value) || 5,
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold"
              />
            </div>
          </div>

          <div className="space-y-3 text-xs pt-2">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="font-bold text-slate-900">Autoriser les stocks négatifs</p>
                <p className="text-[11px] text-slate-500">
                  Si désactivé, la caisse bloque la vente d'un produit dont la quantité est nulle.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.allowNegativeStock}
                onChange={(e) =>
                  setFormData({ ...formData, allowNegativeStock: e.target.checked })
                }
                className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="font-bold text-slate-900">Activer le calcul de la TVA sur les factures</p>
                <p className="text-[11px] text-slate-500">
                  Ajoute la ligne TVA lors de l'encaissement et sur la facture imprimée.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.taxEnabled}
                onChange={(e) => setFormData({ ...formData, taxEnabled: e.target.checked })}
                className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            {formData.taxEnabled && (
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
                <span className="font-semibold text-slate-700">Taux de TVA standard (%) :</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.taxRatePercent}
                  onChange={(e) =>
                    setFormData({ ...formData, taxRatePercent: parseFloat(e.target.value) || 0 })
                  }
                  className="w-24 px-3 py-1.5 bg-white border border-indigo-300 rounded-lg font-bold text-right text-indigo-900"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Enregistrer Tous les Paramètres
          </button>
        </div>
      </form>

      {/* 5. BACKUP & RESTORE / DATA PORTABILITY */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Download className="w-4 h-4 text-indigo-600" />
          Sauvegarde & Restauration Complète
        </h2>

        {importStatus && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900">
            {importStatus}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Export JSON */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
            <div>
              <p className="font-bold text-slate-900">Exporter Sauvegarde</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Téléchargez l'intégralité de vos produits, ventes, factures et inventaires au format JSON.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportDB}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger JSON
            </button>
          </div>

          {/* Import JSON */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
            <div>
              <p className="font-bold text-slate-900">Restaurer Sauvegarde</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Chargez un fichier de sauvegarde pour restaurer l'état complet de votre système.
              </p>
            </div>
            <label className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer text-center transition-all shadow-xs">
              <Upload className="w-3.5 h-3.5" />
              Importer Fichier
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>
          </div>

          {/* Reset To Zero */}
          <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 flex flex-col justify-between space-y-3">
            <div>
              <p className="font-bold text-rose-900">Remise à Zéro Totale (0)</p>
              <p className="text-[11px] text-rose-700 mt-1">
                Efface toutes les données : 0 produits, 0 ventes, 0 achats, 0 dépenses, 0 dettes, caisse à zéro.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowZeroModal(true)}
              className="w-full py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Remettre Tout à 0
            </button>
          </div>

          {/* Reset Demo */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex flex-col justify-between space-y-3">
            <div>
              <p className="font-bold text-amber-900">Charger Données Démo</p>
              <p className="text-[11px] text-amber-700 mt-1">
                Charge des exemples types de produits et ventes pour tester l'application.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Recharger Démo
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRM ZERO RESET MODAL */}
      <ConfirmModal
        isOpen={showZeroModal}
        title="Remise à zéro complète de l'application"
        message="Êtes-vous absolument sûr de vouloir TOUT remettre à zéro ? Tous les produits, ventes, factures, achats, dépenses, clients, fournisseurs et mouvements de caisse seront effacés (0 partout)."
        confirmLabel="Oui, tout remettre à zéro (0)"
        isDanger={true}
        onConfirm={() => {
          if (resetAllDataToZero) {
            resetAllDataToZero();
          }
          setShowZeroModal(false);
        }}
        onCancel={() => setShowZeroModal(false)}
      />

      {/* CONFIRM APPLY PRESET MODAL */}
      {selectedPresetForModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl shadow-xs">
                {selectedPresetForModal.icon}
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Appliquer le modèle : {selectedPresetForModal.name}
                </h3>
                <p className="text-xs text-slate-500">{selectedPresetForModal.tagline}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Ce modèle va configurer automatiquement les catégories adaptées, les unités de mesure recommandées et les entêtes de facturation.
            </p>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={includeSampleProducts}
                  onChange={(e) => setIncludeSampleProducts(e.target.checked)}
                  className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Ajouter des exemples de produits types dans mon catalogue</span>
              </label>
              <p className="text-[11px] text-slate-500 pl-6">
                Idéal pour démarrer rapidement sans tout saisir manuellement.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPresetForModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(selectedPresetForModal)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Confirmer & Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM RESET MODAL */}
      <ConfirmModal
        isOpen={showResetModal}
        title="Réinitialiser les données de démonstration"
        message="Êtes-vous sûr de vouloir réinitialiser toutes les données de la boutique ? Toutes vos saisies actuelles seront remplacées par le catalogue standard de démonstration."
        confirmLabel="Réinitialiser complètement"
        isDanger={true}
        onConfirm={() => {
          resetToDemoData();
          setShowResetModal(false);
        }}
        onCancel={() => setShowResetModal(false)}
      />
    </div>
  );
};
