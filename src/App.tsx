import React, { useState, useEffect } from 'react';
import { 
  getInitialState, saveStateToLocal, syncStateWithGoogleSheets, fetchAllDataFromSheets, getThemePalette, getBusinessConfig 
} from './utils/storage';
import { 
  User, Company, Category, Product, Customer, Supplier, 
  SalesInvoice, PurchaseEntry, Expense, Payment, StockLog, Settings, DashboardStats, UserRole 
} from './types';

// Component imports
import Login from './components/Login';
import DashboardView from './components/DashboardView';
import ProductsView from './components/ProductsView';
import CustomersSuppliersView from './components/CustomersSuppliersView';
import SalesView from './components/SalesView';
import PurchaseView from './components/PurchaseView';
import ExpensesPaymentsView from './components/ExpensesPaymentsView';
import InventoryView from './components/InventoryView';
import ReportsView from './components/ReportsView';
import AIAnalyticsView from './components/AIAnalyticsView';
import ActivityLogView from './components/ActivityLogView';
import SettingsView from './components/SettingsView';

import { 
  LayoutDashboard, ShoppingBag, Users, ShoppingCart, ArrowDownCircle, 
  IndianRupee, Settings as SettingsIcon, LogOut, Shield, Database, Sparkles, AlertCircle, FileText 
} from 'lucide-react';

export default function App() {
  const [state, setState] = useState(getInitialState);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-save state helper
  const updateState = (newState: Partial<typeof state>) => {
    setState(prev => {
      const updated = { ...prev, ...newState };
      saveStateToLocal(updated);
      
      // Auto-sync with Google Sheets in the background if active
      if (updated.settings.useGoogleSheets && updated.settings.appsScriptUrl) {
        syncStateWithGoogleSheets(updated, updated.settings.appsScriptUrl).then(res => {
          if (res.success) {
            console.log("Auto-sync with Google Sheets succeeded");
          } else {
            console.warn("Auto-sync with Google Sheets failed:", res.message);
          }
        }).catch(err => {
          console.warn("Auto-sync with Google Sheets warning:", err);
        });
      }
      
      return updated;
    });
  };

  const addActivityLog = (action: string, details: string) => {
    const newLog = {
      id: `act-${Date.now()}`,
      userId: state.currentUser?.id || 'system',
      username: state.currentUser?.username || 'system',
      action,
      details,
      timestamp: new Date().toISOString()
    };
    updateState({
      activityLogs: [...state.activityLogs, newLog]
    });
  };

  const executePostAction = async (action: string, data: any) => {
    if (state.settings.useGoogleSheets && state.settings.appsScriptUrl) {
      try {
        const payload = {
          action,
          data,
          auth: state.currentUser ? {
            username: state.currentUser.username,
            token: state.currentUser.passwordHash || "system-token"
          } : undefined
        };

        const response = await fetch(state.settings.appsScriptUrl, {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result && result.success) {
          console.log(`POST Action ${action} succeeded:`, result.message);
        } else {
          console.warn(`POST Action ${action} failed:`, result?.error || "Unknown error");
        }
      } catch (err) {
        console.warn(`POST Action ${action} exception:`, err);
      }
    }
  };

  // Auth
  const handleLoginSuccess = (user: User) => {
    setState(prev => {
      const updated = { ...prev, currentUser: user };
      saveStateToLocal(updated);
      return updated;
    });
    // Add activity log manually after setting state or using updateState
    const newLog = {
      id: `act-${Date.now()}`,
      userId: user.id,
      username: user.username,
      action: 'Login',
      details: `User successfully signed in to ERP system: ${user.fullName}`,
      timestamp: new Date().toISOString()
    };
    setState(prev => {
      const updated = { ...prev, currentUser: user, activityLogs: [...prev.activityLogs, newLog] };
      saveStateToLocal(updated);
      return updated;
    });
  };

  const handleLogout = () => {
    addActivityLog('Logout', 'User signed out from ERP portal.');
    setState(prev => {
      const updated = { ...prev, currentUser: null };
      saveStateToLocal(updated);
      return updated;
    });
  };

  // Products & Categories
  const handleAddProduct = (p: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...p,
      id: `prod-${Date.now()}`
    };
    updateState({
      products: [...state.products, newProduct]
    });
    executePostAction('createProduct', newProduct);
    addActivityLog('Add Product', `Added new product catalog item: ${newProduct.name} SKU: ${newProduct.sku}`);
  };

  const handleEditProduct = (p: Product) => {
    updateState({
      products: state.products.map(item => item.id === p.id ? p : item)
    });
    executePostAction('updateProduct', p);
    addActivityLog('Edit Product', `Modified product catalog specifications: ${p.name}`);
  };

  const handleAddCategory = (c: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...c,
      id: `cat-${Date.now()}`
    };
    updateState({
      categories: [...state.categories, newCategory]
    });
    executePostAction('createCategory', newCategory);
    addActivityLog('Add Category', `Created new product classification tier: ${newCategory.name}`);
  };

  // Contacts (Customers & Suppliers)
  const handleAddCustomer = (c: Omit<Customer, 'id'>) => {
    const newCust: Customer = {
      ...c,
      id: `cust-${Date.now()}`
    };
    updateState({
      customers: [...state.customers, newCust]
    });
    executePostAction('createCustomer', newCust);
    addActivityLog('Add Customer', `Registered new client ledger directory: ${newCust.name}`);
  };

  const handleEditCustomer = (c: Customer) => {
    updateState({
      customers: state.customers.map(item => item.id === c.id ? c : item)
    });
    executePostAction('updateCustomer', c);
    addActivityLog('Edit Customer', `Updated client directory ledger information: ${c.name}`);
  };

  const handleAddSupplier = (s: Omit<Supplier, 'id'>) => {
    const newSupp: Supplier = {
      ...s,
      id: `supp-${Date.now()}`
    };
    updateState({
      suppliers: [...state.suppliers, newSupp]
    });
    executePostAction('createSupplier', newSupp);
    addActivityLog('Add Supplier', `Registered new supplier ledger account: ${newSupp.name}`);
  };

  const handleEditSupplier = (s: Supplier) => {
    updateState({
      suppliers: state.suppliers.map(item => item.id === s.id ? s : item)
    });
    executePostAction('updateSupplier', s);
    addActivityLog('Edit Supplier', `Updated supplier account credentials: ${s.name}`);
  };

  // Billing (Sales Invoice)
  const handleAddSalesInvoice = (inv: Omit<SalesInvoice, 'id'>) => {
    const invoiceId = `sale-${Date.now()}`;
    const newInvoice: SalesInvoice = {
      ...inv,
      id: invoiceId
    };

    // Auto stock reduction & logs
    const newStockLogs: StockLog[] = inv.items.map((it, idx) => ({
      id: `stk-${Date.now()}-${idx}`,
      productId: it.productId,
      date: inv.date,
      type: 'Reduction',
      quantity: -Math.abs(it.quantity),
      referenceId: invoiceId,
      notes: `Sales Invoice ${inv.invoiceNumber} checkout`
    }));

    // Update customer outstanding ledger balances
    const outstanding = inv.totalAmount - inv.amountPaid;
    const updatedCustomers = state.customers.map(c => {
      if (c.id === inv.customerId) {
        return { ...c, balance: c.balance + outstanding };
      }
      return c;
    });

    // If partial payment made, add receipt payment log
    let updatedPayments = [...state.payments];
    if (inv.amountPaid > 0) {
      const customerName = state.customers.find(c => c.id === inv.customerId)?.name || 'Consumer';
      const newPayment: Payment = {
        id: `pay-${Date.now()}`,
        type: 'Inflow',
        date: inv.date,
        partyId: inv.customerId,
        partyName: customerName,
        amount: inv.amountPaid,
        method: inv.paymentMethod as any,
        reference: inv.invoiceNumber,
        notes: `Received amount toward invoice settlement: ${inv.invoiceNumber}`
      };
      updatedPayments.push(newPayment);
    }

    updateState({
      sales: [...state.sales, newInvoice],
      stockLogs: [...state.stockLogs, ...newStockLogs],
      customers: updatedCustomers,
      payments: updatedPayments
    });
    executePostAction('createSale', newInvoice);

    addActivityLog('Sales Invoice', `Dispatched GST invoice: ${newInvoice.invoiceNumber} amounting ₹${newInvoice.totalAmount}`);
  };

  // Purchase entry
  const handleAddPurchase = (p: Omit<PurchaseEntry, 'id'>) => {
    const purchaseId = `purch-${Date.now()}`;
    const newPurchase: PurchaseEntry = {
      ...p,
      id: purchaseId
    };

    // Auto stock addition & logs
    const newStockLogs: StockLog[] = p.items.map((it, idx) => ({
      id: `stk-${Date.now()}-${idx}`,
      productId: it.productId,
      date: p.date,
      type: 'Addition',
      quantity: Math.abs(it.quantity),
      referenceId: purchaseId,
      notes: `Purchase Bill ${p.billNumber} inbound replenishment`
    }));

    // Update supplier balance (accounts payable)
    const outstanding = p.totalAmount - p.amountPaid;
    const updatedSuppliers = state.suppliers.map(s => {
      if (s.id === p.supplierId) {
        return { ...s, balance: s.balance + outstanding };
      }
      return s;
    });

    // If payment made to supplier, record outflow payment log
    let updatedPayments = [...state.payments];
    if (p.amountPaid > 0) {
      const supplierName = state.suppliers.find(s => s.id === p.supplierId)?.name || 'Supplier';
      const newPayment: Payment = {
        id: `pay-${Date.now()}`,
        type: 'Outflow',
        date: p.date,
        partyId: p.supplierId,
        partyName: supplierName,
        amount: p.amountPaid,
        method: 'UPI', // default UPI for system representation
        reference: p.billNumber,
        notes: `Settled amount toward purchase bill: ${p.billNumber}`
      };
      updatedPayments.push(newPayment);
    }

    updateState({
      purchases: [...state.purchases, newPurchase],
      stockLogs: [...state.stockLogs, ...newStockLogs],
      suppliers: updatedSuppliers,
      payments: updatedPayments
    });
    executePostAction('createPurchase', newPurchase);

    addActivityLog('Purchase Entry', `Logged supplier purchase entry: ${newPurchase.billNumber} amounting ₹${newPurchase.totalAmount}`);
  };

  // Expenses & Ledger settlements
  const handleAddExpense = (e: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...e,
      id: `exp-${Date.now()}`
    };
    updateState({
      expenses: [...state.expenses, newExpense]
    });
    executePostAction('createExpense', newExpense);
    addActivityLog('Add Expense', `Logged operational cash opex: ${newExpense.category} amounting ₹${newExpense.amount}`);
  };

  const handleAddPayment = (pay: Omit<Payment, 'id'>) => {
    const newPayment: Payment = {
      ...pay,
      id: `pay-${Date.now()}`
    };

    // Update ledger balances depending on inflow vs outflow
    let updatedCustomers = [...state.customers];
    let updatedSuppliers = [...state.suppliers];

    if (pay.type === 'Inflow') {
      updatedCustomers = state.customers.map(c => {
        if (c.id === pay.partyId) {
          return { ...c, balance: Math.max(0, c.balance - pay.amount) };
        }
        return c;
      });
    } else {
      updatedSuppliers = state.suppliers.map(s => {
        if (s.id === pay.partyId) {
          return { ...s, balance: Math.max(0, s.balance - pay.amount) };
        }
        return s;
      });
    }

    updateState({
      payments: [...state.payments, newPayment],
      customers: updatedCustomers,
      suppliers: updatedSuppliers
    });
    executePostAction('createPayment', newPayment);

    addActivityLog('Settlement Payment', `Logged ledger settlement: ${pay.type.toUpperCase()} from ${pay.partyName} of ₹${pay.amount}`);
  };

  // Stock log manual
  const handleAddStockLog = (log: Omit<StockLog, 'id'>) => {
    const newLog: StockLog = {
      ...log,
      id: `stk-${Date.now()}`
    };
    updateState({
      stockLogs: [...state.stockLogs, newLog]
    });
    addActivityLog('Stock Adjustment', `Manual warehouse audit adjustment executed for Product ID: ${log.productId}`);
  };

  // Settings
  const handleUpdateCompany = (company: Company) => {
    updateState({
      settings: {
        ...state.settings,
        company
      }
    });
    executePostAction('updateCompany', company);
    addActivityLog('Settings Update', `Modified company credentials and bank ledger details.`);
  };

  const handleUpdateSettings = (settings: Settings) => {
    updateState({
      settings
    });
    addActivityLog('Settings Update', `Google Sheets database integration setup updated.`);
  };

  // Sheets sync processes
  const handleTriggerSync = async () => {
    const result = await syncStateWithGoogleSheets(state, state.settings.appsScriptUrl);
    if (result.success && result.remoteState) {
      addActivityLog('Sheets Sync', 'Pushed local state data ledger to Google Sheets successfully.');
    } else {
      addActivityLog('Sheets Sync Error', `Failed to push state data to Sheets: ${result.message}`);
    }
    return result;
  };

  const handleTriggerFetch = async () => {
    const result = await fetchAllDataFromSheets(state.settings.appsScriptUrl);
    if (result.success && result.data) {
      const remote = result.data as any;
      // Safely merge remote data supporting both camelCase and lowercase keys from Google Sheets
      const merged = {
        ...state,
        users: remote.users || remote.Users || state.users,
        settings: {
          ...state.settings,
          company: remote.company || remote.Company || state.settings.company
        },
        categories: remote.categories || remote.Categories || state.categories,
        products: remote.products || remote.Products || state.products,
        customers: remote.customers || remote.Customers || state.customers,
        suppliers: remote.suppliers || remote.Suppliers || state.suppliers,
        sales: remote.sales || remote.Sales || state.sales,
        purchases: remote.purchases || remote.Purchases || state.purchases,
        expenses: remote.expenses || remote.Expenses || state.expenses,
        payments: remote.payments || remote.Payments || state.payments,
        stockLogs: remote.stocklogs || remote.stockLogs || state.stockLogs,
        activityLogs: remote.activitylogs || remote.activityLogs || state.activityLogs
      };
      
      setState(merged);
      saveStateToLocal(merged);
      addActivityLog('Sheets Fetch', 'Pulled remote master records from Google Sheets database successfully.');
    } else {
      addActivityLog('Sheets Fetch Error', `Failed to pull remote records from Sheets: ${result.message}`);
    }
    return result;
  };

  // Auto-trigger load from Sheets on startup if setup is active
  useEffect(() => {
    if (state.settings.useGoogleSheets && state.settings.appsScriptUrl) {
      handleTriggerFetch();
    }
  }, [state.currentUser]);

  // Compute stats on-the-fly for Dashboard and Reports views
  const computeDashboardStats = (): DashboardStats => {
    const totalSales = state.sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalPurchase = state.purchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);

    // GST Liability
    const salesCgst = state.sales.reduce((sum, s) => sum + s.cgstTotal, 0);
    const salesSgst = state.sales.reduce((sum, s) => sum + s.sgstTotal, 0);
    const salesIgst = state.sales.reduce((sum, s) => sum + s.igstTotal, 0);
    const totalSalesGst = salesCgst + salesSgst + salesIgst;

    const purchaseCgst = state.purchases.reduce((sum, p) => sum + p.cgstTotal, 0);
    const purchaseSgst = state.purchases.reduce((sum, p) => sum + p.sgstTotal, 0);
    const purchaseIgst = state.purchases.reduce((sum, p) => sum + p.igstTotal, 0);
    const totalPurchaseGst = purchaseCgst + purchaseSgst + purchaseIgst;

    const totalTaxLiability = totalSalesGst - totalPurchaseGst;

    // Receivables and Payables balances
    const receivables = state.customers.reduce((sum, c) => sum + c.balance, 0);
    const payables = state.suppliers.reduce((sum, s) => sum + s.balance, 0);

    // Inventory Valuation weighting (products initialStock * purchasePrice + logs adjustments)
    let inventoryValuation = 0;
    state.products.forEach(p => {
      const logs = state.stockLogs.filter(log => log.productId === p.id);
      const currentStock = p.initialStock + logs.reduce((acc, log) => {
        if (log.type === 'Addition') return acc + log.quantity;
        if (log.type === 'Reduction') return acc - log.quantity;
        return acc;
      }, 0);
      inventoryValuation += Math.max(0, currentStock * p.purchasePrice);
    });

    const lowStockCount = state.products.filter(p => {
      const logs = state.stockLogs.filter(log => log.productId === p.id);
      const stock = p.initialStock + logs.reduce((acc, log) => {
        if (log.type === 'Addition') return acc + log.quantity;
        if (log.type === 'Reduction') return acc - log.quantity;
        return acc;
      }, 0);
      return stock <= p.minStockAlert;
    }).length;

    return {
      totalSales,
      totalPurchase,
      totalExpenses,
      totalTaxLiability,
      lowStockCount,
      salesGrowth: 12.5, // placeholder
      inventoryValuation,
      receivables,
      payables
    };
  };

  const dashboardStats = computeDashboardStats();

  // If user is not logged in, force Login Screen
  if (!state.currentUser) {
    return <Login users={state.users} onLoginSuccess={handleLoginSuccess} />;
  }

  // Active Screen Selector Switch
  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView state={state} stats={dashboardStats} onNavigate={(tab) => setActiveTab(tab)} />;
      case 'products':
        return (
          <ProductsView 
            state={state}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onAddCategory={handleAddCategory}
          />
        );
      case 'contacts':
        return (
          <CustomersSuppliersView 
            state={state}
            onAddCustomer={handleAddCustomer}
            onEditCustomer={handleEditCustomer}
            onAddSupplier={handleAddSupplier}
            onEditSupplier={handleEditSupplier}
          />
        );
      case 'sales':
        return <SalesView state={state} onAddSalesInvoice={handleAddSalesInvoice} />;
      case 'purchase':
        return <PurchaseView state={state} onAddPurchase={handleAddPurchase} />;
      case 'expenses':
        return (
          <ExpensesPaymentsView 
            state={state}
            onAddExpense={handleAddExpense}
            onAddPayment={handleAddPayment}
          />
        );
      case 'inventory':
        return <InventoryView state={state} onAddStockLog={handleAddStockLog} />;
      case 'reports':
        return <ReportsView state={state} />;
      case 'ai':
        return <AIAnalyticsView state={state} />;
      case 'logs':
        return <ActivityLogView state={state} />;
      case 'settings':
        return (
          <SettingsView 
            state={state}
            onUpdateCompany={handleUpdateCompany}
            onUpdateSettings={handleUpdateSettings}
            onTriggerSync={handleTriggerSync}
            onTriggerFetch={handleTriggerFetch}
          />
        );
      default:
        return <DashboardView state={state} stats={dashboardStats} onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products & Categories', icon: ShoppingBag },
    { id: 'contacts', label: 'Customers & Suppliers', icon: Users },
    { id: 'sales', label: 'Sales Invoicing', icon: ShoppingCart },
    { id: 'purchase', label: 'Purchase Entry', icon: ArrowDownCircle },
    { id: 'expenses', label: 'Expenses & Payments', icon: IndianRupee },
    { id: 'inventory', label: 'Inventory Audit', icon: Shield },
    { id: 'reports', label: 'ERP Reports', icon: FileText },
    { id: 'ai', label: 'Gemini AI Insights', icon: Sparkles, highlight: true },
    { id: 'logs', label: 'Audit Logs', icon: Database },
    { id: 'settings', label: 'Settings & Cloud', icon: SettingsIcon },
  ];

  const themePalette = getThemePalette(state.settings.company);
  const bizConfig = getBusinessConfig(state.settings.company);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 flex-col bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0 select-none">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            {state.settings.company.logoUrl ? (
              <img src={state.settings.company.logoUrl} alt="Logo" className="h-9 w-9 object-contain rounded-lg" referrerPolicy="no-referrer" />
            ) : (
              <div className={`${themePalette.bg} p-1.5 rounded-lg text-white font-extrabold text-sm flex items-center justify-center w-9 h-9 shrink-0`}>
                {state.settings.company.name ? state.settings.company.name.charAt(0).toUpperCase() : 'P'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="font-black text-white text-sm tracking-tight block truncate" title={state.settings.company.name}>
                {state.settings.company.name}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider block truncate" style={{ color: themePalette.primary === 'emerald' ? '#34d399' : themePalette.primary === 'indigo' ? '#818cf8' : themePalette.primary === 'sky' ? '#38bdf8' : themePalette.primary === 'rose' ? '#f43f5e' : themePalette.primary === 'amber' ? '#fbbf24' : themePalette.primary === 'violet' ? '#a78bfa' : themePalette.primary === 'teal' ? '#2dd4bf' : '#60a5fa' }}>
                {state.settings.company.businessType || 'Retail ERP'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Sidebar List */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all group ${
                  isSelected 
                    ? `${themePalette.bg} text-white shadow` 
                    : item.highlight
                      ? `${themePalette.lightText} hover:bg-slate-800 hover:text-white`
                      : 'hover:bg-slate-800 hover:text-white text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4.5 w-4.5 ${isSelected ? 'text-white' : item.highlight ? themePalette.lightText : 'text-slate-400 group-hover:text-white'}`} />
                  <span>{item.label}</span>
                </div>
                {item.highlight && (
                  <span className={`${themePalette.badgeBg} ${themePalette.badgeText} border border-white/10 text-[8px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-widest`}>
                    AI
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Account / Sign Out Block */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs">
          <div>
            <p className="font-extrabold text-white">{state.currentUser.fullName}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{state.currentUser.role}</p>
          </div>
          <button 
            onClick={handleLogout}
            id="sidebar-logout"
            className="p-2 bg-slate-900 hover:bg-rose-950 hover:text-rose-400 rounded-lg text-slate-400 transition-colors"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Header - Mobile Screen */}
      <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center select-none shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          {state.settings.company.logoUrl ? (
            <img src={state.settings.company.logoUrl} alt="Logo" className="h-7 w-7 object-contain rounded" referrerPolicy="no-referrer" />
          ) : (
            <div className={`${themePalette.bg} p-1 rounded text-white font-extrabold text-xs flex items-center justify-center w-7 h-7 shrink-0`}>
              {state.settings.company.name ? state.settings.company.name.charAt(0).toUpperCase() : 'P'}
            </div>
          )}
          <span className="font-black text-sm tracking-tight truncate max-w-[200px]">{state.settings.company.name}</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          id="btn-mobile-menu"
          className="p-1.5 bg-slate-800 rounded font-bold"
        >
          ✕
        </button>
      </header>

      {/* Navigation - Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 text-slate-300 border-b border-slate-800 p-4 space-y-1 select-none z-40">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-nav-${item.id}`}
                onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold ${
                  isSelected ? `${themePalette.bg} text-white` : 'hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                {item.highlight && <span className={`${themePalette.badgeBg} ${themePalette.badgeText} text-[8px] font-extrabold px-1.5 py-0.2 rounded`}>AI</span>}
              </button>
            );
          })}
          <hr className="border-slate-800 my-2" />
          <button 
            onClick={handleLogout}
            id="mobile-logout"
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-slate-800 rounded-lg text-left"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out ({state.currentUser.fullName})</span>
          </button>
        </div>
      )}

      {/* Main Workspace Frame container */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Dynamic Warning Notification if local storage active and cloud sheets disabled */}
        {!state.settings.useGoogleSheets && (
          <div className="mb-6 p-3 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-lg flex items-start gap-2.5 text-xs text-indigo-900 shadow-sm print:hidden">
            <AlertCircle className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Persistent Mode: Local Storage Active</p>
              <p className="text-slate-500 mt-0.5">
                Your ERP data is securely saved in local browser state. Enable <strong className="text-indigo-800 hover:underline cursor-pointer" onClick={() => setActiveTab('settings')}>Google Sheets persistent backend</strong> in settings to activate remote multi-user cloud sync.
              </p>
            </div>
          </div>
        )}

        {/* Active Screen Frame */}
        {renderActiveScreen()}
      </main>
    </div>
  );
}
