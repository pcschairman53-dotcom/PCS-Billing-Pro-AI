import React, { useState, useEffect } from 'react';
import { AppState, SalesInvoice, InvoiceItem, Customer, Product } from '../types';
import { Plus, Trash, Printer, ArrowLeft, Download, ShoppingCart, Percent, User, FileText, CheckCircle } from 'lucide-react';
import { formatCurrency, getBusinessConfig, getThemePalette } from '../utils/storage';

interface SalesViewProps {
  state: AppState;
  onAddSalesInvoice: (invoice: Omit<SalesInvoice, 'id'>) => void;
}

export default function SalesView({ state, onAddSalesInvoice }: SalesViewProps) {
  const company = state.settings.company;
  const themePalette = getThemePalette(company);
  const bizConfig = getBusinessConfig(company);

  const [isCreating, setIsCreating] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<SalesInvoice | null>(null);

  // Form State for New Invoice
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<Omit<InvoiceItem, 'subTotal' | 'cgst' | 'sgst' | 'igst' | 'total'>[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Unpaid' | 'Partial'>('Paid');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [amountPaid, setAmountPaid] = useState(0);
  const [notes, setNotes] = useState('');

  // Item form line input temp states
  const [tempProductId, setTempProductId] = useState('');
  const [tempQuantity, setTempQuantity] = useState(1);
  const [tempPrice, setTempPrice] = useState(0);
  const [tempDiscountPercent, setTempDiscountPercent] = useState(0);

  // Load auto-generated invoice number on start
  useEffect(() => {
    if (isCreating) {
      const year = new Date().getFullYear();
      const count = state.sales.length + 1;
      setInvoiceNumber(`INV-${year}-${String(count).padStart(3, '0')}`);
      setCustomerId(state.customers[0]?.id || '');
      setItems([]);
      setDiscount(0);
      setPaymentStatus('Paid');
      setPaymentMethod('UPI');
      setAmountPaid(0);
      setNotes('');
    }
  }, [isCreating, state.sales.length]);

  // Handle selected product change to pre-fill prices
  const handleTempProductChange = (prodId: string) => {
    setTempProductId(prodId);
    const prod = state.products.find(p => p.id === prodId);
    if (prod) {
      setTempPrice(prod.salesPrice);
    }
  };

  // Pre-fill first product on item state reset
  useEffect(() => {
    if (state.products.length > 0 && !tempProductId) {
      handleTempProductChange(state.products[0].id);
    }
  }, [state.products, tempProductId]);

  const handleAddItem = () => {
    if (!tempProductId) return;
    const prod = state.products.find(p => p.id === tempProductId);
    if (!prod) return;

    // Check if item already exists in list
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
          gstRate: prod.gstRate,
          discountPercent: Number(tempDiscountPercent)
        }
      ]);
    }

    // Reset item input
    setTempQuantity(1);
    if (state.products.length > 0) {
      handleTempProductChange(state.products[0].id);
    }
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  // Determine State tax mapping (CGST + SGST vs IGST)
  const getTaxCalculations = () => {
    const selectedCustomer = state.customers.find(c => c.id === customerId);
    const isInterState = selectedCustomer ? selectedCustomer.stateCode !== state.settings.company.stateCode : false;

    let subTotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const computedItems: InvoiceItem[] = items.map(item => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const discountPercent = Number(item.discountPercent) || 0;
      const gstRate = Number(item.gstRate) || 0;

      const itemSub = qty * price;
      const itemDisc = (itemSub * discountPercent) / 100;
      const taxableVal = itemSub - itemDisc;

      const gstAmt = (taxableVal * gstRate) / 100;
      let cgst = 0, sgst = 0, igst = 0;

      if (isInterState) {
        igst = gstAmt;
      } else {
        cgst = gstAmt / 2;
        sgst = gstAmt / 2;
      }

      subTotal += taxableVal;
      cgstTotal += cgst;
      sgstTotal += sgst;
      igstTotal += igst;

      return {
        ...item,
        subTotal: taxableVal,
        cgst,
        sgst,
        igst,
        total: taxableVal + gstAmt
      };
    });

    const discountVal = Number(discount) || 0;
    const totalAmount = Math.round((subTotal || 0) + (cgstTotal || 0) + (sgstTotal || 0) + (igstTotal || 0) - discountVal);

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

  // Set default amount paid when total amount changes and status is "Paid"
  useEffect(() => {
    if (paymentStatus === 'Paid') {
      setAmountPaid(calculations.totalAmount || 0);
    } else if (paymentStatus === 'Unpaid') {
      setAmountPaid(0);
    }
  }, [calculations.totalAmount, paymentStatus]);

  const handleSubmitInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      alert("Please select a customer.");
      return;
    }
    if (items.length === 0) {
      alert("Please add at least one product item to the invoice.");
      return;
    }

    // Validate duplicate invoice number
    if (state.sales.some(s => s.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase())) {
      alert("Invoice Number already exists! Please use a unique number.");
      return;
    }

    onAddSalesInvoice({
      invoiceNumber,
      date,
      customerId,
      items: calculations.computedItems,
      subTotal: calculations.subTotal,
      cgstTotal: calculations.cgstTotal,
      sgstTotal: calculations.sgstTotal,
      igstTotal: calculations.igstTotal,
      discount,
      totalAmount: calculations.totalAmount,
      paymentStatus,
      paymentMethod,
      amountPaid: Number(amountPaid),
      notes
    });

    setIsCreating(false);
  };

  const handlePrint = (invoice: SalesInvoice) => {
    setActiveInvoice(invoice);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-6">
      {activeInvoice ? (
        /* Detailed View / Print Preview Block */
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg max-w-4xl mx-auto space-y-6 print:p-0 print:border-none print:shadow-none" id="invoice-print-area">
          {/* Header Action Row (Hidden on print) */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 print:hidden">
            <button 
              onClick={() => setActiveInvoice(null)}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-sm font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sales History
            </button>
            <div className="flex gap-2">
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Printer className="h-4 w-4" />
                Print Invoice
              </button>
            </div>
          </div>

          {/* Actual Tax Invoice Document */}
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div className="flex gap-4 items-start">
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt="Logo" className="h-14 object-contain rounded-lg border border-slate-100 bg-slate-50 p-1" referrerPolicy="no-referrer" />
                ) : (
                  <div className={`h-14 w-14 rounded-lg ${themePalette.bg} text-white font-black flex items-center justify-center text-xl`}>
                    {company.name ? company.name.charAt(0).toUpperCase() : 'P'}
                  </div>
                )}
                <div>
                  <span className={`text-xs uppercase tracking-widest font-extrabold ${themePalette.text} ${themePalette.lightBg} px-2.5 py-1 rounded-full border ${themePalette.border}`}>
                    {company.invoiceHeader || 'Tax Invoice'}
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 mt-2">{company.name}</h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">{company.address}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    <strong>GSTIN:</strong> {company.gstin} • <strong>State:</strong> {company.state} ({company.stateCode})
                  </p>
                  <p className="text-xs text-slate-500"><strong>Contact:</strong> {company.phone} • {company.email}</p>
                </div>
              </div>

              <div className="text-right">
                <h3 className="text-xl font-bold font-mono text-slate-800">{activeInvoice.invoiceNumber}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Date: {activeInvoice.date}</p>
                <div className={`mt-3 inline-block bg-slate-100 px-3 py-1 rounded text-xs font-bold text-slate-800`}>
                  Payment: {activeInvoice.paymentStatus.toUpperCase()} ({activeInvoice.paymentMethod})
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Bill To Customer Section */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Billed To:</p>
              {(() => {
                const cust = state.customers.find(c => c.id === activeInvoice.customerId);
                return cust ? (
                  <div className="mt-1 text-xs text-slate-700">
                    <p className="font-extrabold text-sm text-slate-900">{cust.name}</p>
                    <p className="mt-0.5">{cust.address}</p>
                    <p className="mt-0.5"><strong>GSTIN:</strong> {cust.gstin || 'Unregistered (URD)'} • <strong>State:</strong> {cust.state} ({cust.stateCode})</p>
                    <p><strong>Phone:</strong> {cust.phone}</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Unknown Customer</p>
                );
              })()}
            </div>

            {/* Items Table */}
            <table className="min-w-full text-xs text-left divide-y divide-slate-200 border border-slate-100">
              <thead className="bg-slate-50 font-bold text-slate-600">
                <tr>
                  <th className="p-2.5">Item Description</th>
                  <th className="p-2.5">HSN</th>
                  <th className="p-2.5 text-right">Qty</th>
                  <th className="p-2.5 text-right">Unit Price</th>
                  <th className="p-2.5 text-center">GST %</th>
                  <th className="p-2.5 text-right">CGST</th>
                  <th className="p-2.5 text-right">SGST</th>
                  <th className="p-2.5 text-right">IGST</th>
                  <th className="p-2.5 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeInvoice.items.map((it, i) => (
                  <tr key={i} className="hover:bg-slate-50/30">
                    <td className="p-2.5 font-medium text-slate-900">{it.name}</td>
                    <td className="p-2.5 font-mono text-slate-500">{it.hsnCode || '—'}</td>
                    <td className="p-2.5 text-right">{it.quantity}</td>
                    <td className="p-2.5 text-right">{formatCurrency(it.price, company)}</td>
                    <td className="p-2.5 text-center">{it.gstRate}%</td>
                    <td className="p-2.5 text-right text-slate-500">{formatCurrency(it.cgst, company, true)}</td>
                    <td className="p-2.5 text-right text-slate-500">{formatCurrency(it.sgst, company, true)}</td>
                    <td className="p-2.5 text-right text-slate-500">{formatCurrency(it.igst, company, true)}</td>
                    <td className="p-2.5 text-right font-semibold">{formatCurrency(it.total, company)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Financial Summary Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                {activeInvoice.notes && (
                  <div className="bg-slate-50 p-3 rounded text-[11px] text-slate-500 border border-slate-100">
                    <strong>Invoice Notes:</strong> {activeInvoice.notes}
                  </div>
                )}
                {/* Bank / UPI QR Placement placeholder */}
                <div className={`p-3 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-700 flex justify-between items-center`}>
                  <div>
                    <h5 className="font-bold text-slate-900">Bank Settlement Details</h5>
                    <p className="mt-0.5">Bank: {company.bankName}</p>
                    <p>A/c: {company.accountNo} • IFSC: {company.ifsc}</p>
                  </div>
                  {company.qrCodeData && (
                    <div className="bg-white p-1 rounded border border-slate-200 flex items-center justify-center shrink-0">
                      {/* Generates placeholder for real-world UPI scans */}
                      <span className="text-[9px] text-slate-400 font-mono font-bold w-12 h-12 text-center flex items-center leading-none">Scan QR Ready</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Math totals columns */}
              <div className="space-y-1 text-xs text-right border-t border-slate-100 md:border-t-0 pt-4 md:pt-0">
                <div className="flex justify-between">
                  <span className="text-slate-400">Taxable Value Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(activeInvoice.subTotal, company)}</span>
                </div>
                {activeInvoice.cgstTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Add CGST total:</span>
                    <span>{formatCurrency(activeInvoice.cgstTotal, company, true)}</span>
                  </div>
                )}
                {activeInvoice.sgstTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Add SGST total:</span>
                    <span>{formatCurrency(activeInvoice.sgstTotal, company, true)}</span>
                  </div>
                )}
                {activeInvoice.igstTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Add IGST total:</span>
                    <span>{formatCurrency(activeInvoice.igstTotal, company, true)}</span>
                  </div>
                )}
                {activeInvoice.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(activeInvoice.discount, company)}</span>
                  </div>
                )}
                <hr className="border-slate-100 my-1" />
                <div className="flex justify-between text-base font-black text-slate-900">
                  <span>Grand Total (Rounded):</span>
                  <span>{formatCurrency(activeInvoice.totalAmount, company)}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-600 font-bold pt-1">
                  <span>Amount Received:</span>
                  <span>{formatCurrency(activeInvoice.amountPaid, company)}</span>
                </div>
                {activeInvoice.totalAmount - activeInvoice.amountPaid > 0 && (
                  <div className="flex justify-between text-xs text-rose-600 font-bold">
                    <span>Outstanding Ledger balance:</span>
                    <span>{formatCurrency(activeInvoice.totalAmount - activeInvoice.amountPaid, company)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Declaration signatures */}
            <div className="pt-8 flex justify-between items-end text-[10px] text-slate-400">
              <div className="max-w-md">
                <p><strong>Declaration:</strong> We declare that this invoice shows the actual price of the goods</p>
                <p>described and that all particulars are true and correct.</p>
                {company.invoiceFooter && (
                  <p className="mt-2 text-[9px] text-slate-500 italic font-medium leading-relaxed bg-slate-50 border border-slate-100 p-2 rounded">
                    <strong>Terms & Footnotes:</strong> {company.invoiceFooter}
                  </p>
                )}
              </div>
              <div className="text-center border-t border-slate-200 pt-3 w-48 shrink-0 text-slate-800">
                <p className="font-bold">{company.name}</p>
                <p className="text-[8px] text-slate-400 mt-6">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>
      ) : isCreating ? (
        /* Create New Invoice Workspace Form */
        <form onSubmit={handleSubmitInvoice} className="space-y-6" id="sales-invoice-form">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Draft New Tax Invoice</h2>
              <p className="text-xs text-slate-500">Select customer, compile line items, and generate compliant invoices.</p>
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
            {/* Left Block - Metadata and Items Builder */}
            <div className="lg:col-span-2 space-y-6">
              {/* Metadata Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Select Customer *</label>
                  <select
                    value={customerId}
                    required
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="" disabled>-- Select Customer --</option>
                    {state.customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.state})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Entry Form block */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">Add Line Items</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
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
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Sales Price ({company.currencySymbol})</label>
                    <input
                      type="number"
                      min={0}
                      value={tempPrice}
                      onChange={(e) => setTempPrice(Number(e.target.value))}
                      className={`mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 ${themePalette.focusRing}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={tempQuantity}
                      onChange={(e) => setTempQuantity(Number(e.target.value))}
                      className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    id="btn-add-item-to-list"
                    className="py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex justify-center items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Insert Item
                  </button>
                </div>

                {/* Entered Items Listing */}
                <div className="border border-slate-100 rounded-lg overflow-hidden">
                  <table className="min-w-full text-xs text-left divide-y divide-slate-100">
                    <thead className="bg-slate-50 font-bold text-slate-600">
                      <tr>
                        <th className="p-3">{bizConfig.productLabel} Name</th>
                        <th className="p-3">Qty</th>
                        <th className="p-3">Unit Price</th>
                        <th className="p-3">GST Rate</th>
                        <th className="p-3 text-right">Subtotal</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-400 italic">No items added to invoice draft.</td>
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

            {/* Right Block - GST Calculation Summary and Payment Options */}
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">Compliance & Totals</h3>

                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Taxable Subtotal:</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(calculations.subTotal, company)}</span>
                  </div>
                  {calculations.cgstTotal > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>CGST (Central Tax):</span>
                      <span>{formatCurrency(calculations.cgstTotal, company, true)}</span>
                    </div>
                  )}
                  {calculations.sgstTotal > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>SGST (State Tax):</span>
                      <span>{formatCurrency(calculations.sgstTotal, company, true)}</span>
                    </div>
                  )}
                  {calculations.igstTotal > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>IGST (Integrated Tax):</span>
                      <span>{formatCurrency(calculations.igstTotal, company, true)}</span>
                    </div>
                  )}

                  <hr className="border-slate-100" />

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Additional Discount ({company.currencySymbol})</label>
                    <input
                      type="number"
                      min={0}
                      value={isNaN(discount) ? "" : discount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setDiscount(isNaN(val) ? 0 : val);
                      }}
                      className={`block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 ${themePalette.focusRing}`}
                    />
                  </div>

                  <hr className="border-slate-100" />

                  <div className="flex justify-between text-base font-black text-slate-900">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(calculations.totalAmount, company)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Settlement Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">Settlement Info</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Payment Status *</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as any)}
                      className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none bg-white"
                    >
                      <option value="Paid">Fully Paid</option>
                      <option value="Partial">Partially Paid</option>
                      <option value="Unpaid">Unpaid / Credit</option>
                    </select>
                  </div>

                  {paymentStatus !== 'Unpaid' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase">Payment Method *</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none bg-white"
                        >
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI Payment</option>
                          <option value="Bank Transfer">Bank Transfer / IMPS</option>
                          <option value="Cheque">Bank Cheque</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase">Amount Received ({company.currencySymbol})</label>
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
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Internal Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none"
                      placeholder="e.g. Received via GPay UPI transaction"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-generate-invoice"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-lg shadow-md transition-all flex justify-center items-center gap-1.5"
                >
                  <CheckCircle className="h-4 w-4" />
                  Finalize & Post Invoice
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        /* Sales Invoices List View */
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">GST Sales Register</h2>
              <p className="text-xs text-slate-500">History of dispatched invoices and customer outstanding ledgers.</p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              id="btn-create-invoice-draft"
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow transition-all"
            >
              <Plus className="h-4 w-4" />
              Create Sales Invoice
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Invoice Number</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Customer</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Total Tax Charged</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Total Invoice Amount</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Payment Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.sales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-400 text-sm">
                        No sales invoices drafted. Create your first invoice above!
                      </td>
                    </tr>
                  ) : (
                    [...state.sales].reverse().map((invoice) => {
                      const customer = state.customers.find(c => c.id === invoice.customerId);
                      const taxTotal = invoice.cgstTotal + invoice.sgstTotal + invoice.igstTotal;
                      return (
                        <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold font-mono text-slate-900">
                            {invoice.invoiceNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500">
                            {invoice.date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">
                            {customer?.name || 'Walk-in Customer'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-500">
                            {formatCurrency(taxTotal, company)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right text-slate-900">
                            {formatCurrency(invoice.totalAmount, company)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              invoice.paymentStatus === 'Paid' ? `${themePalette.lightBg} ${themePalette.text}` :
                              invoice.paymentStatus === 'Partial' ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-800'
                            }`}>
                              {invoice.paymentStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <button
                              onClick={() => handlePrint(invoice)}
                              className={`${themePalette.text} hover:opacity-80 font-semibold inline-flex items-center gap-1`}
                            >
                              <Printer className="h-4 w-4" />
                              Invoice PDF / Print
                            </button>
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
