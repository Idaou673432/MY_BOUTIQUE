import React, { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { POSView } from './components/pos/POSView';
import { ProductsView } from './components/products/ProductsView';
import { StockView } from './components/stock/StockView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { SalesHistoryView } from './components/sales/SalesHistoryView';
import { CashRegisterView } from './components/cash/CashRegisterView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { ThirdPartiesView } from './components/third-parties/ThirdPartiesView';
import { CreditDebtView } from './components/credit-debt/CreditDebtView';
import { QuotesView } from './components/quotes/QuotesView';
import { InventoryView } from './components/inventory/InventoryView';
import { ReportsView } from './components/reports/ReportsView';
import { UsersView } from './components/users/UsersView';
import { SettingsView } from './components/settings/SettingsView';
import { LoginView } from './components/auth/LoginView';
import { ROLE_PERMISSIONS, UserRole } from './types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { currentUser, isAuthenticated } = useStore();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const userRole: UserRole = currentUser?.role || 'VENDEUR';
  const roleConfig = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.VENDEUR;

  // On auth state change or role change, make sure the current tab is permitted
  useEffect(() => {
    if (isAuthenticated) {
      if (!roleConfig.allowedTabs.includes(currentTab)) {
        // Redirect to default starting tab for this role
        const defaultTab = userRole === 'VENDEUR' ? 'pos' : 'dashboard';
        setCurrentTab(defaultTab);
      }
    }
  }, [isAuthenticated, userRole, currentTab, roleConfig.allowedTabs]);

  const handleNavigate = (tab: string) => {
    if (roleConfig.allowedTabs.includes(tab)) {
      setCurrentTab(tab);
    } else {
      // If not allowed, default to safe tab
      setCurrentTab(userRole === 'VENDEUR' ? 'pos' : 'dashboard');
    }
  };

  const handleLoginSuccess = (role: UserRole) => {
    if (role === 'VENDEUR') {
      setCurrentTab('pos');
    } else {
      setCurrentTab('dashboard');
    }
  };

  // If not authenticated, require PIN login identification screen
  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Security guard for unauthorized tab attempts
  const isTabAllowed = roleConfig.allowedTabs.includes(currentTab);

  const renderActiveView = () => {
    if (!isTabAllowed) {
      return (
        <div className="bg-white p-8 rounded-3xl border border-rose-200 shadow-sm text-center max-w-lg mx-auto my-12">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            Accès Non Autorisé pour ce Rôle
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Votre profil <strong>{roleConfig.label}</strong> n'a pas la permission d'accéder à cette section.
            {userRole === 'VENDEUR' && ' Les vendeurs sont limités aux ventes, caisse et consultation produits.'}
          </p>
          <button
            onClick={() => setCurrentTab(userRole === 'VENDEUR' ? 'pos' : 'dashboard')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Retourner à mon espace de travail
          </button>
        </div>
      );
    }

    switch (currentTab) {
      case 'dashboard':
        return <DashboardView onNavigate={handleNavigate} />;
      case 'pos':
        return <POSView onNavigate={handleNavigate} />;
      case 'products':
        return <ProductsView />;
      case 'stock':
        return <StockView />;
      case 'purchases':
        return <PurchasesView />;
      case 'sales':
        return <SalesHistoryView onNavigate={handleNavigate} />;
      case 'quotes':
        return <QuotesView />;
      case 'credits-debts':
        return <CreditDebtView />;
      case 'cash':
        return <CashRegisterView onNavigate={handleNavigate} />;
      case 'expenses':
        return <ExpensesView />;
      case 'customers':
        return <ThirdPartiesView initialTab="customers" />;
      case 'suppliers':
        return <ThirdPartiesView initialTab="suppliers" />;
      case 'inventory':
        return <InventoryView />;
      case 'reports':
        return <ReportsView />;
      case 'activity':
        return <UsersView initialTab="audit" />;
      case 'users':
        return <UsersView initialTab="users" />;
      case 'settings':
        return <SettingsView />;
      default:
        return userRole === 'VENDEUR' ? (
          <POSView onNavigate={handleNavigate} />
        ) : (
          <DashboardView onNavigate={handleNavigate} />
        );
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-100 overflow-hidden font-sans text-slate-900">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleNavigate}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          onNavigate={handleNavigate}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 no-scrollbar">
          <div className="max-w-7xl mx-auto">
            {renderActiveView()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainAppContent />
    </StoreProvider>
  );
}
