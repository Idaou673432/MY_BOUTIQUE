import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  User,
  UserRole,
  Product,
  Category,
  Supplier,
  Customer,
  StockMovement,
  Sale,
  SaleItem,
  Purchase,
  PurchaseItem,
  Expense,
  CashRegister,
  CashTransaction,
  Inventory,
  InventoryItem,
  ActivityLog,
  BusinessType,
  StoreSettings,
  MovementType,
  PaymentMethod,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_SUPPLIERS,
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCTS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_SALES,
  INITIAL_PURCHASES,
  INITIAL_EXPENSES,
  INITIAL_CASH_REGISTER,
  INITIAL_CASH_TRANSACTIONS,
  INITIAL_PAST_INVENTORIES,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_SETTINGS,
  DEMO_SUPPLIERS,
  DEMO_CUSTOMERS,
  DEMO_PRODUCTS,
  DEMO_STOCK_MOVEMENTS,
  DEMO_SALES,
} from '../data/initialData';
import { BUSINESS_PRESETS } from '../data/industryPresets';
import { generateId, generateInvoiceNumber, generateOrderNumber } from '../utils/formatters';

interface StoreContextType {
  // Firebase Sync State
  isCloudSynced: boolean;
  isSyncing: boolean;
  syncToCloudNow: () => Promise<void>;

  // Current user & authentication
  currentUser: User;
  users: User[];
  isAuthenticated: boolean;
  login: (userId: string, pin: string) => { success: boolean; message?: string };
  loginWithCredentials: (identifier: string, passwordOrPin: string) => { success: boolean; user?: User; message?: string };
  logout: () => void;
  lockSession: () => void;
  verifyPin: (userId: string, pin: string) => boolean;
  switchUserWithPin: (userId: string, pin: string) => { success: boolean; message?: string };
  setCurrentUser: (user: User) => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => boolean;

  // Settings & Industry Presets
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  loadBusinessPreset: (presetId: BusinessType, loadSampleProducts?: boolean) => boolean;

  // Categories
  categories: Category[];
  addCategory: (category: Omit<Category, 'id'>) => void;

  // Products
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => { success: boolean; message?: string };
  importProducts: (productsList: Partial<Product>[]) => number;

  // Stock Movements & Alerts
  stockMovements: StockMovement[];
  createStockMovement: (
    productId: string,
    quantity: number,
    type: MovementType,
    reason: string,
    referenceId?: string
  ) => boolean;

  // Suppliers & Purchases
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt' | 'totalPurchased' | 'debtBalance'>) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => { success: boolean; message?: string };
  paySupplierDebt: (supplierId: string, amount: number, paymentMethod: PaymentMethod) => boolean;

  purchases: Purchase[];
  createPurchase: (
    supplierId: string,
    items: PurchaseItem[],
    paidAmount: number,
    paymentMethod: PaymentMethod,
    notes?: string
  ) => Purchase;
  updatePurchaseStatus: (purchaseId: string, status: Purchase['status']) => boolean;

  // Customers & Sales
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'totalSpent' | 'creditBalance' | 'salesCount'>) => Customer;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => { success: boolean; message?: string };
  payCustomerCredit: (customerId: string, amount: number, paymentMethod: PaymentMethod) => boolean;

  sales: Sale[];
  createSale: (
    items: SaleItem[],
    paymentMethod: PaymentMethod,
    amountReceived: number,
    customerId?: string,
    notes?: string
  ) => { success: boolean; sale?: Sale; message?: string };
  cancelSale: (saleId: string, reason: string) => { success: boolean; message?: string };

  // Expenses & Cash
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'userId' | 'userName'>) => boolean;
  deleteExpense: (id: string) => boolean;

  cashRegister: CashRegister | null;
  cashTransactions: CashTransaction[];
  openCashRegister: (openingBalance: number, notes?: string) => boolean;
  closeCashRegister: (realClosingBalance: number, discrepancyReason?: string, notes?: string) => boolean;
  addCashTransaction: (type: CashTransaction['type'], amount: number, reason: string, paymentMethod?: PaymentMethod) => boolean;

  // Monthly Inventories
  inventories: Inventory[];
  inventorySessions: Inventory[];
  createInventorySession: (title?: string) => Inventory;
  updateInventoryItemCount: (inventoryId: string, productId: string, realStock: number, justification?: string) => void;
  updateInventoryCount: (inventoryId: string, productId: string, realStock: number, justification?: string) => void;
  validateInventory: (inventoryId: string, notes?: string) => { success: boolean; message?: string };
  cancelInventory: (inventoryId: string) => boolean;
  deleteInventory: (inventoryId: string) => boolean;

  // Activity Logs
  activityLogs: ActivityLog[];
  auditLogs: ActivityLog[];
  logActivity: (action: string, category: ActivityLog['category'], targetItem: string, details: string) => void;

  // Helper metrics
  metrics: {
    todaySales: number;
    todayMargin: number;
    weekSales: number;
    monthSales: number;
    monthPurchases: number;
    monthExpenses: number;
    monthNetProfit: number;
    totalStockCount: number;
    totalStockValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    currentCashBalance: number;
    totalCustomerDebt: number;
    totalSupplierDebt: number;
    shopHealth: 'GOOD' | 'WARNING' | 'CRITICAL';
    shopHealthReasons: string[];
  };

  // Reset & Backup
  resetAllData: () => void;
  resetAllDataToZero: () => void;
  resetToDemoData?: () => void;
  exportDatabaseJson: () => string;
  exportFullDatabase?: () => string;
  importDatabaseJson: (jsonData: string) => boolean;
  importFullDatabase?: (jsonData: string) => { success: boolean; message?: string };
  switchUser?: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USERS: 'bpm_users_v2_zero',
  CURRENT_USER: 'bpm_current_user_v2_zero',
  SETTINGS: 'bpm_settings_v2_zero',
  CATEGORIES: 'bpm_categories_v2_zero',
  PRODUCTS: 'bpm_products_v2_zero',
  SUPPLIERS: 'bpm_suppliers_v2_zero',
  CUSTOMERS: 'bpm_customers_v2_zero',
  STOCK_MOVEMENTS: 'bpm_movements_v2_zero',
  SALES: 'bpm_sales_v2_zero',
  PURCHASES: 'bpm_purchases_v2_zero',
  EXPENSES: 'bpm_expenses_v2_zero',
  CASH_REGISTER: 'bpm_cash_register_v2_zero',
  CASH_TRANSACTIONS: 'bpm_cash_tx_v2_zero',
  INVENTORIES: 'bpm_inventories_v2_zero',
  ACTIVITY_LOGS: 'bpm_activity_logs_v2_zero',
};

// Helper to sanitize payload for Firestore by stripping undefined fields
function sanitizeForFirestore<T>(data: T): any {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (e) {
    console.error('Error sanitizing data for Firestore:', e);
    return data;
  }
}

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // One-time cleanup of legacy demo caches
  try {
    if (!localStorage.getItem('bpm_reset_zero_completed_v2')) {
      // Clear legacy storage keys
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('bpm_')) {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem('bpm_reset_zero_completed_v2', 'true');
    }
  } catch (e) {
    console.warn('Storage cleanup error:', e);
  }

  // Local storage loader helper
  const loadState = <T,>(key: string, fallback: T): T => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(`Error loading state for ${key}`, e);
    }
    return fallback;
  };

  // States
  const [users, setUsers] = useState<User[]>(() => {
    const loaded = loadState(STORAGE_KEYS.USERS, INITIAL_USERS);
    return loaded.map((u: User) => {
      if (u.id === 'usr_admin' && (u.username === 'mamadou.admin' || !u.username)) {
        return { ...u, username: 'MD' };
      }
      return u;
    });
  });
  const [currentUser, setCurrentUserState] = useState<User>(() => loadState(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [settings, setSettings] = useState<StoreSettings>(() => loadState(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS));
  const [categories, setCategories] = useState<Category[]>(() => loadState(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES));
  const [products, setProducts] = useState<Product[]>(() => loadState(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => loadState(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS));
  const [customers, setCustomers] = useState<Customer[]>(() => loadState(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS));
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => loadState(STORAGE_KEYS.STOCK_MOVEMENTS, INITIAL_STOCK_MOVEMENTS));
  const [sales, setSales] = useState<Sale[]>(() => loadState(STORAGE_KEYS.SALES, INITIAL_SALES));
  const [purchases, setPurchases] = useState<Purchase[]>(() => loadState(STORAGE_KEYS.PURCHASES, INITIAL_PURCHASES));
  const [expenses, setExpenses] = useState<Expense[]>(() => loadState(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES));
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(() => loadState(STORAGE_KEYS.CASH_REGISTER, INITIAL_CASH_REGISTER));
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(() => loadState(STORAGE_KEYS.CASH_TRANSACTIONS, INITIAL_CASH_TRANSACTIONS));
  const [inventories, setInventories] = useState<Inventory[]>(() => loadState(STORAGE_KEYS.INVENTORIES, INITIAL_PAST_INVENTORIES));
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => loadState(STORAGE_KEYS.ACTIVITY_LOGS, INITIAL_ACTIVITY_LOGS));

  // Firebase Sync status states
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const isRemoteUpdate = useRef<boolean>(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync to local storage
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers)); }, [suppliers]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, JSON.stringify(stockMovements)); }, [stockMovements]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales)); }, [sales]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases)); }, [purchases]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CASH_REGISTER, JSON.stringify(cashRegister)); }, [cashRegister]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CASH_TRANSACTIONS, JSON.stringify(cashTransactions)); }, [cashTransactions]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.INVENTORIES, JSON.stringify(inventories)); }, [inventories]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(activityLogs)); }, [activityLogs]);

  // Firestore Real-Time Listener (Bi-directional sync)
  useEffect(() => {
    const docRef = doc(db, 'store_data', 'main_store');
    
    // Initial fetch / check if Firestore has existing state & ensure zero initialization
    getDoc(docRef).then((snap) => {
      const needsZeroReset = !localStorage.getItem('bpm_firestore_zero_synced_v2');
      if (!snap.exists() || needsZeroReset) {
        // Initialization or requested reset in Firestore: save zero data
        const initialPayload = sanitizeForFirestore({
          settings: INITIAL_SETTINGS,
          users: INITIAL_USERS,
          categories: INITIAL_CATEGORIES,
          products: [],
          suppliers: [],
          customers: [],
          stockMovements: [],
          sales: [],
          purchases: [],
          expenses: [],
          cashRegister: null,
          cashTransactions: [],
          inventories: [],
          activityLogs: INITIAL_ACTIVITY_LOGS,
          updatedAt: new Date().toISOString(),
        });
        setDoc(docRef, initialPayload)
          .then(() => {
            localStorage.setItem('bpm_firestore_zero_synced_v2', 'true');
          })
          .catch(err => console.warn('Init doc failed:', err));
      }
    }).catch(err => console.warn('Firestore initial check error:', err));

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const remote = docSnap.data();
        if (remote && !docSnap.metadata.hasPendingWrites) {
          isRemoteUpdate.current = true;
          if (remote.settings) setSettings(remote.settings);
          if (remote.users) setUsers(remote.users);
          if (remote.categories) setCategories(remote.categories);
          if (remote.products) setProducts(remote.products);
          if (remote.suppliers) setSuppliers(remote.suppliers);
          if (remote.customers) setCustomers(remote.customers);
          if (remote.stockMovements) setStockMovements(remote.stockMovements);
          if (remote.sales) setSales(remote.sales);
          if (remote.purchases) setPurchases(remote.purchases);
          if (remote.expenses) setExpenses(remote.expenses);
          if (remote.cashRegister !== undefined) setCashRegister(remote.cashRegister);
          if (remote.cashTransactions) setCashTransactions(remote.cashTransactions);
          if (remote.inventories) setInventories(remote.inventories);
          if (remote.activityLogs) setActivityLogs(remote.activityLogs);
          setIsCloudSynced(true);
          setTimeout(() => {
            isRemoteUpdate.current = false;
          }, 300);
        }
      }
    }, (error) => {
      console.warn('Firestore snapshot error:', error);
      setIsCloudSynced(false);
    });

    return () => unsubscribe();
  }, []);

  // Function to explicitly push state to Firebase Firestore
  const syncToCloudNow = async () => {
    try {
      setIsSyncing(true);
      const docRef = doc(db, 'store_data', 'main_store');
      const payload = sanitizeForFirestore({
        settings,
        users,
        categories,
        products,
        suppliers,
        customers,
        stockMovements,
        sales,
        purchases,
        expenses,
        cashRegister,
        cashTransactions,
        inventories,
        activityLogs,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(docRef, payload, { merge: true });
      setIsCloudSynced(true);
    } catch (e) {
      console.error('Failed to sync state to Firestore:', e);
      setIsCloudSynced(false);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto push to Firestore with debouncing whenever state changes locally
  useEffect(() => {
    if (isRemoteUpdate.current) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      syncToCloudNow();
    }, 1200);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [
    users,
    settings,
    categories,
    products,
    suppliers,
    customers,
    stockMovements,
    sales,
    purchases,
    expenses,
    cashRegister,
    cashTransactions,
    inventories,
    activityLogs,
  ]);

  // Log activity helper
  const logActivity = (action: string, category: ActivityLog['category'], targetItem: string, details: string) => {
    const newLog: ActivityLog = {
      id: generateId('log'),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      category,
      targetItem,
      details,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  const setCurrentUser = (user: User) => {
    setCurrentUserState(user);
    logActivity('Changement de session', 'CONNEXION', `Utilisateur: ${user.name}`, `Rôle actif: ${user.role}`);
  };

  const verifyPin = (userId: string, pin: string): boolean => {
    const user = (users || []).find(u => u.id === userId);
    if (!user) return false;
    // Standard PIN comparison (default to '0000' or user.pin)
    const expectedPin = user.pin || (user.role === 'ADMIN' ? '1234' : user.role === 'GERANT' ? '5678' : '0000');
    return String(expectedPin).trim() === String(pin).trim();
  };

  const login = (userId: string, pin: string): { success: boolean; message?: string } => {
    const user = (users || []).find(u => u.id === userId);
    if (!user) {
      return { success: false, message: 'Utilisateur introuvable.' };
    }
    if (user.active === false) {
      return { success: false, message: 'Ce compte utilisateur est désactivé.' };
    }
    if (!verifyPin(userId, pin)) {
      logActivity('Échec d\'authentification', 'CONNEXION', user.name, 'Code PIN incorrect');
      return { success: false, message: 'Code PIN incorrect. Veuillez réessayer.' };
    }

    setCurrentUserState(user);
    setIsAuthenticated(true);
    logActivity('Connexion réussie', 'CONNEXION', user.name, `Connexion établie avec le rôle: ${user.role}`);
    return { success: true };
  };

  const loginWithCredentials = (identifier: string, passwordOrPin: string): { success: boolean; user?: User; message?: string } => {
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPass = String(passwordOrPin || '').trim();

    if (!cleanId) {
      return { success: false, message: 'Veuillez saisir votre nom d\'utilisateur ou identifiant.' };
    }
    if (!cleanPass) {
      return { success: false, message: 'Veuillez renseigner votre mot de passe ou code PIN.' };
    }

    const digitsOnly = cleanId.replace(/\D/g, '');

    const foundUser = (users || []).find((u) => {
      const uUser = (u.username || '').trim().toLowerCase();
      const uEmail = (u.email || '').trim().toLowerCase();
      const uName = (u.name || '').trim().toLowerCase();
      const uFullName = (u.fullName || '').trim().toLowerCase();
      const uPhoneDigits = (u.phone || '').replace(/\D/g, '');

      const isMatch =
        uUser === cleanId ||
        uEmail === cleanId ||
        uName === cleanId ||
        uFullName === cleanId ||
        (cleanId === 'md' && (u.role === 'ADMIN' || u.id === 'usr_admin' || uUser === 'md')) ||
        (cleanId === 'admin' && u.role === 'ADMIN') ||
        (digitsOnly.length >= 6 && uPhoneDigits.endsWith(digitsOnly));

      return isMatch;
    });

    if (!foundUser) {
      logActivity('Tentative de connexion inconnue', 'CONNEXION', cleanId, 'Identifiant non répertorié');
      return { success: false, message: 'Nom d\'utilisateur ou mot de passe incorrect.' };
    }

    if (foundUser.active === false) {
      logActivity('Connexion refusée', 'CONNEXION', foundUser.fullName || foundUser.name, 'Compte désactivé');
      return { success: false, message: 'Ce compte utilisateur a été désactivé par l\'administrateur.' };
    }

    const expectedPin = String(foundUser.pin || (foundUser.role === 'ADMIN' ? '1234' : foundUser.role === 'GERANT' ? '5678' : '0000')).trim();
    if (expectedPin !== cleanPass) {
      logActivity('Échec d\'authentification', 'CONNEXION', foundUser.fullName || foundUser.name, 'Mot de passe ou Code PIN erroné');
      return { success: false, message: 'Nom d\'utilisateur ou mot de passe incorrect.' };
    }

    setCurrentUserState(foundUser);
    setIsAuthenticated(true);
    logActivity('Connexion réussie au poste', 'CONNEXION', foundUser.fullName || foundUser.name, `Poste PC déverrouillé - Rôle: ${foundUser.role} (@${foundUser.username || foundUser.name})`);
    return { success: true, user: foundUser };
  };

  const logout = () => {
    setIsAuthenticated(false);
    logActivity('Déconnexion', 'CONNEXION', currentUser?.name || 'Session', 'Fermeture de session');
  };

  const lockSession = () => {
    setIsAuthenticated(false);
    logActivity('Verrouillage session', 'CONNEXION', currentUser?.name || 'Session', 'Écran verrouillé');
  };

  const switchUserWithPin = (userId: string, pin: string): { success: boolean; message?: string } => {
    return login(userId, pin);
  };

  const addUser = (newUser: Omit<User, 'id' | 'createdAt'>) => {
    const u: User = {
      ...newUser,
      id: generateId('usr'),
      createdAt: new Date().toISOString(),
    };
    setUsers(prev => [...prev, u]);
    logActivity('Création d\'utilisateur', 'SYSTEME', u.name, `Rôle: ${u.role} (${u.email})`);
  };

  const updateUser = (id: string, updated: Partial<User>) => {
    const targetUser = users.find(u => u.id === id);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updated } : u));
    if (currentUser.id === id) {
      setCurrentUserState(prev => ({ ...prev, ...updated }));
    }
    const userName = targetUser?.fullName || targetUser?.name || `ID: ${id}`;
    if (updated.pin !== undefined) {
      logActivity('Changement de Code PIN', 'SYSTEME', userName, `Mise à jour sécurisée du code PIN / mot de passe par l'administrateur`);
    } else if (updated.active !== undefined) {
      logActivity('Changement de Statut Compte', 'SYSTEME', userName, `Compte ${updated.active ? 'activé' : 'désactivé'}`);
    } else {
      logActivity('Modification de Compte Utilisateur', 'SYSTEME', userName, `Mise à jour des informations de compte (${updated.role ? 'Rôle: ' + updated.role : 'Profil'})`);
    }
  };

  const deleteUser = (id: string) => {
    if ((users || []).length <= 1) return false;
    const target = (users || []).find(u => u.id === id);
    if (!target) return false;
    setUsers(prev => (prev || []).filter(u => u.id !== id));
    logActivity('Suppression d\'utilisateur', 'SYSTEME', target.name, `Utilisateur supprimé`);
    return true;
  };

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    logActivity('Modification des paramètres', 'SYSTEME', 'Boutique', 'Mise à jour des réglages généraux');
  };

  const loadBusinessPreset = (presetId: BusinessType, loadSampleProducts = false): boolean => {
    const preset = (BUSINESS_PRESETS || []).find(p => p.id === presetId);
    if (!preset) return false;

    // Update settings
    setSettings(prev => ({
      ...prev,
      businessType: preset.id,
      storeName: preset.defaultSettings.storeName || prev.storeName,
      storeTagline: preset.defaultSettings.storeTagline || prev.storeTagline,
      receiptFooterMessage: preset.defaultSettings.receiptFooterMessage || prev.receiptFooterMessage,
      lowStockThresholdDefault: preset.defaultSettings.lowStockThresholdDefault || prev.lowStockThresholdDefault,
    }));

    // Update categories
    setCategories(preset.sampleCategories);

    // If requested, add sample products
    if (loadSampleProducts && preset.sampleProducts.length > 0) {
      preset.sampleProducts.forEach(sample => {
        addProduct(sample);
      });
    }

    logActivity('Chargement modèle boutique', 'SYSTEME', preset.name, `Modèle commercial appliqué`);
    return true;
  };

  const addCategory = (category: Omit<Category, 'id'>) => {
    const newCat: Category = {
      ...category,
      id: generateId('cat'),
    };
    setCategories(prev => [...prev, newCat]);
    logActivity('Ajout catégorie', 'STOCK', newCat.name, 'Nouvelle catégorie créée');
  };

  // Stock Movement Core Engine
  const createStockMovement = (
    productId: string,
    quantity: number,
    type: MovementType,
    reason: string,
    referenceId?: string
  ): boolean => {
    const product = (products || []).find(p => p.id === productId);
    if (!product) return false;

    const previousStock = product.currentStock;
    const newStock = previousStock + quantity;

    if (newStock < 0 && !settings.allowNegativeStock) {
      return false; // Prevent negative stock
    }

    const movement: StockMovement = {
      id: generateId('mov'),
      productId,
      productName: product.name,
      quantity,
      type,
      previousStock,
      newStock,
      unitCost: product.purchasePrice,
      userId: currentUser.id,
      userName: currentUser.name,
      date: new Date().toISOString(),
      reason,
      referenceId,
    };

    setStockMovements(prev => [movement, ...prev]);
    setProducts(prev =>
      prev.map(p =>
        p.id === productId
          ? { ...p, currentStock: newStock, updatedAt: new Date().toISOString() }
          : p
      )
    );

    return true;
  };

  // Products
  const addProduct = (pData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product => {
    const newProd: Product = {
      ...pData,
      id: generateId('prod'),
      code: pData.code || `ART-${Math.floor(1000 + Math.random() * 9000)}`,
      barcode: pData.barcode || `${Math.floor(600000000000 + Math.random() * 99999999999)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProducts(prev => [newProd, ...prev]);

    // If initial stock is positive, record initial movement
    if (newProd.currentStock > 0) {
      const initialMov: StockMovement = {
        id: generateId('mov'),
        productId: newProd.id,
        productName: newProd.name,
        quantity: newProd.currentStock,
        type: 'ENTREE',
        previousStock: 0,
        newStock: newProd.currentStock,
        unitCost: newProd.purchasePrice,
        userId: currentUser.id,
        userName: currentUser.name,
        date: new Date().toISOString(),
        reason: 'Stock initial à la création du produit',
      };
      setStockMovements(prev => [initialMov, ...prev]);
    }

    logActivity('Ajout produit', 'STOCK', newProd.name, `Prix vente: ${newProd.salePrice}, Stock: ${newProd.currentStock}`);
    return newProd;
  };

  const updateProduct = (id: string, pData: Partial<Product>) => {
    const existing = (products || []).find(p => p.id === id);
    if (!existing) return;

    // Detect price changes or manual stock corrections
    if (pData.salePrice !== undefined && pData.salePrice !== existing.salePrice) {
      logActivity(
        'Modification prix de vente',
        'PRIX',
        existing.name,
        `Ancien: ${existing.salePrice} -> Nouveau: ${pData.salePrice}`
      );
    }
    if (pData.purchasePrice !== undefined && pData.purchasePrice !== existing.purchasePrice) {
      logActivity(
        'Modification prix d\'achat',
        'PRIX',
        existing.name,
        `Ancien: ${existing.purchasePrice} -> Nouveau: ${pData.purchasePrice}`
      );
    }

    // If manual stock field changed directly from form
    if (pData.currentStock !== undefined && pData.currentStock !== existing.currentStock) {
      const diff = pData.currentStock - existing.currentStock;
      createStockMovement(
        id,
        diff,
        'CORRECTION_MANUELLE',
        'Correction manuelle depuis la fiche produit'
      );
    }

    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, ...pData, updatedAt: new Date().toISOString() } : p))
    );
    logActivity('Mise à jour produit', 'STOCK', existing.name, 'Fiche produit modifiée');
  };

  const deleteProduct = (id: string): { success: boolean; message?: string } => {
    const prod = (products || []).find(p => p.id === id);
    if (!prod) return { success: false, message: 'Produit introuvable.' };

    // Business rule: prevent deleting product if it has sales history
    const hasSales = (sales || []).some(s => (s.items || []).some(it => it.productId === id));
    if (hasSales) {
      return {
        success: false,
        message: 'Impossible de supprimer ce produit car il possède un historique de ventes. Désactivez-le plutôt.',
      };
    }

    setProducts(prev => (prev || []).filter(p => p.id !== id));
    logActivity('Suppression produit', 'STOCK', prod.name, 'Produit retiré du catalogue');
    return { success: true };
  };

  const importProducts = (productsList: Partial<Product>[]): number => {
    let count = 0;
    (productsList || []).forEach(p => {
      if (p.name && p.salePrice !== undefined) {
        addProduct({
          code: p.code || `IMP-${Math.floor(1000 + Math.random() * 9000)}`,
          barcode: p.barcode || `${Math.floor(600000000000 + Math.random() * 99999999999)}`,
          name: p.name,
          description: p.description || '',
          categoryId: p.categoryId || categories[0]?.id || 'cat_alim',
          brand: p.brand || '',
          unit: p.unit || 'pièce',
          purchasePrice: Number(p.purchasePrice) || 0,
          salePrice: Number(p.salePrice) || 0,
          currentStock: Number(p.currentStock) || 0,
          minStock: Number(p.minStock) || settings.lowStockThresholdDefault,
          maxStock: Number(p.maxStock) || 100,
          supplierId: p.supplierId,
          location: p.location || '',
          active: true,
        });
        count++;
      }
    });
    logActivity('Import massif de produits', 'STOCK', `${count} produits`, 'Import CSV/JSON effectué');
    return count;
  };

  // Suppliers & Purchases
  const addSupplier = (sData: Omit<Supplier, 'id' | 'createdAt' | 'totalPurchased' | 'debtBalance'>) => {
    const newSup: Supplier = {
      ...sData,
      id: generateId('sup'),
      totalPurchased: 0,
      debtBalance: 0,
      createdAt: new Date().toISOString(),
    };
    setSuppliers(prev => [...(prev || []), newSup]);
    logActivity('Ajout fournisseur', 'FOURNISSEUR', newSup.companyName, `Contact: ${newSup.contactName}`);
  };

  const updateSupplier = (id: string, sData: Partial<Supplier>) => {
    setSuppliers(prev => (prev || []).map(s => s.id === id ? { ...s, ...sData } : s));
  };

  const deleteSupplier = (id: string) => {
    const hasPurchases = (purchases || []).some(p => p.supplierId === id);
    if (hasPurchases) {
      return { success: false, message: 'Ce fournisseur est associé à des bons de commande existants.' };
    }
    const sup = (suppliers || []).find(s => s.id === id);
    setSuppliers(prev => (prev || []).filter(s => s.id !== id));
    logActivity('Suppression fournisseur', 'FOURNISSEUR', sup?.companyName || id, 'Fournisseur supprimé');
    return { success: true };
  };

  const paySupplierDebt = (supplierId: string, amount: number, paymentMethod: PaymentMethod): boolean => {
    const sup = (suppliers || []).find(s => s.id === supplierId);
    if (!sup || amount <= 0 || amount > sup.debtBalance) return false;

    setSuppliers(prev =>
      (prev || []).map(s => (s.id === supplierId ? { ...s, debtBalance: s.debtBalance - amount } : s))
    );

    // If cash register open and cash paid, register cash transaction
    if (paymentMethod === 'ESPECES' && cashRegister && cashRegister.isOpen) {
      addCashTransaction(
        'PAIEMENT_DETTE_FOURNISSEUR',
        -amount,
        `Règlement dette fournisseur: ${sup.companyName}`,
        paymentMethod
      );
    }

    logActivity('Règlement dette fournisseur', 'FOURNISSEUR', sup.companyName, `Montant versé: ${amount}`);
    return true;
  };

  const createPurchase = (
    supplierId: string,
    items: PurchaseItem[],
    paidAmount: number,
    paymentMethod: PaymentMethod,
    notes?: string
  ): Purchase => {
    const sup = (suppliers || []).find(s => s.id === supplierId);
    const totalAmount = items.reduce((sum, it) => sum + it.totalCost, 0);
    const remainingAmount = Math.max(0, totalAmount - paidAmount);

    const purchase: Purchase = {
      id: generateId('purch'),
      orderNumber: generateOrderNumber(purchases.length),
      supplierId,
      supplierName: sup ? sup.companyName : 'Fournisseur inconnu',
      date: new Date().toISOString(),
      items,
      totalAmount,
      paidAmount,
      remainingAmount,
      paymentMethod,
      status: 'COMMANDE',
      notes,
      createdBy: currentUser.name,
    };

    setPurchases(prev => [purchase, ...prev]);

    // Update supplier total purchased and debt
    if (sup) {
      setSuppliers(prev =>
        prev.map(s =>
          s.id === supplierId
            ? {
                ...s,
                totalPurchased: s.totalPurchased + totalAmount,
                debtBalance: s.debtBalance + remainingAmount,
              }
            : s
        )
      );
    }

    // Cash transaction if paid with cash
    if (paidAmount > 0 && paymentMethod === 'ESPECES' && cashRegister && cashRegister.isOpen) {
      addCashTransaction(
        'SORTIE',
        -paidAmount,
        `Acompte achat ${purchase.orderNumber} (${sup?.companyName})`,
        paymentMethod
      );
    }

    logActivity('Nouvelle commande fournisseur', 'ACHAT', purchase.orderNumber, `Montant: ${totalAmount}, Fournisseur: ${sup?.companyName}`);
    return purchase;
  };

  const updatePurchaseStatus = (purchaseId: string, status: Purchase['status']): boolean => {
    const purchase = (purchases || []).find(p => p.id === purchaseId);
    if (!purchase) return false;

    // If status changes to 'RECU', automatically increase stock for each item
    if (status === 'RECU' && purchase.status !== 'RECU') {
      (purchase.items || []).forEach(it => {
        createStockMovement(
          it.productId,
          it.quantity,
          'ENTREE',
          `Réception commande fournisseur ${purchase.orderNumber}`,
          purchase.id
        );
      });
      purchase.receivedDate = new Date().toISOString();
    }

    setPurchases(prev =>
      (prev || []).map(p => (p.id === purchaseId ? { ...p, status, receivedDate: status === 'RECU' ? new Date().toISOString() : p.receivedDate } : p))
    );

    logActivity('Changement statut achat', 'ACHAT', purchase.orderNumber, `Statut: ${status}`);
    return true;
  };

  // Customers & Sales
  const addCustomer = (cData: Omit<Customer, 'id' | 'createdAt' | 'totalSpent' | 'creditBalance' | 'salesCount'>): Customer => {
    const newCust: Customer = {
      ...cData,
      id: generateId('cust'),
      totalSpent: 0,
      creditBalance: 0,
      salesCount: 0,
      createdAt: new Date().toISOString(),
    };
    setCustomers(prev => [...(prev || []), newCust]);
    logActivity('Ajout client', 'CLIENT', newCust.name, `Téléphone: ${newCust.phone}`);
    return newCust;
  };

  const updateCustomer = (id: string, cData: Partial<Customer>) => {
    setCustomers(prev => (prev || []).map(c => (c.id === id ? { ...c, ...cData } : c)));
  };

  const deleteCustomer = (id: string) => {
    const hasSales = (sales || []).some(s => s.customerId === id);
    if (hasSales) {
      return { success: false, message: 'Ce client est associé à des ventes enregistrées.' };
    }
    const cust = (customers || []).find(c => c.id === id);
    setCustomers(prev => (prev || []).filter(c => c.id !== id));
    logActivity('Suppression client', 'CLIENT', cust?.name || id, 'Fiche client supprimée');
    return { success: true };
  };

  const payCustomerCredit = (customerId: string, amount: number, paymentMethod: PaymentMethod): boolean => {
    const cust = (customers || []).find(c => c.id === customerId);
    if (!cust || amount <= 0 || amount > cust.creditBalance) return false;

    setCustomers(prev =>
      (prev || []).map(c => (c.id === customerId ? { ...c, creditBalance: c.creditBalance - amount } : c))
    );

    // Register cash entry if paid cash
    if (paymentMethod === 'ESPECES' && cashRegister && cashRegister.isOpen) {
      addCashTransaction(
        'PAIEMENT_DETTE_CLIENT',
        amount,
        `Règlement crédit client: ${cust.name}`,
        paymentMethod
      );
    }

    logActivity('Encaissement crédit client', 'CLIENT', cust.name, `Montant réglé: ${amount}`);
    return true;
  };

  // Sale Core Execution
  const createSale = (
    items: SaleItem[],
    paymentMethod: PaymentMethod,
    amountReceived: number,
    customerId?: string,
    notes?: string
  ): { success: boolean; sale?: Sale; message?: string } => {
    if (!items || items.length === 0) {
      return { success: false, message: 'Le panier est vide. Veuillez ajouter au moins un produit.' };
    }

    // Verify stock availability
    for (const item of items) {
      const prod = (products || []).find(p => p.id === item.productId);
      if (!prod) {
        return { success: false, message: `Produit introuvable: ${item.productName}` };
      }
      if (!settings.allowNegativeStock && prod.currentStock < item.quantity) {
        return {
          success: false,
          message: `Stock insuffisant pour "${prod.name}". Stock actuel: ${prod.currentStock}, Quantité demandée: ${item.quantity}`,
        };
      }
    }

    const subtotal = items.reduce((sum, it) => sum + it.total, 0);
    const taxAmount = settings.taxEnabled ? (subtotal * settings.taxRatePercent) / 100 : 0;
    const totalAmount = Math.round(subtotal + taxAmount);
    const totalCost = items.reduce((sum, it) => sum + it.unitCost * it.quantity, 0);
    const totalMargin = totalAmount - totalCost;
    const changeGiven = paymentMethod === 'ESPECES' ? Math.max(0, amountReceived - totalAmount) : 0;

    const cust = customerId ? (customers || []).find(c => c.id === customerId) : undefined;

    const prefix = settings.invoicePrefix || 'FAC-';
    const year = new Date().getFullYear();
    const padded = String((sales || []).length + 1).padStart(4, '0');
    const invoiceNumber = `${prefix}${year}-${padded}`;

    // Ensure all items carry productUnit and productCode
    const enrichedItems: SaleItem[] = items.map(it => {
      const prod = (products || []).find(p => p.id === it.productId);
      return {
        ...it,
        productCode: it.productCode || prod?.code,
        productUnit: it.productUnit || prod?.unit || 'pièce',
      };
    });

    const sale: Sale = {
      id: generateId('sale'),
      invoiceNumber,
      date: new Date().toISOString(),
      items: enrichedItems,
      subtotal,
      discountTotal: items.reduce((sum, it) => sum + (it.unitPrice * it.quantity * it.discountPercent) / 100, 0),
      taxAmount,
      totalAmount,
      totalCost,
      totalMargin,
      paymentMethod,
      amountReceived,
      changeGiven,
      customerId,
      customerName: cust ? cust.name : undefined,
      userId: currentUser.id,
      userName: currentUser.name,
      status: 'COMPLETEE',
      notes,
    };

    // 1. Save Sale
    setSales(prev => [sale, ...(prev || [])]);

    // 2. Decrease Stock automatically and create movement for each item
    items.forEach(it => {
      createStockMovement(
        it.productId,
        -it.quantity,
        'VENTE',
        `Vente POS ticket ${sale.invoiceNumber}`,
        sale.id
      );
    });

    // 3. Update Customer records if assigned
    if (cust) {
      setCustomers(prev =>
        (prev || []).map(c =>
          c.id === cust.id
            ? {
                ...c,
                totalSpent: c.totalSpent + totalAmount,
                salesCount: c.salesCount + 1,
                creditBalance: paymentMethod === 'CREDIT' ? c.creditBalance + totalAmount : c.creditBalance,
              }
            : c
        )
      );
    }

    // 4. Update Cash Register if cash sale and cash register is open
    if (paymentMethod === 'ESPECES') {
      if (cashRegister && cashRegister.isOpen) {
        addCashTransaction('VENTE', totalAmount, `Vente ${sale.invoiceNumber} (Espèces)`, 'ESPECES');
      }
    }

    logActivity(
      'Vente validée',
      'VENTE',
      sale.invoiceNumber,
      `Montant: ${totalAmount}, Mode: ${paymentMethod}, Articles: ${items.length}`
    );

    return { success: true, sale };
  };

  const cancelSale = (saleId: string, reason: string): { success: boolean; message?: string } => {
    const sale = (sales || []).find(s => s.id === saleId);
    if (!sale) return { success: false, message: 'Vente introuvable.' };
    if (sale.status === 'ANNULEE') return { success: false, message: 'Cette vente est déjà annulée.' };

    // Restock all items
    sale.items.forEach(it => {
      createStockMovement(
        it.productId,
        it.quantity,
        'RETOUR_CLIENT',
        `Annulation vente ${sale.invoiceNumber} : ${reason}`,
        sale.id
      );
    });

    // Revert customer credit or total spent
    if (sale.customerId) {
      setCustomers(prev =>
        prev.map(c =>
          c.id === sale.customerId
            ? {
                ...c,
                totalSpent: Math.max(0, c.totalSpent - sale.totalAmount),
                salesCount: Math.max(0, c.salesCount - 1),
                creditBalance: sale.paymentMethod === 'CREDIT' ? Math.max(0, c.creditBalance - sale.totalAmount) : c.creditBalance,
              }
            : c
        )
      );
    }

    // Cash transaction refund if cash sale
    if (sale.paymentMethod === 'ESPECES' && cashRegister && cashRegister.isOpen) {
      addCashTransaction(
        'REMBOURSEMENT_CLIENT',
        -sale.totalAmount,
        `Remboursement annulation vente ${sale.invoiceNumber}`,
        'ESPECES'
      );
    }

    setSales(prev => prev.map(s => (s.id === saleId ? { ...s, status: 'ANNULEE' } : s)));
    logActivity('Annulation de vente', 'VENTE', sale.invoiceNumber, `Motif: ${reason}`);

    return { success: true };
  };

  // Expenses
  const addExpense = (eData: Omit<Expense, 'id' | 'userId' | 'userName'>): boolean => {
    const exp: Expense = {
      ...eData,
      id: generateId('exp'),
      userId: currentUser.id,
      userName: currentUser.name,
    };
    setExpenses(prev => [exp, ...prev]);

    // If paid cash and register open, register cash out
    if (exp.paymentMethod === 'ESPECES' && cashRegister && cashRegister.isOpen) {
      addCashTransaction('DEPENSE', -exp.amount, `Dépense: ${exp.category} - ${exp.description}`, 'ESPECES');
    }

    logActivity('Enregistrement dépense', 'CAISSE', exp.category, `Montant: ${exp.amount} (${exp.description})`);
    return true;
  };

  const deleteExpense = (id: string): boolean => {
    const exp = (expenses || []).find(e => e.id === id);
    if (!exp) return false;
    setExpenses(prev => prev.filter(e => e.id !== id));
    logActivity('Suppression dépense', 'CAISSE', exp.category, `Suppression dépense ${exp.description} (${exp.amount})`);
    return true;
  };

  // Cash Register Management
  const openCashRegister = (openingBalance: number, notes?: string): boolean => {
    if (cashRegister && cashRegister.isOpen) return false;

    const newReg: CashRegister = {
      id: generateId('csh_session'),
      openedAt: new Date().toISOString(),
      openedBy: currentUser.id,
      openedByName: currentUser.name,
      openingBalance,
      isOpen: true,
      totalSales: 0,
      totalExpenses: 0,
      totalIn: 0,
      totalOut: 0,
      notes,
    };

    setCashRegister(newReg);

    const initTx: CashTransaction = {
      id: generateId('tx'),
      cashRegisterId: newReg.id,
      type: 'OUVERTURE',
      amount: openingBalance,
      reason: 'Ouverture de caisse - Fond initial',
      userId: currentUser.id,
      userName: currentUser.name,
      date: new Date().toISOString(),
      paymentMethod: 'ESPECES',
    };

    setCashTransactions(prev => [initTx, ...prev]);
    logActivity('Ouverture de caisse', 'CAISSE', 'Caisse', `Fond initial: ${openingBalance}`);
    return true;
  };

  const addCashTransaction = (
    type: CashTransaction['type'],
    amount: number,
    reason: string,
    paymentMethod?: PaymentMethod
  ): boolean => {
    if (!cashRegister || !cashRegister.isOpen) return false;

    const tx: CashTransaction = {
      id: generateId('tx'),
      cashRegisterId: cashRegister.id,
      type,
      amount,
      reason,
      userId: currentUser.id,
      userName: currentUser.name,
      date: new Date().toISOString(),
      paymentMethod,
    };

    setCashTransactions(prev => [tx, ...prev]);

    // Update totals in current register
    setCashRegister(prev => {
      if (!prev) return null;
      let { totalSales, totalExpenses, totalIn, totalOut } = prev;
      if (type === 'VENTE') totalSales += amount;
      if (type === 'DEPENSE') totalExpenses += Math.abs(amount);
      if (amount > 0 && type !== 'VENTE' && type !== 'OUVERTURE') totalIn += amount;
      if (amount < 0 && type !== 'DEPENSE') totalOut += Math.abs(amount);
      return { ...prev, totalSales, totalExpenses, totalIn, totalOut };
    });

    return true;
  };

  const closeCashRegister = (
    realClosingBalance: number,
    discrepancyReason?: string,
    notes?: string
  ): boolean => {
    if (!cashRegister || !cashRegister.isOpen) return false;

    // Calculate theoretical cash balance
    const sessionTx = cashTransactions.filter(tx => tx.cashRegisterId === cashRegister.id);
    const theoreticalBalance = sessionTx.reduce((sum, tx) => sum + tx.amount, 0);
    const discrepancy = realClosingBalance - theoreticalBalance;

    const closedReg: CashRegister = {
      ...cashRegister,
      closedAt: new Date().toISOString(),
      closedBy: currentUser.id,
      closedByName: currentUser.name,
      closingBalanceTheoretical: theoreticalBalance,
      closingBalanceReal: realClosingBalance,
      discrepancy,
      discrepancyReason: discrepancy !== 0 ? discrepancyReason || 'Écart non spécifié' : undefined,
      isOpen: false,
      notes,
    };

    setCashRegister(closedReg);

    const closeTx: CashTransaction = {
      id: generateId('tx'),
      cashRegisterId: cashRegister.id,
      type: 'FERMETURE',
      amount: 0,
      reason: `Clôture de caisse. Réel: ${realClosingBalance}, Théorique: ${theoreticalBalance}, Écart: ${discrepancy}`,
      userId: currentUser.id,
      userName: currentUser.name,
      date: new Date().toISOString(),
    };

    setCashTransactions(prev => [closeTx, ...prev]);
    logActivity(
      'Fermeture de caisse',
      'CAISSE',
      'Caisse',
      `Solde réel: ${realClosingBalance}, Théorique: ${theoreticalBalance}, Écart: ${discrepancy}`
    );

    return true;
  };

  // Monthly Inventory Management
  const createInventorySession = (title?: string): Inventory => {
    const sessionTitle = title?.trim() || `Inventaire du ${new Date().toLocaleDateString('fr-FR')}`;
    const items: InventoryItem[] = (products || []).map(p => {
      const cat = (categories || []).find(c => c.id === p.categoryId);
      return {
        productId: p.id,
        productCode: p.code,
        productName: p.name,
        categoryName: cat ? cat.name : 'Général',
        unitCost: p.purchasePrice,
        unitPrice: p.salePrice,
        theoreticalStock: p.currentStock,
        realStock: p.currentStock, // default initialized to theoretical
        difference: 0,
        financialDifference: 0,
        counted: false,
      };
    });

    const theoreticalVal = items.reduce((sum, it) => sum + it.theoreticalStock * it.unitCost, 0);

    const newInv: Inventory = {
      id: generateId('inv'),
      title: sessionTitle,
      date: new Date().toISOString(),
      responsibleId: currentUser.id,
      responsibleName: currentUser.name,
      items,
      totalProductsCounted: 0,
      totalTheoreticalStockValue: theoreticalVal,
      totalRealStockValue: theoreticalVal,
      totalLossesValue: 0,
      totalSurplusValue: 0,
      netDifferenceValue: 0,
      status: 'EN_COURS',
    };

    setInventories(prev => [newInv, ...(prev || [])]);
    logActivity('Nouvelle session d\'inventaire', 'INVENTAIRE', sessionTitle, `Responsable: ${currentUser.name}`);
    return newInv;
  };

  const updateInventoryItemCount = (
    inventoryId: string,
    productId: string,
    realStock: number,
    justification?: string
  ) => {
    setInventories(prev =>
      prev.map(inv => {
        if (inv.id !== inventoryId || inv.status !== 'EN_COURS') return inv;

        const updatedItems = inv.items.map(it => {
          if (it.productId === productId) {
            const difference = realStock - it.theoreticalStock;
            const financialDifference = difference * it.unitCost;
            return {
              ...it,
              realStock,
              difference,
              financialDifference,
              justification: justification ?? it.justification,
              counted: true,
            };
          }
          return it;
        });

        const countedCount = updatedItems.filter(it => it.counted).length;
        const totalRealValue = updatedItems.reduce((sum, it) => sum + it.realStock * it.unitCost, 0);
        const lossesVal = updatedItems.filter(it => it.difference < 0).reduce((sum, it) => sum + Math.abs(it.financialDifference), 0);
        const surplusVal = updatedItems.filter(it => it.difference > 0).reduce((sum, it) => sum + it.financialDifference, 0);

        return {
          ...inv,
          items: updatedItems,
          totalProductsCounted: countedCount,
          totalRealStockValue: totalRealValue,
          totalLossesValue: lossesVal,
          totalSurplusValue: surplusVal,
          netDifferenceValue: surplusVal - lossesVal,
        };
      })
    );
  };

  const validateInventory = (inventoryId: string, notes?: string): { success: boolean; message?: string } => {
    const inv = inventories.find(i => i.id === inventoryId);
    if (!inv) return { success: false, message: 'Inventaire introuvable.' };
    if (inv.status !== 'EN_COURS') return { success: false, message: 'Cet inventaire a déjà été traité.' };

    // Apply adjustments to system stock
    inv.items.forEach(it => {
      if (it.difference !== 0) {
        createStockMovement(
          it.productId,
          it.difference,
          'AJUSTEMENT_INVENTAIRE',
          `Régularisation ${inv.title} (${it.justification || 'Ajustement inventaire'})`,
          inv.id
        );
      }
    });

    setInventories(prev =>
      prev.map(i =>
        i.id === inventoryId
          ? {
              ...i,
              status: 'VALIDE',
              validatedAt: new Date().toISOString(),
              validatedBy: currentUser.name,
              notes: notes || i.notes,
            }
          : i
      )
    );

    logActivity('Validation inventaire mensuel', 'INVENTAIRE', inv.title, `Pertes: ${inv.totalLossesValue}, Surplus: ${inv.totalSurplusValue}`);
    return { success: true };
  };

  const cancelInventory = (inventoryId: string): boolean => {
    const inv = inventories.find(i => i.id === inventoryId);
    if (!inv || inv.status !== 'EN_COURS') return false;

    setInventories(prev =>
      prev.map(i => (i.id === inventoryId ? { ...i, status: 'ANNULE' } : i))
    );
    logActivity('Annulation session inventaire', 'INVENTAIRE', inv.title, 'Session annulée');
    return true;
  };

  const deleteInventory = (inventoryId: string): boolean => {
    const inv = inventories.find(i => i.id === inventoryId);
    if (!inv) return false;

    setInventories(prev => prev.filter(i => i.id !== inventoryId));
    logActivity('Suppression session inventaire', 'INVENTAIRE', inv.title, 'Session supprimée');
    return true;
  };

  // High-Level Metrics Computation
  const metrics = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Sales metrics
    const completedSales = sales.filter(s => s.status === 'COMPLETEE');
    
    const todaySalesList = completedSales.filter(s => s.date.startsWith(todayStr));
    const todaySales = todaySalesList.reduce((sum, s) => sum + s.totalAmount, 0);
    const todayMargin = todaySalesList.reduce((sum, s) => sum + s.totalMargin, 0);

    const weekSales = completedSales
      .filter(s => new Date(s.date) >= startOfWeek)
      .reduce((sum, s) => sum + s.totalAmount, 0);

    const monthSalesList = completedSales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const monthSales = monthSalesList.reduce((sum, s) => sum + s.totalAmount, 0);
    const monthCostOfGoods = monthSalesList.reduce((sum, s) => sum + s.totalCost, 0);

    const monthExpenses = expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const monthPurchases = purchases
      .filter(p => {
        const d = new Date(p.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && p.status !== 'ANNULE';
      })
      .reduce((sum, p) => sum + p.totalAmount, 0);

    // Benefice = CA - Cout d'achat des marchandises vendues - Depenses
    const monthNetProfit = monthSales - monthCostOfGoods - monthExpenses;

    // Stock metrics
    const totalStockCount = products.reduce((sum, p) => sum + p.currentStock, 0);
    const totalStockValue = products.reduce((sum, p) => sum + p.currentStock * p.purchasePrice, 0);
    const outOfStockCount = products.filter(p => p.currentStock <= 0).length;
    const lowStockCount = products.filter(p => p.currentStock > 0 && p.currentStock <= p.minStock).length;

    // Cash metrics
    let currentCashBalance = 0;
    if (cashRegister && cashRegister.isOpen) {
      const sessionTx = cashTransactions.filter(tx => tx.cashRegisterId === cashRegister.id);
      currentCashBalance = sessionTx.reduce((sum, tx) => sum + tx.amount, 0);
    }

    // Debts & Credits
    const totalCustomerDebt = customers.reduce((sum, c) => sum + c.creditBalance, 0);
    const totalSupplierDebt = suppliers.reduce((sum, s) => sum + s.debtBalance, 0);

    // Shop Health algorithm
    const healthReasons: string[] = [];
    let health: 'GOOD' | 'WARNING' | 'CRITICAL' = 'GOOD';

    if (outOfStockCount > 0) {
      healthReasons.push(`${outOfStockCount} produit(s) en rupture totale`);
      health = 'WARNING';
    }
    if (lowStockCount >= 3) {
      healthReasons.push(`${lowStockCount} produits sous le stock minimum`);
      if ((health as string) !== 'CRITICAL') health = 'WARNING';
    }
    if (cashRegister && cashRegister.discrepancy && Math.abs(cashRegister.discrepancy) > 1000) {
      healthReasons.push(`Écart de caisse de ${cashRegister.discrepancy} constaté`);
      health = 'CRITICAL';
    }
    if (totalSupplierDebt > 200000) {
      healthReasons.push(`Dettes fournisseurs élevées (${totalSupplierDebt} ${settings.currency})`);
      health = 'WARNING';
    }
    if (monthNetProfit < 0) {
      healthReasons.push(`Bénéfice négatif ce mois (${monthNetProfit} ${settings.currency})`);
      health = 'CRITICAL';
    }
    if (healthReasons.length === 0) {
      healthReasons.push('Boutique rentable et approvisionnée');
    }

    return {
      todaySales,
      todayMargin,
      weekSales,
      monthSales,
      monthPurchases,
      monthExpenses,
      monthNetProfit,
      totalStockCount,
      totalStockValue,
      lowStockCount,
      outOfStockCount,
      currentCashBalance,
      totalCustomerDebt,
      totalSupplierDebt,
      shopHealth: health,
      shopHealthReasons: healthReasons,
    };
  }, [sales, products, expenses, purchases, cashRegister, cashTransactions, customers, suppliers, settings.currency]);

  // Reset & Backup Tools
  const resetAllDataToZero = async () => {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    setUsers(INITIAL_USERS);
    setCurrentUserState(INITIAL_USERS[0]);
    setSettings(INITIAL_SETTINGS);
    setCategories(INITIAL_CATEGORIES);
    setProducts([]);
    setSuppliers([]);
    setCustomers([]);
    setStockMovements([]);
    setSales([]);
    setPurchases([]);
    setExpenses([]);
    setCashRegister(null);
    setCashTransactions([]);
    setInventories([]);
    const freshLogs: ActivityLog[] = [
      {
        id: `act_${Date.now()}`,
        userId: currentUser?.id || 'usr_admin',
        userName: currentUser?.name || 'Mamadou Diallo',
        userRole: (currentUser?.role as any) || 'ADMIN',
        action: 'Remise à zéro complète',
        category: 'SYSTEME',
        targetItem: 'Base de données',
        details: 'Toutes les données ont été réinitialisées à 0 (ventes, achats, dépenses, caisse, stocks, dettes).',
        timestamp: new Date().toISOString(),
      },
    ];
    setActivityLogs(freshLogs);

    try {
      const docRef = doc(db, 'store_data', 'main_store');
      const cleanPayload = sanitizeForFirestore({
        settings: INITIAL_SETTINGS,
        users: INITIAL_USERS,
        categories: INITIAL_CATEGORIES,
        products: [],
        suppliers: [],
        customers: [],
        stockMovements: [],
        sales: [],
        purchases: [],
        expenses: [],
        cashRegister: null,
        cashTransactions: [],
        inventories: [],
        activityLogs: freshLogs,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(docRef, cleanPayload);
      setIsCloudSynced(true);
    } catch (e) {
      console.error('Failed to reset Firestore to zero:', e);
    }
  };

  const resetToDemoData = async () => {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    setUsers(INITIAL_USERS);
    setCurrentUserState(INITIAL_USERS[0]);
    setSettings(INITIAL_SETTINGS);
    setCategories(INITIAL_CATEGORIES);
    setProducts(DEMO_PRODUCTS);
    setSuppliers(DEMO_SUPPLIERS);
    setCustomers(DEMO_CUSTOMERS);
    setStockMovements(DEMO_STOCK_MOVEMENTS);
    setSales(DEMO_SALES);
    setPurchases([]);
    setExpenses([]);
    setCashRegister(null);
    setCashTransactions([]);
    setInventories([]);
    const demoLogs: ActivityLog[] = [
      {
        id: `act_${Date.now()}`,
        userId: currentUser?.id || 'usr_admin',
        userName: currentUser?.name || 'Mamadou Diallo',
        userRole: (currentUser?.role as any) || 'ADMIN',
        action: 'Chargement Démo',
        category: 'SYSTEME',
        targetItem: 'Base de données',
        details: 'Données de démonstration rechargées avec succès.',
        timestamp: new Date().toISOString(),
      },
    ];
    setActivityLogs(demoLogs);

    try {
      const docRef = doc(db, 'store_data', 'main_store');
      const payload = sanitizeForFirestore({
        settings: INITIAL_SETTINGS,
        users: INITIAL_USERS,
        categories: INITIAL_CATEGORIES,
        products: DEMO_PRODUCTS,
        suppliers: DEMO_SUPPLIERS,
        customers: DEMO_CUSTOMERS,
        stockMovements: DEMO_STOCK_MOVEMENTS,
        sales: DEMO_SALES,
        purchases: [],
        expenses: [],
        cashRegister: null,
        cashTransactions: [],
        inventories: [],
        activityLogs: demoLogs,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(docRef, payload);
      setIsCloudSynced(true);
    } catch (e) {
      console.error('Failed to sync demo to Firestore:', e);
    }
  };

  const resetAllData = resetAllDataToZero;

  const exportDatabaseJson = (): string => {
    const fullBackup = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      settings,
      users,
      categories,
      products,
      suppliers,
      customers,
      stockMovements,
      sales,
      purchases,
      expenses,
      cashRegister,
      cashTransactions,
      inventories,
      activityLogs,
    };
    return JSON.stringify(fullBackup, null, 2);
  };

  const importDatabaseJson = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.products && parsed.settings) {
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.users) setUsers(parsed.users);
        if (parsed.categories) setCategories(parsed.categories);
        if (parsed.products) setProducts(parsed.products);
        if (parsed.suppliers) setSuppliers(parsed.suppliers);
        if (parsed.customers) setCustomers(parsed.customers);
        if (parsed.stockMovements) setStockMovements(parsed.stockMovements);
        if (parsed.sales) setSales(parsed.sales);
        if (parsed.purchases) setPurchases(parsed.purchases);
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.cashRegister) setCashRegister(parsed.cashRegister);
        if (parsed.cashTransactions) setCashTransactions(parsed.cashTransactions);
        if (parsed.inventories) setInventories(parsed.inventories);
        if (parsed.activityLogs) setActivityLogs(parsed.activityLogs);
        logActivity('Restauration sauvegarde', 'SYSTEME', 'Base de données', 'Import de fichier JSON réussi');
        return true;
      }
    } catch (e) {
      console.error('Failed to import JSON database', e);
    }
    return false;
  };

  return (
    <StoreContext.Provider
      value={{
        isCloudSynced,
        isSyncing,
        syncToCloudNow,
        currentUser,
        users,
        isAuthenticated,
        login,
        loginWithCredentials,
        logout,
        lockSession,
        verifyPin,
        switchUserWithPin,
        setCurrentUser,
        addUser,
        updateUser,
        deleteUser,
        settings,
        updateSettings,
        loadBusinessPreset,
        categories,
        addCategory,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        importProducts,
        stockMovements,
        createStockMovement,
        suppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        paySupplierDebt,
        purchases,
        createPurchase,
        updatePurchaseStatus,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        payCustomerCredit,
        sales: sales || [],
        createSale,
        cancelSale,
        expenses: expenses || [],
        addExpense,
        deleteExpense,
        cashRegister,
        cashTransactions: cashTransactions || [],
        openCashRegister,
        closeCashRegister,
        addCashTransaction,
        inventories: inventories || [],
        inventorySessions: inventories || [],
        createInventorySession,
        updateInventoryItemCount,
        updateInventoryCount: updateInventoryItemCount,
        validateInventory,
        cancelInventory,
        deleteInventory,
        activityLogs: activityLogs || [],
        auditLogs: activityLogs || [],
        logActivity,
        metrics,
        resetAllData,
        resetAllDataToZero,
        resetToDemoData,
        exportDatabaseJson,
        exportFullDatabase: exportDatabaseJson,
        importDatabaseJson,
        importFullDatabase: (jsonData: string) => {
          const ok = importDatabaseJson(jsonData);
          return { success: ok, message: ok ? undefined : 'Format invalide' };
        },
        switchUser: (id: string) => {
          const target = (users || []).find(u => u.id === id);
          if (target) setCurrentUser(target);
        },
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
