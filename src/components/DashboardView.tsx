import React from 'react';
import { AppState, DashboardStats } from '../types';
import { 
  TrendingUp, ShoppingCart, ArrowDownCircle, AlertTriangle, 
  Coins, Briefcase, FileText, Calendar, PlusCircle, ArrowUpRight 
} from 'lucide-react';
import { getThemePalette } from '../utils/storage';

interface DashboardViewProps {
  state: AppState;
  stats: DashboardStats;
  onNavigate: (tab: string) => void;
}

export default function DashboardView({ state, stats, onNavigate }: DashboardViewProps) {
  const company = state.settings.company;
  const themePalette = getThemePalette(company);

  const formatCurrency = (amount: number) => {
    const code = company.currencyCode || 'INR';
    const symbol = company.currencySymbol || '₹';
    const locale = code === 'INR' ? 'en-IN' : 'en-US';
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        maximumFractionDigits: 0
      }).format(amount);
    } catch (e) {
      return `${symbol}${amount.toLocaleString(locale, { maximumFractionDigits: 0 })}`;
    }
  };

  const getBannerGradient = (theme: string) => {
    switch(theme) {
      case 'indigo': return 'from-slate-900 to-indigo-950 border-indigo-900/40';
      case 'sky': return 'from-slate-900 to-sky-950 border-sky-900/40';
      case 'rose': return 'from-slate-900 to-rose-950 border-rose-900/40';
      case 'amber': return 'from-slate-900 to-amber-950 border-amber-900/40';
      case 'violet': return 'from-slate-900 to-violet-950 border-violet-900/40';
      case 'teal': return 'from-slate-900 to-teal-950 border-teal-900/40';
      case 'blue': return 'from-slate-900 to-blue-950 border-blue-900/40';
      default: return 'from-slate-900 to-emerald-950 border-emerald-900/40';
    }
  };

  const bannerGradient = getBannerGradient(company.themeColor || 'emerald');

  const lowStockProducts = state.products.filter(
    p => p.initialStock + state.stockLogs
      .filter(log => log.productId === p.id)
      .reduce((acc, log) => {
        if (log.type === 'Addition') return acc + log.quantity;
        if (log.type === 'Reduction') return acc - log.quantity;
        return acc; // Adjustment or similar
      }, 0) <= p.minStockAlert
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className={`bg-gradient-to-r ${bannerGradient} rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome back, {state.currentUser?.fullName}!
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Running ERP for <strong className="text-white font-semibold">{company.name}</strong> • GSTIN: {company.gstin}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={() => onNavigate('sales')} 
            id="dash-new-invoice"
            className={`flex items-center gap-1.5 ${themePalette.bg} ${themePalette.hoverBg} text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow transition-all`}
          >
            <PlusCircle className="h-4 w-4" />
            New Sales Invoice
          </button>
          <button 
            onClick={() => onNavigate('purchase')} 
            id="dash-new-purchase"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-semibold text-xs px-4 py-2.5 rounded-lg shadow transition-all"
          >
            <ArrowUpRight className={`h-4 w-4 text-${themePalette.primary}-400`} />
            New Purchase
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-grid">
        {/* Total Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Sales</span>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalSales)}</h3>
            <span className={`text-xs ${themePalette.text} flex items-center font-medium`}>
              <TrendingUp className="h-3.5 w-3.5 mr-1" />
              Active state
            </span>
          </div>
          <div className={`p-3.5 rounded-xl ${themePalette.lightBg} ${themePalette.text}`}>
            <ShoppingCart className="h-6 w-6" />
          </div>
        </div>

        {/* Total Purchases */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Purchases</span>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalPurchase)}</h3>
            <span className="text-xs text-indigo-500 font-medium">Stock replenishment</span>
          </div>
          <div className="p-3.5 rounded-xl bg-indigo-50 text-indigo-600">
            <ArrowDownCircle className="h-6 w-6" />
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Expenses</span>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalExpenses)}</h3>
            <span className="text-xs text-slate-500 font-medium">Operational costs</span>
          </div>
          <div className="p-3.5 rounded-xl bg-rose-50 text-rose-600">
            <Briefcase className="h-6 w-6" />
          </div>
        </div>

        {/* Net GST / Tax Liability */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">GST Net Liability</span>
            <h3 className={`text-2xl font-bold ${stats.totalTaxLiability >= 0 ? 'text-slate-900' : 'text-emerald-600'}`}>
              {formatCurrency(stats.totalTaxLiability)}
            </h3>
            <span className="text-xs text-slate-500 font-medium">Sales GST - ITC Credit</span>
          </div>
          <div className={`p-3.5 rounded-xl ${themePalette.lightBg} ${themePalette.text}`}>
            <Coins className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Financial Health & Valuation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ledger Summaries */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4 lg:col-span-2">
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-1.5">
            <Coins className={`h-5 w-5 ${themePalette.text}`} />
            Financial Standing & Accounts Ledger
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 ${themePalette.lightBg}/50 rounded-xl border ${themePalette.border} text-center`}>
              <span className={`text-xs ${themePalette.text} font-medium uppercase tracking-wider`}>Book Receivables</span>
              <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(stats.receivables)}</p>
              <p className="text-[10px] text-slate-500 mt-1">Pending customer invoices</p>
            </div>
            <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 text-center">
              <span className="text-xs text-rose-700 font-medium uppercase tracking-wider">Book Payables</span>
              <p className="text-xl font-bold text-rose-950 mt-1">{formatCurrency(stats.payables)}</p>
              <p className="text-[10px] text-rose-600 mt-1">Unpaid supplier bills</p>
            </div>
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 text-center">
              <span className="text-xs text-amber-700 font-medium uppercase tracking-wider">Inventory Valuation</span>
              <p className="text-xl font-bold text-amber-950 mt-1">{formatCurrency(stats.inventoryValuation)}</p>
              <p className="text-[10px] text-amber-600 mt-1">Weighted at purchase cost</p>
            </div>
          </div>

          {/* Quick Recent Activity list */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">Recent Transactions</h4>
            <div className="divide-y divide-slate-100 max-h-[160px] overflow-y-auto pr-1">
              {state.sales.length === 0 && state.purchases.length === 0 ? (
                <p className="text-sm text-slate-400 py-3 text-center">No transaction records found yet.</p>
              ) : (
                [
                  ...state.sales.map(s => ({ type: 'sale', num: s.invoiceNumber, party: state.customers.find(c => c.id === s.customerId)?.name || 'Unknown', amt: s.totalAmount, date: s.date })),
                  ...state.purchases.map(p => ({ type: 'purchase', num: p.billNumber, party: state.suppliers.find(s => s.id === p.supplierId)?.name || 'Unknown', amt: p.totalAmount, date: p.date }))
                ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((tx, idx) => (
                  <div key={idx} className="py-2.5 flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tx.type === 'sale' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}`}>
                        {tx.type === 'sale' ? 'SALES' : 'PURCHASE'}
                      </span>
                      <span className="font-mono text-xs text-slate-500">{tx.num}</span>
                      <span className="text-slate-700 font-medium">{tx.party}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-slate-900">{formatCurrency(tx.amt)}</span>
                      <p className="text-[10px] text-slate-400 font-mono">{tx.date}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Low Stock Warning Panel */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-1.5">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Alerts & Stock Warnings
          </h3>

          {lowStockProducts.length === 0 ? (
            <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 text-center flex flex-col items-center justify-center h-48">
              <span className="text-3xl">🎉</span>
              <p className="font-bold text-sm mt-2">All Products fully stocked!</p>
              <p className="text-xs text-emerald-600 mt-1">No items have fallen below safety limits.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              <p className="text-xs font-semibold text-amber-700 bg-amber-50 rounded-lg p-2.5 border border-amber-100">
                {lowStockProducts.length} items have fallen below their safety threshold levels.
              </p>
              {lowStockProducts.map(p => {
                const currentStock = p.initialStock + state.stockLogs
                  .filter(log => log.productId === p.id)
                  .reduce((acc, log) => {
                    if (log.type === 'Addition') return acc + log.quantity;
                    if (log.type === 'Reduction') return acc - log.quantity;
                    return acc;
                  }, 0);
                return (
                  <div key={p.id} className="p-3 border border-slate-100 rounded-lg flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500 font-mono">SKU: {p.sku}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-rose-600 px-2 py-0.5 bg-rose-50 rounded-full">
                        Stock: {currentStock}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Alert Level: {p.minStockAlert}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button 
            onClick={() => onNavigate('inventory')}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg text-center transition-colors"
          >
            Manage Stock History
          </button>
        </div>
      </div>
    </div>
  );
}
