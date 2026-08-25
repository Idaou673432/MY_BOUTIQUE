export type UserRole = 'ADMIN' | 'GERANT' | 'VENDEUR';

export interface RolePermissionConfig {
  label: string;
  description: string;
  allowedTabs: string[];
  defaultTab: string;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canManageProducts: boolean;
  canManagePurchases: boolean;
  canManageExpenses: boolean;
  canManageInventories: boolean;
  canCancelSales: boolean;
  canViewReports: boolean;
  canViewAudit: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissionConfig> = {
  VENDEUR: {
    label: 'Vendeur (Caissier)',
    description: 'Accès aux Ventes (POS), encaissement, devis/proformas, consultation crédits et fond de caisse.',
    allowedTabs: ['pos', 'sales', 'quotes', 'credits-debts', 'cash', 'products', 'customers'],
    defaultTab: 'pos',
    canManageUsers: false,
    canManageSettings: false,
    canManageProducts: false,
    canManagePurchases: false,
    canManageExpenses: false,
    canManageInventories: false,
    canCancelSales: true, // Caissier autorisé avec motif d'annulation
    canViewReports: false,
    canViewAudit: false,
  },
  GERANT: {
    label: 'Gérant de Boutique',
    description: 'Gestion complète du magasin : stocks, ventes, devis, crédits/dettes, achats, inventaires, caisse, clients, fournisseurs et dépenses.',
    allowedTabs: [
      'dashboard',
      'pos',
      'sales',
      'quotes',
      'credits-debts',
      'products',
      'stock',
      'purchases',
      'cash',
      'expenses',
      'inventory',
      'reports',
      'customers',
      'suppliers',
      'activity',
      'settings',
    ],
    defaultTab: 'dashboard',
    canManageUsers: false, // Réservé à l'Admin
    canManageSettings: true,
    canManageProducts: true,
    canManagePurchases: true,
    canManageExpenses: true,
    canManageInventories: true,
    canCancelSales: true,
    canViewReports: true,
    canViewAudit: true,
  },
  ADMIN: {
    label: 'Administrateur',
    description: 'Contrôle absolu : gestion des utilisateurs, attribution des rôles & PIN, paramètres avancés et audit.',
    allowedTabs: [
      'dashboard',
      'pos',
      'sales',
      'quotes',
      'credits-debts',
      'products',
      'stock',
      'purchases',
      'cash',
      'expenses',
      'inventory',
      'reports',
      'customers',
      'suppliers',
      'activity',
      'users',
      'settings',
    ],
    defaultTab: 'dashboard',
    canManageUsers: true,
    canManageSettings: true,
    canManageProducts: true,
    canManagePurchases: true,
    canManageExpenses: true,
    canManageInventories: true,
    canCancelSales: true,
    canViewReports: true,
    canViewAudit: true,
  },
};

export interface User {
  id: string;
  name: string;
  fullName?: string;
  username?: string;
  phone?: string;
  email: string;
  role: UserRole;
  pin: string;
  active: boolean;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface Product {
  id: string;
  code: string;
  barcode: string;
  name: string;
  description: string;
  categoryId: string;
  brand: string;
  unit: string; // e.g. 'pièce', 'kg', 'paquet', 'litre', 'boîte'
  purchasePrice: number;
  salePrice: number;
  currentStock: number;
  minStock: number;
  maxStock: number;
  supplierId?: string;
  location?: string; // Rayon / Étagère
  imageUrl?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MovementType = 
  | 'ENTREE' 
  | 'VENTE' 
  | 'RETOUR_CLIENT' 
  | 'RETOUR_FOURNISSEUR' 
  | 'PERTE' 
  | 'CASSE' 
  | 'AJUSTEMENT_INVENTAIRE' 
  | 'CORRECTION_MANUELLE';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  quantity: number; // positive or negative
  type: MovementType;
  previousStock: number;
  newStock: number;
  unitCost: number;
  userId: string;
  userName: string;
  date: string; // ISO string
  reason: string;
  referenceId?: string; // saleId, purchaseId, inventoryId
}

export type PurchaseStatus = 'BROUILLON' | 'COMMANDE' | 'RECU' | 'PARTIEL' | 'ANNULE';

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface Purchase {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseItem[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: PaymentMethod;
  status: PurchaseStatus;
  notes?: string;
  receivedDate?: string;
  createdBy: string;
}

export type PaymentMethod = 'ESPECES' | 'MOBILE_MONEY' | 'CARTE_BANCAIRE' | 'VIREMENT' | 'CREDIT';

export type BusinessType = 
  | 'ALIMENTATION' 
  | 'QUINCAILLERIE' 
  | 'MODE_BOUTIQUE' 
  | 'COSMETIQUE' 
  | 'ELECTRONIQUE' 
  | 'PHARMACIE' 
  | 'COMMERCE_GENERAL';

export interface SaleItem {
  productId: string;
  productName: string;
  productCode?: string;
  productUnit?: string; // 'pièce', 'kg', 'mètre', 'paquet', etc.
  quantity: number;
  unitPrice: number;
  unitCost: number; // purchase price at time of sale
  discountPercent: number;
  total: number;
  margin: number;
}

export type SaleStatus = 'COMPLETEE' | 'ANNULEE' | 'REMBOURSEE';

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  totalAmount: number;
  totalCost: number;
  totalMargin: number;
  paymentMethod: PaymentMethod;
  amountReceived: number;
  changeGiven: number;
  customerId?: string;
  customerName?: string;
  userId: string;
  userName: string;
  status: SaleStatus;
  notes?: string;
}

export type QuoteStatus = 'BROUILLON' | 'ENVOYE' | 'ACCEPTE' | 'REFUSE' | 'CONVERTI';

export interface QuoteItem {
  productId?: string;
  productName: string;
  productCode?: string;
  productUnit?: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  discountPercent: number;
  total: number;
}

export interface Quote {
  id: string;
  quoteNumber: string; // e.g. "DEV-2026-0001"
  date: string;
  validUntil: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  items: QuoteItem[];
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  totalAmount: number;
  status: QuoteStatus;
  notes?: string;
  terms?: string;
  userId: string;
  userName: string;
  convertedSaleId?: string;
  createdAt: string;
}

export type CreditType = 'CLIENT_CREDIT' | 'SUPPLIER_DEBT';

export interface CreditPayment {
  id: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  receivedBy: string;
  receiptNumber?: string;
}

export interface CreditDebtRecord {
  id: string;
  type: CreditType;
  partyId: string; // customerId or supplierId
  partyName: string;
  partyPhone?: string;
  partyAddress?: string;
  title: string; // e.g. "Facture FAC-2026-0012" or "Commande Fournisseur #CMD-004"
  initialAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate?: string;
  date: string;
  notes?: string;
  status: 'EN_COURS' | 'SOLDE' | 'EN_RETARD';
  referenceId?: string;
  payments: CreditPayment[];
  createdAt?: string;
}

export type CashTransactionType = 
  | 'OUVERTURE'
  | 'VENTE'
  | 'ENTREE'
  | 'SORTIE'
  | 'DEPENSE'
  | 'RETRAIT'
  | 'VERSEMENT'
  | 'REMBOURSEMENT_CLIENT'
  | 'PAIEMENT_DETTE_CLIENT'
  | 'PAIEMENT_DETTE_FOURNISSEUR'
  | 'FERMETURE';

export interface CashTransaction {
  id: string;
  cashRegisterId: string;
  type: CashTransactionType;
  amount: number; // positive = in, negative = out
  reason: string;
  userId: string;
  userName: string;
  date: string;
  referenceId?: string;
  paymentMethod?: PaymentMethod;
}

export interface CashRegister {
  id: string;
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  openedByName: string;
  closedBy?: string;
  closedByName?: string;
  openingBalance: number;
  closingBalanceTheoretical?: number;
  closingBalanceReal?: number;
  discrepancy?: number; // Real - Theoretical
  discrepancyReason?: string;
  isOpen: boolean;
  totalSales: number;
  totalExpenses: number;
  totalIn: number;
  totalOut: number;
  notes?: string;
}

export type ExpenseCategory =
  | 'LOYER'
  | 'ELECTRICITE_EAU'
  | 'SALAIRES'
  | 'TRANSPORT'
  | 'EMBALLAGE'
  | 'ENTRETIEN'
  | 'IMPOTS_TAXES'
  | 'AUTRE'
  | string;

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory; // 'Loyer', 'Électricité', 'Transport', 'Fournitures', 'Salaires', 'Autre'
  amount: number;
  description: string;
  paymentMethod: PaymentMethod;
  userId: string;
  userName: string;
  beneficiary?: string;
  receiptNumber?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  creditLimit?: number;
  notes?: string;
  totalSpent: number;
  totalPurchasesCount?: number;
  creditBalance: number; // Amount owed by customer
  salesCount: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  productsSupplied?: string[]; // Product IDs or descriptions
  totalPurchased: number;
  debtBalance: number; // Amount shop owes to supplier
  balanceDue?: number;
  createdAt: string;
}

export type InventoryStatus = 'EN_COURS' | 'VALIDE' | 'ANNULE';

export interface InventoryItem {
  productId: string;
  productCode: string;
  productName: string;
  categoryName: string;
  unitCost: number;
  unitPrice: number;
  theoreticalStock: number;
  realStock: number;
  difference: number; // realStock - theoreticalStock
  financialDifference: number; // difference * unitCost
  justification?: string;
  counted: boolean;
}

export interface Inventory {
  id: string;
  title: string; // e.g. "Inventaire Août 2026"
  date: string;
  responsibleId: string;
  responsibleName: string;
  items: InventoryItem[];
  totalProductsCounted: number;
  totalTheoreticalStockValue: number;
  totalRealStockValue: number;
  totalLossesValue: number; // value of negative differences
  totalSurplusValue: number; // value of positive differences
  netDifferenceValue: number;
  status: InventoryStatus;
  validatedAt?: string;
  validatedBy?: string;
  notes?: string;
}

export type InventorySession = Inventory;

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  category: 'CONNEXION' | 'VENTE' | 'STOCK' | 'ACHAT' | 'INVENTAIRE' | 'CAISSE' | 'CLIENT' | 'FOURNISSEUR' | 'PRIX' | 'SYSTEME';
  targetItem: string;
  details: string;
  timestamp: string;
}

export type PrinterType = 'BROWSER' | 'USB_SERIAL' | 'BLUETOOTH' | 'RAWBT';

export interface StoreSettings {
  storeName?: string;
  shopName?: string;
  storeTagline?: string;
  logoUrl?: string; // URL or base64 data URI of the store logo
  businessType?: BusinessType;
  address?: string;
  shopAddress?: string;
  phone?: string;
  shopPhone?: string;
  email?: string;
  shopEmail?: string;
  nifRccm?: string; // N° RCCM, NIF, SIRET, Identifiant Fiscal
  bankDetails?: string; // RIB / Compte bancaire
  mobileMoneyNumber?: string; // Numéro Wave / Orange Money / MTN
  taxRatePercent: number; // e.g. 18% or 0%
  taxEnabled: boolean;
  currency: string; // e.g. 'FCFA', '€', '$', 'MAD', 'DZD', 'GNF', 'CDF'
  receiptFooterMessage: string;
  invoiceLegalNotice?: string;
  invoicePrefix?: string; // e.g. 'FACT-'
  defaultInvoiceFormat?: 'A4' | 'TICKET';
  allowNegativeStock: boolean;
  lowStockThresholdDefault: number;
  cashThresholdAlert?: number;
  printerType?: PrinterType;
  autoPrintReceiptOnSale?: boolean;
  directThermalWidthMm?: 80 | 58;
  bluetoothDeviceName?: string;
  openCashDrawerOnPrint?: boolean;
}
