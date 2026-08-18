import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Wallet, 
  User as UserIcon, 
  AlertTriangle,
  Menu,
  X,
  ChevronDown,
  Plus,
  Cloud,
  RefreshCw,
  Lock,
  LogOut
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatMoney } from '../../utils/formatters';
import { User, ROLE_PERMISSIONS } from '../../types';

interface NavbarProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onNavigate: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarOpen, onNavigate }) => {
  const { currentUser, settings, metrics, cashRegister, isCloudSynced, isSyncing, syncToCloudNow, lockSession } = useStore();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const isAdmin = currentUser?.role === 'ADMIN';
  const isVendeur = currentUser?.role === 'VENDEUR';

  const roleLabels: Record<string, { label: string; bg: string; text: string }> = {
    ADMIN: { label: 'Administrateur', bg: 'bg-purple-50 text-purple-700 border-purple-200', text: 'text-purple-700' },
    GERANT: { label: 'Gérant', bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700' },
    VENDEUR: { label: 'Vendeur (Caisse)', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700' },
  };

  const totalAlerts = metrics.outOfStockCount + metrics.lowStockCount;

  // Format today's date nicely in French
  const todayFormatted = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      onNavigate('products');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 z-30 sticky top-0">
      {/* Left: Mobile menu toggle + Global Search bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 lg:hidden focus:outline-none"
          aria-label="Menu"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-sm sm:max-w-md">
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Rechercher un produit, une vente..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </form>
      </div>

      {/* Center/Right: Date, Cash Status, New Sale Button, Alerts, User Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Date string */}
        <span className="text-xs text-gray-500 font-medium capitalize hidden xl:inline-block">
          {todayFormatted}
        </span>

        {/* Firebase Cloud Sync Indicator */}
        <button
          onClick={() => syncToCloudNow()}
          disabled={isSyncing}
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            isCloudSynced
              ? 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
          }`}
          title="Synchronisation en temps réel Firebase Firestore"
        >
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
          ) : (
            <Cloud className="w-3.5 h-3.5 text-sky-600" />
          )}
          <span className="text-[11px]">
            {isSyncing ? 'Synchronisation...' : isCloudSynced ? 'Firebase Cloud' : 'En attente'}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${isCloudSynced ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        </button>

        {/* Live Cash Indicator */}
        <button
          onClick={() => onNavigate('cash')}
          className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
            cashRegister?.isOpen
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
          }`}
          title="Consulter l'état de la caisse"
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>
            {cashRegister?.isOpen ? (
              <>
                Caisse :{' '}
                <span className="font-bold">
                  {formatMoney(metrics.currentCashBalance, settings.currency)}
                </span>
              </>
            ) : (
              'Caisse Fermée'
            )}
          </span>
        </button>

        {/* Action Button: Nouvelle Vente POS */}
        <button
          onClick={() => onNavigate('pos')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nouvelle Vente</span>
        </button>

        {/* Stock Alerts notification icon */}
        <div className="relative">
          <button
            onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 relative focus:outline-none transition-colors"
            title="Alertes de stock"
          >
            <Bell className="w-5 h-5" />
            {totalAlerts > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-xs">
                {totalAlerts}
              </span>
            )}
          </button>

          {showAlertsDropdown && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3.5 py-2 border-b border-gray-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                  Alertes de stock ({totalAlerts})
                </span>
                <button
                  onClick={() => {
                    setShowAlertsDropdown(false);
                    onNavigate('stock');
                  }}
                  className="text-xs text-indigo-600 font-bold hover:underline"
                >
                  Voir tout
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 text-xs">
                {metrics.outOfStockCount > 0 && (
                  <div
                    onClick={() => {
                      setShowAlertsDropdown(false);
                      onNavigate('stock');
                    }}
                    className="p-3 bg-red-50/60 hover:bg-red-50 cursor-pointer flex items-center gap-2.5 text-red-700"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    <div>
                      <p className="font-bold">{metrics.outOfStockCount} produit(s) en rupture totale</p>
                      <p className="text-[11px] text-red-600">Nécessite un réapprovisionnement urgent</p>
                    </div>
                  </div>
                )}
                {metrics.lowStockCount > 0 && (
                  <div
                    onClick={() => {
                      setShowAlertsDropdown(false);
                      onNavigate('stock');
                    }}
                    className="p-3 bg-amber-50/60 hover:bg-amber-50 cursor-pointer flex items-center gap-2.5 text-amber-800"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <div>
                      <p className="font-bold">{metrics.lowStockCount} produit(s) en stock faible</p>
                      <p className="text-[11px] text-amber-700">Sous le seuil d'alerte configuré</p>
                    </div>
                  </div>
                )}
                {totalAlerts === 0 && (
                  <div className="p-4 text-center text-gray-400 text-xs">
                    Aucune alerte de stock. Tous les produits sont approvisionnés.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Lock / Logout Button */}
        <button
          onClick={lockSession}
          id="navbar-btn-lock"
          title="Verrouiller la session (Quitter le poste)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Verrouiller</span>
        </button>

        {/* User Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-xl bg-gray-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {currentUser?.avatar || currentUser?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-gray-900 leading-none truncate max-w-[110px]">{currentUser?.name}</p>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md inline-block mt-0.5 border ${roleLabels[currentUser?.role || 'VENDEUR']?.bg}`}>
                {roleLabels[currentUser?.role || 'VENDEUR']?.label}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 bg-slate-50 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-xs">
                  {currentUser?.avatar || currentUser?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{currentUser?.name}</p>
                  <p className="text-[10px] text-gray-500 font-mono truncate">@{currentUser?.username || currentUser?.name?.toLowerCase().replace(/\s+/g, '.')}</p>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 border ${roleLabels[currentUser?.role || 'VENDEUR']?.bg}`}>
                    {roleLabels[currentUser?.role || 'VENDEUR']?.label}
                  </span>
                </div>
              </div>

              <div className="px-4 py-2 text-[11px] text-gray-500 space-y-1 bg-white">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-400">Poste :</span>
                  <span className="font-semibold text-gray-700">PC Individuel</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-400">Boutique :</span>
                  <span className="font-semibold text-gray-700 truncate max-w-[150px]">{settings.storeName || 'Boutique Mali'}</span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-1.5 px-1.5 space-y-1">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onNavigate('users');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-indigo-600 font-bold hover:bg-indigo-50 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Gérer les comptes & codes PIN</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    lockSession();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-rose-600 font-bold hover:bg-rose-50 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Fermer la session sur ce PC</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

