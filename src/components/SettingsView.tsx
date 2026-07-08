import React, { useState } from 'react';
import { AppState, Company, Settings } from '../types';
import { getGoogleAppsScriptTemplate } from '../utils/storage';
import { Save, RefreshCw, Copy, Check, Database, Eye, EyeOff } from 'lucide-react';

interface SettingsViewProps {
  state: AppState;
  onUpdateCompany: (company: Company) => void;
  onUpdateSettings: (settings: Settings) => void;
  onTriggerSync: () => Promise<{ success: boolean; message: string }>;
  onTriggerFetch: () => Promise<{ success: boolean; message: string }>;
}

export default function SettingsView({
  state, onUpdateCompany, onUpdateSettings, onTriggerSync, onTriggerFetch
}: SettingsViewProps) {
  const [compName, setCompName] = useState(state.settings.company.name || '');
  const [compGstin, setCompGstin] = useState(state.settings.company.gstin || '');
  const [compPhone, setCompPhone] = useState(state.settings.company.phone || '');
  const [compEmail, setCompEmail] = useState(state.settings.company.email || '');
  const [compAddress, setCompAddress] = useState(state.settings.company.address || '');
  const [compState, setCompState] = useState(state.settings.company.state || '');
  const [compStateCode, setCompStateCode] = useState(state.settings.company.stateCode || '');
  const [compBank, setCompBank] = useState(state.settings.company.bankName || '');
  const [compAccount, setCompAccount] = useState(state.settings.company.accountNo || '');
  const [compIfsc, setCompIfsc] = useState(state.settings.company.ifsc || '');
  const [compUpi, setCompUpi] = useState(state.settings.company.qrCodeData || '');
  const [compLogoUrl, setCompLogoUrl] = useState(state.settings.company.logoUrl || '');
  const [compInvoiceHeader, setCompInvoiceHeader] = useState(state.settings.company.invoiceHeader || 'TAX INVOICE');
  const [compInvoiceFooter, setCompInvoiceFooter] = useState(state.settings.company.invoiceFooter || '');
  const [compThemeColor, setCompThemeColor] = useState(state.settings.company.themeColor || 'emerald');
  const [compCurrencySymbol, setCompCurrencySymbol] = useState(state.settings.company.currencySymbol || '₹');
  const [compCurrencyCode, setCompCurrencyCode] = useState(state.settings.company.currencyCode || 'INR');
  const [compBusinessType, setCompBusinessType] = useState(state.settings.company.businessType || 'Retail Business');

  // Sync settings states
  const [scriptUrl, setScriptUrl] = useState(state.settings.appsScriptUrl || '');
  const [useSheets, setUseSheets] = useState(state.settings.useGoogleSheets || false);

  // Synchronize local form states with global state updates
  React.useEffect(() => {
    setCompName(state.settings.company.name || '');
    setCompGstin(state.settings.company.gstin || '');
    setCompPhone(state.settings.company.phone || '');
    setCompEmail(state.settings.company.email || '');
    setCompAddress(state.settings.company.address || '');
    setCompState(state.settings.company.state || '');
    setCompStateCode(state.settings.company.stateCode || '');
    setCompBank(state.settings.company.bankName || '');
    setCompAccount(state.settings.company.accountNo || '');
    setCompIfsc(state.settings.company.ifsc || '');
    setCompUpi(state.settings.company.qrCodeData || '');
    setCompLogoUrl(state.settings.company.logoUrl || '');
    setCompInvoiceHeader(state.settings.company.invoiceHeader || 'TAX INVOICE');
    setCompInvoiceFooter(state.settings.company.invoiceFooter || '');
    setCompThemeColor(state.settings.company.themeColor || 'emerald');
    setCompCurrencySymbol(state.settings.company.currencySymbol || '₹');
    setCompCurrencyCode(state.settings.company.currencyCode || 'INR');
    setCompBusinessType(state.settings.company.businessType || 'Retail Business');
    setScriptUrl(state.settings.appsScriptUrl || '');
    setUseSheets(state.settings.useGoogleSheets || false);
  }, [state.settings]);

  // Statuses
  const [isCopied, setIsCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [syncStatusError, setSyncStatusError] = useState(false);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(getGoogleAppsScriptTemplate());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCompany({
      name: compName,
      gstin: compGstin.toUpperCase(),
      phone: compPhone,
      email: compEmail,
      address: compAddress,
      state: compState,
      stateCode: compStateCode,
      bankName: compBank,
      accountNo: compAccount,
      ifsc: compIfsc.toUpperCase(),
      qrCodeData: compUpi,
      logoUrl: compLogoUrl,
      invoiceHeader: compInvoiceHeader,
      invoiceFooter: compInvoiceFooter,
      themeColor: compThemeColor,
      currencySymbol: compCurrencySymbol,
      currencyCode: compCurrencyCode.toUpperCase(),
      businessType: compBusinessType
    });
    alert("White label configuration committed successfully!");
  };

  const handleSaveSyncSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      company: state.settings.company,
      appsScriptUrl: scriptUrl,
      sheetId: "",
      useGoogleSheets: useSheets
    });
    alert("Google Sheets server configuration saved.");
  };

  const handleSyncPushNow = async () => {
    setIsSyncing(true);
    setSyncStatusMsg("Synchronizing local catalog & sales invoices to Google Sheets database...");
    setSyncStatusError(false);

    const result = await onTriggerSync();
    setIsSyncing(false);
    setSyncStatusMsg(result.message);
    if (!result.success) {
      setSyncStatusError(true);
    }
  };

  const handleSyncPullNow = async () => {
    setIsSyncing(true);
    setSyncStatusMsg("Fetching latest records and company variables from Google Sheets...");
    setSyncStatusError(false);

    const result = await onTriggerFetch();
    setIsSyncing(false);
    setSyncStatusMsg(result.message);
    if (!result.success) {
      setSyncStatusError(true);
    }
  };

  return (
    <div className="space-y-8">
      {/* Grid wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left column - Business profile setup */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">ERP Business Entity Settings</h2>
            <p className="text-xs text-slate-500">Configure tax compliance parameters, GSTIN identities, and bank ledger accounts.</p>
          </div>

          <form onSubmit={handleSaveCompany} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block font-bold text-slate-500 uppercase">Registered Trade Name *</label>
                <input
                  type="text"
                  required
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase">Company GSTIN Identification *</label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  value={compGstin}
                  onChange={(e) => setCompGstin(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase">State Code Mapping *</label>
                <input
                  type="text"
                  required
                  value={compStateCode}
                  onChange={(e) => setCompStateCode(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none font-mono"
                  placeholder="e.g. 27 for Maharashtra"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase">Primary Phone *</label>
                <input
                  type="text"
                  required
                  value={compPhone}
                  onChange={(e) => setCompPhone(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase">Support Email</label>
                <input
                  type="email"
                  value={compEmail}
                  onChange={(e) => setCompEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="block font-bold text-slate-500 uppercase">Primary Registered Street Address</label>
                <textarea
                  value={compAddress}
                  onChange={(e) => setCompAddress(e.target.value)}
                  rows={2}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                />
              </div>
            </div>

            <hr className="border-slate-100" />

            <div>
              <h3 className="font-extrabold text-slate-900 text-sm mb-3 text-slate-800">White-Label & Custom Branding</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-500 uppercase">Business Verticals / Type *</label>
                  <select
                    value={compBusinessType}
                    onChange={(e) => setCompBusinessType(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-slate-50 font-medium"
                  >
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Grocery">Grocery</option>
                    <option value="Garments">Garments</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Stationery">Stationery</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Sweet Shop">Sweet Shop</option>
                    <option value="Mobile Shop">Mobile Shop</option>
                    <option value="Cosmetics">Cosmetics</option>
                    <option value="Wholesale Business">Wholesale Business</option>
                    <option value="Retail Business">Retail Business</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase">Theme Color Palette *</label>
                  <select
                    value={compThemeColor}
                    onChange={(e) => setCompThemeColor(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none capitalize bg-slate-50 font-medium"
                  >
                    <option value="emerald">Emerald (Green)</option>
                    <option value="indigo">Indigo (Purple-Blue)</option>
                    <option value="sky">Sky (Cyan-Blue)</option>
                    <option value="rose">Rose (Red-Pink)</option>
                    <option value="amber">Amber (Orange-Yellow)</option>
                    <option value="violet">Violet (Purple)</option>
                    <option value="teal">Teal (Teal-Green)</option>
                    <option value="blue">Blue (Standard Blue)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase">Currency Symbol *</label>
                  <input
                    type="text"
                    required
                    value={compCurrencySymbol}
                    onChange={(e) => setCompCurrencySymbol(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none font-medium"
                    placeholder="e.g. ₹, $, €, £"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase">Currency ISO Code *</label>
                  <input
                    type="text"
                    required
                    value={compCurrencyCode}
                    onChange={(e) => setCompCurrencyCode(e.target.value.toUpperCase())}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none font-mono font-medium uppercase"
                    placeholder="e.g. INR, USD, EUR, GBP"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-500 uppercase">Custom Corporate Logo Image URL</label>
                  <input
                    type="url"
                    value={compLogoUrl}
                    onChange={(e) => setCompLogoUrl(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none font-mono"
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-500 uppercase">Custom Invoice Header Text *</label>
                  <input
                    type="text"
                    required
                    value={compInvoiceHeader}
                    onChange={(e) => setCompInvoiceHeader(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none font-medium"
                    placeholder="TAX INVOICE - ORIGINAL FOR RECIPIENT"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-500 uppercase">Custom Invoice Footer/Terms Text *</label>
                  <textarea
                    required
                    value={compInvoiceFooter}
                    onChange={(e) => setCompInvoiceFooter(e.target.value)}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none font-medium"
                    placeholder="Thank you for your business! Terms: Goods once sold..."
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div>
              <h3 className="font-extrabold text-slate-900 text-sm mb-3">Bank Details (For Invoicing)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-500 uppercase">Bank Name</label>
                  <input
                    type="text"
                    value={compBank}
                    onChange={(e) => setCompBank(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 uppercase">Account Number</label>
                  <input
                    type="text"
                    value={compAccount}
                    onChange={(e) => setCompAccount(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 uppercase">IFSC Code</label>
                  <input
                    type="text"
                    value={compIfsc}
                    onChange={(e) => setCompIfsc(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 uppercase">UPI Settlement QR Link</label>
                  <input
                    type="text"
                    value={compUpi}
                    onChange={(e) => setCompUpi(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                    placeholder="upi://pay?pa=yours@sbi"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              id="btn-save-company-info"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-lg shadow-sm text-xs flex justify-center items-center gap-1.5 transition-all"
            >
              <Save className="h-4 w-4 text-emerald-400" />
              Commit Profile Changes
            </button>
          </form>
        </div>

        {/* Right column - Google sheets sync config */}
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-1.5">
                <Database className="h-5 w-5 text-emerald-600" />
                Google Sheets Database Sync
              </h2>
              <p className="text-xs text-slate-500">Deploy and sync this app directly with Google Sheets for robust persistent storage.</p>
            </div>

            <form onSubmit={handleSaveSyncSettings} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase">Google Sheets Active Integration</label>
                <div className="mt-2 flex items-center gap-4">
                  <input
                    type="checkbox"
                    id="checkbox-use-sheets"
                    checked={useSheets}
                    onChange={(e) => setUseSheets(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="checkbox-use-sheets" className="text-xs text-slate-600 font-bold cursor-pointer">
                    Enable Google Sheets persistent database backend
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase">Deployed Apps Script Web App URL</label>
                <input
                  type="url"
                  value={scriptUrl}
                  onChange={(e) => setScriptUrl(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none font-mono"
                  placeholder="https://script.google.com/macros/s/.../exec"
                />
                <p className="text-[10px] text-slate-400 mt-1">Get this URL by deploying the code block below as a Web App in Google Apps Script.</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  id="btn-save-sheets-config"
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors"
                >
                  Save Integration Setup
                </button>
              </div>
            </form>

            {/* Sync Now / Pull Now actions */}
            {useSheets && scriptUrl && (
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-3 text-xs">
                <h4 className="font-extrabold text-emerald-950 flex items-center gap-1">
                  <Database className="h-4 w-4 text-emerald-600" />
                  Trigger Operations Desk
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleSyncPushNow}
                    disabled={isSyncing}
                    id="btn-push-to-sheets"
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 text-white font-extrabold rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs"
                  >
                    <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    Sync Local to Sheets
                  </button>
                  <button
                    onClick={handleSyncPullNow}
                    disabled={isSyncing}
                    id="btn-pull-from-sheets"
                    className="py-2.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-200 text-white font-extrabold rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs border border-slate-700"
                  >
                    <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    Fetch Sheets to Local
                  </button>
                </div>

                {syncStatusMsg && (
                  <p className={`p-2 rounded font-mono text-[10px] text-center font-bold mt-2 ${syncStatusError ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-950'}`}>
                    {syncStatusMsg}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Copyable script template block */}
          <div className="bg-slate-900 p-6 rounded-xl text-white shadow-md space-y-4 relative">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-400">Google Apps Script Backend Code</h3>
              <button
                onClick={handleCopyScript}
                id="btn-copy-script"
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 text-[10px] font-bold"
              >
                {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {isCopied ? 'Copied' : 'Copy Code'}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Create a free spreadsheet in Google Drive, then click <strong className="text-white">Extensions &gt; Apps Script</strong>. Clear the editor and paste the copied code block, then deploy as a <strong className="text-white">Web App</strong> accessible by <strong className="text-white">Anyone</strong>.
            </p>
            <div className="bg-slate-950 p-3 rounded font-mono text-[9px] text-slate-300 max-h-[140px] overflow-y-auto border border-slate-800 leading-tight">
              {getGoogleAppsScriptTemplate()}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
