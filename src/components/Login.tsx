import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { LogIn, Key, AlertCircle, ShoppingBag, UserPlus, Building, Briefcase, Mail, Phone, MapPin } from 'lucide-react';

interface LoginProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export default function Login({ users, onLoginSuccess }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Registration Fields
  const [companyName, setCompanyName] = useState('');
  const [businessType, setBusinessType] = useState('Retail');
  const [gstin, setGstin] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [stateName, setStateName] = useState('Maharashtra');
  const [address, setAddress] = useState('');

  const businessSectors = [
    'Retail', 'Wholesale', 'Pharmacy', 'Medical Store', 'Electronics',
    'Garments', 'Hardware', 'Supermarket', 'Distributor', 'Manufacturer',
    'Service Business', 'Restaurant', 'Educational Institute'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username.trim() || !password.trim()) {
      setError('Please fill in username and password.');
      setLoading(false);
      return;
    }

    if (isRegister) {
      if (!companyName.trim() || !fullName.trim()) {
        setError('Please fill in Company Name and Full Name.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: companyName.trim(),
            businessType,
            gstin: gstin.trim(),
            fullName: fullName.trim(),
            username: username.trim(),
            password: password.trim(),
            email: email.trim(),
            phone: phone.trim(),
            state: stateName,
            address: address.trim()
          })
        });

        const result = await response.json();
        if (result && result.success && result.user) {
          onLoginSuccess(result.user);
        } else {
          setError(result.error || 'Failed to register company.');
        }
      } catch (err) {
        setError('Connection error. Please ensure the server is running.');
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            password: password.trim()
          })
        });

        const result = await response.json();
        if (result && result.success && result.user) {
          onLoginSuccess(result.user);
        } else {
          setError(result.error || 'Invalid username or password.');
        }
      } catch (err) {
        setError('Connection error. Please ensure the server is running.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-emerald-600 p-3 rounded-2xl shadow-md text-white animate-pulse">
            <ShoppingBag className="h-10 w-10" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          PCS Billing Pro AI
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 font-medium">
          Multi-Tenant Indian GST Billing & Inventory ERP
        </p>
        <p className="mt-1 text-center text-xs text-slate-400">
          Powered by PCS Consultancy Brand
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-slate-100">
          
          {/* Form Action Toggles */}
          <div className="flex justify-center space-x-4 mb-6 border-b border-slate-100 pb-4">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(''); }}
              className={`pb-2 text-sm font-semibold border-b-2 transition-all ${!isRegister ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Client Login
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(''); }}
              className={`pb-2 text-sm font-semibold border-b-2 transition-all ${isRegister ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Register Company
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} id="login-form">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-md flex items-start space-x-3 animate-bounce">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {isRegister && (
              <>
                <div>
                  <label htmlFor="companyName" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Company Name
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="companyName"
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-slate-900"
                      placeholder="e.g. PCS Enterprises"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="businessType" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Sector
                    </label>
                    <select
                      id="businessType"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-slate-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-slate-900"
                    >
                      {businessSectors.map((sector) => (
                        <option key={sector} value={sector}>{sector}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="gstin" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      GSTIN (Optional)
                    </label>
                    <input
                      id="gstin"
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-slate-900"
                      placeholder="27AAAAA0000A1Z5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-slate-900"
                      placeholder="info@pcs.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Phone
                    </label>
                    <input
                      id="phone"
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-slate-900"
                      placeholder="9876543210"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="fullName" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Administrator Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-slate-900"
                    placeholder="e.g. Anand Sharma"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {isRegister ? 'Admin Username' : 'Username'}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-slate-900"
                  placeholder="e.g. admin"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-slate-900"
                  placeholder="Enter secure password"
                />
              </div>
            </div>

            {!isRegister && (
              <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-50 pt-3">
                <span className="flex items-center">
                  <Key className="h-3 w-3 mr-1 text-slate-400 animate-pulse" />
                  Default login: <strong>admin</strong>/<strong>admin</strong>
                </span>
              </div>
            )}

            <div>
              <button
                type="submit"
                id="btn-login"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:bg-emerald-400 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Processing...</span>
                  </span>
                ) : isRegister ? (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Register & Start SaaS
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In to ERP
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
