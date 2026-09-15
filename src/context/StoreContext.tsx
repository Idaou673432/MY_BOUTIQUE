import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
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
  Quote,
  QuoteItem,
  CreditDebtRecord,
  CreditPayment,
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
import { STORE_LOGO_BASE64 } from '../assets/logoBase64';
import { BUSINESS_PRESETS } from '../data/industryPresets';
import { generateId, generateInvoiceNumber, generateOrderNumber, generateQuoteNumber } from '../utils/formatters';

interface StoreContextType {
  // Firebase Sync State
  isCloudSynced: boolean;
  isSyncing: boolean;
  lastSyncTime?: string;
  cloudSyncError?: string | null;
  syncToCloudNow: (forceInit?: boolean) => Promise<void>;

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
  restoreDefaultCatalog: () => void;
  restoreProductsFromBackup: () => boolean;

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
  paySupplierDebt: (
    supplierId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    notes?: string
  ) => { success: boolean; message?: string; receipt?: CreditPayment; remainingBalance?: number };

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
  payCustomerCredit: (
    customerId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    notes?: string
  ) => { success: boolean; message?: string; receipt?: CreditPayment };

  sales: Sale[];
  createSale: (
    items: SaleItem[],
    paymentMethod: PaymentMethod,
    amountReceived: number,
    customerId?: string,
    notes?: string,
    remainingDebt?: number
  ) => { success: boolean; sale?: Sale; message?: string };
  cancelSale: (saleId: string, reason: string) => { success: boolean; message?: string };

  // Quotes (Devis & Factures Proforma)
  quotes: Quote[];
  addQuote: (quoteData: Omit<Quote, 'id' | 'quoteNumber' | 'createdAt' | 'userId' | 'userName'>) => Quote;
  updateQuote: (id: string, quoteData: Partial<Quote>) => void;
  deleteQuote: (id: string) => boolean;
  convertQuoteToSale: (
    quoteId: string,
    paymentMethod: PaymentMethod,
    amountReceived: number
  ) => { success: boolean; sale?: Sale; message?: string };

  // Credits & Debts (Créances Clients & Dettes Fournisseurs)
  creditDebtRecords: CreditDebtRecord[];
  addCreditDebtRecord: (
    record: Omit<CreditDebtRecord, 'id' | 'payments' | 'paidAmount' | 'remainingAmount' | 'status'>
  ) => CreditDebtRecord;
  recordCreditPayment: (
    recordId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    notes?: string
  ) => { success: boolean; message?: string; receipt?: CreditPayment };
  cancelCreditPayment: (
    recordIdOrPaymentId: string,
    paymentId?: string,
    reason?: string
  ) => { success: boolean; message?: string };
  updateCreditDebtRecord: (id: string, updates: Partial<CreditDebtRecord>) => void;
  deleteCreditDebtRecord: (id: string) => boolean;

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
  QUOTES: 'bpm_quotes_v2_zero',
  CREDIT_DEBT_RECORDS: 'bpm_credit_debts_v2_zero',
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

// Helper to safely load array state from primary and backup storage keys
function loadSafeList<T>(primaryKey: string, backupKeys: string[] = [], fallback: T[] = []): T[] {
  try {
    const primary = localStorage.getItem(primaryKey);
    if (primary) {
      const parsed = JSON.parse(primary);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    for (const bKey of backupKeys) {
      const bData = localStorage.getItem(bKey);
      if (bData) {
        const parsed = JSON.parse(bData);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {
    console.warn(`Error loading list for ${primaryKey}:`, e);
  }
  return fallback;
}

// Helper to merge remote items with local items by ID so offline/local items are never wiped out
function mergeListById<T extends { id: string }>(remoteList?: T[], localList?: T[], preferLocal = false): T[] {
  if (!remoteList || !Array.isArray(remoteList) || remoteList.length === 0) {
    return localList || [];
  }
  if (!localList || !Array.isArray(localList) || localList.length === 0) {
    return remoteList;
  }
  const map = new Map<string, T>();
  if (preferLocal) {
    // If local changes are authoritatively pending, keep local records for existing IDs
    localList.forEach((item) => {
      if (item && item.id) map.set(item.id, item);
    });
    remoteList.forEach((item) => {
      if (item && item.id && !map.has(item.id)) {
        map.set(item.id, item);
      }
    });
  } else {
    // Standard merge: remote values override local unless absent
    remoteList.forEach((item) => {
      if (item && item.id) map.set(item.id, item);
    });
    localList.forEach((item) => {
      if (item && item.id && !map.has(item.id)) {
        map.set(item.id, item);
      }
    });
  }
  return Array.from(map.values());
}

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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

  // Dedicated Product Loader to safely recover from backup keys if main key is empty
  const loadInitialProducts = (): Product[] => {
    return loadSafeList<Product>(
      STORAGE_KEYS.PRODUCTS,
      ['bpm_products_backup', 'bpm_products_recovery_catalog', 'bpm_products_v2', 'bpm_products'],
      DEMO_PRODUCTS
    );
  };

  // Helper to remove any unwanted 'ni repris ni échangé sauf accord préalable' clauses
  const cleanSettingStrings = (s: StoreSettings): StoreSettings => {
    if (!s) return s;
    let receiptFooterMessage = s.receiptFooterMessage || '';
    let invoiceLegalNotice = s.invoiceLegalNotice || '';

    const clean = (txt: string) =>
      txt
        .replace(/les\s+articles\s+vendus?\s+ne\s+sont\s+ni\s+repris?\s+ni\s+échangés?[^.\n]*/gi, '')
        .replace(/les\s+marchandises\s+vendues?\s+ne\s+sont\s+ni\s+reprises?\s+ni\s+échangées?[^.\n]*/gi, '')
        .replace(/les\s+articles\s+frais\s+ne\s+sont\s+ni\s+repris?\s+ni\s+échangés?[^.\n]*/gi, '')
        .replace(/ne\s+sont\s+ni\s+repris?\s+ni\s+échangés?[^.\n]*/gi, '')
        .replace(/sauf\s+accord\s+préalable[^.\n]*/gi, '')
        .replace(/au-delà\s+de\s+48h[^.\n]*/gi, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/^[ -.,;:]+/, '')
        .replace(/[ -.,;:]+$/, '')
        .trim();

    receiptFooterMessage = clean(receiptFooterMessage);
    if (!receiptFooterMessage) {
      receiptFooterMessage = 'Merci pour votre visite ! Aw ni ce !';
    }

    invoiceLegalNotice = clean(invoiceLegalNotice);
    if (!invoiceLegalNotice) {
      invoiceLegalNotice = 'Facture conforme aux normes du commerce au Mali.';
    }

    const storeName = (!s.storeName || s.storeName === 'Boutique Bamako Pro' || s.storeName === 'Boutique & Négoce Pro')
      ? 'TANE FAH COLLECTION'
      : s.storeName;

    const logoUrl = s.logoUrl || STORE_LOGO_BASE64;

    return {
      ...s,
      storeName,
      logoUrl,
      receiptFooterMessage,
      invoiceLegalNotice,
    };
  };

  // States with multi-layer safe fallback loading
  const [users, setUsers] = useState<User[]>(() => {
    const loaded = loadSafeList<User>(STORAGE_KEYS.USERS, ['bpm_users_backup', 'bpm_users_v2', 'bpm_users'], INITIAL_USERS);
    return loaded.map((u: User) => {
      if (u.id === 'usr_admin' && (u.username === 'mamadou.admin' || !u.username)) {
        return { ...u, username: 'MD' };
      }
      return u;
    });
  });
  const [currentUser, setCurrentUserState] = useState<User>(() => loadState(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [settings, setSettings] = useState<StoreSettings>(() => cleanSettingStrings(loadState(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS)));
  const [categories, setCategories] = useState<Category[]>(() => {
    const cats = loadSafeList<Category>(STORAGE_KEYS.CATEGORIES, ['bpm_categories_backup', 'bpm_categories_v2', 'bpm_categories'], INITIAL_CATEGORIES);
    return cats && cats.length > 0 ? cats : INITIAL_CATEGORIES;
  });
  const [products, setProducts] = useState<Product[]>(() => loadInitialProducts());
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const sups = loadSafeList<Supplier>(STORAGE_KEYS.SUPPLIERS, ['bpm_suppliers_backup', 'bpm_suppliers_v2', 'bpm_suppliers'], DEMO_SUPPLIERS);
    return sups && sups.length > 0 ? sups : DEMO_SUPPLIERS;
  });
  const [customers, setCustomers] = useState<Customer[]>(() =>
    loadSafeList<Customer>(STORAGE_KEYS.CUSTOMERS, ['bpm_customers_backup', 'bpm_customers_v2', 'bpm_customers'], INITIAL_CUSTOMERS)
  );
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() =>
    loadSafeList<StockMovement>(STORAGE_KEYS.STOCK_MOVEMENTS, ['bpm_movements_backup', 'bpm_movements_v2', 'bpm_movements'], INITIAL_STOCK_MOVEMENTS)
  );
  const [sales, setSales] = useState<Sale[]>(() =>
    loadSafeList<Sale>(STORAGE_KEYS.SALES, ['bpm_sales_backup', 'bpm_sales_recovery', 'bpm_sales_v2', 'bpm_sales'], INITIAL_SALES)
  );
  const [quotes, setQuotes] = useState<Quote[]>(() =>
    loadSafeList<Quote>(STORAGE_KEYS.QUOTES, ['bpm_quotes_backup', 'bpm_quotes_v2', 'bpm_quotes'], [])
  );
  const [creditDebtRecords, setCreditDebtRecords] = useState<CreditDebtRecord[]>(() =>
    loadSafeList<CreditDebtRecord>(
      STORAGE_KEYS.CREDIT_DEBT_RECORDS,
      ['bpm_credit_debts_backup', 'bpm_credit_debts_recovery', 'bpm_credit_debts_v2', 'bpm_credit_debts'],
      []
    )
  );
  const [purchases, setPurchases] = useState<Purchase[]>(() =>
    loadSafeList<Purchase>(STORAGE_KEYS.PURCHASES, ['bpm_purchases_backup', 'bpm_purchases_v2', 'bpm_purchases'], INITIAL_PURCHASES)
  );
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    loadSafeList<Expense>(STORAGE_KEYS.EXPENSES, ['bpm_expenses_backup', 'bpm_expenses_v2', 'bpm_expenses'], INITIAL_EXPENSES)
  );
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(() => loadState(STORAGE_KEYS.CASH_REGISTER, INITIAL_CASH_REGISTER));
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(() =>
    loadSafeList<CashTransaction>(STORAGE_KEYS.CASH_TRANSACTIONS, ['bpm_cash_tx_backup', 'bpm_cash_tx_v2', 'bpm_cash_tx'], INITIAL_CASH_TRANSACTIONS)
  );
  const [inventories, setInventories] = useState<Inventory[]>(() =>
    loadSafeList<Inventory>(STORAGE_KEYS.INVENTORIES, ['bpm_inventories_backup', 'bpm_inventories_v2', 'bpm_inventories'], INITIAL_PAST_INVENTORIES)
  );
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() =>
    loadSafeList<ActivityLog>(STORAGE_KEYS.ACTIVITY_LOGS, ['bpm_activity_logs_backup', 'bpm_activity_logs_v2'], INITIAL_ACTIVITY_LOGS)
  );

  // Firebase Sync status states & anti-quota loops
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
  const isRemoteUpdate = useRef<boolean>(false);
  const isCloudHydrated = useRef<boolean>(false);
  const hasLocalMutations = useRef<boolean>(false);
  const lastSyncedFingerprint = useRef<string>('');
  const hasReconciledRef = useRef<boolean>(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync to local storage & maintain permanent rolling multi-key backups
  useEffect(() => { 
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)); 
    if (users && users.length > 0) localStorage.setItem('bpm_users_backup', JSON.stringify(users));
  }, [users]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings)); }, [settings]);
  useEffect(() => { 
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories)); 
    if (categories && categories.length > 0) localStorage.setItem('bpm_categories_backup', JSON.stringify(categories));
  }, [categories]);
  useEffect(() => { 
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products)); 
    if (products && products.length > 0) {
      localStorage.setItem('bpm_products_backup', JSON.stringify(products));
      localStorage.setItem('bpm_products_recovery_catalog', JSON.stringify(products));
    }
  }, [products]);
  useEffect(() => { 
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers)); 
    if (suppliers && suppliers.length > 0) localStorage.setItem('bpm_suppliers_backup', JSON.stringify(suppliers));
  }, [suppliers]);
  useEffect(() => { 
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers)); 
    if (customers && customers.length > 0) localStorage.setItem('bpm_customers_backup', JSON.stringify(customers));
  }, [customers]);
  useEffect(() => { 
    localStorage.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, JSON.stringify(stockMovements)); 
    if (stockMovements && stockMovements.length > 0) localStorage.setItem('bpm_movements_backup', JSON.stringify(stockMovements));
  }, [stockMovements]);
  useEffect(() => { 
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales)); 
    if (sales && sales.length > 0) {
      localStorage.setItem('bpm_sales_backup', JSON.stringify(sales));
      localStorage.setItem('bpm_sales_recovery', JSON.stringify(sales));
    }
  }, [sales]);
  useEffect(() => { 
    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes)); 
    if (quotes && quotes.length > 0) localStorage.setItem('bpm_quotes_backup', JSON.stringify(quotes));
  }, [quotes]);
  useEffect(() => { 
    localStorage.setItem(STORAGE_KEYS.CREDIT_DEBT_RECORDS, JSON.stringify(creditDebtRecords)); 
    if (creditDebtRecords && creditDebtRecords.length > 0) {
      localStorage.setItem('bpm_credit_debts_backup', JSON.stringify(creditDebtRecords));
      localStorage.setItem('bpm_credit_debts_recovery', JSON.stringify(creditDebtRecords));
    }
  }, [creditDebtRecords]);
  useEffect(() => { 
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases)); 
    if (purchases && purchases.length > 0) localStorage.setItem('bpm_purchases_backup', JSON.stringify(purchases));
  }, [purchases]);
  useEffect(() => { 
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses)); 
    if (expenses && expenses.length > 0) localStorage.setItem('bpm_expenses_backup', JSON.stringify(expenses));
  }, [expenses]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CASH_REGISTER, JSON.stringify(cashRegister)); }, [cashRegister]);
  useEffect(() => { 
    localStorage.setItem(STORAGE_KEYS.CASH_TRANSACTIONS, JSON.stringify(cashTransactions)); 
    if (cashTransactions && cashTransactions.length > 0) localStorage.setItem('bpm_cash_tx_backup', JSON.stringify(cashTransactions));
  }, [cashTransactions]);
  useEffect(() => { 
    localStorage.setItem(STORAGE_KEYS.INVENTORIES, JSON.stringify(inventories)); 
    if (inventories && inventories.length > 0) localStorage.setItem('bpm_inventories_backup', JSON.stringify(inventories));
  }, [inventories]);
  useEffect(() => { 
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(activityLogs)); 
    if (activityLogs && activityLogs.length > 0) localStorage.setItem('bpm_activity_logs_backup', JSON.stringify(activityLogs));
  }, [activityLogs]);

  // Fingerprint calculation to detect genuine data changes and avoid quota-wasting write loops
  const computeFingerprint = useCallback(() => {
    return JSON.stringify({
      products: products.map(p => `${p.id}:${p.currentStock}:${p.salePrice}`),
      salesCount: sales.length,
      salesLatestId: sales[0]?.id || '',
      customersCount: customers.length,
      customerBalances: customers.map(c => `${c.id}:${c.creditBalance}`),
      creditDebts: creditDebtRecords.map(r => `${r.id}:${r.remainingAmount}:${r.status}`),
      suppliersCount: suppliers.length,
      supplierDebts: suppliers.map(s => `${s.id}:${s.debtBalance}`),
      purchasesCount: purchases.length,
      expensesCount: expenses.length,
      cashRegId: cashRegister?.id || '',
      cashRegOpen: cashRegister?.isOpen || false,
      cashTxCount: cashTransactions.length,
      inventoriesCount: inventories.length,
      categoriesCount: categories.length,
      usersCount: users.length,
      settingsStore: settings.storeName,
    });
  }, [
    products,
    sales,
    customers,
    creditDebtRecords,
    suppliers,
    purchases,
    expenses,
    cashRegister,
    cashTransactions,
    inventories,
    categories,
    users,
    settings.storeName,
  ]);

  // Startup and Cross-Reconciliation: ensure customer credits and supplier debts are tracked in creditDebtRecords
  // Run ONLY ONCE when data is ready to prevent infinite render loops
  useEffect(() => {
    if (hasReconciledRef.current || !isCloudHydrated.current) return;
    if (!customers || customers.length === 0) return;
    
    const missingRecords: CreditDebtRecord[] = [];
    customers.forEach(c => {
      if (c.creditBalance > 0) {
        const hasRecord = (creditDebtRecords || []).some(
          r => r.type === 'CLIENT_CREDIT' && (r.partyId === c.id || r.partyName === c.name) && r.status === 'EN_COURS'
        );
        if (!hasRecord) {
          missingRecords.push({
            id: generateId('cd'),
            type: 'CLIENT_CREDIT',
            partyId: c.id,
            partyName: c.name,
            partyPhone: c.phone,
            title: `Crédit client en cours (${c.name})`,
            initialAmount: c.creditBalance,
            paidAmount: 0,
            remainingAmount: c.creditBalance,
            status: 'EN_COURS',
            payments: [],
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            date: new Date().toISOString(),
            notes: 'Restauré automatiquement depuis le solde client',
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    if (suppliers && suppliers.length > 0) {
      suppliers.forEach(s => {
        if (s.debtBalance > 0) {
          const hasRecord = (creditDebtRecords || []).some(
            r => r.type === 'SUPPLIER_DEBT' && (r.partyId === s.id || r.partyName === s.companyName) && r.status === 'EN_COURS'
          );
          if (!hasRecord) {
            missingRecords.push({
              id: generateId('cd'),
              type: 'SUPPLIER_DEBT',
              partyId: s.id,
              partyName: s.companyName,
              partyPhone: s.phone,
              title: `Dette fournisseur en cours (${s.companyName})`,
              initialAmount: s.debtBalance,
              paidAmount: 0,
              remainingAmount: s.debtBalance,
              status: 'EN_COURS',
              payments: [],
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              date: new Date().toISOString(),
              notes: 'Restauré automatiquement depuis le solde fournisseur',
              createdAt: new Date().toISOString(),
            });
          }
        }
      });
    }

    if (missingRecords.length > 0) {
      hasReconciledRef.current = true;
      setCreditDebtRecords(prev => [...missingRecords, ...(prev || [])]);
    } else {
      hasReconciledRef.current = true;
    }
  }, [customers, suppliers]);

  // Firestore Real-Time Listener (Bi-directional sync with anti-loss merge & anti-overwrite guard)
  useEffect(() => {
    const docRef = doc(db, 'store_data', 'main_store');

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const remote = docSnap.data();
        if (remote && !docSnap.metadata.hasPendingWrites) {
          const preferLocal = hasLocalMutations.current;
          isRemoteUpdate.current = true;
          isCloudHydrated.current = true;
          setIsCloudSynced(true);
          setCloudSyncError(null);
          setLastSyncTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));

          if (remote.settings) setSettings(cleanSettingStrings(remote.settings));
          if (remote.users && Array.isArray(remote.users) && remote.users.length > 0) setUsers(prev => mergeListById(remote.users, prev, preferLocal));
          if (remote.categories && Array.isArray(remote.categories) && remote.categories.length > 0) setCategories(prev => mergeListById(remote.categories, prev, preferLocal));
          if (remote.products && Array.isArray(remote.products) && remote.products.length > 0) {
            setProducts(prev => mergeListById(remote.products, prev, preferLocal));
          }
          if (remote.suppliers && Array.isArray(remote.suppliers) && remote.suppliers.length > 0) setSuppliers(prev => mergeListById(remote.suppliers, prev, preferLocal));
          if (remote.customers && Array.isArray(remote.customers) && remote.customers.length > 0) setCustomers(prev => mergeListById(remote.customers, prev, preferLocal));
          if (remote.stockMovements && Array.isArray(remote.stockMovements) && remote.stockMovements.length > 0) setStockMovements(prev => mergeListById(remote.stockMovements, prev, preferLocal));
          if (remote.sales && Array.isArray(remote.sales) && remote.sales.length > 0) setSales(prev => mergeListById(remote.sales, prev, preferLocal));
          if (remote.quotes && Array.isArray(remote.quotes) && remote.quotes.length > 0) setQuotes(prev => mergeListById(remote.quotes, prev, preferLocal));
          if (remote.creditDebtRecords && Array.isArray(remote.creditDebtRecords) && remote.creditDebtRecords.length > 0) setCreditDebtRecords(prev => mergeListById(remote.creditDebtRecords, prev, preferLocal));
          if (remote.purchases && Array.isArray(remote.purchases) && remote.purchases.length > 0) setPurchases(prev => mergeListById(remote.purchases, prev, preferLocal));
          if (remote.expenses && Array.isArray(remote.expenses) && remote.expenses.length > 0) setExpenses(prev => mergeListById(remote.expenses, prev, preferLocal));
          if (remote.cashRegister !== undefined && remote.cashRegister !== null) {
            setCashRegister(prev => {
              if (!prev) return remote.cashRegister;
              const remoteTime = new Date(remote.cashRegister.closedAt || remote.cashRegister.openedAt || 0).getTime();
              const localTime = new Date(prev.closedAt || prev.openedAt || 0).getTime();

              // Anti-reopening guard: If locally closed and remote is open with older or equal timestamp, retain closed
              if (!prev.isOpen && remote.cashRegister.isOpen) {
                if (localTime >= remoteTime) {
                  return prev;
                }
              }
              // If remote has a newer timestamp or both are open/closed, accept remote
              if (remoteTime >= localTime) {
                return remote.cashRegister;
              }
              return prev;
            });
          }
          if (remote.cashTransactions && Array.isArray(remote.cashTransactions) && remote.cashTransactions.length > 0) setCashTransactions(prev => mergeListById(remote.cashTransactions, prev));
          if (remote.inventories && Array.isArray(remote.inventories) && remote.inventories.length > 0) setInventories(prev => mergeListById(remote.inventories, prev));
          if (remote.activityLogs && Array.isArray(remote.activityLogs) && remote.activityLogs.length > 0) setActivityLogs(prev => mergeListById(remote.activityLogs, prev));

          setTimeout(() => {
            isRemoteUpdate.current = false;
          }, 800);
        }
      } else {
        // Document does not exist yet on remote: safe initial seed
        isCloudHydrated.current = true;
        syncToCloudNow(true);
      }
    }, (error) => {
      console.warn('Firestore snapshot error:', error);
      setIsCloudSynced(false);
      isCloudHydrated.current = true;
      if (error?.message?.includes('resource-exhausted') || (error as any)?.code === 'resource-exhausted') {
        setCloudSyncError('Quota quotidien Firebase temporairement atteint. Toutes vos données sont sauvegardées en local sur cet appareil.');
      } else {
        setCloudSyncError('Mode hors-ligne. Vos données sont conservées localement.');
      }
    });

    return () => unsubscribe();
  }, []);

  // Explicit or debounced push to Firestore with quota protection
  const syncToCloudNow = async (forceInit = false, overrideData?: Record<string, any>) => {
    // Critical Guard: never push to cloud before initial remote hydration,
    // protecting another machine from overwriting existing cloud data on boot
    if (!isCloudHydrated.current && !forceInit) {
      console.log('[Sync] Attente de la première lecture cloud...');
      return;
    }

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
        quotes,
        creditDebtRecords,
        purchases,
        expenses,
        cashRegister,
        cashTransactions,
        inventories,
        activityLogs,
        ...(overrideData || {}),
        updatedAt: new Date().toISOString(),
      });
      await setDoc(docRef, payload, { merge: true });
      lastSyncedFingerprint.current = computeFingerprint();
      hasLocalMutations.current = false;
      setIsCloudSynced(true);
      setCloudSyncError(null);
      setLastSyncTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    } catch (e: any) {
      console.warn('Firestore write warning:', e);
      setIsCloudSynced(false);
      if (e?.code === 'resource-exhausted' || e?.message?.includes('resource-exhausted')) {
        setCloudSyncError('Quota Firebase quotidien atteint. Sauvegarde locale active.');
      } else {
        setCloudSyncError('Sauvegarde locale active (Cloud non accessible).');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto push to Firestore ONLY when real user mutation occurs on this machine
  useEffect(() => {
    // Skip if incoming from remote snapshot
    if (isRemoteUpdate.current) return;

    // Skip if cloud hasn't hydrated yet (prevents blank/demo overwriting real cloud)
    if (!isCloudHydrated.current) return;

    const currentFp = computeFingerprint();
    // Skip if data is identical to what was last synced/received
    if (currentFp === lastSyncedFingerprint.current) return;

    // Real change detected!
    hasLocalMutations.current = true;
    setIsCloudSynced(false);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (hasLocalMutations.current && isCloudHydrated.current) {
        syncToCloudNow();
      }
    }, 2000);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [
    computeFingerprint,
    users,
    settings,
    categories,
    products,
    suppliers,
    customers,
    stockMovements,
    sales,
    quotes,
    creditDebtRecords,
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
    setSettings(prev => cleanSettingStrings({ ...prev, ...newSettings }));
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

  const restoreDefaultCatalog = () => {
    setCategories(INITIAL_CATEGORIES);
    setSuppliers(prev => (prev && prev.length > 0 ? prev : DEMO_SUPPLIERS));
    setProducts(DEMO_PRODUCTS);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEMO_PRODUCTS));
    localStorage.setItem('bpm_products_backup', JSON.stringify(DEMO_PRODUCTS));
    localStorage.setItem('bpm_products_recovery_catalog', JSON.stringify(DEMO_PRODUCTS));

    try {
      const docRef = doc(db, 'store_data', 'main_store');
      setDoc(docRef, { products: DEMO_PRODUCTS, categories: INITIAL_CATEGORIES }, { merge: true }).catch(console.warn);
    } catch (e) {
      console.warn('Sync default catalog to Firestore failed:', e);
    }

    logActivity('Restauration Catalogue', 'STOCK', 'Catalogue Standard', `${DEMO_PRODUCTS.length} articles standards restaurés (Alimentation, Boissons, Hygiène, Électronique)`);
  };

  const restoreProductsFromBackup = (): boolean => {
    try {
      const backupStr = localStorage.getItem('bpm_products_backup') || 
                        localStorage.getItem('bpm_products_recovery_catalog') ||
                        localStorage.getItem('bpm_products_v2') ||
                        localStorage.getItem('bpm_products');
      if (backupStr) {
        const parsed = JSON.parse(backupStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProducts(parsed);
          setCategories(prev => (prev && prev.length > 0 ? prev : INITIAL_CATEGORIES));
          setSuppliers(prev => (prev && prev.length > 0 ? prev : DEMO_SUPPLIERS));
          try {
            const docRef = doc(db, 'store_data', 'main_store');
            setDoc(docRef, { products: parsed }, { merge: true }).catch(console.warn);
          } catch (e) {
            console.warn(e);
          }
          logActivity('Restauration Sauvegarde', 'STOCK', 'Sauvegarde Locale', `${parsed.length} articles récupérés de la sauvegarde`);
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to restore from backup:', e);
    }
    // Fallback: restore full demo catalog
    restoreDefaultCatalog();
    return true;
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

  const paySupplierDebt = (
    supplierId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    notes?: string
  ): { success: boolean; message?: string; receipt?: CreditPayment; remainingBalance?: number } => {
    const sup = (suppliers || []).find(s => s.id === supplierId);
    if (!sup) return { success: false, message: 'Fournisseur introuvable.' };
    if (amount <= 0) return { success: false, message: 'Le montant du versement doit être supérieur à zéro.' };
    if (sup.debtBalance <= 0) return { success: false, message: 'Aucune dette en cours pour ce fournisseur.' };

    const actualAmount = Math.min(amount, sup.debtBalance);
    const newDebtBalance = Math.max(0, Math.round(((sup.debtBalance || 0) - actualAmount) * 100) / 100);

    const newSuppliers = (suppliers || []).map(s =>
      s.id === supplierId ? { ...s, debtBalance: newDebtBalance } : s
    );
    setSuppliers(newSuppliers);
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(newSuppliers));

    // Also deduct from active creditDebtRecords for this supplier
    let remainingToDeduct = actualAmount;
    const newCreditDebtRecords = (creditDebtRecords || []).map(r => {
      const isMatch =
        r.type === 'SUPPLIER_DEBT' &&
        (r.partyId === supplierId || (r.partyName && sup.companyName && r.partyName.trim().toLowerCase() === sup.companyName.trim().toLowerCase())) &&
        r.status === 'EN_COURS';

      if (isMatch && remainingToDeduct > 0) {
        const deduct = Math.min(r.remainingAmount, remainingToDeduct);
        remainingToDeduct -= deduct;
        const newPaid = (r.paidAmount || 0) + deduct;
        const newRem = Math.max(0, Math.round((r.remainingAmount - deduct) * 100) / 100);
        const payment: CreditPayment = {
          id: generateId('pay'),
          date: new Date().toISOString(),
          amount: deduct,
          paymentMethod,
          notes: notes || 'Règlement effectué depuis la fiche fournisseur',
          receivedBy: currentUser.name,
          receiptNumber: `REC-${new Date().getFullYear()}-${String((r.payments?.length || 0) + 1).padStart(3, '0')}`,
        };
        return {
          ...r,
          paidAmount: newPaid,
          remainingAmount: newRem,
          status: (newRem <= 0.001 ? 'SOLDE' : 'EN_COURS') as 'SOLDE' | 'EN_COURS',
          payments: [payment, ...(r.payments || [])],
        };
      }
      return r;
    });
    setCreditDebtRecords(newCreditDebtRecords);
    localStorage.setItem(STORAGE_KEYS.CREDIT_DEBT_RECORDS, JSON.stringify(newCreditDebtRecords));

    // If cash register open and cash paid, register cash transaction
    if (paymentMethod === 'ESPECES' && cashRegister && cashRegister.isOpen) {
      addCashTransaction(
        'PAIEMENT_DETTE_FOURNISSEUR',
        -actualAmount,
        `Règlement dette fournisseur: ${sup.companyName}`,
        paymentMethod
      );
    }

    logActivity('Règlement dette fournisseur', 'FOURNISSEUR', sup.companyName, `Montant versé: ${actualAmount}, Nouveau solde dette: ${newDebtBalance}`);

    hasLocalMutations.current = true;
    syncToCloudNow(false, {
      suppliers: newSuppliers,
      creditDebtRecords: newCreditDebtRecords,
    });

    const supplierReceipt: CreditPayment = {
      id: generateId('pay'),
      date: new Date().toISOString(),
      amount: actualAmount,
      paymentMethod,
      notes: notes || 'Règlement effectué depuis la fiche fournisseur',
      receivedBy: currentUser.name,
      receiptNumber: `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    };

    return {
      success: true,
      message: `Paiement de ${actualAmount} enregistré avec succès ! Nouveau solde dette: ${newDebtBalance}`,
      receipt: supplierReceipt,
      remainingBalance: newDebtBalance,
    };
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

    // Auto-create CreditDebtRecord for remaining unpaid balance
    if (remainingAmount > 0) {
      const debtRecord: CreditDebtRecord = {
        id: generateId('cd'),
        type: 'SUPPLIER_DEBT',
        partyId: sup?.id || supplierId,
        partyName: sup ? sup.companyName : (purchase.supplierName || 'Fournisseur'),
        partyPhone: sup?.phone,
        title: `Commande achat ${purchase.orderNumber}`,
        initialAmount: remainingAmount,
        paidAmount: 0,
        remainingAmount: remainingAmount,
        status: 'EN_COURS',
        payments: [],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        date: new Date().toISOString(),
        notes: `Créé automatiquement pour l'achat ${purchase.orderNumber}. ${notes || ''}`,
        createdAt: new Date().toISOString(),
      };
      setCreditDebtRecords(prev => [debtRecord, ...(prev || [])]);
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
    } else if (status === 'ANNULE' && purchase.status === 'RECU') {
      // If cancelling an already received purchase, deduct the stock that was received
      (purchase.items || []).forEach(it => {
        createStockMovement(
          it.productId,
          -it.quantity,
          'RETOUR_FOURNISSEUR',
          `Annulation commande fournisseur reçue ${purchase.orderNumber}`,
          purchase.id
        );
      });
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

  const payCustomerCredit = (
    customerId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    notes?: string
  ): { success: boolean; message?: string; receipt?: CreditPayment } => {
    const cust = (customers || []).find(c => c.id === customerId);
    if (!cust) return { success: false, message: 'Client introuvable.' };
    if (amount <= 0) return { success: false, message: 'Le montant du versement doit être supérieur à zéro.' };

    // Find active creditDebtRecords for this customer (match by customerId OR partyName)
    const activeRecords = (creditDebtRecords || []).filter(
      r =>
        r.type === 'CLIENT_CREDIT' &&
        (r.partyId === customerId || (r.partyName && cust.name && r.partyName.trim().toLowerCase() === cust.name.trim().toLowerCase())) &&
        r.status === 'EN_COURS'
    );
    const totalActiveRecordDebt = activeRecords.reduce((sum, r) => sum + (r.remainingAmount || 0), 0);
    const maxPayable = Math.max(cust.creditBalance || 0, totalActiveRecordDebt);

    if (maxPayable <= 0) {
      return { success: false, message: 'Ce client n\'a aucune dette en cours.' };
    }

    const actualAmount = Math.min(amount, maxPayable);
    const newCustomerBalance = Math.max(0, Math.round(((cust.creditBalance || 0) - actualAmount) * 100) / 100);

    const newCustomers = (customers || []).map(c =>
      c.id === customerId ? { ...c, creditBalance: newCustomerBalance } : c
    );
    setCustomers(newCustomers);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(newCustomers));

    // Generate receipt
    const receiptNumber = `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const payment: CreditPayment = {
      id: generateId('pay'),
      date: new Date().toISOString(),
      amount: actualAmount,
      paymentMethod,
      notes: notes || 'Règlement crédit depuis la fiche client',
      receivedBy: currentUser.name,
      receiptNumber,
    };

    // Deduct from creditDebtRecords
    let remainingToDeduct = actualAmount;
    let matchedAnyRecord = false;

    const newCreditDebtRecords = (creditDebtRecords || []).map(r => {
      const isMatch =
        r.type === 'CLIENT_CREDIT' &&
        (r.partyId === customerId || (r.partyName && cust.name && r.partyName.trim().toLowerCase() === cust.name.trim().toLowerCase())) &&
        r.status === 'EN_COURS';

      if (isMatch && remainingToDeduct > 0) {
        matchedAnyRecord = true;
        const deduct = Math.min(r.remainingAmount, remainingToDeduct);
        remainingToDeduct -= deduct;
        const newPaid = (r.paidAmount || 0) + deduct;
        const newRem = Math.max(0, Math.round((r.remainingAmount - deduct) * 100) / 100);
        return {
          ...r,
          paidAmount: newPaid,
          remainingAmount: newRem,
          status: (newRem <= 0.001 ? 'SOLDE' : 'EN_COURS') as 'SOLDE' | 'EN_COURS',
          payments: [
            {
              ...payment,
              amount: deduct,
            },
            ...(r.payments || []),
          ],
        };
      }
      return r;
    });

    // If customer had debt on profile but no active record existed in creditDebtRecords, create an archive record so payment is tracked
    let finalCreditRecords = newCreditDebtRecords;
    if (!matchedAnyRecord) {
      const archiveRecord: CreditDebtRecord = {
        id: generateId('cd'),
        type: 'CLIENT_CREDIT',
        partyId: customerId,
        partyName: cust.name,
        partyPhone: cust.phone,
        title: `Règlement dette client (${cust.name})`,
        initialAmount: actualAmount,
        paidAmount: actualAmount,
        remainingAmount: 0,
        status: 'SOLDE',
        payments: [payment],
        dueDate: new Date().toISOString().split('T')[0],
        date: new Date().toISOString(),
        notes: notes || 'Règlement enregistré depuis la fiche client',
        createdAt: new Date().toISOString(),
      };
      finalCreditRecords = [archiveRecord, ...newCreditDebtRecords];
    }

    setCreditDebtRecords(finalCreditRecords);
    localStorage.setItem(STORAGE_KEYS.CREDIT_DEBT_RECORDS, JSON.stringify(finalCreditRecords));

    // Register cash entry if paid cash
    if (paymentMethod === 'ESPECES' && cashRegister && cashRegister.isOpen) {
      addCashTransaction(
        'PAIEMENT_DETTE_CLIENT',
        actualAmount,
        `Règlement crédit client: ${cust.name}`,
        paymentMethod
      );
    }

    logActivity(
      'Encaissement crédit client',
      'CLIENT',
      cust.name,
      `Montant réglé: ${actualAmount}, Nouveau solde dette: ${newCustomerBalance}`
    );

    // Immediate Cloud push & local mutations flag
    hasLocalMutations.current = true;
    syncToCloudNow(false, {
      customers: newCustomers,
      creditDebtRecords: finalCreditRecords,
    });

    return {
      success: true,
      message: `Règlement de ${actualAmount} validé avec succès ! Nouveau solde: ${newCustomerBalance}`,
      receipt: payment,
    };
  };

  // Sale Core Execution
  const createSale = (
    items: SaleItem[],
    paymentMethod: PaymentMethod,
    amountReceived: number,
    customerId?: string,
    notes?: string,
    remainingDebt?: number
  ): { success: boolean; sale?: Sale; message?: string } => {
    if (!items || items.length === 0) {
      return { success: false, message: 'Le panier est vide. Veuillez ajouter au moins un produit.' };
    }

    // Verify stock availability
    for (const item of items) {
      if (item.productId.startsWith('custom_')) {
        continue;
      }
      const prod = (products || []).find(p => p.id === item.productId);
      if (!prod) {
        // Custom or on-the-fly item: skip stock validation
        continue;
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

    // Calcul précis de la dette restante et de la monnaie rendue
    const computedDebt = remainingDebt !== undefined
      ? Math.max(0, remainingDebt)
      : (paymentMethod === 'CREDIT'
          ? Math.max(0, totalAmount - (amountReceived || 0))
          : Math.max(0, totalAmount - (amountReceived || 0)));

    const effectiveRemainingDue = computedDebt;
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
      remainingDue: effectiveRemainingDue,
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
      if (!it.productId.startsWith('custom_')) {
        const prod = (products || []).find(p => p.id === it.productId);
        if (prod) {
          createStockMovement(
            it.productId,
            -it.quantity,
            'VENTE',
            `Vente POS ticket ${sale.invoiceNumber}`,
            sale.id
          );
        }
      }
    });

    // 3. Auto-create CreditDebtRecord & synchronize Customer credit balance
    let updatedCustomers = customers || [];
    let updatedCreditDebtRecords = creditDebtRecords || [];
    const debtAmountToTrack = effectiveRemainingDue > 0 ? effectiveRemainingDue : (paymentMethod === 'CREDIT' ? totalAmount : 0);

    if (debtAmountToTrack > 0) {
      let linkedCust = cust;
      if (!linkedCust && sale.customerName && sale.customerName !== 'Client au comptant') {
        const foundByName = (customers || []).find(
          c => c.name.trim().toLowerCase() === sale.customerName!.trim().toLowerCase()
        );
        if (foundByName) {
          linkedCust = foundByName;
        } else {
          // Auto-create customer so the credit is attached to a real client in the directory
          linkedCust = {
            id: generateId('cust'),
            name: sale.customerName.trim(),
            phone: '',
            creditBalance: 0,
            creditLimit: 0,
            salesCount: 0,
            totalSpent: 0,
            createdAt: new Date().toISOString(),
          };
          updatedCustomers = [linkedCust, ...updatedCustomers];
        }
      }

      if (linkedCust) {
        updatedCustomers = updatedCustomers.map(c =>
          c.id === linkedCust!.id
            ? {
                ...c,
                totalSpent: (c.totalSpent || 0) + totalAmount,
                salesCount: (c.salesCount || 0) + 1,
                creditBalance: Math.round(((c.creditBalance || 0) + debtAmountToTrack) * 100) / 100,
              }
            : c
        );
      }

      const creditRecord: CreditDebtRecord = {
        id: generateId('cd'),
        type: 'CLIENT_CREDIT',
        partyId: linkedCust ? linkedCust.id : (customerId || 'client_credit'),
        partyName: linkedCust ? linkedCust.name : (sale.customerName || 'Client à crédit'),
        partyPhone: linkedCust?.phone,
        partyAddress: linkedCust?.address,
        title: `Dette Vente ${sale.invoiceNumber} (Reste à payer)`,
        initialAmount: debtAmountToTrack,
        paidAmount: 0,
        remainingAmount: debtAmountToTrack,
        status: 'EN_COURS',
        payments: [],
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        date: new Date().toISOString(),
        notes: `Reste à payer vente ${sale.invoiceNumber}. Total: ${totalAmount}, Donné: ${amountReceived}, Reste en dette: ${debtAmountToTrack}. ${notes || ''}`,
        referenceId: sale.id,
        createdAt: new Date().toISOString(),
      };

      updatedCreditDebtRecords = [creditRecord, ...updatedCreditDebtRecords];
      setCreditDebtRecords(updatedCreditDebtRecords);
      localStorage.setItem(STORAGE_KEYS.CREDIT_DEBT_RECORDS, JSON.stringify(updatedCreditDebtRecords));
      setCustomers(updatedCustomers);
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updatedCustomers));
    } else if (cust) {
      // Normal paid sale with known customer: update salesCount and totalSpent
      updatedCustomers = (customers || []).map(c =>
        c.id === cust.id
          ? {
              ...c,
              totalSpent: (c.totalSpent || 0) + totalAmount,
              salesCount: (c.salesCount || 0) + 1,
            }
          : c
      );
      setCustomers(updatedCustomers);
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updatedCustomers));
    }

    // 4. Update Cash Register if cash sale or cash down payment on credit, and cash register is open
    if ((paymentMethod === 'ESPECES' || (paymentMethod === 'CREDIT' && amountReceived > 0)) && cashRegister && cashRegister.isOpen) {
      const cashAmountIn = Math.min(amountReceived, totalAmount);
      if (cashAmountIn > 0) {
        addCashTransaction('VENTE', cashAmountIn, `Vente ${sale.invoiceNumber} (${paymentMethod === 'CREDIT' ? 'Acompte espèces' : 'Espèces'}${effectiveRemainingDue > 0 && paymentMethod !== 'CREDIT' ? ' - Acompte' : ''})`, 'ESPECES');
      }
    }

    logActivity(
      'Vente validée',
      'VENTE',
      sale.invoiceNumber,
      `Montant: ${totalAmount}, Donné: ${amountReceived}, Dette: ${effectiveRemainingDue}, Mode: ${paymentMethod}, Articles: ${items.length}`
    );

    // Sync all affected entities to cloud
    hasLocalMutations.current = true;
    syncToCloudNow(false, {
      sales: [sale, ...(sales || [])],
      customers: updatedCustomers,
      creditDebtRecords: updatedCreditDebtRecords,
    });

    return { success: true, sale };
  };

  const cancelSale = (saleId: string, reason: string): { success: boolean; message?: string } => {
    const sale = (sales || []).find(s => s.id === saleId);
    if (!sale) return { success: false, message: 'Vente introuvable.' };
    if (sale.status === 'ANNULEE') return { success: false, message: 'Cette vente est déjà annulée.' };

    // Restock all items
    sale.items.forEach(it => {
      if (!it.productId.startsWith('custom_')) {
        const prod = (products || []).find(p => p.id === it.productId);
        if (prod) {
          createStockMovement(
            it.productId,
            it.quantity,
            'RETOUR_CLIENT',
            `Annulation vente ${sale.invoiceNumber} : ${reason}`,
            sale.id
          );
        }
      }
    });

    // Revert customer credit or total spent
    if (sale.customerId) {
      const debtAmount = sale.remainingDue ?? (sale.paymentMethod === 'CREDIT' ? sale.totalAmount : 0);
      setCustomers(prev =>
        prev.map(c =>
          c.id === sale.customerId
            ? {
                ...c,
                totalSpent: Math.max(0, c.totalSpent - sale.totalAmount),
                salesCount: Math.max(0, c.salesCount - 1),
                creditBalance: Math.max(0, (c.creditBalance || 0) - debtAmount),
              }
            : c
        )
      );
    }

    // Cancel matching credit debt record if credit sale or had remaining debt
    if ((sale.remainingDue && sale.remainingDue > 0) || sale.paymentMethod === 'CREDIT') {
      setCreditDebtRecords(prev =>
        (prev || []).filter(r => !(r.referenceId === sale.id || r.title?.includes(sale.invoiceNumber) || r.notes?.includes(sale.invoiceNumber)))
      );
    }

    // Cash transaction refund if cash sale or cash advance on credit sale
    if ((sale.paymentMethod === 'ESPECES' || (sale.paymentMethod === 'CREDIT' && sale.amountReceived > 0)) && cashRegister && cashRegister.isOpen) {
      const cashAmountRefund = Math.min(sale.amountReceived, sale.totalAmount);
      if (cashAmountRefund > 0) {
        addCashTransaction(
          'REMBOURSEMENT_CLIENT',
          -cashAmountRefund,
          `Remboursement annulation vente ${sale.invoiceNumber}`,
          'ESPECES'
        );
      }
    }

    setSales(prev => prev.map(s => (s.id === saleId ? { ...s, status: 'ANNULEE' } : s)));
    logActivity('Annulation de vente', 'VENTE', sale.invoiceNumber, `Motif: ${reason}`);

    return { success: true };
  };

  // --- QUOTES (DEVIS & FACTURES PROFORMA) ---
  const addQuote = (quoteData: Omit<Quote, 'id' | 'quoteNumber' | 'createdAt' | 'userId' | 'userName'>): Quote => {
    const count = (quotes || []).length;
    const quoteNumber = generateQuoteNumber(count);

    const newQuote: Quote = {
      ...quoteData,
      id: generateId('quote'),
      quoteNumber,
      createdAt: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      status: quoteData.status || 'ENVOYE',
    };

    setQuotes(prev => [newQuote, ...(prev || [])]);
    logActivity('Création de Devis', 'VENTE', newQuote.quoteNumber, `Client: ${newQuote.customerName}, Montant: ${newQuote.totalAmount}`);
    return newQuote;
  };

  const updateQuote = (id: string, quoteData: Partial<Quote>) => {
    setQuotes(prev => (prev || []).map(q => (q.id === id ? { ...q, ...quoteData } : q)));
    logActivity('Modification Devis', 'VENTE', id, 'Mise à jour du devis / statut');
  };

  const deleteQuote = (id: string): boolean => {
    const q = (quotes || []).find(it => it.id === id);
    if (!q) return false;
    setQuotes(prev => (prev || []).filter(it => it.id !== id));
    logActivity('Suppression Devis', 'VENTE', q.quoteNumber, `Devis ${q.quoteNumber} supprimé`);
    return true;
  };

  const convertQuoteToSale = (
    quoteId: string,
    paymentMethod: PaymentMethod,
    amountReceived: number
  ): { success: boolean; sale?: Sale; message?: string } => {
    const quote = (quotes || []).find(q => q.id === quoteId);
    if (!quote) return { success: false, message: 'Devis introuvable.' };

    const saleItems: SaleItem[] = quote.items.map(it => {
      const prod = it.productId ? (products || []).find(p => p.id === it.productId) : undefined;
      const unitCost = it.unitCost !== undefined ? it.unitCost : (prod?.purchasePrice || 0);
      const margin = it.total - (unitCost * it.quantity);
      return {
        productId: it.productId || `custom_${generateId('item')}`,
        productName: it.productName,
        productCode: it.productCode || prod?.code,
        productUnit: it.productUnit || prod?.unit || 'pièce',
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        unitCost,
        discountPercent: it.discountPercent || 0,
        total: it.total,
        margin,
      };
    });

    const saleResult = createSale(
      saleItems,
      paymentMethod,
      amountReceived,
      quote.customerId,
      `Vente issue du devis ${quote.quoteNumber}. ${quote.notes || ''}`
    );

    if (saleResult.success && saleResult.sale) {
      updateQuote(quoteId, {
        status: 'CONVERTI',
        convertedSaleId: saleResult.sale.id,
      });
      logActivity('Conversion Devis en Vente', 'VENTE', quote.quoteNumber, `Converti en facture ${saleResult.sale.invoiceNumber}`);
    }

    return saleResult;
  };

  // --- CREDITS & DETTES (GESTION COMPLETE FOURNISSEURS & CLIENTS) ---
  const addCreditDebtRecord = (
    record: Omit<CreditDebtRecord, 'id' | 'payments' | 'paidAmount' | 'remainingAmount' | 'status'>
  ): CreditDebtRecord => {
    let finalPartyId = record.partyId;
    let finalPartyName = record.partyName;
    let updatedCustomers = customers || [];
    let updatedSuppliers = suppliers || [];

    // 1. If CLIENT_CREDIT:
    if (record.type === 'CLIENT_CREDIT') {
      const cust = (customers || []).find(
        c => (record.partyId && c.id === record.partyId) ||
             (c.name && record.partyName && c.name.trim().toLowerCase() === record.partyName.trim().toLowerCase())
      );
      if (cust) {
        finalPartyId = cust.id;
        finalPartyName = cust.name;
        updatedCustomers = (customers || []).map(c =>
          c.id === cust.id
            ? { ...c, creditBalance: Math.round(((c.creditBalance || 0) + record.initialAmount) * 100) / 100 }
            : c
        );
      } else {
        // Auto-create customer so they appear in customers directory with their credit balance!
        const newCust: Customer = {
          id: generateId('cust'),
          name: record.partyName.trim(),
          phone: record.partyPhone?.trim() || '',
          address: record.partyAddress?.trim() || '',
          creditBalance: record.initialAmount,
          creditLimit: 0,
          salesCount: 0,
          totalSpent: 0,
          createdAt: new Date().toISOString(),
        };
        finalPartyId = newCust.id;
        updatedCustomers = [newCust, ...updatedCustomers];
      }
      setCustomers(updatedCustomers);
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updatedCustomers));
    } else {
      // 2. If SUPPLIER_DEBT:
      const sup = (suppliers || []).find(
        s => (record.partyId && s.id === record.partyId) ||
             (s.companyName && record.partyName && s.companyName.trim().toLowerCase() === record.partyName.trim().toLowerCase())
      );
      if (sup) {
        finalPartyId = sup.id;
        finalPartyName = sup.companyName;
        updatedSuppliers = (suppliers || []).map(s =>
          s.id === sup.id
            ? { ...s, debtBalance: Math.round(((s.debtBalance || 0) + record.initialAmount) * 100) / 100 }
            : s
        );
      } else {
        // Auto-create supplier so they appear in suppliers directory with their debt balance!
        const newSup: Supplier = {
          id: generateId('sup'),
          companyName: record.partyName.trim(),
          contactName: record.partyName.trim(),
          phone: record.partyPhone?.trim() || '',
          address: record.partyAddress?.trim() || '',
          debtBalance: record.initialAmount,
          totalPurchased: 0,
          createdAt: new Date().toISOString(),
        };
        finalPartyId = newSup.id;
        updatedSuppliers = [newSup, ...updatedSuppliers];
      }
      setSuppliers(updatedSuppliers);
      localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(updatedSuppliers));
    }

    const newRecord: CreditDebtRecord = {
      ...record,
      id: generateId('cd'),
      partyId: finalPartyId || generateId('party'),
      partyName: finalPartyName,
      paidAmount: 0,
      remainingAmount: record.initialAmount,
      status: 'EN_COURS',
      payments: [],
      createdAt: record.createdAt || new Date().toISOString(),
    };

    const newRecords = [newRecord, ...(creditDebtRecords || [])];
    setCreditDebtRecords(newRecords);
    localStorage.setItem(STORAGE_KEYS.CREDIT_DEBT_RECORDS, JSON.stringify(newRecords));

    hasLocalMutations.current = true;
    syncToCloudNow(false, {
      creditDebtRecords: newRecords,
      customers: updatedCustomers,
      suppliers: updatedSuppliers,
    });

    logActivity(
      record.type === 'CLIENT_CREDIT' ? 'Nouveau Crédit Client' : 'Nouvelle Dette Fournisseur',
      record.type === 'CLIENT_CREDIT' ? 'CLIENT' : 'FOURNISSEUR',
      newRecord.partyName,
      `Montant: ${record.initialAmount}, Titre: ${record.title}`
    );

    return newRecord;
  };

  const recordCreditPayment = (
    recordId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    notes?: string
  ): { success: boolean; message?: string; receipt?: CreditPayment } => {
    const record = (creditDebtRecords || []).find(r => r.id === recordId);
    if (!record) return { success: false, message: 'Dossier de crédit introuvable.' };
    if (amount <= 0) return { success: false, message: 'Le montant de versement doit être supérieur à zéro.' };
    if (record.remainingAmount <= 0) {
      return { success: false, message: 'Ce dossier de crédit est déjà totalement soldé.' };
    }
    if (amount > record.remainingAmount + 0.01) {
      return {
        success: false,
        message: `Le versement (${amount}) ne peut pas dépasser le solde restant (${record.remainingAmount}).`,
      };
    }

    const actualAmount = Math.min(amount, record.remainingAmount);
    const receiptNumber = `REC-${new Date().getFullYear()}-${String((record.payments?.length || 0) + 1).padStart(3, '0')}`;
    const newPayment: CreditPayment = {
      id: generateId('pay'),
      date: new Date().toISOString(),
      amount: actualAmount,
      paymentMethod,
      notes,
      receivedBy: currentUser.name,
      receiptNumber,
    };

    const newPaidAmount = (record.paidAmount || 0) + actualAmount;
    const newRemainingAmount = Math.max(0, Math.round(((record.remainingAmount || 0) - actualAmount) * 100) / 100);
    const newStatus: 'SOLDE' | 'EN_COURS' = newRemainingAmount <= 0.001 ? 'SOLDE' : 'EN_COURS';

    const newCreditDebtRecords = (creditDebtRecords || []).map(r =>
      r.id === recordId
        ? {
            ...r,
            paidAmount: newPaidAmount,
            remainingAmount: newRemainingAmount,
            status: newStatus,
            payments: [newPayment, ...(r.payments || [])],
          }
        : r
    );
    setCreditDebtRecords(newCreditDebtRecords);
    localStorage.setItem(STORAGE_KEYS.CREDIT_DEBT_RECORDS, JSON.stringify(newCreditDebtRecords));

    let updatedCustomers = customers;
    let updatedSuppliers = suppliers;

    // If client credit payment, update customer creditBalance (match by partyId OR by partyName)
    if (record.type === 'CLIENT_CREDIT') {
      const cust = (customers || []).find(
        c => (record.partyId && c.id === record.partyId) ||
             (c.name && record.partyName && c.name.trim().toLowerCase() === record.partyName.trim().toLowerCase())
      );
      if (cust) {
        const newCustBalance = Math.max(0, Math.round(((cust.creditBalance || 0) - actualAmount) * 100) / 100);
        updatedCustomers = (customers || []).map(c =>
          c.id === cust.id ? { ...c, creditBalance: newCustBalance } : c
        );
        setCustomers(updatedCustomers);
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updatedCustomers));
      }
      if (paymentMethod === 'ESPECES' && cashRegister && cashRegister.isOpen) {
        addCashTransaction(
          'PAIEMENT_DETTE_CLIENT',
          actualAmount,
          `Encaissement crédit client : ${record.partyName} (${record.title})`,
          paymentMethod
        );
      }
    } else {
      // Supplier debt payment: update supplier debtBalance and register cash out if paid in cash
      const sup = (suppliers || []).find(
        s => (record.partyId && s.id === record.partyId) ||
             (s.companyName && record.partyName && s.companyName.trim().toLowerCase() === record.partyName.trim().toLowerCase())
      );
      if (sup) {
        const newSupBalance = Math.max(0, Math.round(((sup.debtBalance || 0) - actualAmount) * 100) / 100);
        updatedSuppliers = (suppliers || []).map(s =>
          s.id === sup.id ? { ...s, debtBalance: newSupBalance } : s
        );
        setSuppliers(updatedSuppliers);
        localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(updatedSuppliers));
      }
      if (paymentMethod === 'ESPECES' && cashRegister && cashRegister.isOpen) {
        addCashTransaction(
          'PAIEMENT_DETTE_FOURNISSEUR',
          -actualAmount,
          `Règlement dette fournisseur : ${record.partyName} (${record.title})`,
          paymentMethod
        );
      }
    }

    logActivity(
      record.type === 'CLIENT_CREDIT' ? 'Règlement Crédit Client' : 'Règlement Dette Fournisseur',
      record.type === 'CLIENT_CREDIT' ? 'CLIENT' : 'FOURNISSEUR',
      record.partyName,
      `Versement: ${actualAmount}, Solde restant: ${newRemainingAmount}`
    );

    // Immediate cloud push
    hasLocalMutations.current = true;
    syncToCloudNow(false, {
      creditDebtRecords: newCreditDebtRecords,
      customers: updatedCustomers,
      suppliers: updatedSuppliers,
    });

    return {
      success: true,
      message: `Versement de ${actualAmount} enregistré avec succès ! Solde restant: ${newRemainingAmount}`,
      receipt: newPayment,
    };
  };

  const cancelCreditPayment = (
    recordIdOrPaymentId: string,
    paymentId?: string,
    reason?: string
  ): { success: boolean; message?: string } => {
    let targetRecord = (creditDebtRecords || []).find(r => r.id === recordIdOrPaymentId);
    let targetPaymentId = paymentId;
    const cancelReason = reason;

    // If paymentId is not specified or record was not found by first ID, search across all records by paymentId
    if (!targetPaymentId) {
      targetPaymentId = recordIdOrPaymentId;
      targetRecord = (creditDebtRecords || []).find(r => (r.payments || []).some(p => p.id === targetPaymentId));
    } else if (!targetRecord) {
      targetRecord = (creditDebtRecords || []).find(r => (r.payments || []).some(p => p.id === targetPaymentId));
    }

    if (!targetRecord) {
      return { success: false, message: 'Dossier de crédit ou versement introuvable.' };
    }

    const paymentToCancel = (targetRecord.payments || []).find(p => p.id === targetPaymentId);
    if (!paymentToCancel) {
      return { success: false, message: 'Versement introuvable dans ce dossier.' };
    }

    const cancelAmount = paymentToCancel.amount;
    const newPaidAmount = Math.max(0, Math.round(((targetRecord.paidAmount || 0) - cancelAmount) * 100) / 100);
    const newRemainingAmount = Math.round(((targetRecord.remainingAmount || 0) + cancelAmount) * 100) / 100;
    const newStatus: 'EN_COURS' | 'SOLDE' = newRemainingAmount > 0.001 ? 'EN_COURS' : 'SOLDE';
    const updatedPayments = (targetRecord.payments || []).filter(p => p.id !== targetPaymentId);

    const updatedCreditDebtRecords = (creditDebtRecords || []).map(r =>
      r.id === targetRecord!.id
        ? {
            ...r,
            paidAmount: newPaidAmount,
            remainingAmount: newRemainingAmount,
            status: newStatus,
            payments: updatedPayments,
          }
        : r
    );
    setCreditDebtRecords(updatedCreditDebtRecords);
    localStorage.setItem(STORAGE_KEYS.CREDIT_DEBT_RECORDS, JSON.stringify(updatedCreditDebtRecords));

    let updatedCustomers = customers;
    let updatedSuppliers = suppliers;

    if (targetRecord.type === 'CLIENT_CREDIT') {
      // Re-add the debt back to the customer
      const cust = (customers || []).find(
        c => (targetRecord!.partyId && c.id === targetRecord!.partyId) ||
             (c.name && targetRecord!.partyName && c.name.trim().toLowerCase() === targetRecord!.partyName.trim().toLowerCase())
      );
      if (cust) {
        const newCustBalance = Math.round(((cust.creditBalance || 0) + cancelAmount) * 100) / 100;
        updatedCustomers = (customers || []).map(c =>
          c.id === cust.id ? { ...c, creditBalance: newCustBalance } : c
        );
        setCustomers(updatedCustomers);
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updatedCustomers));
      }

      // If original payment was in cash, refund / remove cash from the register
      if (paymentToCancel.paymentMethod === 'ESPECES' && cashRegister && cashRegister.isOpen) {
        addCashTransaction(
          'SORTIE',
          -cancelAmount,
          `Annulation encaissement dette client (${targetRecord.partyName}) - ${cancelReason || 'Versement erroné annulé'}`,
          paymentToCancel.paymentMethod
        );
      }
    } else {
      // Re-add the debt to the supplier
      const sup = (suppliers || []).find(
        s => (targetRecord!.partyId && s.id === targetRecord!.partyId) ||
             (s.companyName && targetRecord!.partyName && s.companyName.trim().toLowerCase() === targetRecord!.partyName.trim().toLowerCase())
      );
      if (sup) {
        const newSupBalance = Math.round(((sup.debtBalance || 0) + cancelAmount) * 100) / 100;
        updatedSuppliers = (suppliers || []).map(s =>
          s.id === sup.id ? { ...s, debtBalance: newSupBalance } : s
        );
        setSuppliers(updatedSuppliers);
        localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(updatedSuppliers));
      }

      // If original payment was in cash, return cash back to register
      if (paymentToCancel.paymentMethod === 'ESPECES' && cashRegister && cashRegister.isOpen) {
        addCashTransaction(
          'ENTREE',
          cancelAmount,
          `Annulation règlement fournisseur (${targetRecord.partyName}) - ${cancelReason || 'Paiement erroné annulé'}`,
          paymentToCancel.paymentMethod
        );
      }
    }

    logActivity(
      'Annulation encaissement dette',
      targetRecord.type === 'CLIENT_CREDIT' ? 'CLIENT' : 'FOURNISSEUR',
      targetRecord.partyName,
      `Annulation du versement de ${cancelAmount} (Reçu: ${paymentToCancel.receiptNumber || paymentToCancel.id}) - Raison: ${cancelReason || 'Erreur de saisie'}`
    );

    hasLocalMutations.current = true;
    syncToCloudNow(false, {
      creditDebtRecords: updatedCreditDebtRecords,
      customers: updatedCustomers,
      suppliers: updatedSuppliers,
    });

    return {
      success: true,
      message: `Encaissement de ${cancelAmount} annulé avec succès. La dette a été réactivée.`,
    };
  };

  const updateCreditDebtRecord = (id: string, updates: Partial<CreditDebtRecord>) => {
    const newRecords = (creditDebtRecords || []).map(r => (r.id === id ? { ...r, ...updates } : r));
    setCreditDebtRecords(newRecords);
    localStorage.setItem(STORAGE_KEYS.CREDIT_DEBT_RECORDS, JSON.stringify(newRecords));
    hasLocalMutations.current = true;
    syncToCloudNow(false, { creditDebtRecords: newRecords });
  };

  const deleteCreditDebtRecord = (id: string): boolean => {
    const record = (creditDebtRecords || []).find(r => r.id === id);
    if (!record) return false;

    let updatedCustomers = customers || [];
    let updatedSuppliers = suppliers || [];

    // Revert customer credit balance or supplier debt balance if there was remaining unpaid debt
    if (record.remainingAmount > 0) {
      if (record.type === 'CLIENT_CREDIT') {
        const cust = (customers || []).find(
          c => (record.partyId && c.id === record.partyId) ||
               (c.name && record.partyName && c.name.trim().toLowerCase() === record.partyName.trim().toLowerCase())
        );
        if (cust) {
          const newBal = Math.max(0, Math.round(((cust.creditBalance || 0) - record.remainingAmount) * 100) / 100);
          updatedCustomers = (customers || []).map(c => (c.id === cust.id ? { ...c, creditBalance: newBal } : c));
          setCustomers(updatedCustomers);
          localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updatedCustomers));
        }
      } else if (record.type === 'SUPPLIER_DEBT') {
        const sup = (suppliers || []).find(
          s => (record.partyId && s.id === record.partyId) ||
               (s.companyName && record.partyName && s.companyName.trim().toLowerCase() === record.partyName.trim().toLowerCase())
        );
        if (sup) {
          const newBal = Math.max(0, Math.round(((sup.debtBalance || 0) - record.remainingAmount) * 100) / 100);
          updatedSuppliers = (suppliers || []).map(s => (s.id === sup.id ? { ...s, debtBalance: newBal } : s));
          setSuppliers(updatedSuppliers);
          localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(updatedSuppliers));
        }
      }
    }

    const newRecords = (creditDebtRecords || []).filter(r => r.id !== id);
    setCreditDebtRecords(newRecords);
    localStorage.setItem(STORAGE_KEYS.CREDIT_DEBT_RECORDS, JSON.stringify(newRecords));

    hasLocalMutations.current = true;
    syncToCloudNow(false, {
      creditDebtRecords: newRecords,
      customers: updatedCustomers,
      suppliers: updatedSuppliers,
    });

    logActivity('Suppression dossier dette/crédit', 'SYSTEME', record.partyName, `Dossier ${record.title} supprimé`);
    return true;
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

    // If expense was paid in cash and cash register is open, reverse the cash outflow
    if (exp.paymentMethod === 'ESPECES' && cashRegister && cashRegister.isOpen) {
      addCashTransaction('ENTREE', exp.amount, `Annulation/Suppression dépense: ${exp.description}`, 'ESPECES');
    }

    setExpenses(prev => prev.filter(e => e.id !== id));
    logActivity('Suppression dépense', 'CAISSE', exp.category, `Suppression dépense ${exp.description} (${exp.amount})`);
    return true;
  };

  // Cash Register Management
  const openCashRegister = (openingBalance: number, notes?: string): boolean => {
    const numOpening = Number(openingBalance) >= 0 ? Number(openingBalance) : 0;

    const newReg: CashRegister = {
      id: generateId('csh_session'),
      openedAt: new Date().toISOString(),
      openedBy: currentUser?.id || 'usr_admin',
      openedByName: currentUser?.name || 'Administrateur',
      openingBalance: numOpening,
      isOpen: true,
      totalSales: 0,
      totalExpenses: 0,
      totalIn: 0,
      totalOut: 0,
      notes,
    };

    setCashRegister(newReg);
    try {
      localStorage.setItem(STORAGE_KEYS.CASH_REGISTER, JSON.stringify(newReg));
    } catch (e) {
      console.warn('LocalStorage error on openCashRegister:', e);
    }

    const initTx: CashTransaction = {
      id: generateId('tx'),
      cashRegisterId: newReg.id,
      type: 'OUVERTURE',
      amount: numOpening,
      reason: 'Ouverture de caisse - Fond initial',
      userId: currentUser?.id || 'usr_admin',
      userName: currentUser?.name || 'Administrateur',
      date: new Date().toISOString(),
      paymentMethod: 'ESPECES',
    };

    const nextTx = [initTx, ...(cashTransactions || [])];
    setCashTransactions(nextTx);
    try {
      localStorage.setItem(STORAGE_KEYS.CASH_TRANSACTIONS, JSON.stringify(nextTx));
    } catch (e) {
      console.warn('LocalStorage error on openCashRegister tx:', e);
    }

    logActivity('Ouverture de caisse', 'CAISSE', 'Caisse', `Fond initial: ${numOpening}`);

    // Direct and immediate cloud push to lock state and prevent stale snapshot race
    try {
      const docRef = doc(db, 'store_data', 'main_store');
      setDoc(docRef, {
        cashRegister: sanitizeForFirestore(newReg),
        cashTransactions: sanitizeForFirestore(nextTx),
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch(err => console.warn('Firestore open register sync warning:', err));
    } catch (e) {
      console.warn('Error pushing open cash register to cloud:', e);
    }

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
      closedBy: currentUser?.id || 'usr_admin',
      closedByName: currentUser?.name || 'Administrateur',
      closingBalanceTheoretical: theoreticalBalance,
      closingBalanceReal: realClosingBalance,
      discrepancy,
      discrepancyReason: discrepancy !== 0 ? discrepancyReason || 'Écart non spécifié' : undefined,
      isOpen: false,
      notes: notes || discrepancyReason,
    };

    setCashRegister(closedReg);
    try {
      localStorage.setItem(STORAGE_KEYS.CASH_REGISTER, JSON.stringify(closedReg));
    } catch (e) {
      console.warn('LocalStorage error on closeCashRegister:', e);
    }

    const closeTx: CashTransaction = {
      id: generateId('tx'),
      cashRegisterId: cashRegister.id,
      type: 'FERMETURE',
      amount: 0,
      reason: `Clôture de caisse. Réel: ${realClosingBalance}, Théorique: ${theoreticalBalance}, Écart: ${discrepancy}`,
      userId: currentUser?.id || 'usr_admin',
      userName: currentUser?.name || 'Administrateur',
      date: new Date().toISOString(),
    };

    const nextTx = [closeTx, ...cashTransactions];
    setCashTransactions(nextTx);
    try {
      localStorage.setItem(STORAGE_KEYS.CASH_TRANSACTIONS, JSON.stringify(nextTx));
    } catch (e) {
      console.warn('LocalStorage error on closeCashRegister tx:', e);
    }

    logActivity(
      'Fermeture de caisse',
      'CAISSE',
      'Caisse',
      `Solde réel: ${realClosingBalance}, Théorique: ${theoreticalBalance}, Écart: ${discrepancy}`
    );

    // Direct and immediate cloud push to lock closed state and prevent stale snapshot race
    try {
      const docRef = doc(db, 'store_data', 'main_store');
      setDoc(docRef, {
        cashRegister: sanitizeForFirestore(closedReg),
        cashTransactions: sanitizeForFirestore(nextTx),
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch(err => console.warn('Firestore close register sync warning:', err));
    } catch (e) {
      console.warn('Error pushing closed cash register to cloud:', e);
    }

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
    setQuotes([]);
    setCreditDebtRecords([]);
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
        details: 'Toutes les données ont été réinitialisées à 0 (ventes, devis, crédits/dettes, achats, dépenses, caisse, stocks).',
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
        quotes: [],
        creditDebtRecords: [],
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
    setQuotes([]);
    setCreditDebtRecords([]);
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
        quotes: [],
        creditDebtRecords: [],
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
      quotes,
      creditDebtRecords,
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
        if (parsed.quotes) setQuotes(parsed.quotes);
        if (parsed.creditDebtRecords) setCreditDebtRecords(parsed.creditDebtRecords);
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
        lastSyncTime,
        cloudSyncError,
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
        restoreDefaultCatalog,
        restoreProductsFromBackup,
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
        quotes: quotes || [],
        addQuote,
        updateQuote,
        deleteQuote,
        convertQuoteToSale,
        creditDebtRecords: creditDebtRecords || [],
        addCreditDebtRecord,
        recordCreditPayment,
        cancelCreditPayment,
        updateCreditDebtRecord,
        deleteCreditDebtRecord,
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
