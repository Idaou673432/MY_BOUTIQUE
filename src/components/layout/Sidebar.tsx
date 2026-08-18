import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Receipt,
  Users,
  Building2,
  Wallet,
  ClipboardList,
  BarChart3,
  UserCheck,
  History,
  Settings,
  AlertCircle,
  Lock,
  LogOut
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ROLE_PERMISSIONS } from '../../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, isOpen, onCloseMobile }) => {
  const { currentUser, metrics, cashRegister, settings, lockSession } = useStore();

  const userRole = currentUser?.role || 'VENDEUR';
  const roleConfig = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.VENDEUR;
  const isVendeur = userRole === 'VENDEUR';

  const allPrincipalItems = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: LayoutDashboard,
    },
    {
      id: 'pos',
      label: 'Ventes (POS / Caisse)',
      icon: ShoppingCart,
      highlight: true,
    },
    {
      id: 'products',
      label: isVendeur ? 'Catalogue & Prix' : 'Catalogue Produits',
      icon: Package,
      badge: metrics.outOfStockCount > 0 && !isVendeur ? `${metrics.outOfStockCount} rupture` : undefined,
      badgeColor: 'bg-red-500 text-white',
    },
    {
      id: 'stock',
      label: 'Stock & Mouvements',
      icon: Boxes,
      badge: metrics.lowStockCount > 0 ? `${metrics.lowStockCount} bas` : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'purchases',
      label: 'Achats & Commandes',
      icon: Truck,
    },
    {
      id: 'sales',
      label: 'Historique Ventes',
      icon: Receipt,
    },
    {
      id: 'cash',
      label: 'Caisse Journalière',
      icon: Wallet,
      badge: cashRegister?.isOpen ? 'Ouverte' : 'Fermée',
      badgeColor: cashRegister?.isOpen ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-700 text-gray-300',
    },
    {
      id: 'expenses',
      label: 'Dépenses & Charges',
      icon: AlertCircle,
    },
    {
      id: 'inventory',
      label: 'Inventaires Mensuels',
      icon: ClipboardList,
    },
  ];

  const allAnalysisItems = [
    {
      id: 'reports',
      label: 'Rapports & Stats',
      icon: BarChart3,
    },
    {
      id: 'customers',
      label: 'Clients & Crédits',
      icon: Users,
      badge: metrics.totalCustomerDebt > 0 ? 'Dettes' : undefined,
      badgeColor: 'bg-orange-500/30 text-orange-300',
    },
    {
      id: 'suppliers',
      label: 'Fournisseurs',
      icon: Building2,
    },
    {
      id: 'activity',
      label: 'Journal d\'Activité',
      icon: History,
    },
    {
      id: 'users',
      label: 'Utilisateurs & PIN',
      icon: UserCheck,
    },
    {
      id: 'settings',
      label: 'Paramètres Boutique',
      icon: Settings,
    },
  ];

  // Filter items based strictly on role permissions
  const visiblePrincipalItems = allPrincipalItems.filter(item =>
    roleConfig.allowedTabs.includes(item.id)
  );

  const visibleAnalysisItems = allAnalysisItems.filter(item =>
    roleConfig.allowedTabs.includes(item.id)
  );

  const renderNavList = (items: typeof allPrincipalItems) => (
    <div className="space-y-0.5 px-2">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;

        return (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            onClick={() => {
              onSelectTab(item.id);
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              isActive
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : item.highlight
                ? 'bg-indigo-900/40 text-indigo-200 hover:bg-indigo-900/70 hover:text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive
                    ? 'text-white'
                    : item.highlight
                    ? 'text-indigo-400'
                    : 'text-gray-400'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </div>

            {item.badge && (
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${item.badgeColor || 'bg-gray-700 text-gray-200'}`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-64 bg-[#1F2937] text-white flex flex-col shrink-0 transition-transform duration-300 ease-in-out border-r border-gray-700 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header brand section */}
        <div className="p-4 sm:p-5 flex items-center gap-3 border-b border-gray-700 shrink-0">
          <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-sm">
            {settings.storeName ? settings.storeName.charAt(0).toUpperCase() : 'B'}
          </div>
          <div className="truncate">
            <span className="font-bold text-base sm:text-lg tracking-tight block text-white truncate">
              {settings.storeName || 'BOUTIQUE PRO'}
            </span>
            <span className="text-[10px] text-gray-400 font-medium block">
              {isVendeur ? 'Session Caisse (Vendeur)' : 'Gestion Commerciale'}
            </span>
          </div>
        </div>

        {/* Navigation lists with role-based filtering */}
        <nav className="flex-1 py-3 overflow-y-auto space-y-4 no-scrollbar">
          {visiblePrincipalItems.length > 0 && (
            <div>
              <div className="px-4 mb-1 text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                {isVendeur ? 'Mon Espace de Vente' : 'Principal'}
              </div>
              {renderNavList(visiblePrincipalItems)}
            </div>
          )}

          {visibleAnalysisItems.length > 0 && (
            <div>
              <div className="px-4 mb-1 text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                Analyse & Gestion
              </div>
              {renderNavList(visibleAnalysisItems)}
            </div>
          )}
        </nav>

        {/* Bottom User Bar */}
        <div className="p-3 bg-[#111827] border-t border-gray-700 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gray-700 text-white flex items-center justify-center font-bold text-xs border border-gray-600 shrink-0">
                {currentUser.avatar || currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-white truncate">{currentUser.name}</span>
                <span className="text-[10px] text-indigo-300 font-medium capitalize">
                  {roleConfig.label}
                </span>
              </div>
            </div>

            <button
              onClick={lockSession}
              id="sidebar-btn-lock"
              title="Verrouiller la session"
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors shrink-0"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>

          {isVendeur && (
            <div className="p-1.5 rounded-lg bg-emerald-950/40 text-[10px] text-emerald-300 flex items-center gap-1.5 border border-emerald-800/40">
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Accès Vente & Caisse actif</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
