import React from 'react';
import { AppState } from '../types';
import { Shield, Clock, Terminal } from 'lucide-react';

interface ActivityLogViewProps {
  state: AppState;
}

export default function ActivityLogView({ state }: ActivityLogViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">ERP System Activity logs</h1>
        <p className="text-sm text-slate-500">View real-time session logs, system changes, and cryptographic audit records.</p>
      </div>

      {/* Logs Card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-400" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">Cryptographic Security Ledger</h3>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded font-mono font-bold">
            Audit State: Active
          </span>
        </div>

        <div className="divide-y divide-slate-100 font-mono text-xs max-h-[500px] overflow-y-auto">
          {state.activityLogs.length === 0 ? (
            <p className="p-6 text-center text-slate-400 italic">No activity logs recorded.</p>
          ) : (
            [...state.activityLogs].reverse().map((log) => (
              <div key={log.id} className="p-4 flex flex-col md:flex-row justify-between gap-2 hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-extrabold bg-emerald-50 px-1.5 py-0.2 rounded text-[10px]">
                      {log.action.toUpperCase()}
                    </span>
                    <span className="text-slate-950 font-bold">@{log.username}</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{log.details}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-slate-400 text-[10px] flex items-center gap-1 md:justify-end">
                    <Clock className="h-3 w-3" />
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
