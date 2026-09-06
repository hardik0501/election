'use client';

import React, { useEffect, useState } from 'react';
import { AuditLog } from '@/types';
import {
  FileText,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Clock,
  User,
  KeyRound,
  Database,
  CheckCircle2,
  Eye
} from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/audit-logs?limit=200');
      if (!res.ok) throw new Error('Failed to retrieve audit logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err: any) {
      setError(err.message || 'Error loading audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('LOGIN') || act.includes('AUTH')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
          <KeyRound className="h-3 w-3" />
          {action}
        </span>
      );
    }
    if (act.includes('DELETE') || act.includes('REJECT') || act.includes('FAILED')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-xs font-semibold text-red-400">
          <AlertTriangle className="h-3 w-3" />
          {action}
        </span>
      );
    }
    if (act.includes('VALIDATION') || act.includes('VERIFIED')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
          <ShieldCheck className="h-3 w-3" />
          {action}
        </span>
      );
    }
    if (act.includes('UPLOAD') || act.includes('IMPORT')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-400">
          <Database className="h-3 w-3" />
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
        <FileText className="h-3 w-3" />
        {action}
      </span>
    );
  };

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== 'all' && log.action.toLowerCase() !== actionFilter.toLowerCase()) return false;
    if (entityFilter !== 'all' && log.entity_type.toLowerCase() !== entityFilter.toLowerCase()) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchAct = log.action.toLowerCase().includes(q);
      const matchEntity = log.entity_type.toLowerCase().includes(q);
      const matchId = (log.entity_id || '').toLowerCase().includes(q);
      const matchChanges = JSON.stringify(log.changes || {}).toLowerCase().includes(q);
      return matchAct || matchEntity || matchId || matchChanges;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Immutable System Audit Trail
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">Security & Administrative Audit Logs</h1>
            <p className="text-xs text-slate-400 mt-1">
              Tracks all authentications, uploads, voter corrections, validation resolutions, and provenance accesses with strict secret redaction.
            </p>
          </div>

          <button
            onClick={loadLogs}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all shadow"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Logs</span>
          </button>
        </div>

        {/* Security Guardrail Alert */}
        <div className="mb-6 rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-4 text-xs text-emerald-300 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Security & Privacy Protocol Active</span>
            <span className="text-emerald-200/80">
              Passphrases, session tokens, authorization headers, and cookie digests are automatically redacted before entering the audit storage stream.
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search audit trail..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">All Actions</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="FILE_UPLOAD">File Upload</option>
              <option value="VOTER_EDIT">Voter Edit</option>
              <option value="VALIDATION_DECISION">Validation Decision</option>
            </select>

            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">All Entity Types</option>
              <option value="user">User / Auth</option>
              <option value="voter">Voter Record</option>
              <option value="source_file">Source File</option>
              <option value="validation_issue">Validation Issue</option>
            </select>
          </div>

          <span className="text-xs text-slate-400">
            Showing {filteredLogs.length} of {logs.length} logged events
          </span>
        </div>

        {/* Audit Log Timeline Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-2" />
            <p className="text-xs">Loading tamper-resistant audit trail...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400">
            <Clock className="h-10 w-10 mx-auto text-slate-600 mb-2" />
            <h3 className="text-sm font-bold text-white">No Audit Records Found</h3>
            <p className="text-xs mt-1">No security or administrative events matched your filter criteria.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl text-xs space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getActionBadge(log.action)}
                    <span className="text-slate-400 font-mono">Entity: {log.entity_type}</span>
                    {log.entity_id && (
                      <span className="text-slate-500 font-mono text-[11px] truncate max-w-xs">
                        ({log.entity_id})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3 text-slate-500" />
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                    {log.ip_address && (
                      <span className="rounded-md bg-slate-950 px-2 py-0.5 font-mono text-slate-400 border border-slate-800">
                        IP: {log.ip_address}
                      </span>
                    )}
                  </div>
                </div>

                {/* Log Payload / Changes */}
                {log.changes && Object.keys(log.changes).length > 0 && (
                  <div className="rounded-xl bg-slate-950 p-3 border border-slate-800/80">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Audited Event Data / Changes:</span>
                    <pre className="font-mono text-[11px] text-emerald-300 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                      {JSON.stringify(log.changes, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
