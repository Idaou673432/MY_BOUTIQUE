import React, { useState } from 'react';
import {
  Printer,
  X,
  Usb,
  Bluetooth,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Play,
  Settings,
  ShieldCheck,
  Zap,
  HelpCircle
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { PrinterType } from '../../types';
import { printTestReceipt } from '../../utils/printService';

interface DirectPrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DirectPrinterModal: React.FC<DirectPrinterModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useStore();

  const [printerType, setPrinterType] = useState<PrinterType>(settings.printerType || 'BROWSER');
  const [paperWidth, setPaperWidth] = useState<80 | 58>(settings.directThermalWidthMm || 80);
  const [autoPrint, setAutoPrint] = useState<boolean>(!!settings.autoPrintReceiptOnSale);
  const [openDrawer, setOpenDrawer] = useState<boolean>(!!settings.openCashDrawerOnPrint);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const hasWebSerial = typeof window !== 'undefined' && 'serial' in navigator;
  const hasWebBluetooth = typeof window !== 'undefined' && 'bluetooth' in navigator;

  const handleSave = () => {
    updateSettings({
      printerType,
      directThermalWidthMm: paperWidth,
      autoPrintReceiptOnSale: autoPrint,
      openCashDrawerOnPrint: openDrawer,
    });
    onClose();
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    const tempSettings = {
      ...settings,
      printerType,
      directThermalWidthMm: paperWidth,
      openCashDrawerOnPrint: openDrawer,
    };

    try {
      const res = await printTestReceipt(tempSettings, printerType);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Erreur lors de l'impression du ticket test.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Configuration de l'Imprimante Directe</h3>
              <p className="text-xs text-slate-400">
                Choix du pilote d'impression thermique pour caisse enregistreuse
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Section 1: Type of Connection */}
          <div className="space-y-2">
            <label className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
              1. Mode de Connexion Imprimante
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Browser Dedicated Tab */}
              <div
                onClick={() => setPrinterType('BROWSER')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all space-y-1.5 ${
                  printerType === 'BROWSER'
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Printer className={`w-4 h-4 ${printerType === 'BROWSER' ? 'text-indigo-600' : 'text-slate-600'}`} />
                    <span className="font-bold text-slate-900">Onglet Dédié / Navigateur</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                    Recommandé
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Ouvre instantanément le ticket au format réel pour impression directe sans blocage. Compatible avec toutes les imprimantes (A4, 80mm, 58mm, PDF).
                </p>
              </div>

              {/* Option 2: USB Serial Direct */}
              <div
                onClick={() => setPrinterType('USB_SERIAL')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all space-y-1.5 ${
                  printerType === 'USB_SERIAL'
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Usb className={`w-4 h-4 ${printerType === 'USB_SERIAL' ? 'text-indigo-600' : 'text-slate-600'}`} />
                    <span className="font-bold text-slate-900">USB / Série Direct (ESC/POS)</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      hasWebSerial ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {hasWebSerial ? 'Supporté' : 'Navigateur requis'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Impression ultra-rapide par câble USB direct vers imprimante de caisse thermique (Xprinter, POS-80, Epson) sans passer par la boîte Windows.
                </p>
              </div>

              {/* Option 3: Bluetooth Direct */}
              <div
                onClick={() => setPrinterType('BLUETOOTH')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all space-y-1.5 ${
                  printerType === 'BLUETOOTH'
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bluetooth className={`w-4 h-4 ${printerType === 'BLUETOOTH' ? 'text-indigo-600' : 'text-slate-600'}`} />
                    <span className="font-bold text-slate-900">Bluetooth Sans Fil (ESC/POS)</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      hasWebBluetooth ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {hasWebBluetooth ? 'Supporté' : 'Navigateur requis'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Connexion directe Bluetooth pour mini-imprimantes thermiques portables de poche (58mm / 80mm).
                </p>
              </div>

              {/* Option 4: RawBT App (Android) */}
              <div
                onClick={() => setPrinterType('RAWBT')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all space-y-1.5 ${
                  printerType === 'RAWBT'
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className={`w-4 h-4 ${printerType === 'RAWBT' ? 'text-indigo-600' : 'text-slate-600'}`} />
                    <span className="font-bold text-slate-900">Application RawBT (Android)</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800 font-bold">
                    Mobile / Tablette
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Envoi direct vers l'application RawBT installée sur téléphone, tablette ou terminal POS Android (Sunmi, iMin, etc.).
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Format and Paper Width */}
          <div className="space-y-2">
            <label className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
              2. Largeur du Rouleau Thermique
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaperWidth(80)}
                className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  paperWidth === 80
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Format Standard 80 mm</span>
              </button>

              <button
                type="button"
                onClick={() => setPaperWidth(58)}
                className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  paperWidth === 58
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Format Mini 58 mm (Compact)</span>
              </button>
            </div>
          </div>

          {/* Section 3: Hardware Options */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <label className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
              3. Automatisation de Caisse
            </label>

            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPrint}
                  onChange={(e) => setAutoPrint(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold text-slate-800">Impression automatique du ticket après chaque vente</span>
                  <p className="text-[11px] text-slate-500">
                    Dès qu'une vente est validée en caisse, le ticket est immédiatement envoyé à l'imprimante.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={openDrawer}
                  onChange={(e) => setOpenDrawer(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold text-slate-800">Ouverture automatique du tiroir-caisse</span>
                  <p className="text-[11px] text-slate-500">
                    Envoie le signal d'éjection (Pulse ESC/POS) pour déverrouiller le tiroir lors de l'impression.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Test Action */}
          <div className="p-4 bg-indigo-50/80 rounded-xl border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-950 font-bold">
                <Zap className="w-4 h-4 text-indigo-600" />
                <span>Tester la Connexion de l'Imprimante</span>
              </div>

              <button
                type="button"
                disabled={isTesting}
                onClick={handleRunTest}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{isTesting ? 'Test en cours...' : 'Lancer un Ticket Test'}</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg flex items-center gap-2 font-medium text-xs mt-2 ${
                  testResult.success ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            Enregistrer la Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
