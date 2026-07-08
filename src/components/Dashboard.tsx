import React from 'react';
import { 
  Product, Customer, Supplier, SalesInvoice, PurchaseEntry, Expense, StockLog 
} from '../types';
import { 
  TrendingUp, TrendingDown, IndianRupee, AlertTriangle, 
  ShoppingBag, Users, FileText, ArrowUpRight, ShieldAlert 
} from 'lucide-react';

interface DashboardProps {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: SalesInvoice[];
  purchases: PurchaseEntry[];
  expenses: Expense[];
  stockLogs: StockLog[];
  onNavigate: (tab: string) => void;
}

export default function Dashboard({
  products,
  customers,
  suppliers,
  sales,
  purchases,
  expenses,
  stockLogs,
  onNavigate
}: DashboardProps) {

  // Calculate stocks on hand per product
  const getProductStock = (productId: string, initialStock: number) => {
    const logs = stockLogs.filter(l => l.productId === productId);
    let stock = initialStock;
    logs.forEach(log => {
      if (log.type === 'Addition') {
        stock += log.quantity;
      } else if (log.type === 'Reduction') {
        stock -= log.quantity;
      } else if (log.type === 'Adjustment') {
        stock = log.quantity; // direct override or adjust
      }
    });
    return stock;
  };

  // Metrics
  const totalSales = sales.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalPurchases = purchases.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  
  const salesGst = sales.reduce((sum, item) => sum + item.cgstTotal + item.sgstTotal + item.igstTotal, 0);
  const purchaseGst = purchases.reduce((sum, item) => sum + item.cgstTotal + item.sgstTotal + item.igstTotal, 0);
  const gstLiability = Math.max(0, salesGst - purchaseGst);

  const totalReceivables = customers.reduce((sum, item) => sum + (item.balance || 0), 0);
  const totalPayables = suppliers.reduce((sum, item) => sum + (item.balance || 0), 0);

  // Stock Valuation and Alerts
  let lowStockCount = 0;
  const inventoryValuation = products.reduce((sum, prod) => {
    const currentStock = getProductStock(prod.id, prod.initialStock);
    if (currentStock <= prod.minStockAlert && prod.minStockAlert > 0) {
      lowStockCount++;
    }
    return sum + (currentStock * prod.purchasePrice);
  }, 0);

  const recentSales = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  
  // High-value stock alerts
  const lowStockList = products
    .map(p => ({ ...p, stock: getProductStock(p.id, p.initialStock) }))
    .filter(p => p.stock <= p.minStockAlert && p.minStockAlert > 0)
    .slice(0, 5);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ERP Operations Console</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time GST, inventory, and ledger metrics for your business.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => onNavigate('sales')}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <FileText className="h-4 w-4 mr-2" />
            New Invoice
          </button>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sales (G.R.)</span>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalSales)}</h3>
            <span className="inline-flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3 mr-1" />
              Sales Active
            </span>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg">
            <IndianRupee className="h-5 w-5" />
          </div>
        </div>

        {/* Purchases */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Purchases</span>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalPurchases)}</h3>
            <span className="inline-flex items-center text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              <TrendingDown className="h-3 w-3 mr-1" />
              Stock Additions
            </span>
          </div>
          <div className="bg-amber-50 text-amber-600 p-3 rounded-lg">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expenses Paid</span>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalExpenses)}</h3>
            <span className="inline-flex items-center text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              Indirect Costs
            </span>
          </div>
          <div className="bg-rose-50 text-rose-600 p-3 rounded-lg">
            <TrendingDown className="h-5 w-5" />
          </div>
        </div>

        {/* GST Payable */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Est. GST Liability</span>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(gstLiability)}</h3>
            <span className="inline-flex items-center text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              Net Tax Payable
            </span>
          </div>
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-lg">
            <IndianRupee className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center space-x-4">
          <div className="bg-blue-100 text-blue-700 p-3 rounded-lg">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Customer Receivables</p>
            <h4 className="text-xl font-bold text-slate-800">{formatCurrency(totalReceivables)}</h4>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center space-x-4">
          <div className="bg-orange-100 text-orange-700 p-3 rounded-lg">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Supplier Payables</p>
            <h4 className="text-xl font-bold text-slate-800">{formatCurrency(totalPayables)}</h4>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center space-x-4">
          <div className="bg-teal-100 text-teal-700 p-3 rounded-lg">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Inventory Valuation</p>
            <h4 className="text-xl font-bold text-slate-800">{formatCurrency(inventoryValuation)}</h4>
          </div>
        </div>
      </div>

      {/* Main Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-50">
            <h3 className="text-lg font-bold text-slate-800">Recent Sales Invoices</h3>
            <button 
              onClick={() => onNavigate('sales')} 
              className="text-emerald-600 hover:text-emerald-700 text-xs font-semibold flex items-center"
            >
              View All <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">Invoice No.</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm text-slate-600">
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">No invoices generated yet.</td>
                  </tr>
                ) : (
                  recentSales.map((sale) => {
                    const cust = customers.find(c => c.id === sale.customerId);
                    return (
                      <tr key={sale.id} className="hover:bg-slate-50/55 transition-colors">
                        <td className="py-3 font-medium text-slate-800">{sale.invoiceNumber}</td>
                        <td className="py-3">{cust ? cust.name : 'Walk-in Customer'}</td>
                        <td className="py-3">{sale.date}</td>
                        <td className="py-3 font-semibold text-slate-800">{formatCurrency(sale.totalAmount)}</td>
                        <td className="py-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            sale.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700' :
                            sale.paymentStatus === 'Partial' ? 'bg-amber-50 text-amber-700' :
                            'bg-rose-50 text-rose-700'
                          }`}>
                            {sale.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Notifications */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-50">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-bold text-slate-800">Critical Alerts</h3>
            </div>
            <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold">
              {lowStockCount} Low Stock
            </span>
          </div>

          <div className="space-y-3">
            {lowStockList.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                All item levels are healthy. Good job!
              </div>
            ) : (
              lowStockList.map((prod) => (
                <div key={prod.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50/40 border border-amber-100/50">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">{prod.name}</h4>
                    <p className="text-xs text-slate-400">SKU: {prod.sku} • Min alert: {prod.minStockAlert}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-amber-600 bg-amber-100/50 px-2.5 py-1 rounded">
                      {prod.stock} left
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          {lowStockList.length > 0 && (
            <button
              onClick={() => onNavigate('inventory')}
              className="w-full text-center py-2 text-xs font-semibold text-emerald-600 hover:bg-slate-50 rounded-lg border border-dashed border-slate-200 block transition-colors"
            >
              Open Inventory Logs
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
