import React, { useState } from 'react';
import { AppState, Expense, Payment } from '../types';
import { Plus, Check, Search, TrendingUp, TrendingDown, BookOpen, Coffee, Lightbulb } from 'lucide-react';
import { formatCurrency, getBusinessConfig, getThemePalette } from '../utils/storage';

interface ExpensesPaymentsViewProps {
  state: AppState;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onAddPayment: (payment: Omit<Payment, 'id'>) => void;
}

export default function ExpensesPaymentsView({ state, onAddExpense, onAddPayment }: ExpensesPaymentsViewProps) {
  const company = state.settings.company;
  const themePalette = getThemePalette(company);
  const bizConfig = getBusinessConfig(company);

  const [activeSubTab, setActiveSubTab] = useState<'expenses' | 'payments'>('expenses');

  // Modal displays
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Expense Form State
  const [expCategory, setExpCategory] = useState('Rent');
  const [expAmount, setExpAmount] = useState(0);
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expDesc, setExpDesc] = useState('');
  const [expRef, setExpRef] = useState('');

  // Payment Form State
  const [payType, setPayType] = useState<'Inflow' | 'Outflow'>('Inflow');
  const [payPartyId, setPayPartyId] = useState('');
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState<'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque'>('UPI');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expAmount <= 0) return;

    onAddExpense({
      category: expCategory,
      amount: Number(expAmount),
      date: expDate,
      description: expDesc,
      reference: expRef
    });

    setExpAmount(0);
    setExpDesc('');
    setExpRef('');
    setIsExpenseModalOpen(false);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0 || !payPartyId) {
      alert("Please specify a contact party and an amount.");
      return;
    }

    const partyName = payType === 'Inflow' 
      ? state.customers.find(c => c.id === payPartyId)?.name || 'Unknown Customer'
      : state.suppliers.find(s => s.id === payPartyId)?.name || 'Unknown Supplier';

    onAddPayment({
      type: payType,
      date: payDate,
      partyId: payPartyId,
      partyName,
      amount: Number(payAmount),
      method: payMethod,
      reference: payRef,
      notes: payNotes
    });

    setPayAmount(0);
    setPayRef('');
    setPayNotes('');
    setIsPaymentModalOpen(false);
  };

  // Prepopulate first customer or supplier on payment type switch
  const handlePaymentTypeSwitch = (type: 'Inflow' | 'Outflow') => {
    setPayType(type);
    if (type === 'Inflow') {
      setPayPartyId(state.customers[0]?.id || '');
    } else {
      setPayPartyId(state.suppliers[0]?.id || '');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and triggers */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Expenses & Payment Book</h1>
          <p className="text-sm text-slate-500">Record off-invoice operational expenses and ledger payment settlements.</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            id="btn-add-expense-modal"
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-lg border border-slate-200 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Log Opex Expense
          </button>
          <button
            onClick={() => {
              setIsPaymentModalOpen(true);
              handlePaymentTypeSwitch('Inflow');
            }}
            id="btn-add-payment-modal"
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow transition-all"
          >
            <Plus className="h-4 w-4" />
            Log Settlement Payment
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('expenses')}
          id="tab-select-expenses"
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeSubTab === 'expenses' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Opex Expenses ({state.expenses.length})
        </button>
        <button
          onClick={() => setActiveSubTab('payments')}
          id="tab-select-payments"
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeSubTab === 'payments' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Contact Ledger Settlements ({state.payments.length})
        </button>
      </div>

      {/* Subtab Content blocks */}
      {activeSubTab === 'expenses' ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden animate-fadeIn">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Description</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Reference / Txn</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm">
                      No operational expenses recorded. Log items like Rent or Utility bills here.
                    </td>
                  </tr>
                ) : (
                  [...state.expenses].reverse().map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                        {exp.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500">
                        {exp.date}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {exp.description || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-400">
                        {exp.reference || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-rose-600">
                        {formatCurrency(exp.amount, company)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden animate-fadeIn">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Transaction Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Party Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Payment Mode</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Reference / UPI ID</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Amount Settled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400 text-sm">
                      No customer/supplier ledger payments logged yet.
                    </td>
                  </tr>
                ) : (
                  [...state.payments].reverse().map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500">
                        {pay.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${pay.type === 'Inflow' ? `${themePalette.lightBg} ${themePalette.text}` : 'bg-rose-50 text-rose-800'}`}>
                          {pay.type === 'Inflow' ? 'INFLOW (REC)' : 'OUTFLOW (PAY)'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">
                        {pay.partyName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-500 uppercase">
                        {pay.method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-400">
                        {pay.reference || '—'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-black ${pay.type === 'Inflow' ? themePalette.text : 'text-rose-600'}`}>
                        {formatCurrency(pay.amount, company)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-scaleUp">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Log Opex Expense</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">Expense Category *</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-white font-medium text-slate-800"
                >
                  <option value="Rent">Office Space Rent</option>
                  <option value="Electricity">Electricity / Utilities</option>
                  <option value="Tea & Snacks">Tea, Food & Refreshments</option>
                  <option value="Stationery">Stationery & Office Supplies</option>
                  <option value="Marketing">Marketing / Local Promo</option>
                  <option value="Salary">Staff Salaries / Perks</option>
                  <option value="Others">Others / Misc</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Amount Paid ({company.currencySymbol}) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={expAmount}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                    className={`mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 ${themePalette.focusRing}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">Description / Purpose *</label>
                <input
                  type="text"
                  required
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                  placeholder="e.g. Paid tea stall monthly balance"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">Transaction ID / Reference (UPI/Cash)</label>
                <input
                  type="text"
                  value={expRef}
                  onChange={(e) => setExpRef(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                  placeholder="e.g. UPI-99120938"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-expense"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold"
                >
                  Post Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Settlement Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-scaleUp">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Log Contact Payment Settlement</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleSavePayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">Settlement Direction *</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePaymentTypeSwitch('Inflow')}
                    className={`py-2 text-xs font-bold rounded-lg border text-center transition-all ${payType === 'Inflow' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                  >
                    Customer Inflow
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentTypeSwitch('Outflow')}
                    className={`py-2 text-xs font-bold rounded-lg border text-center transition-all ${payType === 'Outflow' ? 'bg-rose-50 border-rose-500 text-rose-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                  >
                    Supplier Outflow
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">
                  Select {payType === 'Inflow' ? 'Customer' : 'Supplier'} Account *
                </label>
                <select
                  value={payPartyId}
                  required
                  onChange={(e) => setPayPartyId(e.target.value)}
                  className={`mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-white font-medium text-slate-800 focus:ring-2 ${themePalette.focusRing}`}
                >
                  <option value="" disabled>-- Select Party --</option>
                  {payType === 'Inflow' 
                    ? state.customers.map(c => <option key={c.id} value={c.id}>{c.name} (Receivable: {formatCurrency(c.balance, company)})</option>)
                    : state.suppliers.map(s => <option key={s.id} value={s.id}>{s.name} (Payable: {formatCurrency(s.balance, company)})</option>)
                  }
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Amount Transacted ({company.currencySymbol}) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className={`mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none font-bold focus:ring-2 ${themePalette.focusRing}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Date of Settlement *</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">Transaction Settlement Mode *</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-white font-medium text-slate-800"
                >
                  <option value="UPI">UPI (GPay, PhonePe, Paytm)</option>
                  <option value="Bank Transfer">Bank Wire (IMPS/NEFT)</option>
                  <option value="Cash">Cash-in-hand</option>
                  <option value="Cheque">Physical Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">Reference / UPI Transaction Reference</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                  placeholder="e.g. UPI-992309112"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">Internal Ledger Note</label>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  rows={2}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                  placeholder="e.g. Clearance of previous month dues"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-payment"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold animate-pulse"
                >
                  Post Payment & Clear Dues
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
