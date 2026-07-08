export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF'
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  fullName: string;
  tenantId: string;
}

export interface Company {
  name: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  state: string;
  stateCode: string; // e.g., '27' for Maharashtra
  bankName: string;
  accountNo: string;
  ifsc: string;
  logoUrl?: string;
  qrCodeData?: string; // UPI ID or custom QR string
  invoiceHeader?: string;
  invoiceFooter?: string;
  themeColor?: string;
  currencySymbol?: string;
  currencyCode?: string;
  businessType?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  description: string;
  hsnCode: string;
  gstRate: number; // 0, 5, 12, 18, 28
  salesPrice: number;
  purchasePrice: number;
  minStockAlert: number;
  initialStock: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  state: string;
  stateCode: string;
  balance: number; // Receivable
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  state: string;
  stateCode: string;
  balance: number; // Payable
}

export interface InvoiceItem {
  productId: string;
  name: string;
  hsnCode: string;
  quantity: number;
  price: number;
  gstRate: number;
  discountPercent: number;
  subTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  items: InvoiceItem[];
  subTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  discount: number;
  totalAmount: number;
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial';
  paymentMethod: string;
  amountPaid: number;
  notes?: string;
}

export interface PurchaseItem {
  productId: string;
  name: string;
  hsnCode: string;
  quantity: number;
  price: number;
  gstRate: number;
  subTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface PurchaseEntry {
  id: string;
  billNumber: string;
  date: string;
  supplierId: string;
  items: PurchaseItem[];
  subTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  totalAmount: number;
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial';
  amountPaid: number;
  notes?: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  reference?: string;
}

export interface Payment {
  id: string;
  type: 'Inflow' | 'Outflow'; // Inflow from customer, Outflow to supplier
  date: string;
  partyId: string; // CustomerId or SupplierId
  partyName: string;
  amount: number;
  method: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque';
  reference?: string;
  notes?: string;
}

export interface StockLog {
  id: string;
  productId: string;
  date: string;
  type: 'Addition' | 'Reduction' | 'Adjustment';
  quantity: number;
  referenceId: string; // Sales ID, Purchase ID or 'Adjustment'
  notes?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Settings {
  company: Company;
  appsScriptUrl: string;
  sheetId: string;
  useGoogleSheets: boolean;
}

export interface DashboardStats {
  totalSales: number;
  totalPurchase: number;
  totalExpenses: number;
  totalTaxLiability: number; // GST Payable (Sales GST - Purchase GST)
  lowStockCount: number;
  salesGrowth: number; // Percent
  inventoryValuation: number;
  receivables: number;
  payables: number;
}

export interface AppState {
  users: User[];
  company: Company;
  categories: Category[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: SalesInvoice[];
  purchases: PurchaseEntry[];
  expenses: Expense[];
  payments: Payment[];
  stockLogs: StockLog[];
  activityLogs: ActivityLog[];
  settings: Settings;
  currentUser: User | null;
}

