import React, { useState } from 'react';
import { AppState, StockLog } from '../types';
import { Plus, Minus, Settings, Search, AlertCircle, RefreshCw, Layers } from 'lucide-react';

interface InventoryViewProps {
  state: AppState;
  onAddStockLog: (log: Omit<StockLog, 'id'>) => void;
}

export default function InventoryView({ state, onAddStockLog }: InventoryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // Form State for manual adjustment
  const [adjustProductId, setAdjustProductId] = useState(state.products[0]?.id || '');
  const [adjustType, setAdjustType] = useState<'Addition' | 'Reduction' | 'Adjustment'>('Addition');
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustNotes, setAdjustNotes] = useState('');

  const getProductStock = (prodId: string) => {
    const prod = state.products.find(p => p.id === prodId);
    if (!prod) return 0;

    const logs = state.stockLogs.filter(log => log.productId === prodId);
    const balance = prod.initialStock + logs.reduce((acc, log) => {
      if (log.type === 'Addition') return acc + log.quantity;
      if (log.type === 'Reduction') return acc - log.quantity;
      if (log.type === 'Adjustment') return acc + log.quantity; // positive/negative addition
      return acc;
    }, 0);

    return balance;
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustQty <= 0) return;

    onAddStockLog({
      productId: adjustProductId,
      date: new Date().toISOString().split('T')[0],
      type: adjustType,
      quantity: adjustType === 'Reduction' ? -Math.abs(adjustQty) : Math.abs(adjustQty),
      referenceId: 'Adjustment',
      notes: adjustNotes || 'Manual Ledger adjustment'
    });

    setAdjustQty(1);
    setAdjustNotes('');
    setIsAdjustModalOpen(false);
  };

  const filteredProducts = state.products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header and triggers */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Inventory & Stock Ledger</h1>
          <p className="text-sm text-slate-500">Perform warehouse auditing, post manual stock adjustments, and monitor alerts.</p>
        </div>
        <button
          onClick={() => {
            setAdjustProductId(state.products[0]?.id || '');
            setAdjustType('Addition');
            setIsAdjustModalOpen(true);
          }}
          id="btn-manual-adjust-stock"
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow transition-all shrink-0"
        >
          <Settings className="h-4 w-4" />
          Manual Adjustment
        </button>
      </div>

      {/* KPI stock summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-lg">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Total SKU Catalog</span>
            <p className="text-xl font-extrabold text-slate-900">{state.products.length} Products</p>
          </div>
        </div>

        <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 text-amber-800 rounded-lg">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Low Stock Warnings</span>
            <p className="text-xl font-extrabold text-slate-900">
              {state.products.filter(p => getProductStock(p.id) <= p.minStockAlert).length} Items
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-slate-200 text-slate-800 rounded-lg">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Total Historical Adjustments</span>
            <p className="text-xl font-extrabold text-slate-900">{state.stockLogs.length} Events</p>
          </div>
        </div>
      </div>

      {/* Auditing Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter stock catalog by SKU or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Product SKU</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Product Title</th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Min Alert Limit</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Current Stock Balance</th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm">
                    No matching catalog products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const currentStock = getProductStock(p.id);
                  const isLow = currentStock <= p.minStockAlert;
                  const isOut = currentStock === 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-bold text-slate-500 uppercase">
                        {p.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 text-sm">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">HSN Code: {p.hsnCode || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-slate-500 text-sm">
                        {p.minStockAlert}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-black text-slate-900 text-sm">
                        {currentStock.toLocaleString('en-IN')} units
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isOut ? 'bg-red-50 text-red-800' :
                          isLow ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'
                        }`}>
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Good Level'}
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

      {/* Historical Stock Logs */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-950 text-sm uppercase tracking-wider">Historical Stock Movement Ledger</h3>
        </div>
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
          <table className="min-w-full text-xs text-left divide-y divide-slate-100">
            <thead className="bg-slate-50 font-bold text-slate-500 uppercase">
              <tr>
                <th className="p-3">Event Date</th>
                <th className="p-3">Product Name</th>
                <th className="p-3">Event Action Type</th>
                <th className="p-3 text-right">Quantity</th>
                <th className="p-3">Audit Reference ID</th>
                <th className="p-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...state.stockLogs].reverse().map((log) => {
                const prodName = state.products.find(p => p.id === log.productId)?.name || 'Removed Product';
                return (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono text-slate-500">{log.date}</td>
                    <td className="p-3 font-semibold text-slate-800">{prodName}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.type === 'Addition' ? 'bg-emerald-50 text-emerald-800' :
                        log.type === 'Reduction' ? 'bg-rose-50 text-rose-800' : 'bg-indigo-50 text-indigo-800'
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className={`p-3 text-right font-bold ${log.quantity >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {log.quantity >= 0 ? `+${log.quantity}` : log.quantity}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-400">{log.referenceId}</td>
                    <td className="p-3 text-slate-600 italic">{log.notes}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-scaleUp">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Perform Manual Stock Audit</h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveAdjustment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">Audit Target Product *</label>
                <select
                  value={adjustProductId}
                  onChange={(e) => setAdjustProductId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none"
                >
                  {state.products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">Adjustment Event Action *</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('Addition')}
                    className={`py-2 text-xs font-bold rounded-lg border text-center transition-all ${adjustType === 'Addition' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                  >
                    Add / Replenish Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('Reduction')}
                    className={`py-2 text-xs font-bold rounded-lg border text-center transition-all ${adjustType === 'Reduction' ? 'bg-rose-50 border-rose-500 text-rose-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                  >
                    Reduce / Audit Reduction
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">Audit Quantity *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">Audit Explanation / Notes *</label>
                <input
                  type="text"
                  required
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                  placeholder="e.g. Audit correction, spoiled inventory, sample, etc."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-audit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold"
                >
                  Commit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
