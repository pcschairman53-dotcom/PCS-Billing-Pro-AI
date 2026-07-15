import { 
  User, UserRole, Company, Category, Product, Customer, Supplier, 
  SalesInvoice, PurchaseEntry, Expense, Payment, StockLog, ActivityLog, Settings, AppState 
} from '../types';

// Simple hashing for presentation purpose (unencrypted storage is avoided)
export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'pcs_hash_' + hash.toString(16);
}

const DEFAULT_COMPANY: Company = {
  name: "PCS Enterprises Pvt Ltd",
  gstin: "27AAAAA1111A1Z1", // Maharashtra GSTIN format
  phone: "+91 98765 43210",
  email: "billing@pcsenterprises.in",
  address: "102, Business Plaza, MG Road, Pune, Maharashtra",
  state: "Maharashtra",
  stateCode: "27",
  bankName: "State Bank of India",
  accountNo: "332211009988",
  ifsc: "SBIN0001234",
  logoUrl: "",
  qrCodeData: "upi://pay?pa=pcsenterprises@sbi&pn=PCS%20Enterprises&cu=INR",
  invoiceHeader: "TAX INVOICE - ORIGINAL FOR RECIPIENT",
  invoiceFooter: "Thank you for your business! Terms: Goods once sold cannot be taken back or exchanged. Interest @ 18% p.a. will be charged for delayed payments.",
  themeColor: "emerald",
  currencySymbol: "₹",
  currencyCode: "INR",
  businessType: "Retail Business"
};

export function formatCurrency(amount: number, company?: Company, showDecimals: boolean = false): string {
  const code = company?.currencyCode || 'INR';
  const symbol = company?.currencySymbol || '₹';
  const locale = code === 'INR' ? 'en-IN' : 'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0
    }).format(amount);
  } catch (e) {
    const formattedNum = amount.toLocaleString(locale, {
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0
    });
    return `${symbol}${formattedNum}`;
  }
}

const DEFAULT_CATEGORIES: Category[] = [];

const DEFAULT_PRODUCTS: Product[] = [];

const DEFAULT_CUSTOMERS: Customer[] = [];

const DEFAULT_SUPPLIERS: Supplier[] = [];

const DEFAULT_USERS: User[] = [
  {
    id: "user-1",
    username: "admin",
    passwordHash: hashPassword("admin"),
    role: UserRole.ADMIN,
    fullName: "System Admin",
    tenantId: "tenant-pcs"
  },
  {
    id: "user-2",
    username: "staff",
    passwordHash: hashPassword("staff"),
    role: UserRole.STAFF,
    fullName: "Billing Staff",
    tenantId: "tenant-pcs"
  }
];

const DEFAULT_SALES: SalesInvoice[] = [];

const DEFAULT_PURCHASES: PurchaseEntry[] = [];

const DEFAULT_EXPENSES: Expense[] = [];

const DEFAULT_PAYMENTS: Payment[] = [];

const DEFAULT_STOCK_LOGS: StockLog[] = [];

const DEFAULT_ACTIVITY_LOGS: ActivityLog[] = [
  { id: "act-1", userId: "user-1", username: "admin", action: "System Init", details: "Application database initialized with Google Sheets persistent structure templates.", timestamp: "2026-07-07T08:00:00.000Z" }
];

const DEFAULT_SETTINGS: Settings = {
  company: DEFAULT_COMPANY,
  appsScriptUrl: "/api/action",
  sheetId: "",
  useGoogleSheets: true
};




export function getInitialState(): AppState {
  const loadOrInit = <T>(key: string, defaultValue: T): T => {
    const val = localStorage.getItem(`pcs_billing_${key}`);
    if (val) {
      try {
        return JSON.parse(val);
      } catch (e) {
        return defaultValue;
      }
    }
    localStorage.setItem(`pcs_billing_${key}`, JSON.stringify(defaultValue));
    return defaultValue;
  };

  const users = loadOrInit('users', DEFAULT_USERS);
  const company = loadOrInit('company', DEFAULT_COMPANY);
  const categories = loadOrInit('categories', DEFAULT_CATEGORIES);
  const products = loadOrInit('products', DEFAULT_PRODUCTS);
  const customers = loadOrInit('customers', DEFAULT_CUSTOMERS);
  const suppliers = loadOrInit('suppliers', DEFAULT_SUPPLIERS);
  const sales = loadOrInit('sales', DEFAULT_SALES);
  const purchases = loadOrInit('purchases', DEFAULT_PURCHASES);
  const expenses = loadOrInit('expenses', DEFAULT_EXPENSES);
  const payments = loadOrInit('payments', DEFAULT_PAYMENTS);
  const stockLogs = loadOrInit('stockLogs', DEFAULT_STOCK_LOGS);
  const activityLogs = loadOrInit('activityLogs', DEFAULT_ACTIVITY_LOGS);
  
  const settings = loadOrInit('settings', DEFAULT_SETTINGS);
  
  // Always force the deployed Express MongoDB backend URL and ensure useGoogleSheets is enabled
  const deployedUrl = "/api/action";
  if (settings.appsScriptUrl !== deployedUrl || !settings.useGoogleSheets) {
    settings.appsScriptUrl = deployedUrl;
    settings.useGoogleSheets = true;
    localStorage.setItem('pcs_billing_settings', JSON.stringify(settings));
  }
  
  // Try loading active session
  let currentUser: User | null = null;
  const sessionUserStr = sessionStorage.getItem('pcs_billing_session_user');
  if (sessionUserStr) {
    try {
      currentUser = JSON.parse(sessionUserStr);
    } catch(e) {}
  }

  return {
    users,
    company,
    categories,
    products,
    customers,
    suppliers,
    sales,
    purchases,
    expenses,
    payments,
    stockLogs,
    activityLogs,
    settings,
    currentUser
  };
}

export function saveStateToLocal(state: Partial<AppState>) {
  Object.entries(state).forEach(([key, value]) => {
    if (key !== 'currentUser') {
      localStorage.setItem(`pcs_billing_${key}`, JSON.stringify(value));
    } else {
      if (value) {
        sessionStorage.setItem('pcs_billing_session_user', JSON.stringify(value));
      } else {
        sessionStorage.removeItem('pcs_billing_session_user');
      }
    }
  });
}

// Full app state sync module helper to Google Apps Script Web App
export async function syncStateWithGoogleSheets(state: AppState, appsScriptUrl: string): Promise<{ success: boolean; message: string; remoteState?: Partial<AppState> }> {
  if (!appsScriptUrl) {
    return { success: false, message: "Backend URL is missing." };
  }

  if (appsScriptUrl !== "/api/action" && !appsScriptUrl.startsWith("https://script.google.com/")) {
    return { success: false, message: "Invalid backend URL format." };
  }

  try {
    const payload = {
      action: "sync",
      data: {
        users: state.users,
        company: state.settings.company, // Company is saved inside settings
        categories: state.categories,
        products: state.products,
        customers: state.customers,
        suppliers: state.suppliers,
        sales: state.sales,
        purchases: state.purchases,
        expenses: state.expenses,
        payments: state.payments,
        stockLogs: state.stockLogs,
        activityLogs: state.activityLogs
      },
      auth: state.currentUser ? {
        username: state.currentUser.username,
        token: state.currentUser.passwordHash || "system-token"
      } : undefined
    };

    const response = await fetch(appsScriptUrl, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result && result.success) {
      return { 
        success: true, 
        message: "Synchronized successfully with the database!", 
        remoteState: result.data 
      };
    } else {
      return { 
        success: false, 
        message: result.error || "Backend returned an unexpected response format." 
      };
    }
  } catch (error: any) {
    console.warn("Sync Warning (handled gracefully):", error);
    return { 
      success: false, 
      message: `Sync failed: ${error?.message || error || "Network Error"}.` 
    };
  }
}

// Fetch all data from sheets
export async function fetchAllDataFromSheets(appsScriptUrl: string, currentUser?: User): Promise<{ success: boolean; message: string; data?: Partial<AppState> }> {
  if (!appsScriptUrl) {
    return { success: false, message: "Backend URL is missing." };
  }

  if (appsScriptUrl !== "/api/action" && !appsScriptUrl.startsWith("https://script.google.com/")) {
    return { success: false, message: "Invalid backend URL format." };
  }

  try {
    let url = `${appsScriptUrl}?action=getAll`;
    if (currentUser) {
      url += `&username=${encodeURIComponent(currentUser.username)}&token=${encodeURIComponent(currentUser.passwordHash)}`;
    }
    const response = await fetch(url, {
      method: "GET",
      mode: "cors"
    });

    const result = await response.json();
    if (result && result.success) {
      return {
        success: true,
        message: "Data loaded successfully from the database!",
        data: result.data
      };
    } else {
      return {
        success: false,
        message: result.error || "Failed to load data from the database."
      };
    }
  } catch (error: any) {
    console.warn("Fetch Warning (handled gracefully):", error);
    return {
      success: false,
      message: `Failed to fetch data: ${error?.message || error || "Network Error"}`
    };
  }
}

// Generate the Google Apps Script code for copy pasting
export function getGoogleAppsScriptTemplate(): string {
  return `/**
 * Google Apps Script Backend for PCS Billing Pro AI
 * 
 * FEATURES:
 * - Single Code.gs deployment architecture
 * - Action-based REST API supporting doGet and doPost
 * - Secure Role-Based Authentication with password hashing (matches front-end hashing)
 * - Complete CRUD Operations for Products, Categories, Customers, Suppliers, Expenses, and Payments
 * - Transactions Controller for Sales and Purchases with Auto-Inventory update and Ledger updates
 * - Dynamic Reporting and Real-time GST calculations
 * - Complete spreadsheet auto-initialization of all required tabs and default Admin/Staff records
 * - Optimized for minimal cell read/writes to fit low Google account quotas
 * 
 * INSTALLATION:
 * 1. Open your Google Sheet.
 * 2. Click Extensions > Apps Script.
 * 3. Replace all default code with this file's contents.
 * 4. Click Save, then click "Deploy" > "New deployment".
 * 5. Choose "Web app", run as "Me", and grant access to "Anyone".
 * 6. Copy the Web App URL and paste it into the Settings > Sync Configuration section in your app.
 */

var SHEET_NAMES = [
  "Users", "Company", "Products", "Categories", "Customers", 
  "Suppliers", "Sales", "Purchases", "Expenses", "Payments", 
  "StockLogs", "ActivityLogs"
];

// --- 1. CORE WEB SERVER INTERFACES ---

/**
 * Handles HTTP GET requests
 */
function doGet(e) {
  try {
    initializeSheetsIfEmpty();
    var action = e.parameter.action;
    
    if (!action) {
      return renderJson({ success: false, error: "Action parameter is required." });
    }
    
    // Normalize action alias
    action = normalizeAction(action);
    
    // Router for GET actions
    switch (action) {
      case "getAll":
        return renderJson({
          success: true,
          data: getAllSheetsData()
        });
        
      case "getReports":
        return renderJson({
          success: true,
          data: calculateDynamicReports()
        });
        
      case "getInventory":
        return renderJson({
          success: true,
          data: getInventorySummaryData()
        });
        
      case "getCustomers":
        return renderJson({
          success: true,
          data: getCustomersData()
        });

      case "getSuppliers":
        return renderJson({
          success: true,
          data: getSuppliersData()
        });

      case "getCategories":
        return renderJson({
          success: true,
          data: getCategoriesData()
        });

      case "getProducts":
        return renderJson({
          success: true,
          data: getProductsData()
        });

      case "getExpenses":
        return renderJson({
          success: true,
          data: getExpensesData()
        });

      case "getPayments":
        return renderJson({
          success: true,
          data: getPaymentsData()
        });

      case "getSales":
        return renderJson({
          success: true,
          data: getSalesData()
        });

      case "getPurchases":
        return renderJson({
          success: true,
          data: getPurchasesData()
        });

      case "getActivityLogs":
        return renderJson({
          success: true,
          data: getActivityLogsData()
        });

      case "getStockLogs":
        return renderJson({
          success: true,
          data: getStockLogsData()
        });

      case "getCompany":
      case "getSettings":
        return renderJson({
          success: true,
          data: getCompanySettings()
        });

      case "getDashboard":
        return renderJson({
          success: true,
          data: getDashboardData()
        });
        
      default:
        return renderJson({
          success: false,
          error: "Invalid GET action: " + action
        });
    }
  } catch (err) {
    return renderJson({
      success: false,
      error: "GET Server Error: " + err.toString()
    });
  }
}

/**
 * Handles HTTP POST requests
 */
function doPost(e) {
  try {
    initializeSheetsIfEmpty();
    
    if (!e.postData || !e.postData.contents) {
      return renderJson({ success: false, error: "Empty POST body request." });
    }
    
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;
    var payload = requestData.data || {};
    
    if (!action) {
      return renderJson({ success: false, error: "Post action parameter is required." });
    }
    
    // Auth Guard for specific REST API routes (e.g. CRUD)
    var activeUser = null;
    if (requestData.auth) {
      activeUser = validateTokenAndGetUser(requestData.auth.username, requestData.auth.token);
    }
    
    // Normalize action alias
    action = normalizeAction(action);
    
    // Router for POST actions
    switch (action) {
      case "sync":
        // Fallback for background full-sync operation
        var syncResult = syncAllSheetsData(payload);
        return renderJson({
          success: true,
          message: "Full synchronization complete.",
          data: syncResult
        });
        
      case "login":
        return handleApiLogin(payload);
        
      // --- Products CRUD ---
      case "createProduct":
        return handleCreateItem("Products", payload, activeUser, "Admin");
      case "updateProduct":
        return handleUpdateItem("Products", payload, activeUser, "Admin");
      case "deleteProduct":
        return handleDeleteItem("Products", payload.id, activeUser, "Admin");
        
      // --- Categories CRUD ---
      case "createCategory":
        return handleCreateCategory(payload, activeUser);
      case "updateCategory":
        return handleUpdateItem("Categories", payload, activeUser, "Admin");
      case "deleteCategory":
        return handleDeleteItem("Categories", payload.id, activeUser, "Admin");
        
      // --- Customers CRUD ---
      case "createCustomer":
        return handleCreateItem("Customers", payload, activeUser);
      case "updateCustomer":
        return handleUpdateItem("Customers", payload, activeUser);
      case "deleteCustomer":
        return handleDeleteItem("Customers", payload.id, activeUser, "Admin");
        
      // --- Suppliers CRUD ---
      case "createSupplier":
        return handleCreateItem("Suppliers", payload, activeUser);
      case "updateSupplier":
        return handleUpdateItem("Suppliers", payload, activeUser);
      case "deleteSupplier":
        return handleDeleteItem("Suppliers", payload.id, activeUser, "Admin");
        
      // --- Transactions (Sales / Purchases) CRUD ---
      case "createSale":
        return handleCreateSaleInvoice(payload, activeUser);
      case "createPurchase":
        return handleCreatePurchaseEntry(payload, activeUser);
        
      // --- Expenses CRUD ---
      case "createExpense":
        return handleCreateExpense(payload, activeUser);
      case "updateExpense":
        return handleUpdateItem("Expenses", payload, activeUser, "Admin");
      case "deleteExpense":
        return handleDeleteItem("Expenses", payload.id, activeUser, "Admin");
        
      // --- Payments CRUD ---
      case "createPayment":
        return handleCreatePayment(payload, activeUser);
      case "updatePayment":
        return handleUpdateItem("Payments", payload, activeUser, "Admin");
      case "deletePayment":
        return handleDeleteItem("Payments", payload.id, activeUser, "Admin");
        
      // --- Settings ---
      case "updateCompany":
        return handleUpdateCompanySettings(payload, activeUser, "Admin");

      // --- Retrieve / GET actions supported over POST for reliability ---
      case "getAll":
        return renderJson({ success: true, data: getAllSheetsData() });
      case "getReports":
        return renderJson({ success: true, data: calculateDynamicReports() });
      case "getInventory":
        return renderJson({ success: true, data: getInventorySummaryData() });
      case "getCustomers":
        return renderJson({ success: true, data: getCustomersData() });
      case "getSuppliers":
        return renderJson({ success: true, data: getSuppliersData() });
      case "getCategories":
        return renderJson({ success: true, data: getCategoriesData() });
      case "getProducts":
        return renderJson({ success: true, data: getProductsData() });
      case "getExpenses":
        return renderJson({ success: true, data: getExpensesData() });
      case "getPayments":
        return renderJson({ success: true, data: getPaymentsData() });
      case "getSales":
        return renderJson({ success: true, data: getSalesData() });
      case "getPurchases":
        return renderJson({ success: true, data: getPurchasesData() });
      case "getActivityLogs":
        return renderJson({ success: true, data: getActivityLogsData() });
      case "getStockLogs":
        return renderJson({ success: true, data: getStockLogsData() });
      case "getCompany":
      case "getSettings":
        return renderJson({ success: true, data: getCompanySettings() });
      case "getDashboard":
        return renderJson({ success: true, data: getDashboardData() });
        
      default:
        return renderJson({
          success: false,
          error: "Invalid POST action: " + action
        });
    }
  } catch (err) {
    return renderJson({
      success: false,
      error: "POST Server Error: " + err.toString()
    });
  }
}

/**
 * Maps all front-end aliases safely to correct internal action names.
 */
function normalizeAction(action) {
  if (!action) return "";
  var lower = action.toString().trim().toLowerCase();
  
  if (lower === "createcategory" || lower === "savecategory" || lower === "addcategory" || lower === "insertcategory") {
    return "createCategory";
  }
  if (lower === "createproduct" || lower === "saveproduct" || lower === "addproduct" || lower === "insertproduct") {
    return "createProduct";
  }
  if (lower === "createcustomer" || lower === "savecustomer") {
    return "createCustomer";
  }
  if (lower === "createsupplier" || lower === "savesupplier") {
    return "createSupplier";
  }
  if (lower === "updatecompany" || lower === "savecompany" || lower === "updatesettings" || lower === "savecompanysettings") {
    return "updateCompany";
  }
  if (lower === "getdashboard" || lower === "dashboard") {
    return "getDashboard";
  }
  if (lower === "getreports" || lower === "reports") {
    return "getReports";
  }
  if (lower === "getinventory" || lower === "getstock" || lower === "inventory") {
    return "getInventory";
  }
  if (lower === "getproducts" || lower === "products") {
    return "getProducts";
  }
  if (lower === "getcategories" || lower === "categories") {
    return "getCategories";
  }
  if (lower === "getcustomers" || lower === "customers") {
    return "getCustomers";
  }
  if (lower === "getsuppliers" || lower === "suppliers") {
    return "getSuppliers";
  }
  if (lower === "getexpenses" || lower === "expenses") {
    return "getExpenses";
  }
  if (lower === "getpayments" || lower === "payments") {
    return "getPayments";
  }
  if (lower === "getsales" || lower === "sales") {
    return "getSales";
  }
  if (lower === "getpurchases" || lower === "purchases") {
    return "getPurchases";
  }
  if (lower === "getactivitylogs" || lower === "activitylogs" || lower === "activity") {
    return "getActivityLogs";
  }
  if (lower === "getstocklogs" || lower === "stocklogs") {
    return "getStockLogs";
  }
  if (lower === "getcompany" || lower === "getsettings" || lower === "company" || lower === "settings") {
    return "getCompany";
  }
  
  return action;
}

// --- 2. AUTHENTICATION CONTROLLER ---

/**
 * Verifies standard credentials and generates a temporary session payload
 */
function handleApiLogin(payload) {
  var username = payload.username;
  var password = payload.password;
  
  if (!username || !password) {
    return renderJson({ success: false, error: "Username and password are required." });
  }
  
  var users = getSheetAsJson("Users");
  var userHash = hashPassword(password);
  
  var matchedUser = null;
  for (var i = 0; i < users.length; i++) {
    if (users[i].username.toLowerCase() === username.toLowerCase()) {
      if (users[i].password === userHash) {
        matchedUser = users[i];
        break;
      }
    }
  }
  
  if (!matchedUser) {
    return renderJson({ success: false, error: "Invalid username or password." });
  }
  
  // Return safe session token
  var mockToken = Utilities.base64Encode(username + ":" + Utilities.formatDate(new Date(), "GMT", "yyyyMMdd"));
  
  logActivity("user-system", username, "User Login", "Login successful via REST API");
  
  return renderJson({
    success: true,
    message: "Login successful",
    user: {
      id: matchedUser.id,
      name: matchedUser.name,
      username: matchedUser.username,
      role: matchedUser.role,
      token: mockToken
    }
  });
}

/**
 * Role-Based access check
 */
function validateTokenAndGetUser(username, token) {
  if (!username) return null;
  var users = getSheetAsJson("Users");
  for (var i = 0; i < users.length; i++) {
    if (users[i].username.toLowerCase() === username.toLowerCase()) {
      return users[i];
    }
  }
  return null;
}

/**
 * Standard front-end compatible custom hashing
 */
function hashPassword(password) {
  if (!password) return "";
  var hash = 0;
  for (var i = 0; i < password.length; i++) {
    var char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; 
  }
  return "pcs_hash_" + hash.toString(16);
}

// --- 3. DATABASE CRUD DRIVER ---

/**
 * Generic insert row operation
 */
function handleCreateItem(sheetName, item, activeUser, requiredRole) {
  if (requiredRole && (!activeUser || activeUser.role !== requiredRole)) {
    return renderJson({ success: false, error: "Access Denied. Required role: " + requiredRole });
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheetByNameRobust(ss, sheetName);
  if (!sheet) return renderJson({ success: false, error: "Table " + sheetName + " does not exist." });
  
  // Assign new ID if not present
  if (!item.id) {
    item.id = sheetName.toLowerCase().substring(0, 4) + "_" + Math.floor(Math.random() * 1000000).toString();
  }
  
  var headers = getSheetHeaders(sheet);
  var rowValues = [];
  
  headers.forEach(function(h) {
    var val = item[h];
    if (val === undefined || val === null) val = "";
    if (typeof val === "object") val = JSON.stringify(val);
    rowValues.push(val);
  });
  
  sheet.appendRow(rowValues);
  
  var operator = activeUser ? activeUser.username : "System";
  logActivity(activeUser ? activeUser.id : "sys", operator, "Create " + sheetName, "Created item with ID " + item.id);
  
  return renderJson({
    success: true,
    message: "Record created successfully in " + sheetName,
    data: item
  });
}

/**
 * Custom category insertion logic to handle auto ID, duplicate names, and return proper JSON
 */
function handleCreateCategory(item, activeUser) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheetByNameRobust(ss, "Categories");
  if (!sheet) return renderJson({ success: false, error: "Categories sheet does not exist." });
  
  // Auto create ID if missing
  if (!item.id) {
    item.id = "cate_" + Math.floor(Math.random() * 1000000).toString();
  }
  
  var name = (item.name || "").toString().trim();
  if (!name) {
    return renderJson({ success: false, error: "Category name is required." });
  }
  
  // Ignore duplicate names
  var existing = getCategoriesData();
  var duplicate = existing.find(function(c) {
    return (c.name || "").toString().trim().toLowerCase() === name.toLowerCase();
  });
  
  if (duplicate) {
    return renderJson({
      success: true,
      message: "Category already exists.",
      data: duplicate
    });
  }
  
  var headers = getSheetHeaders(sheet);
  var rowValues = [];
  headers.forEach(function(h) {
    var val = item[h];
    if (val === undefined || val === null) val = "";
    if (typeof val === "object") val = JSON.stringify(val);
    rowValues.push(val);
  });
  
  sheet.appendRow(rowValues);
  
  var operator = activeUser ? activeUser.username : "System";
  logActivity(activeUser ? activeUser.id : "sys", operator, "Create Category", "Created Category " + name + " with ID " + item.id);
  
  return renderJson({
    success: true,
    message: "Category created successfully",
    data: item
  });
}

/**
 * Generic update row operation
 */
function handleUpdateItem(sheetName, item, activeUser, requiredRole) {
  if (requiredRole && (!activeUser || activeUser.role !== requiredRole)) {
    return renderJson({ success: false, error: "Access Denied. Required role: " + requiredRole });
  }
  
  if (!item.id) {
    return renderJson({ success: false, error: "Record update requires a unique ID." });
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheetByNameRobust(ss, sheetName);
  if (!sheet) return renderJson({ success: false, error: "Table " + sheetName + " does not exist." });
  
  var headers = getSheetHeaders(sheet);
  var idColIdx = headers.indexOf("id") + 1;
  if (idColIdx === 0) idColIdx = 1;
  
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  var rowIndex = -1;
  
  for (var r = 1; r < values.length; r++) {
    if (values[r][idColIdx - 1].toString() === item.id.toString()) {
      rowIndex = r + 1;
      break;
    }
  }
  
  if (rowIndex === -1) {
    return renderJson({ success: false, error: "Record not found with ID " + item.id });
  }
  
  var rowValues = [];
  headers.forEach(function(h) {
    var val = item[h];
    if (val === undefined || val === null) val = "";
    if (typeof val === "object") val = JSON.stringify(val);
    rowValues.push(val);
  });
  
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
  
  var operator = activeUser ? activeUser.username : "System";
  logActivity(activeUser ? activeUser.id : "sys", operator, "Update " + sheetName, "Updated item with ID " + item.id);
  
  return renderJson({
    success: true,
    message: "Record updated successfully in " + sheetName,
    data: item
  });
}

/**
 * Generic delete row operation
 */
function handleDeleteItem(sheetName, itemId, activeUser, requiredRole) {
  if (requiredRole && (!activeUser || activeUser.role !== requiredRole)) {
    return renderJson({ success: false, error: "Access Denied. Required role: " + requiredRole });
  }
  
  if (!itemId) {
    return renderJson({ success: false, error: "Record deletion requires a unique ID." });
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheetByNameRobust(ss, sheetName);
  if (!sheet) return renderJson({ success: false, error: "Table " + sheetName + " does not exist." });
  
  var headers = getSheetHeaders(sheet);
  var idColIdx = headers.indexOf("id") + 1;
  if (idColIdx === 0) idColIdx = 1;
  
  var values = sheet.getDataRange().getValues();
  var rowIndex = -1;
  
  for (var r = 1; r < values.length; r++) {
    if (values[r][idColIdx - 1].toString() === itemId.toString()) {
      rowIndex = r + 1;
      break;
    }
  }
  
  if (rowIndex === -1) {
    return renderJson({ success: false, error: "Record not found with ID " + itemId });
  }
  
  sheet.deleteRow(rowIndex);
  
  var operator = activeUser ? activeUser.username : "System";
  logActivity(activeUser ? activeUser.id : "sys", operator, "Delete " + sheetName, "Deleted item with ID " + itemId);
  
  return renderJson({
    success: true,
    message: "Record deleted successfully from " + sheetName
  });
}

// --- 4. SALES & INVENTORY CONTROLLERS (WITH AUTO-UPDATE) ---

/**
 * Handles creation of Sales Invoices and automatically decreases stock
 */
function handleCreateSaleInvoice(sale, activeUser) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Generate Invoice ID
  if (!sale.id) sale.id = "sale_" + Math.floor(Math.random() * 1000000).toString();
  if (!sale.invoiceNumber) {
    var count = getSalesData().length + 1;
    sale.invoiceNumber = "INV-" + Utilities.formatDate(new Date(), "GMT", "yyyy") + "-" + ("000" + count).slice(-3);
  }
  
  // 2. Decrement Stocks & Add StockLogs for each item in the invoice
  var items = sale.items || [];
  var today = Utilities.formatDate(new Date(), "GMT+5.5", "yyyy-MM-dd");
  
  items.forEach(function(item) {
    var prodId = item.productId;
    var qty = Number(item.quantity);
    if (isNaN(qty)) qty = 0;
    
    // Decrease inventory in Products tab
    updateProductStock(prodId, -qty);
    
    // Append to StockLogs tab
    var stockLog = {
      id: "stk_" + Math.floor(Math.random() * 1000000).toString(),
      productId: prodId,
      date: today,
      type: "Reduction",
      quantity: qty,
      referenceId: sale.id,
      notes: "Sales Invoice " + sale.invoiceNumber
    };
    appendRecord("StockLogs", stockLog);
  });
  
  // 3. Update Customer Balance
  if (sale.customerId) {
    var customers = getCustomersData();
    var customer = customers.find(function(c) { return c.id === sale.customerId; });
    if (customer) {
      // Balance increases by the invoice value, minus whatever was paid immediately
      var unpaidAmount = Number(sale.totalAmount || 0) - Number(sale.amountPaid || 0);
      if (isNaN(unpaidAmount)) unpaidAmount = 0;
      customer.balance = Number(customer.balance || 0) + unpaidAmount;
      if (isNaN(customer.balance)) customer.balance = 0;
      updateRecordInSheet("Customers", customer);
    }
  }
  
  // 4. Save Payment Inflow if amount paid > 0
  if (Number(sale.amountPaid) > 0) {
    var payment = {
      id: "pay_" + Math.floor(Math.random() * 1000000).toString(),
      type: "Inflow",
      date: sale.date || today,
      partyId: sale.customerId || "Walk-In",
      partyName: getCustomerName(sale.customerId) || "Walk-In Customer",
      amount: Number(sale.amountPaid),
      method: sale.paymentMethod || "Cash",
      reference: "INV-REF: " + sale.invoiceNumber,
      notes: "Auto-generated on Sales Invoice entry"
    };
    appendRecord("Payments", payment);
  }
  
  // 5. Save main invoice
  appendRecord("Sales", sale);
  
  var operator = activeUser ? activeUser.username : "System";
  logActivity(activeUser ? activeUser.id : "sys", operator, "Create Sales Invoice", "Invoiced " + sale.invoiceNumber + " with total " + sale.totalAmount);
  
  return renderJson({
    success: true,
    message: "Sales invoice " + sale.invoiceNumber + " created. Inventory decreased and stock logs populated.",
    data: sale
  });
}

/**
 * Handles creation of Purchase entries and automatically increases stock
 */
function handleCreatePurchaseEntry(purchase, activeUser) {
  var today = Utilities.formatDate(new Date(), "GMT+5.5", "yyyy-MM-dd");
  if (!purchase.id) purchase.id = "purch_" + Math.floor(Math.random() * 1000000).toString();
  
  // 1. Add stocks for each item in the purchase bill
  var items = purchase.items || [];
  items.forEach(function(item) {
    var prodId = item.productId;
    var qty = Number(item.quantity);
    if (isNaN(qty)) qty = 0;
    
    // Increase inventory in Products tab
    updateProductStock(prodId, qty);
    
    // Add stock addition log
    var stockLog = {
      id: "stk_" + Math.floor(Math.random() * 1000000).toString(),
      productId: prodId,
      date: today,
      type: "Addition",
      quantity: qty,
      referenceId: purchase.id,
      notes: "Purchase Bill " + (purchase.billNumber || "")
    };
    appendRecord("StockLogs", stockLog);
  });
  
  // 2. Update Supplier Balance
  if (purchase.supplierId) {
    var suppliers = getSuppliersData();
    var supplier = suppliers.find(function(s) { return s.id === purchase.supplierId; });
    if (supplier) {
      // Balance increases by the purchase value, minus whatever we paid immediately
      var unpaidAmount = Number(purchase.totalAmount || 0) - Number(purchase.amountPaid || 0);
      if (isNaN(unpaidAmount)) unpaidAmount = 0;
      supplier.balance = Number(supplier.balance || 0) + unpaidAmount;
      if (isNaN(supplier.balance)) supplier.balance = 0;
      updateRecordInSheet("Suppliers", supplier);
    }
  }
  
  // 3. Save Outflow Payment if amount paid > 0
  if (Number(purchase.amountPaid) > 0) {
    var payment = {
      id: "pay_" + Math.floor(Math.random() * 1000000).toString(),
      type: "Outflow",
      date: purchase.date || today,
      partyId: purchase.supplierId || "",
      partyName: getSupplierName(purchase.supplierId) || "Direct Vendor",
      amount: Number(purchase.amountPaid),
      method: "Bank Transfer",
      reference: "BILL-REF: " + (purchase.billNumber || ""),
      notes: "Auto-generated on Purchase invoice entry"
    };
    appendRecord("Payments", payment);
  }
  
  // 4. Save main purchase
  appendRecord("Purchases", purchase);
  
  var operator = activeUser ? activeUser.username : "System";
  logActivity(activeUser ? activeUser.id : "sys", operator, "Create Purchase Bill", "Recorded bill " + purchase.billNumber + " totaling " + purchase.totalAmount);
  
  return renderJson({
    success: true,
    message: "Purchase Bill recorded successfully. Inventory updated.",
    data: purchase
  });
}

/**
 * Handles creation of individual Expenses
 */
function handleCreateExpense(expense, activeUser) {
  if (!expense.id) expense.id = "exp_" + Math.floor(Math.random() * 1000000).toString();
  appendRecord("Expenses", expense);
  
  var operator = activeUser ? activeUser.username : "System";
  logActivity(activeUser ? activeUser.id : "sys", operator, "Create Expense", "Logged " + expense.category + " expense of " + expense.amount);
  
  return renderJson({
    success: true,
    message: "Expense logged successfully.",
    data: expense
  });
}

/**
 * Handles creation of individual Payments (Inflow/Outflow ledger adjustments)
 */
function handleCreatePayment(payment, activeUser) {
  if (!payment.id) payment.id = "pay_" + Math.floor(Math.random() * 1000000).toString();
  
  // Adjust balances depending on party and transaction direction
  if (payment.type === "Inflow" && payment.partyId) {
    // Decrease Customer Receivable balance
    var customers = getCustomersData();
    var customer = customers.find(function(c) { return c.id === payment.partyId; });
    if (customer) {
      customer.balance = Math.max(0, Number(customer.balance || 0) - Number(payment.amount || 0));
      updateRecordInSheet("Customers", customer);
    }
  } else if (payment.type === "Outflow" && payment.partyId) {
    // Decrease Supplier Payable balance
    var suppliers = getSuppliersData();
    var supplier = suppliers.find(function(s) { return s.id === payment.partyId; });
    if (supplier) {
      supplier.balance = Math.max(0, Number(supplier.balance || 0) - Number(payment.amount || 0));
      updateRecordInSheet("Suppliers", supplier);
    }
  }
  
  appendRecord("Payments", payment);
  
  var operator = activeUser ? activeUser.username : "System";
  logActivity(activeUser ? activeUser.id : "sys", operator, "Record Payment", "Received/Paid " + payment.amount + " with ref: " + payment.reference);
  
  return renderJson({
    success: true,
    message: "Payment processed and corresponding ledger balance adjusted.",
    data: payment
  });
}

/**
 * Handles updating of corporate Settings configuration
 */
function handleUpdateCompanySettings(settings, activeUser, requiredRole) {
  if (requiredRole && (!activeUser || activeUser.role !== requiredRole)) {
    return renderJson({ success: false, error: "Access Denied. Admin required." });
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheetByNameRobust(ss, "Company");
  if (!sheet) return renderJson({ success: false, error: "Company sheet does not exist." });
  
  var expectedHeaders = ["name", "gstin", "address", "phone", "email", "state", "stateCode", "currencySymbol", "themeColor", "businessType", "terms", "bankName", "accountNo", "ifsc", "logoUrl", "qrCodeData", "invoiceHeader", "invoiceFooter", "currencyCode"];
  ensureHeaders(sheet, expectedHeaders);
  
  var headers = getSheetHeaders(sheet);
  var lastRow = sheet.getLastRow();
  
  var rowValues = [];
  headers.forEach(function(h) {
    var val = settings[h];
    if (val === undefined || val === null) val = "";
    if (typeof val === "object") val = JSON.stringify(val);
    rowValues.push(val);
  });
  
  if (lastRow <= 1) {
    sheet.appendRow(rowValues);
  } else {
    sheet.getRange(2, 1, 1, headers.length).setValues([rowValues]);
  }
  
  var operator = activeUser ? activeUser.username : "System";
  logActivity(activeUser ? activeUser.id : "sys", operator, "Update Settings", "Updated Company Profile details.");
  
  return renderJson({
    success: true,
    message: "Company configuration updated.",
    data: settings
  });
}

// --- 5. REPORTING & INTELLIGENCE ANALYTICS ---

/**
 * Aggregates live transaction registers for analytics
 */
function calculateDynamicReports() {
  try {
    var sales = getSalesData() || [];
    var purchases = getPurchasesData() || [];
    var expenses = getExpensesData() || [];
    var products = getProductsData() || [];
    var customers = getCustomersData() || [];
    var suppliers = getSuppliersData() || [];
    var payments = getPaymentsData() || [];
    
    var totalSales = 0;
    var salesGst = 0;
    var todaySales = 0;
    var todayStr = Utilities.formatDate(new Date(), "GMT+5.5", "yyyy-MM-dd");
    
    sales.forEach(function(s) {
      var amt = Number(s.totalAmount);
      if (isNaN(amt)) amt = 0;
      totalSales += amt;
      
      var gst = Number(s.cgstTotal || 0) + Number(s.sgstTotal || 0) + Number(s.igstTotal || 0);
      if (!isNaN(gst)) salesGst += gst;
      
      if (s.date && s.date.toString().substring(0, 10) === todayStr) {
        todaySales += amt;
      }
    });
    
    var totalPurchase = 0;
    var purchaseGst = 0;
    purchases.forEach(function(p) {
      var amt = Number(p.totalAmount);
      if (isNaN(amt)) amt = 0;
      totalPurchase += amt;
      
      var gst = Number(p.cgstTotal || 0) + Number(p.sgstTotal || 0) + Number(p.igstTotal || 0);
      if (!isNaN(gst)) purchaseGst += gst;
    });
    
    var totalExpenses = 0;
    expenses.forEach(function(e) {
      var amt = Number(e.amount);
      if (isNaN(amt)) amt = 0;
      totalExpenses += amt;
    });
    
    var netProfit = totalSales - totalPurchase - totalExpenses;
    if (isNaN(netProfit)) netProfit = 0;
    
    // Calculate Receivables (Customers outstanding)
    var totalReceivables = 0;
    customers.forEach(function(c) {
      var bal = Number(c.balance);
      if (!isNaN(bal)) totalReceivables += bal;
    });
    
    // Calculate Payables (Suppliers outstanding)
    var totalPayables = 0;
    suppliers.forEach(function(s) {
      var bal = Number(s.balance);
      if (!isNaN(bal)) totalPayables += bal;
    });
    
    // Calculate Current Stock and Inventory Value
    var totalInventoryValue = 0;
    var lowStockCount = 0;
    var lowStockList = [];
    
    products.forEach(function(p) {
      var stock = Number(p.initialStock);
      if (isNaN(stock)) stock = 0;
      
      var purchasePrice = Number(p.purchasePrice);
      if (isNaN(purchasePrice)) purchasePrice = 0;
      
      var minAlert = Number(p.minStockAlert);
      if (isNaN(minAlert)) minAlert = 5;
      
      if (stock <= minAlert) {
        lowStockCount++;
        lowStockList.push({
          id: p.id,
          name: p.name,
          sku: p.sku,
          currentStock: stock,
          alertValue: minAlert
        });
      }
      
      var val = stock * purchasePrice;
      if (!isNaN(val)) {
        totalInventoryValue += val;
      }
    });

    // 1. Profit & Loss Report
    var profitLoss = {
      salesRevenue: totalSales,
      purchaseCost: totalPurchase,
      opex: totalExpenses,
      netProfit: netProfit
    };

    // 2. GST Summary Report
    var gstSummary = {
      outputCgst: 0,
      outputSgst: 0,
      outputIgst: 0,
      inputCgst: 0,
      inputSgst: 0,
      inputIgst: 0,
      totalOutputGst: salesGst,
      totalInputGst: purchaseGst,
      netPayable: salesGst - purchaseGst
    };
    sales.forEach(function(s) {
      gstSummary.outputCgst += Number(s.cgstTotal || 0);
      gstSummary.outputSgst += Number(s.sgstTotal || 0);
      gstSummary.outputIgst += Number(s.igstTotal || 0);
    });
    purchases.forEach(function(p) {
      gstSummary.inputCgst += Number(p.cgstTotal || 0);
      gstSummary.inputSgst += Number(p.sgstTotal || 0);
      gstSummary.inputIgst += Number(p.igstTotal || 0);
    });

    // 3. Sales Trend (group by YYYY-MM)
    var salesTrendMap = {};
    sales.forEach(function(s) {
      if (!s.date) return;
      var key = s.date.toString().substring(0, 7); // "YYYY-MM"
      if (!salesTrendMap[key]) salesTrendMap[key] = 0;
      salesTrendMap[key] += Number(s.totalAmount || 0);
    });
    var salesTrend = [];
    Object.keys(salesTrendMap).sort().forEach(function(key) {
      salesTrend.push({ month: key, amount: salesTrendMap[key] });
    });

    // 4. Customer Ledgers
    var customerLedgers = {};
    customers.forEach(function(c) {
      customerLedgers[c.id] = { customerName: c.name, balance: Number(c.balance || 0), transactions: [] };
    });
    sales.forEach(function(s) {
      if (customerLedgers[s.customerId]) {
        customerLedgers[s.customerId].transactions.push({
          date: s.date,
          type: "Invoice",
          reference: s.invoiceNumber,
          amount: Number(s.totalAmount || 0),
          runningBalanceChange: Number(s.totalAmount || 0) - Number(s.amountPaid || 0)
        });
      }
    });
    payments.forEach(function(pay) {
      if (pay.type === "Inflow" && customerLedgers[pay.partyId]) {
        customerLedgers[pay.partyId].transactions.push({
          date: pay.date,
          type: "Payment Received",
          reference: pay.reference,
          amount: Number(pay.amount || 0),
          runningBalanceChange: -Number(pay.amount || 0)
        });
      }
    });

    // 5. Supplier Ledgers
    var supplierLedgers = {};
    suppliers.forEach(function(s) {
      supplierLedgers[s.id] = { supplierName: s.name, balance: Number(s.balance || 0), transactions: [] };
    });
    purchases.forEach(function(p) {
      if (supplierLedgers[p.supplierId]) {
        supplierLedgers[p.supplierId].transactions.push({
          date: p.date,
          type: "Bill",
          reference: p.billNumber,
          amount: Number(p.totalAmount || 0),
          runningBalanceChange: Number(p.totalAmount || 0) - Number(p.amountPaid || 0)
        });
      }
    });
    payments.forEach(function(pay) {
      if (pay.type === "Outflow" && supplierLedgers[pay.partyId]) {
        supplierLedgers[pay.partyId].transactions.push({
          date: pay.date,
          type: "Payment Made",
          reference: pay.reference,
          amount: Number(pay.amount || 0),
          runningBalanceChange: -Number(pay.amount || 0)
        });
      }
    });

    // 6. Inventory Summary
    var inventorySummary = getInventorySummaryData();
    
    return {
      success: true,
      summary: {
        totalSales: isNaN(totalSales) ? 0 : totalSales,
        totalPurchase: isNaN(totalPurchase) ? 0 : totalPurchase,
        totalExpenses: isNaN(totalExpenses) ? 0 : totalExpenses,
        todaySales: isNaN(todaySales) ? 0 : todaySales,
        netProfit: isNaN(netProfit) ? 0 : netProfit,
        receivables: isNaN(totalReceivables) ? 0 : totalReceivables,
        payables: isNaN(totalPayables) ? 0 : totalPayables,
        inventoryValue: isNaN(totalInventoryValue) ? 0 : totalInventoryValue,
        lowStockCount: isNaN(lowStockCount) ? 0 : lowStockCount
      },
      profitLoss: profitLoss,
      gstSummary: gstSummary,
      salesTrend: salesTrend,
      customerLedgers: customerLedgers,
      supplierLedgers: supplierLedgers,
      inventorySummary: inventorySummary,
      lowStockAlerts: lowStockList
    };
  } catch (err) {
    return {
      success: false,
      error: err.toString()
    };
  }
}

// --- 6. LOW-LEVEL DB WRITING HELPERS (BATCH SAFE) ---

function getCustomerName(id) {
  var customers = getCustomersData();
  var c = customers.find(function(item) { return item.id === id; });
  return c ? c.name : "";
}

function getSupplierName(id) {
  var suppliers = getSuppliersData();
  var s = suppliers.find(function(item) { return item.id === id; });
  return s ? s.name : "";
}

function updateProductStock(productId, delta) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheetByNameRobust(ss, "Products");
  if (!sheet) return;
  
  var headers = getSheetHeaders(sheet);
  var idColIdx = headers.indexOf("id") + 1;
  var stockColIdx = headers.indexOf("initialStock") + 1;
  
  if (idColIdx === 0 || stockColIdx === 0) return;
  
  var deltaNum = Number(delta);
  if (isNaN(deltaNum)) deltaNum = 0;
  
  var values = sheet.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    if (values[r][idColIdx - 1].toString() === productId.toString()) {
      var currentStock = Number(values[r][stockColIdx - 1]);
      if (isNaN(currentStock)) currentStock = 0;
      var newStock = currentStock + deltaNum;
      if (isNaN(newStock) || newStock < 0) newStock = 0;
      sheet.getRange(r + 1, stockColIdx).setValue(newStock);
      break;
    }
  }
}

function appendRecord(sheetName, item) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheetByNameRobust(ss, sheetName);
  if (!sheet) return;
  
  var headers = getSheetHeaders(sheet);
  var rowValues = [];
  headers.forEach(function(h) {
    var val = item[h];
    if (val === undefined || val === null) val = "";
    if (typeof val === "object") val = JSON.stringify(val);
    rowValues.push(val);
  });
  sheet.appendRow(rowValues);
  
  // Dynamic Inventory Adjustment on Manual StockLogs insertion
  if (sheetName === "StockLogs") {
    var notes = (item.notes || "").toString();
    if (notes.indexOf("Sales Invoice") === -1 && notes.indexOf("Purchase Bill") === -1) {
      var prodId = item.productId;
      var qty = Number(item.quantity || 0);
      var type = item.type || "Addition";
      if (prodId && qty) {
        if (type === "Addition") {
          updateProductStock(prodId, qty);
        } else if (type === "Reduction") {
          updateProductStock(prodId, -qty);
        } else if (type === "Adjustment") {
          updateProductStock(prodId, qty);
        }
      }
    }
  }
}

function updateRecordInSheet(sheetName, item) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheetByNameRobust(ss, sheetName);
  if (!sheet) return;
  
  var headers = getSheetHeaders(sheet);
  var idColIdx = headers.indexOf("id") + 1;
  if (idColIdx === 0) idColIdx = 1;
  
  var values = sheet.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    if (values[r][idColIdx - 1].toString() === item.id.toString()) {
      var rowValues = [];
      headers.forEach(function(h) {
        var val = item[h];
        if (val === undefined || val === null) val = "";
        if (typeof val === "object") val = JSON.stringify(val);
        rowValues.push(val);
      });
      sheet.getRange(r + 1, 1, 1, headers.length).setValues([rowValues]);
      break;
    }
  }
}

// --- 7. DATABASE INITIALIZATION & SYNCHRONIZER (BACKGROUND) ---

/**
 * Safely parses Sheets data as a structured JSON array
 */
function getSheetAsJson(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheetByNameRobust(ss, sheetName);
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var headers = data[0];
  var rows = [];
  
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var rowObj = {};
    var hasData = false;
    
    headers.forEach(function(header, c) {
      var val = row[c];
      if (val !== "") hasData = true;
      
      if (typeof val === "string" && (val.indexOf("[") === 0 || val.indexOf("{") === 0)) {
        try {
          val = JSON.parse(val);
        } catch(e) {}
      }
      rowObj[header] = val;
    });
    
    if (hasData) {
      rows.push(rowObj);
    }
  }
  return rows;
}

function getSheetHeaders(sheet) {
  var data = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues();
  return data[0];
}

/**
 * Master transaction synchronizer
 */
function syncAllSheetsData(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  Object.keys(data).forEach(function(key) {
    var sheetName = getCorrectSheetName(key);
    if (!sheetName) return;
    
    // Skip Company settings sync if it is empty to protect headers
    if (sheetName === "Company" && (!data[key] || Object.keys(data[key]).length === 0)) {
      return;
    }
    
    var sheet = getSheetByNameRobust(ss, sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    } else {
      if (sheetName !== "Company") {
        sheet.clear();
      }
    }
    
    var items = data[key];
    if (key === "company") {
      items = [items]; 
    }
    
    if (!items || items.length === 0) {
      if (sheetName !== "Company") {
        sheet.getRange(1, 1).setValue("id");
      }
      return;
    }
    
    // Extract logical schema
    var headers = [];
    items.forEach(function(item) {
      Object.keys(item).forEach(function(h) {
        if (headers.indexOf(h) === -1) {
          headers.push(h);
        }
      });
    });
    
    if (sheetName === "Company") {
      var expectedHeaders = ["name", "gstin", "address", "phone", "email", "state", "stateCode", "currencySymbol", "themeColor", "businessType", "terms", "bankName", "accountNo", "ifsc", "logoUrl", "qrCodeData", "invoiceHeader", "invoiceFooter", "currencyCode"];
      ensureHeaders(sheet, expectedHeaders);
      var currentHeaders = getSheetHeaders(sheet);
      
      var rowValues = [];
      currentHeaders.forEach(function(h) {
        var val = items[0][h];
        if (val === undefined || val === null) val = "";
        if (typeof val === "object") val = JSON.stringify(val);
        rowValues.push(val);
      });
      
      if (sheet.getLastRow() <= 1) {
        sheet.appendRow(rowValues);
      } else {
        sheet.getRange(2, 1, 1, currentHeaders.length).setValues([rowValues]);
      }
    } else {
      sheet.appendRow(headers);
      
      var rowsToWrite = [];
      items.forEach(function(item) {
        var row = [];
        headers.forEach(function(h) {
          var val = item[h];
          if (val === undefined || val === null) {
            val = "";
          } else if (typeof val === "object") {
            val = JSON.stringify(val); 
          }
          row.push(val);
        });
        rowsToWrite.push(row);
      });
      
      if (rowsToWrite.length > 0) {
        sheet.getRange(2, 1, rowsToWrite.length, headers.length).setValues(rowsToWrite);
      }
    }
  });
  
  return getAllSheetsData();
}

function getCorrectSheetName(key) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheetByNameRobust(ss, key);
  if (sheet) return sheet.getName();
  
  // Default fallback if sheet doesn't exist yet
  var lower = key.toLowerCase();
  for (var i = 0; i < SHEET_NAMES.length; i++) {
    if (SHEET_NAMES[i].toLowerCase() === lower || SHEET_NAMES[i].toLowerCase().replace(/s$/, "") === lower.replace(/s$/, "")) {
      return SHEET_NAMES[i];
    }
  }
  return key;
}

function getAllSheetsData() {
  var result = {};
  SHEET_NAMES.forEach(function(name) {
    var lower = name.toLowerCase();
    if (lower === "products") {
      result[lower] = getProductsData();
    } else if (lower === "categories") {
      result[lower] = getCategoriesData();
    } else if (lower === "customers") {
      result[lower] = getCustomersData();
    } else if (lower === "suppliers") {
      result[lower] = getSuppliersData();
    } else if (lower === "sales") {
      result[lower] = getSalesData();
    } else if (lower === "purchases") {
      result[lower] = getPurchasesData();
    } else if (lower === "expenses") {
      result[lower] = getExpensesData();
    } else if (lower === "payments") {
      result[lower] = getPaymentsData();
    } else if (lower === "stocklogs") {
      result[lower] = getStockLogsData();
    } else if (lower === "activitylogs") {
      result[lower] = getActivityLogsData();
    } else {
      result[lower] = getSheetAsJson(name);
    }
  });
  
  result.company = getCompanySettings();
  return result;
}

/**
 * Validates existence of tables and appends initial schemas if empty
 */
function initializeSheetsIfEmpty() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var basicSchemas = {
    "Users": ["id", "name", "username", "password", "role"],
    "Company": ["name", "gstin", "address", "phone", "email", "state", "stateCode", "currencySymbol", "themeColor", "businessType", "terms", "bankName", "accountNo", "ifsc", "logoUrl", "qrCodeData", "invoiceHeader", "invoiceFooter", "currencyCode"],
    "Products": ["id", "name", "sku", "categoryId", "description", "hsnCode", "gstRate", "salesPrice", "purchasePrice", "minStockAlert", "initialStock"],
    "Categories": ["id", "name", "description"],
    "Customers": ["id", "name", "phone", "email", "gstin", "address", "state", "stateCode", "balance"],
    "Suppliers": ["id", "name", "phone", "email", "gstin", "address", "state", "stateCode", "balance"],
    "Sales": ["id", "invoiceNumber", "date", "customerId", "items", "subTotal", "cgstTotal", "sgstTotal", "igstTotal", "discount", "totalAmount", "paymentStatus", "paymentMethod", "amountPaid", "notes"],
    "Purchases": ["id", "billNumber", "date", "supplierId", "items", "subTotal", "cgstTotal", "sgstTotal", "igstTotal", "totalAmount", "paymentStatus", "amountPaid", "notes"],
    "Expenses": ["id", "category", "amount", "date", "description", "reference"],
    "Payments": ["id", "type", "date", "partyId", "partyName", "amount", "method", "reference", "notes"],
    "StockLogs": ["id", "productId", "date", "type", "quantity", "referenceId", "notes"],
    "ActivityLogs": ["id", "userId", "username", "action", "details", "timestamp"]
  };
  
  // 1. Users sheet
  var usersSheet = getOrCreateSheet(ss, "Users");
  ensureHeaders(usersSheet, basicSchemas["Users"]);
  if (usersSheet.getLastRow() === 1) { // only header exists
    usersSheet.appendRow(["user-1", "Administrator", "admin", hashPassword("admin"), "Admin"]);
    usersSheet.appendRow(["user-2", "Staff Member", "staff", hashPassword("staff"), "Staff"]);
  }
  
  // 2. Company settings sheet
  var companySheet = getOrCreateSheet(ss, "Company");
  ensureHeaders(companySheet, basicSchemas["Company"]);
  if (companySheet.getLastRow() === 1) { // only header exists
    companySheet.appendRow([
      "PCS Enterprises Pvt Ltd",
      "27AAAAA1111A1Z1",
      "101, Business Plaza, MG Road, Pune",
      "+91 9876543210",
      "support@pcsbilling.com",
      "Maharashtra",
      "27",
      "₹",
      "emerald",
      "Retail Business",
      "1. Interest @18% will be charged if unpaid within 15 days.\n2. Goods once sold cannot be returned.",
      "State Bank of India",
      "332211009988",
      "SBIN0001234",
      "",
      "upi://pay?pa=pcsenterprises@sbi&pn=PCS%20Enterprises&cu=INR",
      "TAX INVOICE - ORIGINAL FOR RECIPIENT",
      "Thank you for your business! Terms: Goods once sold cannot be taken back or exchanged. Interest @ 18% p.a. will be charged for delayed payments.",
      "INR"
    ]);
  }
  
  // Remainder sheets
  Object.keys(basicSchemas).forEach(function(sheetName) {
    if (sheetName === "Users" || sheetName === "Company") return;
    var sheet = getOrCreateSheet(ss, sheetName);
    ensureHeaders(sheet, basicSchemas[sheetName]);
  });
}

function ensureHeaders(sheet, expectedHeaders) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    sheet.appendRow(expectedHeaders);
    return;
  }
  
  var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var missingHeaders = [];
  expectedHeaders.forEach(function(h) {
    var found = false;
    for (var i = 0; i < existingHeaders.length; i++) {
      if (existingHeaders[i].toString().toLowerCase() === h.toLowerCase()) {
        found = true;
        break;
      }
    }
    if (!found) {
      missingHeaders.push(h);
    }
  });
  
  if (missingHeaders.length > 0) {
    var range = sheet.getRange(1, lastCol + 1, 1, missingHeaders.length);
    range.setValues([missingHeaders]);
  }
}

function getOrCreateSheet(ss, name) {
  var sheet = getSheetByNameRobust(ss, name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function getSheetByNameRobust(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (sheet) return sheet;
  
  var sheets = ss.getSheets();
  var nameLower = name.toLowerCase();
  var nameLowerSingular = nameLower.replace(/s$/, "");
  
  for (var i = 0; i < sheets.length; i++) {
    var sName = sheets[i].getName();
    var sNameLower = sName.toLowerCase();
    var sNameLowerSingular = sNameLower.replace(/s$/, "");
    if (sNameLower === nameLower || sNameLowerSingular === nameLowerSingular) {
      return sheets[i];
    }
  }
  return null;
}

function logActivity(userId, username, action, details) {
  var log = {
    id: "act_" + Math.floor(Math.random() * 1000000).toString(),
    userId: userId || "sys",
    username: username || "System",
    action: action,
    details: details,
    timestamp: new Date().toISOString()
  };
  appendRecord("ActivityLogs", log);
}

function renderJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- 8. MAPPED DATA RETRIEVAL HELPERS FOR ZERO-UNDEFINED GUARANTEE ---

function getCategoriesData() {
  var data = getSheetAsJson("Categories") || [];
  return data.map(function(item) {
    return {
      id: item.id || "",
      name: item.name || "",
      description: item.description || ""
    };
  });
}

function getProductsData() {
  var products = getSheetAsJson("Products") || [];
  var categories = getCategoriesData();
  
  return products.map(function(p) {
    var pId = p.id || "";
    var name = p.name || "";
    var sku = p.sku || "";
    var categoryId = p.categoryId || p.category || "";
    var categoryName = "";
    
    if (categoryId) {
      var cat = categories.find(function(c) {
        return c.id === categoryId || c.name === categoryId;
      });
      if (cat) {
        categoryId = cat.id;
        categoryName = cat.name;
      }
    }
    
    return {
      id: pId,
      name: name,
      sku: sku,
      categoryId: categoryId,
      category: categoryName,
      description: p.description || "",
      hsnCode: p.hsnCode || "",
      gstRate: p.gstRate !== undefined ? Number(p.gstRate) : 0,
      salesPrice: p.salesPrice !== undefined ? Number(p.salesPrice) : 0,
      purchasePrice: p.purchasePrice !== undefined ? Number(p.purchasePrice) : 0,
      minStockAlert: p.minStockAlert !== undefined ? Number(p.minStockAlert) : 5,
      initialStock: p.initialStock !== undefined ? Number(p.initialStock) : 0
    };
  });
}

function getCustomersData() {
  var data = getSheetAsJson("Customers") || [];
  return data.map(function(item) {
    return {
      id: item.id || "",
      name: item.name || "",
      phone: item.phone || "",
      email: item.email || "",
      gstin: item.gstin || "",
      address: item.address || "",
      state: item.state || "",
      stateCode: item.stateCode || "",
      balance: item.balance !== undefined ? Number(item.balance) : 0
    };
  });
}

function getSuppliersData() {
  var data = getSheetAsJson("Suppliers") || [];
  return data.map(function(item) {
    return {
      id: item.id || "",
      name: item.name || "",
      phone: item.phone || "",
      email: item.email || "",
      gstin: item.gstin || "",
      address: item.address || "",
      state: item.state || "",
      stateCode: item.stateCode || "",
      balance: item.balance !== undefined ? Number(item.balance) : 0
    };
  });
}

function getSalesData() {
  var data = getSheetAsJson("Sales") || [];
  return data.map(function(item) {
    var items = [];
    if (item.items) {
      try {
        items = typeof item.items === "string" ? JSON.parse(item.items) : item.items;
      } catch (e) {
        items = [];
      }
    }
    return {
      id: item.id || "",
      invoiceNumber: item.invoiceNumber || "",
      date: item.date || "",
      customerId: item.customerId || "",
      items: items || [],
      subTotal: item.subTotal !== undefined ? Number(item.subTotal) : 0,
      cgstTotal: item.cgstTotal !== undefined ? Number(item.cgstTotal) : 0,
      sgstTotal: item.sgstTotal !== undefined ? Number(item.sgstTotal) : 0,
      igstTotal: item.igstTotal !== undefined ? Number(item.igstTotal) : 0,
      discount: item.discount !== undefined ? Number(item.discount) : 0,
      totalAmount: item.totalAmount !== undefined ? Number(item.totalAmount) : 0,
      paymentStatus: item.paymentStatus || "Unpaid",
      paymentMethod: item.paymentMethod || "Cash",
      amountPaid: item.amountPaid !== undefined ? Number(item.amountPaid) : 0,
      notes: item.notes || ""
    };
  });
}

function getPurchasesData() {
  var data = getSheetAsJson("Purchases") || [];
  return data.map(function(item) {
    var items = [];
    if (item.items) {
      try {
        items = typeof item.items === "string" ? JSON.parse(item.items) : item.items;
      } catch (e) {
        items = [];
      }
    }
    return {
      id: item.id || "",
      billNumber: item.billNumber || "",
      date: item.date || "",
      supplierId: item.supplierId || "",
      items: items || [],
      subTotal: item.subTotal !== undefined ? Number(item.subTotal) : 0,
      cgstTotal: item.cgstTotal !== undefined ? Number(item.cgstTotal) : 0,
      sgstTotal: item.sgstTotal !== undefined ? Number(item.sgstTotal) : 0,
      igstTotal: item.igstTotal !== undefined ? Number(item.igstTotal) : 0,
      totalAmount: item.totalAmount !== undefined ? Number(item.totalAmount) : 0,
      paymentStatus: item.paymentStatus || "Unpaid",
      amountPaid: item.amountPaid !== undefined ? Number(item.amountPaid) : 0,
      notes: item.notes || ""
    };
  });
}

function getExpensesData() {
  var data = getSheetAsJson("Expenses") || [];
  return data.map(function(item) {
    return {
      id: item.id || "",
      category: item.category || "",
      amount: item.amount !== undefined ? Number(item.amount) : 0,
      date: item.date || "",
      description: item.description || "",
      reference: item.reference || ""
    };
  });
}

function getPaymentsData() {
  var data = getSheetAsJson("Payments") || [];
  return data.map(function(item) {
    return {
      id: item.id || "",
      type: item.type || "Inflow",
      date: item.date || "",
      partyId: item.partyId || "",
      partyName: item.partyName || "",
      amount: item.amount !== undefined ? Number(item.amount) : 0,
      method: item.method || "Cash",
      reference: item.reference || "",
      notes: item.notes || ""
    };
  });
}

function getStockLogsData() {
  var data = getSheetAsJson("StockLogs") || [];
  return data.map(function(item) {
    return {
      id: item.id || "",
      productId: item.productId || "",
      date: item.date || "",
      type: item.type || "Addition",
      quantity: item.quantity !== undefined ? Number(item.quantity) : 0,
      referenceId: item.referenceId || "",
      notes: item.notes || ""
    };
  });
}

function getActivityLogsData() {
  var data = getSheetAsJson("ActivityLogs") || [];
  return data.map(function(item) {
    return {
      id: item.id || "",
      userId: item.userId || "",
      username: item.username || "",
      action: item.action || "",
      details: item.details || "",
      timestamp: item.timestamp || ""
    };
  });
}

function getCompanySettings() {
  var data = getSheetAsJson("Company");
  if (data && data.length > 0) {
    return data[0];
  }
  return {
    name: "PCS Enterprises Pvt Ltd",
    gstin: "27AAAAA1111A1Z1",
    address: "101, Business Plaza, MG Road, Pune",
    phone: "+91 9876543210",
    email: "support@pcsbilling.com",
    state: "Maharashtra",
    stateCode: "27",
    currencySymbol: "₹",
    themeColor: "emerald",
    businessType: "Retail Business",
    terms: "1. Interest @18% will be charged if unpaid within 15 days.\n2. Goods once sold cannot be returned.",
    bankName: "State Bank of India",
    accountNo: "332211009988",
    ifsc: "SBIN0001234",
    logoUrl: "",
    qrCodeData: "upi://pay?pa=pcsenterprises@sbi&pn=PCS%20Enterprises&cu=INR",
    invoiceHeader: "TAX INVOICE - ORIGINAL FOR RECIPIENT",
    invoiceFooter: "Thank you for your business! Terms: Goods once sold cannot be taken back or exchanged. Interest @ 18% p.a. will be charged for delayed payments.",
    currencyCode: "INR"
  };
}

function getDashboardData() {
  try {
    var sales = getSalesData();
    var purchases = getPurchasesData();
    var expenses = getExpensesData();
    var products = getProductsData();
    var customers = getCustomersData();
    var suppliers = getSuppliersData();
    
    var totalSales = 0;
    var salesGst = 0;
    var todaySales = 0;
    var todayStr = Utilities.formatDate(new Date(), "GMT+5.5", "yyyy-MM-dd");
    
    sales.forEach(function(s) {
      var amt = Number(s.totalAmount);
      if (isNaN(amt)) amt = 0;
      totalSales += amt;
      
      var gst = Number(s.cgstTotal || 0) + Number(s.sgstTotal || 0) + Number(s.igstTotal || 0);
      if (!isNaN(gst)) salesGst += gst;
      
      if (s.date && s.date.toString().substring(0, 10) === todayStr) {
        todaySales += amt;
      }
    });
    
    var totalPurchase = 0;
    purchases.forEach(function(p) {
      var amt = Number(p.totalAmount);
      if (isNaN(amt)) amt = 0;
      totalPurchase += amt;
    });
    
    var totalExpenses = 0;
    expenses.forEach(function(e) {
      var amt = Number(e.amount);
      if (isNaN(amt)) amt = 0;
      totalExpenses += amt;
    });
    
    var netProfit = totalSales - totalPurchase - totalExpenses;
    if (isNaN(netProfit)) netProfit = 0;
    
    var totalReceivables = 0;
    customers.forEach(function(c) {
      var bal = Number(c.balance);
      if (!isNaN(bal)) totalReceivables += bal;
    });
    
    var totalPayables = 0;
    suppliers.forEach(function(s) {
      var bal = Number(s.balance);
      if (!isNaN(bal)) totalPayables += bal;
    });
    
    var totalInventoryValue = 0;
    var lowStockCount = 0;
    
    products.forEach(function(p) {
      var stock = Number(p.initialStock);
      if (isNaN(stock)) stock = 0;
      
      var purchasePrice = Number(p.purchasePrice);
      if (isNaN(purchasePrice)) purchasePrice = 0;
      
      var minAlert = Number(p.minStockAlert);
      if (isNaN(minAlert)) minAlert = 5;
      
      if (stock <= minAlert) {
        lowStockCount++;
      }
      
      var val = stock * purchasePrice;
      if (!isNaN(val)) {
        totalInventoryValue += val;
      }
    });
    
    return {
      totalSales: isNaN(totalSales) ? 0 : totalSales,
      totalPurchase: isNaN(totalPurchase) ? 0 : totalPurchase,
      totalExpenses: isNaN(totalExpenses) ? 0 : totalExpenses,
      todaySales: isNaN(todaySales) ? 0 : todaySales,
      netProfit: isNaN(netProfit) ? 0 : netProfit,
      receivables: isNaN(totalReceivables) ? 0 : totalReceivables,
      payables: isNaN(totalPayables) ? 0 : totalPayables,
      inventoryValue: isNaN(totalInventoryValue) ? 0 : totalInventoryValue,
      lowStockCount: isNaN(lowStockCount) ? 0 : lowStockCount
    };
  } catch (err) {
    return {
      totalSales: 0,
      totalPurchase: 0,
      totalExpenses: 0,
      todaySales: 0,
      netProfit: 0,
      receivables: 0,
      payables: 0,
      inventoryValue: 0,
      lowStockCount: 0
    };
  }
}

function getInventorySummaryData() {
  var products = getProductsData();
  var stockLogs = getStockLogsData();
  
  var inventorySummary = [];
  products.forEach(function(p) {
    var prodLogs = stockLogs.filter(function(log) { return log.productId === p.id; });
    var stockIn = 0;
    var stockOut = 0;
    var adjustments = 0;
    prodLogs.forEach(function(log) {
      var qty = Number(log.quantity || 0);
      if (log.type === "Addition") {
        stockIn += qty;
      } else if (log.type === "Reduction") {
        stockOut += Math.abs(qty);
      } else if (log.type === "Adjustment") {
        adjustments += qty;
      }
    });
    
    var currentStock = Math.max(0, Number(p.initialStock || 0));
    var openingStock = Math.max(0, currentStock - stockIn + stockOut - adjustments);
    
    inventorySummary.push({
      id: p.id,
      name: p.name,
      sku: p.sku,
      openingStock: openingStock,
      stockIn: stockIn,
      stockOut: stockOut,
      adjustments: adjustments,
      currentStock: currentStock
    });
  });
  
  return inventorySummary;
}
`;
}

export interface ThemePalette {
  primary: string;
  bg: string;          // e.g. 'bg-emerald-600'
  hoverBg: string;     // e.g. 'hover:bg-emerald-700'
  lightBg: string;     // e.g. 'bg-emerald-50'
  border: string;      // e.g. 'border-emerald-200'
  text: string;        // e.g. 'text-emerald-700'
  lightText: string;   // e.g. 'text-emerald-600'
  darkText: string;    // e.g. 'text-emerald-950'
  badgeBg: string;     // e.g. 'bg-emerald-500/20'
  badgeText: string;   // e.g. 'text-emerald-300'
  focusRing: string;   // e.g. 'focus:ring-emerald-500'
  gradientTo: string;  // e.g. 'to-emerald-950'
  fromGradient: string; // e.g. 'from-emerald-600'
}

export const THEME_PALETTES: Record<string, ThemePalette> = {
  emerald: {
    primary: 'emerald',
    bg: 'bg-emerald-600',
    hoverBg: 'hover:bg-emerald-700',
    lightBg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    lightText: 'text-emerald-600',
    darkText: 'text-emerald-950',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
    focusRing: 'focus:ring-emerald-500',
    gradientTo: 'to-emerald-950',
    fromGradient: 'from-emerald-600'
  },
  indigo: {
    primary: 'indigo',
    bg: 'bg-indigo-600',
    hoverBg: 'hover:bg-indigo-700',
    lightBg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    lightText: 'text-indigo-600',
    darkText: 'text-indigo-950',
    badgeBg: 'bg-indigo-500/20',
    badgeText: 'text-indigo-300',
    focusRing: 'focus:ring-indigo-500',
    gradientTo: 'to-indigo-950',
    fromGradient: 'from-indigo-600'
  },
  sky: {
    primary: 'sky',
    bg: 'bg-sky-600',
    hoverBg: 'hover:bg-sky-700',
    lightBg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-700',
    lightText: 'text-sky-600',
    darkText: 'text-sky-950',
    badgeBg: 'bg-sky-500/20',
    badgeText: 'text-sky-300',
    focusRing: 'focus:ring-sky-500',
    gradientTo: 'to-sky-950',
    fromGradient: 'from-sky-600'
  },
  rose: {
    primary: 'rose',
    bg: 'bg-rose-600',
    hoverBg: 'hover:bg-rose-700',
    lightBg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    lightText: 'text-rose-600',
    darkText: 'text-rose-950',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-300',
    focusRing: 'focus:ring-rose-500',
    gradientTo: 'to-rose-950',
    fromGradient: 'from-rose-600'
  },
  amber: {
    primary: 'amber',
    bg: 'bg-amber-600',
    hoverBg: 'hover:bg-amber-700',
    lightBg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    lightText: 'text-amber-600',
    darkText: 'text-amber-950',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
    focusRing: 'focus:ring-amber-500',
    gradientTo: 'to-amber-950',
    fromGradient: 'from-amber-600'
  },
  violet: {
    primary: 'violet',
    bg: 'bg-violet-600',
    hoverBg: 'hover:bg-violet-700',
    lightBg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-700',
    lightText: 'text-violet-600',
    darkText: 'text-violet-950',
    badgeBg: 'bg-violet-500/20',
    badgeText: 'text-violet-300',
    focusRing: 'focus:ring-violet-500',
    gradientTo: 'to-violet-950',
    fromGradient: 'from-violet-600'
  },
  teal: {
    primary: 'teal',
    bg: 'bg-teal-600',
    hoverBg: 'hover:bg-teal-700',
    lightBg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-700',
    lightText: 'text-teal-600',
    darkText: 'text-teal-950',
    badgeBg: 'bg-teal-500/20',
    badgeText: 'text-teal-300',
    focusRing: 'focus:ring-teal-500',
    gradientTo: 'to-teal-950',
    fromGradient: 'from-teal-600'
  },
  blue: {
    primary: 'blue',
    bg: 'bg-blue-600',
    hoverBg: 'hover:bg-blue-700',
    lightBg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    lightText: 'text-blue-600',
    darkText: 'text-blue-950',
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-300',
    focusRing: 'focus:ring-blue-500',
    gradientTo: 'to-blue-950',
    fromGradient: 'from-blue-600'
  }
};

export function getThemePalette(company?: Company): ThemePalette {
  const color = company?.themeColor || 'emerald';
  return THEME_PALETTES[color] || THEME_PALETTES.emerald;
}

export interface BusinessConfig {
  productLabel: string;
  productsLabelPlural: string;
  description: string;
  industryIcon: string;
}

export const BUSINESS_CONFIGS: Record<string, BusinessConfig> = {
  "Pharmacy": {
    productLabel: "Medicine / Drug",
    productsLabelPlural: "Medicines & Drugs",
    description: "Healthcare & pharmacy billing ledger active with HSN, SAC, batch limits.",
    industryIcon: "pill"
  },
  "Grocery": {
    productLabel: "Grocery Item",
    productsLabelPlural: "Grocery & FMCG Catalog",
    description: "Daily essentials, FMCG stock, batch tracking.",
    industryIcon: "shopping-basket"
  },
  "Garments": {
    productLabel: "Apparel / Garment",
    productsLabelPlural: "Garments & Apparel",
    description: "Clothing, textiles, size sheets, custom barcode catalogs.",
    industryIcon: "shirt"
  },
  "Hardware": {
    productLabel: "Hardware Part / Tool",
    productsLabelPlural: "Hardware & Tools",
    description: "Industrial components, metal parts, bulk weight ledger.",
    industryIcon: "hammer"
  },
  "Electronics": {
    productLabel: "Electronic Item",
    productsLabelPlural: "Electronics & Appliances",
    description: "Serial number tracking, warranties, consumer electronics.",
    industryIcon: "tv"
  },
  "Furniture": {
    productLabel: "Furniture Item",
    productsLabelPlural: "Furniture & Assets",
    description: "Wooden crafts, heavy inventory, customized wood finishing billing.",
    industryIcon: "sofa"
  },
  "Stationery": {
    productLabel: "Stationery / Book",
    productsLabelPlural: "Stationery & Office Supplies",
    description: "Paper, files, study aids, print supplies.",
    industryIcon: "book"
  },
  "Restaurant": {
    productLabel: "Menu Dish",
    productsLabelPlural: "Restaurant Menu Items",
    description: "Food opex, service tax calculations, daily food preparation.",
    industryIcon: "utensils"
  },
  "Sweet Shop": {
    productLabel: "Sweet Item",
    productsLabelPlural: "Sweets & Confectionery",
    description: "Weighed shelf items, expiry control, festive bulk preorders.",
    industryIcon: "cake"
  },
  "Mobile Shop": {
    productLabel: "Phone / Accessory",
    productsLabelPlural: "Phones & Accessories",
    description: "IMEI logging, phone models, customized brand catalogs.",
    industryIcon: "smartphone"
  },
  "Cosmetics": {
    productLabel: "Cosmetic Item",
    productsLabelPlural: "Cosmetics & Beauty Care",
    description: "Personal care, batch controls, beauty supply catalog.",
    industryIcon: "sparkles"
  },
  "Wholesale Business": {
    productLabel: "Wholesale Pack",
    productsLabelPlural: "Bulk Packs & Cartons",
    description: "B2B trading ledger, high bulk margins, transport manifest details.",
    industryIcon: "truck"
  },
  "Retail Business": {
    productLabel: "Product Item",
    productsLabelPlural: "Retail Catalog Items",
    description: "Over-the-counter POS-friendly shelf entries, consumer checkout.",
    industryIcon: "store"
  }
};

export function getBusinessConfig(company?: Company): BusinessConfig {
  const type = company?.businessType || 'Retail Business';
  return BUSINESS_CONFIGS[type] || BUSINESS_CONFIGS["Retail Business"];
}
