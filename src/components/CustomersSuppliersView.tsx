import React, { useState } from 'react';
import { AppState, Customer, Supplier } from '../types';
import { Plus, Edit, Search, User, Truck, MapPin, Phone, Mail, FileText } from 'lucide-react';
import { formatCurrency, getThemePalette } from '../utils/storage';

interface CustomersSuppliersViewProps {
  state: AppState;
  onAddCustomer: (customer: Omit<Customer, 'id'>) => void;
  onEditCustomer: (customer: Customer) => void;
  onAddSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  onEditSupplier: (supplier: Supplier) => void;
}

const INDIAN_STATES = [
  { name: 'Andhra Pradesh', code: '37' },
  { name: 'Arunachal Pradesh', code: '12' },
  { name: 'Assam', code: '18' },
  { name: 'Bihar', code: '10' },
  { name: 'Chhattisgarh', code: '22' },
  { name: 'Goa', code: '30' },
  { name: 'Gujarat', code: '24' },
  { name: 'Haryana', code: '06' },
  { name: 'Himachal Pradesh', code: '02' },
  { name: 'Jharkhand', code: '20' },
  { name: 'Karnataka', code: '29' },
  { name: 'Kerala', code: '32' },
  { name: 'Madhya Pradesh', code: '23' },
  { name: 'Maharashtra', code: '27' },
  { name: 'Manipur', code: '14' },
  { name: 'Meghalaya', code: '17' },
  { name: 'Mizoram', code: '15' },
  { name: 'Nagaland', code: '13' },
  { name: 'Odisha', code: '21' },
  { name: 'Punjab', code: '03' },
  { name: 'Rajasthan', code: '08' },
  { name: 'Sikkim', code: '11' },
  { name: 'Tamil Nadu', code: '33' },
  { name: 'Telangana', code: '36' },
  { name: 'Tripura', code: '16' },
  { name: 'Uttar Pradesh', code: '09' },
  { name: 'Uttarakhand', code: '05' },
  { name: 'West Bengal', code: '19' },
  { name: 'Delhi', code: '07' },
  { name: 'Jammu & Kashmir', code: '01' },
  { name: 'Ladakh', code: '38' }
];

export default function CustomersSuppliersView({
  state, onAddCustomer, onEditCustomer, onAddSupplier, onEditSupplier
}: CustomersSuppliersViewProps) {
  const company = state.settings.company;
  const themePalette = getThemePalette(company);

  const [activeSubTab, setActiveSubTab] = useState<'customers' | 'suppliers'>('customers');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; type: 'customer' | 'supplier' } | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [stateName, setStateName] = useState('Maharashtra');
  const [stateCode, setStateCode] = useState('27');
  const [balance, setBalance] = useState(0);

  const handleStateChange = (selectedName: string) => {
    setStateName(selectedName);
    const found = INDIAN_STATES.find(s => s.name === selectedName);
    if (found) {
      setStateCode(found.code);
    }
  };

  const handleOpenModal = (type: 'customer' | 'supplier', item: any | null = null) => {
    if (item) {
      setEditingItem({ id: item.id, type });
      setName(item.name || '');
      setPhone(item.phone || '');
      setEmail(item.email || '');
      setGstin(item.gstin || '');
      setAddress(item.address || '');
      setStateName(item.state || 'Maharashtra');
      setStateCode(item.stateCode || '27');
      setBalance(item.balance ?? 0);
    } else {
      setEditingItem(null);
      setName('');
      setPhone('');
      setEmail('');
      setGstin('');
      setAddress('');
      setStateName('Maharashtra');
      setStateCode('27');
      setBalance(0);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name,
      phone,
      email,
      gstin: gstin.toUpperCase(),
      address,
      state: stateName,
      stateCode,
      balance: Number(balance)
    };

    if (editingItem) {
      if (editingItem.type === 'customer') {
        onEditCustomer({ ...payload, id: editingItem.id });
      } else {
        onEditSupplier({ ...payload, id: editingItem.id });
      }
    } else {
      if (activeSubTab === 'customers') {
        onAddCustomer(payload);
      } else {
        onAddSupplier(payload);
      }
    }

    setIsModalOpen(false);
  };

  const filteredItems = (activeSubTab === 'customers' ? state.customers : state.suppliers)
    .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    item.phone.includes(searchTerm) || 
                    item.gstin.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Contact Directories</h1>
          <p className="text-sm text-slate-500">Manage customer records, supplier profiles, and Indian state GST identifiers.</p>
        </div>
        <button
          onClick={() => handleOpenModal(activeSubTab === 'customers' ? 'customer' : 'supplier', null)}
          id="btn-add-contact"
          className={`flex items-center gap-1.5 ${themePalette.bg} hover:opacity-90 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow transition-all shrink-0`}
        >
          <Plus className="h-4 w-4" />
          Add {activeSubTab === 'customers' ? 'Customer' : 'Supplier'}
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveSubTab('customers'); setSearchTerm(''); }}
          id="tab-select-customers"
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeSubTab === 'customers' ? `border-${company.themeColor}-600 ${themePalette.text}` : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Customers ({state.customers.length})
        </button>
        <button
          onClick={() => { setActiveSubTab('suppliers'); setSearchTerm(''); }}
          id="tab-select-suppliers"
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeSubTab === 'suppliers' ? `border-${company.themeColor}-600 ${themePalette.text}` : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Suppliers ({state.suppliers.length})
        </button>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={`Search by Name, Phone, or GSTIN...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Name & Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">GSTIN No.</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Billing Address</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">State / Code</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {activeSubTab === 'customers' ? 'Receivable Balance' : 'Payable Balance'}
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 text-sm">
                    No records found matching your search.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                          {activeSubTab === 'customers' ? <User className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" />{item.phone || '—'}</span>
                            {item.email && <span className="flex items-center gap-0.5"><Mail className="h-3 w-3" />{item.email}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600 uppercase">
                      {item.gstin || (
                        <span className="text-xs text-slate-400 italic">Unregistered (URD)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                      {item.address || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="font-medium text-slate-900">{item.state}</div>
                      <div className="text-xs text-slate-400 font-mono">Code: {item.stateCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-slate-900">
                      {formatCurrency(item.balance, company)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => handleOpenModal(activeSubTab === 'customers' ? 'customer' : 'supplier', item)}
                        className={`${themePalette.text} hover:opacity-80 font-semibold inline-flex items-center gap-1`}
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Block */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">
                {editingItem ? 'Edit ' : 'Add New '} 
                {activeSubTab === 'customers' ? 'Customer' : 'Supplier'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Balaji Agencies"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="9988776655"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="name@store.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">GSTIN (15-character ID)</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  maxLength={15}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono uppercase"
                  placeholder="e.g. 27AAAAA1111A1Z1"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">State Location</label>
                <select
                  value={stateName}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {INDIAN_STATES.map(s => (
                    <option key={s.code} value={s.name}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">Street Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Detailed street and locality details..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase">
                  {activeSubTab === 'customers' ? `Opening Receivable (${company.currencySymbol})` : `Opening Payable (${company.currencySymbol})`}
                </label>
                <input
                  type="number"
                  min={0}
                  value={balance}
                  onChange={(e) => setBalance(Number(e.target.value))}
                  className={`mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 ${themePalette.focusRing}`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-contact"
                  className={`px-4 py-2 ${themePalette.bg} hover:opacity-95 text-white rounded-lg text-sm font-semibold`}
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
