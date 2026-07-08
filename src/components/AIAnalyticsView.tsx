import React, { useState } from 'react';
import { AppState } from '../types';
import { Sparkles, Loader2, Play, FileText, Lightbulb, TrendingUp, HelpCircle } from 'lucide-react';

interface AIAnalyticsViewProps {
  state: AppState;
}

export default function AIAnalyticsView({ state }: AIAnalyticsViewProps) {
  const [reportText, setReportText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Generate full stats payload to submit to the backend
  const computeStatsPayload = () => {
    const totalSales = state.sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalPurchase = state.purchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);
    const receivables = state.customers.reduce((sum, c) => sum + c.balance, 0);
    const payables = state.suppliers.reduce((sum, s) => sum + s.balance, 0);

    return {
      company: state.settings.company,
      metrics: {
        totalSales,
        totalPurchase,
        totalExpenses,
        receivables,
        payables,
        itemCount: state.products.length,
        customerCount: state.customers.length,
        supplierCount: state.suppliers.length
      },
      products: state.products.map(p => ({ sku: p.sku, name: p.name, stock: p.initialStock })),
      recentSales: state.sales.slice(-5).map(s => ({ date: s.date, amount: s.totalAmount }))
    };
  };

  const handleTriggerAnalysis = async (type: 'summary' | 'sales' | 'profit' | 'stock' | 'tips') => {
    setIsLoading(true);
    setErrorMsg('');
    setReportText('');

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          data: computeStatsPayload()
        })
      });

      const result = await response.json();
      if (result && result.success) {
        setReportText(result.report);
      } else {
        setErrorMsg(result.error || 'Failed to generate report from AI backend. Check your Gemini API secret.');
      }
    } catch (err: any) {
      console.error('AI Request error:', err);
      setErrorMsg(err?.message || 'Network error communicating with AI server route.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Premium Header banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-300 font-extrabold uppercase tracking-widest text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-emerald-400" />
              Powered by Gemini 3.5 Flash
            </span>
          </div>
          <h1 className="text-2xl font-black mt-3">Gemini Business Intelligence</h1>
          <p className="text-emerald-300 text-xs mt-1">
            Analyze tax liability, optimize product stock replenishments, and generate SWOT logs automatically.
          </p>
        </div>
        <div className="hidden md:block">
          <Sparkles className="h-16 w-16 text-emerald-400/30 animate-pulse" />
        </div>
      </div>

      {/* Grid of options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="ai-modules-grid">
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
          <div className="space-y-2">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 inline-block">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">ERP Executive Summary</h3>
            <p className="text-xs text-slate-500">Generate a comprehensive diagnostic report analyzing sales volumes, low-stock warnings, and cash balances.</p>
          </div>
          <button
            onClick={() => handleTriggerAnalysis('summary')}
            disabled={isLoading}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-300 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Analyze Executive Health
          </button>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
          <div className="space-y-2">
            <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700 inline-block">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">Predictive Stock Suggestions</h3>
            <p className="text-xs text-slate-500">Calculate inventory valuations, map category sizes, and predict dead-stock risks or reorder constraints.</p>
          </div>
          <button
            onClick={() => handleTriggerAnalysis('stock')}
            disabled={isLoading}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Generate Stock Insights
          </button>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
          <div className="space-y-2">
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 inline-block">
              <Lightbulb className="h-5 w-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">GST Tax & Cash Optimizations</h3>
            <p className="text-xs text-slate-500">Analyze input tax credit (ITC) offsets, receivable collections speed, and local business tip logs.</p>
          </div>
          <button
            onClick={() => handleTriggerAnalysis('tips')}
            disabled={isLoading}
            className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-300 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Formulate Growth Tips
          </button>
        </div>
      </div>

      {/* Result report display */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden min-h-[250px]">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-extrabold text-slate-900 text-sm">Gemini AI Audit Report</h3>
          {isLoading && (
            <span className="text-xs text-slate-500 flex items-center gap-1.5 font-semibold">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              Running diagnostics... Please wait up to 10 seconds.
            </span>
          )}
        </div>

        <div className="p-6">
          {errorMsg && (
            <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 rounded-r-lg space-y-1">
              <h4 className="font-bold text-sm">Intelligence Extraction Failed</h4>
              <p className="text-xs">{errorMsg}</p>
            </div>
          )}

          {!reportText && !errorMsg && !isLoading && (
            <div className="py-12 text-center flex flex-col items-center justify-center text-slate-400">
              <Sparkles className="h-10 w-10 text-emerald-500/20 mb-3" />
              <p className="font-bold text-sm text-slate-700">Audit Desk Idle</p>
              <p className="text-xs max-w-sm mt-1">Select one of the analytical operations above to formulate intelligence reports from your active catalog ledger state.</p>
            </div>
          )}

          {reportText && (
            <div className="prose prose-sm max-w-none text-slate-800 space-y-4 font-sans leading-relaxed" id="ai-report-body">
              {reportText.split('\n').map((line, idx) => {
                // Basic markdown rendering simulation for headers
                if (line.startsWith('### ')) {
                  return <h4 key={idx} className="text-sm font-black text-slate-900 pt-3">{line.replace('### ', '')}</h4>;
                }
                if (line.startsWith('## ')) {
                  return <h3 key={idx} className="text-base font-black text-slate-950 border-b border-slate-100 pb-1 pt-4">{line.replace('## ', '')}</h3>;
                }
                if (line.startsWith('# ')) {
                  return <h2 key={idx} className="text-lg font-black text-slate-950 pt-4">{line.replace('# ', '')}</h2>;
                }
                if (line.startsWith('- ') || line.startsWith('* ')) {
                  return <li key={idx} className="ml-4 list-disc text-xs text-slate-700">{line.substring(2)}</li>;
                }
                if (line.trim() === '') {
                  return <div key={idx} className="h-2" />;
                }
                return <p key={idx} className="text-xs text-slate-700">{line}</p>;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
