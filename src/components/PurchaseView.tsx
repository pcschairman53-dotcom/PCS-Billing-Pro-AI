import React, { useState, useEffect } from 'react';
import { AppState, PurchaseEntry, PurchaseItem, Supplier, Product } from '../types';
import { Plus, Trash, ArrowLeft, CheckCircle, ListPlus, FolderOpen } from 'lucide-react';
import { formatCurrency, getBusinessConfig, getThemePalette } from '../utils/storage';

interface PurchaseViewProps {
  state: AppState;
  onAddPurchase: (purchase: Omit<PurchaseEntry, 'id'>) => void;
}

export default function PurchaseView({ state, onAddPurchase }: PurchaseViewProps) {
  const company = state.settings.company;
  const themePalette = getThemePalette(company);
  const bizConfig = getBusinessConfig(company);

  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [billNumber, setBillNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<Omit<PurchaseItem, 'subTotal' | 'cgst' | 'sgst' | 'igst' | 'total'>[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Unpaid' | 'Partial'>('Paid');
  const [amountPaid, setAmountPaid] = useState(0);
  const [notes, setNotes] = useState('');

  // Item list temp states
  const [tempProductId, setTempProductId] = useState('');
  const [tempQuantity, setTempQuantity] = useState(1);
  const [tempPrice, setTempPrice] = useState(0);

  // Fill default values
  useEffect(() => {
    if (isCreating) {
      setBillNumber('');
      setSupplierId(state.suppliers[0]?.id || '');
      setItems([]);
      setPaymentStatus('Paid');
      setAmountPaid(0);
      setNotes('');
    }
  }, [isCreating, state.suppliers]);

  const handleTempProductChange = (prodId: string) => {
    setTempProductId(prodId);
    const prod = state.products.find(p => p.id === prodId);
    if (prod) {
      setTempPrice(prod.purchasePrice);
    }
  };

  useEffect(() => {
    if (state.products.length > 0 && !tempProductId) {
      handleTempProductChange(state.products[0].id);
    }
  }, [state.products, tempProductId]);

  const handleAddItem = () => {
    if (!tempProductId) return;
    const prod = state.products.find(p => p.id === tempProductId);
    if (!prod) return;

    const existingIdx = items.findIndex(it => it.productId === tempProductId);
    if (existingIdx !== -1) {
      const updated = [...items];
      updated[existingIdx].quantity += Number(tempQuantity);
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          productId: tempProductId,
          name: prod.name,
          hsnCode: prod.hsnCode,
          quantity: Number(tempQuantity),
          price: Number(tempPrice),
          gstRate: prod.gstRate
        }
      ]);
    }

    setTempQuantity(1);
    if (state.products.length > 0) {
      handleTempProductChange(state.products[0].id);
    }
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  // Determine State tax mapping (CGST + SGST vs IGST) for purchases
  const getTaxCalculations = () => {
    const supplier = state.suppliers.find(s => s.id === supplierId);
    const isInterState = supplier ? supplier.stateCode !== state.settings.company.stateCode : false;

    let subTotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const computedItems: PurchaseItem[] = items.map(item => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const gstRate = Number(item.gstRate) || 0;

      const itemSub = qty * price;
      const gstAmt = (itemSub * gstRate) / 100;
      let cgst = 0, sgst = 0, igst = 0;

      if (isInterState) {
        igst = gstAmt;
      } else {
        cgst = gstAmt / 2;
        sgst = gstAmt / 2;
      }

      subTotal += itemSub;
      cgstTotal += cgst;
      sgstTotal += sgst;
      igstTotal += igst;

      return {
        ...item,
        subTotal: itemSub,
        cgst,
        sgst,
        igst,
        total: itemSub + gstAmt
      };
    });

    const totalAmount = Math.round((subTotal || 0) + (cgstTotal || 0) + (sgstTotal || 0) + (igstTotal || 0));

    return {
      computedItems,
      subTotal: isNaN(subTotal) ? 0 : subTotal,
      cgstTotal: isNaN(cgstTotal) ? 0 : cgstTotal,
      sgstTotal: isNaN(sgstTotal) ? 0 : sgstTotal,
      igstTotal: isNaN(igstTotal) ? 0 : igstTotal,
      totalAmount: isNaN(totalAmount) ? 0 : totalAmount
    };
  };

  const calculations = getTaxCalculations();

  useEffect(() => {
    if (paymentStatus === 'Paid') {
      setAmountPaid(calculations.totalAmount || 0);
    } else if (paymentStatus === 'Unpaid') {
      setAmountPaid(0);
    }
  }, [calculations.totalAmount, paymentStatus]);

  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billNumber.trim()) {
      alert("Please provide the Supplier's Bill Number.");
      return;
    }
    if (!supplierId) {
      alert("Please choose a supplier.");
      return;
    }
    if (items.length === 0) {
      alert("Please specify product lines purchased.");
      return;
    }

    onAddPurchase({
      billNumber,
      date,
      supplierId,
      items: calculations.computedItems,
      subTotal: calculations.subTotal,
      cgstTotal: calculations.cgstTotal,
      sgstTotal: calculations.sgstTotal,
      igstTotal: calculations.igstTotal,
      totalAmount: calculations.totalAmount,
      paymentStatus,
      amountPaid: Number(amountPaid),
      notes
    });

    setIsCreating(false);
  };

  return (
    <div className="space-y-6">
      {isCreating ? (
        <form onSubmit={handleSubmitPurchase} className="space-y-6" id="purchase-entry-form">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Record Supplier Purchase</h2>
              <p className="text-xs text-slate-500">Log inward material stock and record input tax credit (ITC) eligibility.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold text-xs border border-slate-200 bg-white px-3 py-1.5 rounded-lg"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel Draft
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Supplier and Invoice identifiers */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Bill / Invoice No. *</label>
                  <input
                    type="text"
                    required
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. B-90112"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Purchase Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Supplier *</label>
                  <select
                    value={supplierId}
                    required
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="" disabled>-- Select Supplier --</option>
                    {state.suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.state})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items compilation block */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">Add Line Items</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Select {bizConfig.productLabel} *</label>
                    <select
                      value={tempProductId}
                      onChange={(e) => handleTempProductChange(e.target.value)}
                      className={`mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 ${themePalette.focusRing} bg-white`}
                    >
                      {state.products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (GST: {p.gstRate}%)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Purchase Cost ({company.currencySymbol})</label>
                    <input
                      type="number"
                      min={0}
                      value={tempPrice}
                      onChange={(e) => setTempPrice(Number(e.target.value))}
                      className={`mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 ${themePalette.focusRing}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Qty Received</label>
                    <input
                      type="number"
                      min={1}
                      value={tempQuantity}
                      onChange={(e) => setTempQuantity(Number(e.target.value))}
                      className={`mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 ${themePalette.focusRing}`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    id="btn-add-purchase-item"
                    className={`md:col-span-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex justify-center items-center gap-1`}
                  >
                    <Plus className="h-4 w-4" />
                    Incorporate Line Item
                  </button>
                </div>

                {/* Items Listing table */}
                <div className="border border-slate-100 rounded-lg overflow-hidden">
                  <table className="min-w-full text-xs text-left divide-y divide-slate-100">
                    <thead className="bg-slate-50 font-bold text-slate-600">
                      <tr>
                        <th className="p-3">{bizConfig.productLabel} Description</th>
                        <th className="p-3">Qty</th>
                        <th className="p-3">Purchase Price</th>
                        <th className="p-3">GST Rate</th>
                        <th className="p-3 text-right">Subtotal</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-400 italic">No items logged in purchase invoice draft.</td>
                        </tr>
                      ) : (
                        items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-900">{item.name}</td>
                            <td className="p-3">{item.quantity}</td>
                            <td className="p-3">{formatCurrency(item.price, company)}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full ${themePalette.lightBg} ${themePalette.text} font-bold text-[10px]`}>
                                {item.gstRate}%
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold">
                              {formatCurrency(item.quantity * item.price, company)}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-rose-600 hover:text-rose-700 font-semibold"
                              >
                                <Trash className="h-4 w-4 inline" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Calculations and payment info */}
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">Financial Valuation</h3>

                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Taxable Value:</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(calculations.subTotal, company)}</span>
                  </div>
                  {calculations.cgstTotal > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Input CGST:</span>
                      <span>{formatCurrency(calculations.cgstTotal, company, true)}</span>
                    </div>
                  )}
                  {calculations.sgstTotal > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Input SGST:</span>
                      <span>{formatCurrency(calculations.sgstTotal, company, true)}</span>
                    </div>
                  )}
                  {calculations.igstTotal > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Input IGST:</span>
                      <span>{formatCurrency(calculations.igstTotal, company, true)}</span>
                    </div>
                  )}

                  <hr className="border-slate-100" />

                  <div className="flex justify-between text-base font-black text-slate-900">
                    <span>Bill Amount ({company.currencyCode}):</span>
                    <span>{formatCurrency(calculations.totalAmount, company)}</span>
                  </div>
                </div>
              </div>

              {/* Settlement Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">Stock Purchase Settlement</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Payment Status *</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as any)}
                      className={`mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none bg-white focus:ring-2 ${themePalette.focusRing}`}
                    >
                      <option value="Paid">Fully Paid</option>
                      <option value="Partial">Partially Paid</option>
                      <option value="Unpaid">Unpaid / Account Payable</option>
                    </select>
                  </div>

                  {paymentStatus !== 'Unpaid' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase">Amount Disbursed ({company.currencySymbol})</label>
                      <input
                        type="number"
                        min={0}
                        max={calculations.totalAmount || 0}
                        value={isNaN(amountPaid) ? "" : amountPaid}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setAmountPaid(isNaN(val) ? 0 : val);
                        }}
                        className={`mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 ${themePalette.focusRing}`}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Reference Details</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none"
                      placeholder="e.g. Sent via Bank transfer or cash confirmation"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-post-purchase-bill"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-lg shadow transition-all flex justify-center items-center gap-1.5"
                >
                  <CheckCircle className="h-4 w-4" />
                  Commit Inward Purchase
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        /* Purchase Ledger History Table */
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">GST Purchase Ledger</h2>
              <p className="text-xs text-slate-500">Track inward receipts from suppliers and verify Input Tax Credit (ITC) entries.</p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              id="btn-create-purchase-draft"
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow transition-all"
            >
              <Plus className="h-4 w-4" />
              Log Purchase Entry
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Bill Number</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Supplier</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">ITC Tax Credit</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Invoice Amount</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Settlement</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.purchases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-400 text-sm">
                        No purchase bills logged. Record your purchases to load inventory and claim ITC.
                      </td>
                    </tr>
                  ) : (
                    [...state.purchases].reverse().map((p) => {
                      const supplier = state.suppliers.find(s => s.id === p.supplierId);
                      const itcTotal = p.cgstTotal + p.sgstTotal + p.igstTotal;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold font-mono text-slate-900">
                            {p.billNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500">
                            {p.date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">
                            {supplier?.name || 'Unknown Supplier'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-indigo-600 font-medium">
                            {formatCurrency(itcTotal, company)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right text-slate-900">
                            {formatCurrency(p.totalAmount, company)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              p.paymentStatus === 'Paid' ? `${themePalette.lightBg} ${themePalette.text}` :
                              p.paymentStatus === 'Partial' ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-800'
                            }`}>
                              {p.paymentStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                            {p.notes || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
