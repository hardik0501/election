'use client';

import React, { useEffect, useState } from 'react';
import { ValidationIssue } from '@/lib/validation/rules';
import { DuplicateCluster } from '@/lib/validation/duplicate-detector';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  Check,
  Edit2,
  XCircle,
  Eye,
  Copy,
  Users,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronDown,
  Layers
} from 'lucide-react';

export default function ValidationQueuePage() {
  const [activeTab, setActiveTab] = useState<'issues' | 'duplicates'>('issues');
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [duplicateClusters, setDuplicateClusters] = useState<DuplicateCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [fieldFilter, setFieldFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Editing state modal
  const [editingIssue, setEditingIssue] = useState<ValidationIssue | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [queueRes, dupRes] = await Promise.all([
        fetch(`/api/validation-queue?status=${statusFilter}`),
        fetch('/api/duplicates'),
      ]);

      if (!queueRes.ok) throw new Error('Failed to load validation queue');
      const queueData = await queueRes.json();
      setIssues(queueData.issues || []);

      if (dupRes.ok) {
        const dupData = await dupRes.json();
        setDuplicateClusters(dupData.clusters || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading validation queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleResolve = async (
    issue: ValidationIssue,
    action: 'ACCEPT' | 'EDIT' | 'REJECT_RECORD' | 'MARK_REVIEWED',
    customValue?: any
  ) => {
    setResolvingId(issue.id);
    try {
      const res = await fetch(`/api/validation-queue/${issue.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          field: issue.field_name,
          new_value: action === 'EDIT' ? (customValue !== undefined ? customValue : editValue) : undefined,
          voter_id: issue.voter_id,
          notes: editNotes || `Admin applied ${action}`,
          resolved_by: 'Electoral Data Officer',
        }),
      });

      if (!res.ok) throw new Error('Failed to resolve validation issue');

      setActionSuccessMsg(`Action "${action}" recorded successfully for Voter #${issue.serial_number}`);
      setTimeout(() => setActionSuccessMsg(null), 3000);

      // Update local state
      setIssues((prev) =>
        prev.map((item) =>
          item.id === issue.id
            ? {
                ...item,
                is_resolved: true,
                current_value: action === 'EDIT' ? editValue : item.current_value,
                resolution: {
                  action,
                  resolved_by: 'Electoral Data Officer',
                  resolved_at: new Date().toISOString(),
                  new_value: editValue,
                },
              }
            : item
        )
      );

      setEditingIssue(null);
    } catch (err: any) {
      alert(err.message || 'Error applying resolution');
    } finally {
      setResolvingId(null);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-xs font-bold text-red-400">
            <AlertOctagon className="h-3 w-3" />
            CRITICAL
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-400">
            <AlertTriangle className="h-3 w-3" />
            ERROR
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            WARNING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-blue-400">
            <Info className="h-3 w-3" />
            INFO
          </span>
        );
    }
  };

  const filteredIssues = issues.filter((issue) => {
    if (severityFilter !== 'all' && issue.severity.toLowerCase() !== severityFilter.toLowerCase()) return false;
    if (fieldFilter !== 'all' && issue.field_name.toLowerCase() !== fieldFilter.toLowerCase()) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchIssue = issue.issue.toLowerCase().includes(q);
      const matchVal = String(issue.current_value || '').toLowerCase().includes(q);
      const matchFile = (issue.file_name || '').toLowerCase().includes(q);
      return matchIssue || matchVal || matchFile;
    }
    return true;
  });

  const openIssuesCount = issues.filter((i) => !i.is_resolved).length;
  const resolvedIssuesCount = issues.filter((i) => i.is_resolved).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" />
                Administrative Quality Assurance
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">Electoral Validation & Quality Queue</h1>
            <p className="text-xs text-slate-400 mt-1">
              Verify suspicious OCR anomalies, detect multi-roll duplicates, and resolve field discrepancies without deleting original records.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all shadow"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {actionSuccessMsg && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-xs font-semibold text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Stats Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Pending Issues</span>
            <span className="text-2xl font-extrabold text-amber-400 font-mono mt-1 block">{openIssuesCount}</span>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Resolved / Accepted</span>
            <span className="text-2xl font-extrabold text-emerald-400 font-mono mt-1 block">{resolvedIssuesCount}</span>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Duplicate Clusters</span>
            <span className="text-2xl font-extrabold text-indigo-400 font-mono mt-1 block">{duplicateClusters.length}</span>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Quality Baseline</span>
            <span className="text-2xl font-extrabold text-white font-mono mt-1 block">
              {issues.length ? `${Math.max(0, 100 - (openIssuesCount / (issues.length || 1)) * 30).toFixed(1)}%` : '100%'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 text-sm font-semibold mb-6 gap-6">
          <button
            onClick={() => setActiveTab('issues')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'issues'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Validation Issues Queue ({openIssuesCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('duplicates')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'duplicates'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Duplicate Detection ({duplicateClusters.length})</span>
          </button>
        </div>

        {/* TAB 1: VALIDATION ISSUES QUEUE */}
        {activeTab === 'issues' && (
          <div className="space-y-4">
            {/* Filter Drawer */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter issues..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="all">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="ERROR">Error</option>
                  <option value="WARNING">Warning</option>
                  <option value="INFO">Info</option>
                </select>

                <select
                  value={fieldFilter}
                  onChange={(e) => setFieldFilter(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="all">All Fields</option>
                  <option value="epic_number">EPIC</option>
                  <option value="age">Age</option>
                  <option value="gender">Gender</option>
                  <option value="serial_number">Serial</option>
                  <option value="house_number">House Number</option>
                  <option value="relation_type">Relation Type</option>
                  <option value="name">Name</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="open">Open Only</option>
                  <option value="resolved">Resolved Only</option>
                  <option value="all">All Statuses</option>
                </select>
              </div>

              <span className="text-xs text-slate-400">
                Showing {filteredIssues.length} of {issues.length} items
              </span>
            </div>

            {/* Issues List Table */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-2" />
                <p className="text-xs font-medium">Scanning electoral records against validation rules...</p>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400">
                <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
                <h3 className="text-sm font-bold text-white">No Issues in this View</h3>
                <p className="text-xs mt-1">All processed electoral records satisfy the data quality rules for this filter.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      issue.is_resolved
                        ? 'border-slate-800/60 bg-slate-950/40 opacity-75'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left Block: Source Location & Issue */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getSeverityBadge(issue.severity)}
                          <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-300">
                            Field: <strong className="text-emerald-400">{issue.field_name}</strong>
                          </span>
                          <span className="text-xs text-slate-400">
                            Page {issue.page_number} • Serial #{issue.serial_number}
                          </span>
                          {issue.file_name && (
                            <span className="text-[11px] text-slate-500 truncate max-w-xs block">
                              ({issue.file_name})
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-white">{issue.issue}</h4>

                        {/* Current Value vs Original Value */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Extracted Value:</span>
                            <span className="font-mono font-semibold text-slate-200 mt-0.5 block break-words">
                              {issue.current_value !== null && issue.current_value !== undefined
                                ? String(issue.current_value)
                                : '<EMPTY / NULL>'}
                            </span>
                          </div>

                          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Suggested Remediation:</span>
                            <span className="text-slate-300 mt-0.5 block text-[11px]">{issue.suggested_action}</span>
                          </div>
                        </div>

                        {issue.is_resolved && issue.resolution && (
                          <div className="mt-2 text-[11px] font-semibold text-emerald-400 bg-emerald-950/30 p-2 rounded-lg border border-emerald-800/30 flex items-center gap-1.5">
                            <Check className="h-3.5 w-3.5" />
                            <span>
                              Resolved via <strong>{issue.resolution.action}</strong> by {issue.resolution.resolved_by || 'Officer'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right Block: Action Buttons */}
                      {!issue.is_resolved && (
                        <div className="flex lg:flex-col items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={resolvingId === issue.id}
                            onClick={() => handleResolve(issue, 'ACCEPT')}
                            className="flex-1 lg:w-36 py-2 px-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-xs font-bold text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all text-center"
                          >
                            [Accept]
                          </button>

                          <button
                            type="button"
                            disabled={resolvingId === issue.id}
                            onClick={() => {
                              setEditingIssue(issue);
                              setEditValue(String(issue.current_value || ''));
                              setEditNotes('');
                            }}
                            className="flex-1 lg:w-36 py-2 px-3 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-xs font-bold text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all text-center"
                          >
                            [Edit]
                          </button>

                          <button
                            type="button"
                            disabled={resolvingId === issue.id}
                            onClick={() => handleResolve(issue, 'REJECT_RECORD')}
                            className="flex-1 lg:w-36 py-2 px-3 rounded-xl bg-red-600/20 border border-red-500/30 text-xs font-bold text-red-300 hover:bg-red-600 hover:text-white transition-all text-center"
                          >
                            [Reject Record]
                          </button>

                          <button
                            type="button"
                            disabled={resolvingId === issue.id}
                            onClick={() => handleResolve(issue, 'MARK_REVIEWED')}
                            className="flex-1 lg:w-36 py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-center"
                          >
                            [Mark Reviewed]
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DUPLICATE DETECTION */}
        {activeTab === 'duplicates' && (
          <div className="space-y-4">
            {duplicateClusters.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400">
                <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
                <h3 className="text-sm font-bold text-white">No Duplicate Clusters Detected</h3>
                <p className="text-xs mt-1">Electoral rolls are free from exact duplicate EPICs, serial collisions, and multi-roll clone records.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {duplicateClusters.map((cluster) => (
                  <div key={cluster.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
                      <div>
                        <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-0.5 text-xs font-bold text-amber-400">
                          {cluster.duplicate_type}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1.5">{cluster.description}</h4>
                      </div>

                      <span className="text-xs font-mono text-indigo-400 bg-indigo-950/40 border border-indigo-800/40 px-3 py-1 rounded-xl">
                        {(cluster.confidence * 100).toFixed(0)}% Match Confidence
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mb-3">
                      <strong>Remediation:</strong> {cluster.suggested_action}
                    </p>

                    {/* Side-by-side Voters in Cluster */}
                    {cluster.voters && cluster.voters.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {cluster.voters.map((v) => (
                          <div key={v.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white font-devanagari text-sm">
                                {v.name_hi || (v as any).name_hindi} ({v.name_en || (v as any).name_english})
                              </span>
                              <span className="font-mono text-emerald-400 font-bold">{v.epic_number || 'NO EPIC'}</span>
                            </div>
                            <p className="text-slate-400">
                              {v.gender} • {v.age} yrs • House {v.house_number || 'N/A'} • Serial #{v.source_serial_number || v.serial_number}
                            </p>
                            <p className="text-slate-500 text-[11px]">
                              Relation: {v.relation_type} ({v.relation_name_hi || (v as any).relation_name_hindi})
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {/* EDIT MODAL */}
      {editingIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
              <Edit2 className="h-5 w-5 text-indigo-400" />
              Edit & Correct Field Value
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Editing <strong>{editingIssue.field_name}</strong> for Voter Page {editingIssue.page_number} Serial #{editingIssue.serial_number}.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Previous / Current Value</label>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-slate-300">
                  {String(editingIssue.current_value || '<EMPTY>')}
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Corrected Value</label>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Enter corrected value..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-white focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Audit Resolution Notes (Optional)</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  placeholder="Reason for change..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingIssue(null)}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={resolvingId === editingIssue.id}
                onClick={() => handleResolve(editingIssue, 'EDIT', editValue)}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-all flex items-center gap-1.5"
              >
                {resolvingId === editingIssue.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>Save Correction & Resolve</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
