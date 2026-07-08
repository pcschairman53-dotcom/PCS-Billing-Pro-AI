import React, { useState } from 'react';
import { AppState } from '../types';
import { FileText, TrendingUp, TrendingDown, BookOpen, Calculator, Award, PieChart, ChevronRight } from 'lucide-react';
import { formatCurrency, getBusinessConfig, getThemePalette } from '../utils/storage';

interface ReportsViewProps {
  state: AppState;
}

export default function ReportsView({ state }: ReportsViewProps) {
  const company = state.settings.company;
  const themePalette = getThemePalette(company);
  const bizConfig = getBusinessConfig(company);

  const [activeReportTab, setActiveReportTab] = useState<'profit' | 'gst' | 'sales' | 'ledgers'>('profit');

  // 1. Profit Calculations
  const totalSalesRevenue = state.sales.reduce((sum, s) => sum + s.subTotal, 0); // taxable value
  const totalPurchaseCost = state.purchases.reduce((sum, p) => sum + p.subTotal, 0); // taxable cost
  const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);
  
  const grossProfit = totalSalesRevenue - totalPurchaseCost;
  const netProfit = grossProfit - totalExpenses;
  const grossMarginPercent = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;
  const netMarginPercent = totalSalesRevenue > 0 ? (netProfit / totalSalesRevenue) * 100 : 0;

  // 2. GST Summary Report (Sales output vs Purchase input)
  const salesCgst = state.sales.reduce((sum, s) => sum + s.cgstTotal, 0);
  const salesSgst = state.sales.reduce((sum, s) => sum + s.sgstTotal, 0);
  const salesIgst = state.sales.reduce((sum, s) => sum + s.igstTotal, 0);
  const totalOutputGst = salesCgst + salesSgst + salesIgst;

  const purchaseCgst = state.purchases.reduce((sum, p) => sum + p.cgstTotal, 0);
  const purchaseSgst = state.purchases.reduce((sum, p) => sum + p.sgstTotal, 0);
  const purchaseIgst = state.purchases.reduce((sum, p) => sum + p.igstTotal, 0);
  const totalInputGst = purchaseCgst + purchaseSgst + purchaseIgst; // ITC

  const netGstPayable = totalOutputGst - totalInputGst;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Compliant ERP Reports & Auditing</h1>
        <p className="text-sm text-slate-500">Review business metrics, tax breakdowns, and performance ledgers instantly.</p>
      </div>

      {/* Subtab selection header */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1" id="reports-tab-bar">
        <button
          onClick={() => setActiveReportTab('profit')}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-extrabold border-b-2 transition-colors ${activeReportTab === 'profit' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Profit & Loss Statement
        </button>
        <button
          onClick={() => setActiveReportTab('gst')}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-extrabold border-b-2 transition-colors ${activeReportTab === 'gst' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          GST GSTR-1 & ITC Audit
        </button>
        <button
          onClick={() => setActiveReportTab('sales')}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-extrabold border-b-2 transition-colors ${activeReportTab === 'sales' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Sales Trend Registry
        </button>
        <button
          onClick={() => setActiveReportTab('ledgers')}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-extrabold border-b-2 transition-colors ${activeReportTab === 'ledgers' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Customer/Supplier Ledger standing
        </button>
      </div>

      {/* P&L Statement block */}
      {activeReportTab === 'profit' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 border border-slate-100 rounded-xl shadow-sm text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Taxable Sales</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">{formatCurrency(totalSalesRevenue, company)}</p>
            </div>
            <div className="bg-white p-5 border border-slate-100 rounded-xl shadow-sm text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Taxable Cost</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">{formatCurrency(totalPurchaseCost, company)}</p>
            </div>
            <div className="bg-white p-5 border border-slate-100 rounded-xl shadow-sm text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Opex Expenses</span>
              <p className="text-xl font-extrabold text-rose-600 mt-1">{formatCurrency(totalExpenses, company)}</p>
            </div>
            <div className={`p-5 border rounded-xl shadow-sm text-center ${netProfit >= 0 ? `${themePalette.lightBg} border-slate-100` : 'bg-rose-50 border-rose-100'}`}>
              <span className="text-[10px] text-slate-600 uppercase tracking-widest font-extrabold">Net Profit (EBIT)</span>
              <p className={`text-2xl font-black mt-1 ${netProfit >= 0 ? themePalette.text : 'text-rose-950'}`}>{formatCurrency(netProfit, company)}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-950 text-base">Analytical Profit Breakdown</h3>
            <div className="divide-y divide-slate-100 text-sm">
              <div className="py-3 flex justify-between">
                <span className="text-slate-600">Sales Gross Billing Revenue:</span>
                <span className="font-semibold text-slate-900">{formatCurrency(state.sales.reduce((s, x) => s + x.totalAmount, 0), company)}</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-slate-600">Taxable Gross Profit Margin (Sales taxable - Purchase taxable):</span>
                <span className="font-bold text-slate-900">{formatCurrency(grossProfit, company)} <strong className={`text-xs ${themePalette.text} font-medium`}>({grossMarginPercent.toFixed(1)}%)</strong></span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-slate-600">Operational Expenses:</span>
                <span className="font-semibold text-rose-600">{formatCurrency(totalExpenses, company)}</span>
              </div>
              <div className="py-3 flex justify-between bg-slate-50 px-3 rounded-lg font-bold text-slate-900">
                <span>Calculated Net Margin Rate:</span>
                <span>{netMarginPercent.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GST Statement block */}
      {activeReportTab === 'gst' && (
        <div className="space-y-6 animate-fadeIn">
          {/* GST stats card banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 border border-slate-100 rounded-xl shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">GSTR-1 Sales Output GST</span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{formatCurrency(totalOutputGst, company)}</p>
              <div className="text-[10px] text-slate-400 mt-1.5 font-mono">
                CGST: {formatCurrency(salesCgst, company)} • SGST: {formatCurrency(salesSgst, company)} • IGST: {formatCurrency(salesIgst, company)}
              </div>
            </div>

            <div className="bg-white p-5 border border-slate-100 rounded-xl shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Input Tax Credit (ITC Claims)</span>
              <p className="text-2xl font-extrabold text-indigo-600 mt-1">{formatCurrency(totalInputGst, company)}</p>
              <div className="text-[10px] text-slate-400 mt-1.5 font-mono">
                CGST: {formatCurrency(purchaseCgst, company)} • SGST: {formatCurrency(purchaseSgst, company)} • IGST: {formatCurrency(purchaseIgst, company)}
              </div>
            </div>

            <div className={`p-5 border rounded-xl shadow-sm ${netGstPayable >= 0 ? 'bg-amber-50 border-amber-100' : `${themePalette.lightBg} border-slate-100`}`}>
              <span className="text-[10px] text-slate-600 font-extrabold uppercase tracking-widest">Net GST Payable / Credit</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(netGstPayable, company)}</p>
              <p className="text-[10px] text-slate-500 mt-1">
                {netGstPayable >= 0 ? 'Tax Payable to Government' : 'Eligible ITC credit carried forward'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-slate-950 text-base">GST Ledger Compliance Worksheet</h3>
            <p className="text-xs text-slate-500">Review line-item sales matching entries generated for outward supply filings.</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left divide-y divide-slate-100">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-3">Invoice / Ref</th>
                    <th className="p-3">Party Type</th>
                    <th className="p-3 text-right">Taxable Subtotal</th>
                    <th className="p-3 text-right">CGST</th>
                    <th className="p-3 text-right">SGST</th>
                    <th className="p-3 text-right">IGST</th>
                    <th className="p-3 text-right font-bold text-slate-900">Total Tax Charged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.sales.map(s => {
                    const cust = state.customers.find(c => c.id === s.customerId);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold font-mono">{s.invoiceNumber}</td>
                        <td className="p-3">{cust?.gstin ? 'Registered B2B' : 'Unregistered Consumer'}</td>
                        <td className="p-3 text-right">{formatCurrency(s.subTotal, company)}</td>
                        <td className="p-3 text-right text-slate-500">{formatCurrency(s.cgstTotal, company, true)}</td>
                        <td className="p-3 text-right text-slate-500">{formatCurrency(s.sgstTotal, company, true)}</td>
                        <td className="p-3 text-right text-slate-500">{formatCurrency(s.igstTotal, company, true)}</td>
                        <td className="p-3 text-right font-bold text-slate-950">
                          {formatCurrency(s.cgstTotal + s.sgstTotal + s.igstTotal, company)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sales trends registry */}
      {activeReportTab === 'sales' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4 animate-fadeIn">
          <h3 className="font-bold text-slate-950 text-base">Historical Transaction Log (GSTR-1 Ready)</h3>
          <p className="text-xs text-slate-500">Every transactional event completed by the operator inside this session.</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3">Timestamp / Date</th>
                  <th className="p-3">Reference No</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Client / Vendor</th>
                  <th className="p-3 text-right">Tax Charged</th>
                  <th className="p-3 text-right">Total Invoice Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  ...state.sales.map(s => ({ date: s.date, num: s.invoiceNumber, type: 'Sale (Inflow)', party: state.customers.find(c => c.id === s.customerId)?.name || 'Consumer', tax: s.cgstTotal + s.sgstTotal + s.igstTotal, total: s.totalAmount })),
                  ...state.purchases.map(p => ({ date: p.date, num: p.billNumber, type: 'Purchase (Outflow)', party: state.suppliers.find(s => s.id === p.supplierId)?.name || 'Supplier', tax: p.cgstTotal + p.sgstTotal + p.igstTotal, total: p.totalAmount }))
                ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono text-slate-500">{row.date}</td>
                    <td className="p-3 font-bold font-mono text-slate-800">{row.num}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${row.type.startsWith('Sale') ? `${themePalette.lightBg} ${themePalette.text}` : 'bg-indigo-50 text-indigo-800'}`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-700">{row.party}</td>
                    <td className="p-3 text-right text-slate-500">{formatCurrency(row.tax, company)}</td>
                    <td className="p-3 text-right font-bold text-slate-950">{formatCurrency(row.total, company)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer/Supplier ledgers */}
      {activeReportTab === 'ledgers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          {/* Receivables book */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Customer Ledger Balances (Receivables)
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {state.customers.map(c => (
                <div key={c.id} className="py-2.5 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900">{c.name}</p>
                    <p className="text-[10px] text-slate-400">Phone: {c.phone} • GST: {c.gstin || 'URD'}</p>
                  </div>
                  <span className="font-bold text-sm text-slate-950">{formatCurrency(c.balance, company)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payables book */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-rose-600" />
              Supplier Accounts Payable Ledger (Payables)
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {state.suppliers.map(s => (
                <div key={s.id} className="py-2.5 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900">{s.name}</p>
                    <p className="text-[10px] text-slate-400">Phone: {s.phone} • GST: {s.gstin}</p>
                  </div>
                  <span className="font-bold text-sm text-slate-950">{formatCurrency(s.balance, company)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
