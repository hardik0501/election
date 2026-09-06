'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  SlidersHorizontal,
  Keyboard,
  Download,
  LayoutGrid,
  List,
  Sparkles,
  Loader2,
  RefreshCw,
  AlertCircle,
  Users,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react';
import { SearchQueryFilters, SearchResponse, SearchResultItem } from '@/types';
import { VoterCard } from '@/components/VoterCard';
import { VoterDetailModal } from '@/components/VoterDetailModal';
import { HindiVirtualKeyboard } from '@/components/HindiVirtualKeyboard';
import { AdvancedFilterDrawer } from '@/components/AdvancedFilterDrawer';
import { expandSearchQuery } from '@/lib/nlp/transliteration';

export default function SearchPage() {
  const [queryInput, setQueryInput] = useState('');
  const [filters, setFilters] = useState<SearchQueryFilters>({
    page: 1,
    limit: 12,
    search_mode: 'all',
  });
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedVoter, setSelectedVoter] = useState<SearchResultItem | null>(null);
  const [tableCopiedId, setTableCopiedId] = useState<string | null>(null);

  // Transliteration real-time suggestions
  const [translitCandidates, setTranslitCandidates] = useState<string[]>([]);

  useEffect(() => {
    if (queryInput.trim().length >= 2) {
      const exp = expandSearchQuery(queryInput);
      setTranslitCandidates(exp.candidates.filter((c) => c !== queryInput).slice(0, 3));
    } else {
      setTranslitCandidates([]);
    }
  }, [queryInput]);

  const executeSearch = useCallback(async (currentFilters: SearchQueryFilters, searchQ?: string) => {
    setLoading(true);
    setError(null);
    try {
      const q = searchQ !== undefined ? searchQ : queryInput;
      const params = new URLSearchParams();

      if (q) params.set('q', q);
      if (currentFilters.epic) params.set('epic', currentFilters.epic);
      if (currentFilters.gender) params.set('gender', currentFilters.gender);
      if (currentFilters.relation_type) params.set('relation_type', currentFilters.relation_type);
      if (currentFilters.min_age) params.set('min_age', String(currentFilters.min_age));
      if (currentFilters.max_age) params.set('max_age', String(currentFilters.max_age));
      if (currentFilters.house_no) params.set('house_no', currentFilters.house_no);
      if (currentFilters.ward) params.set('ward', currentFilters.ward);
      if (currentFilters.part_no) params.set('part_no', currentFilters.part_no);
      if (currentFilters.area) params.set('area', currentFilters.area);
      if (currentFilters.serial_no) params.set('serial_no', String(currentFilters.serial_no));
      if (currentFilters.search_mode) params.set('search_mode', currentFilters.search_mode);
      if (currentFilters.page) params.set('page', String(currentFilters.page));
      if (currentFilters.limit) params.set('limit', String(currentFilters.limit));

      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Search query failed');
      }
      const data: SearchResponse = await res.json();
      setResponse(data);
    } catch (err: any) {
      setError(err.message || 'Error executing search');
    } finally {
      setLoading(false);
    }
  }, [queryInput]);

  // Initial load
  useEffect(() => {
    executeSearch(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = { ...filters, page: 1 };
    setFilters(updated);
    executeSearch(updated, queryInput);
  };

  const handleQuickCandidateClick = (cand: string) => {
    setQueryInput(cand);
    const updated = { ...filters, page: 1 };
    setFilters(updated);
    executeSearch(updated, cand);
  };

  const handlePageChange = (newPage: number) => {
    const updated = { ...filters, page: newPage };
    setFilters(updated);
    executeSearch(updated);
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (queryInput) params.set('q', queryInput);
    if (filters.epic) params.set('epic', filters.epic);
    if (filters.ward) params.set('ward', filters.ward);
    if (filters.part_no) params.set('part_no', filters.part_no);
    window.open(`/api/export?${params.toString()}`, '_blank');
  };

  const handleInsertKey = (char: string) => {
    setQueryInput((prev) => prev + char);
  };

  const handleBackspaceKey = () => {
    setQueryInput((prev) => prev.slice(0, -1));
  };

  const handleCopyTableEpic = (epic: string) => {
    navigator.clipboard.writeText(epic);
    setTableCopiedId(epic);
    setTimeout(() => setTableCopiedId(null), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Hero / Omnibox Search Section */}
      <div className="relative rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-teal-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Dual-Script Hindi ↔ English Phonetic Transliteration Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
            Search Electoral Voter Records
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-300">
            Search by Hindi Name (e.g. <span className="text-emerald-300 font-devanagari font-bold">रमेश</span>), English Name (e.g. <span className="text-emerald-300 font-semibold">Ramesh</span>), EPIC ID, Relative Name, House No, or Ward.
          </p>
        </div>

        {/* Omnibox Search Bar Form */}
        <form onSubmit={handleSearchSubmit} className="relative mt-6">
          <div className="relative flex items-center rounded-2xl border-2 border-slate-700 bg-slate-950 p-2 transition-all focus-within:border-emerald-500 focus-within:shadow-xl focus-within:shadow-emerald-950/40">
            <Search className="ml-3 h-6 w-6 text-slate-400" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search by Name, EPIC, House Number or Family Name"
              className="flex-1 bg-transparent px-4 py-2 text-base sm:text-lg text-white placeholder:text-slate-500 focus:outline-none"
            />

            {/* Virtual Keyboard Toggle */}
            <button
              type="button"
              onClick={() => setShowKeyboard(!showKeyboard)}
              title="Toggle Hindi Virtual Keyboard"
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors mr-2 ${
                showKeyboard
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Keyboard className="h-4 w-4" />
              <span className="hidden sm:inline">हिंदी कीबोर्ड</span>
            </button>

            {/* Filter Drawer Toggle */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              title="Advanced Filters"
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors mr-2 ${
                showFilters
                  ? 'border-teal-500 bg-teal-500/20 text-teal-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
            </button>

            {/* Search Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span>Search</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {/* Virtual Hindi Keyboard Component */}
          {showKeyboard && (
            <HindiVirtualKeyboard
              onInsertChar={handleInsertKey}
              onBackspace={handleBackspaceKey}
              onClose={() => setShowKeyboard(false)}
            />
          )}

          {/* Real-time Transliteration Candidates Bar */}
          {translitCandidates.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Transliterated Matches:
              </span>
              {translitCandidates.map((cand) => (
                <button
                  key={cand}
                  type="button"
                  onClick={() => handleQuickCandidateClick(cand)}
                  className="rounded-lg bg-slate-800/80 hover:bg-emerald-950/80 border border-slate-700 hover:border-emerald-500/50 px-2.5 py-1 text-emerald-300 font-devanagari transition-colors"
                >
                  {cand}
                </button>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* Advanced Filter Drawer */}
      {showFilters && (
        <AdvancedFilterDrawer
          filters={filters}
          onChange={(up) => setFilters((prev) => ({ ...prev, ...up, page: 1 }))}
          onReset={() => {
            const resetFilters: SearchQueryFilters = { page: 1, limit: 12, search_mode: 'all' };
            setFilters(resetFilters);
            executeSearch(resetFilters);
          }}
          onApply={() => executeSearch(filters)}
        />
      )}

      {/* Search Header Bar: Stats, View Toggles & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          {response && (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-bold text-white">
                Found {response.total.toLocaleString()} voter records
              </span>
              <span className="text-xs text-slate-400">
                ({response.execution_time_ms} ms)
              </span>

              {response.query_expansion && (
                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-emerald-400 border border-slate-700">
                  Script: {response.query_expansion.detected_script}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`rounded-lg p-1.5 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid Card View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`rounded-lg p-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Table List View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Results Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-800/80">
                <div className="h-5 w-28 rounded-md bg-slate-800" />
                <div className="h-5 w-20 rounded-md bg-slate-800" />
              </div>
              <div className="space-y-2">
                <div className="h-6 w-3/4 rounded-md bg-slate-800" />
                <div className="h-4 w-1/2 rounded-md bg-slate-800" />
              </div>
              <div className="h-10 rounded-xl bg-slate-950/60" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-8 rounded-xl bg-slate-950/60" />
                <div className="h-8 rounded-xl bg-slate-950/60" />
              </div>
              <div className="flex justify-between pt-3 border-t border-slate-800/80">
                <div className="h-4 w-1/3 rounded bg-slate-800" />
                <div className="h-6 w-24 rounded-xl bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-900/60 bg-rose-950/20 p-6 text-center text-rose-300">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-400 mb-2" />
          <p className="font-semibold">{error}</p>
          <button
            onClick={() => executeSearch(filters)}
            className="mt-4 rounded-xl bg-rose-900/60 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-900"
          >
            Try Again
          </button>
        </div>
      ) : response?.results && response.results.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {response.results.map((voter) => (
                <VoterCard
                  key={voter.id}
                  voter={voter}
                  onSelect={(v) => setSelectedVoter(v)}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Sr #</th>
                    <th className="px-4 py-3">EPIC ID</th>
                    <th className="px-4 py-3">Voter Name (Hindi)</th>
                    <th className="px-4 py-3">Voter Name (English)</th>
                    <th className="px-4 py-3">Relative Name</th>
                    <th className="px-4 py-3">Gender / Age</th>
                    <th className="px-4 py-3">House / Ward</th>
                    <th className="px-4 py-3">Part #</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {response.results.map((voter) => (
                    <tr
                      key={voter.id}
                      onClick={() => setSelectedVoter(voter)}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                        #{voter.source_serial_number}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {voter.epic_number ? (
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-slate-100">{voter.epic_number}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyTableEpic(voter.epic_number!);
                              }}
                              className="text-slate-400 hover:text-emerald-400"
                            >
                              {tableCopiedId === voter.epic_number ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-devanagari font-semibold text-white text-sm">
                        {voter.name_hindi}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-200">
                        {voter.name_english}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-devanagari">{voter.relation_name_hindi || voter.relation_name_english || '—'}</span>
                        {voter.relation_type !== 'UNKNOWN' && (
                          <span className="text-[10px] text-slate-400 block">{voter.relation_type}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {voter.gender} {voter.age ? `• ${voter.age}y` : ''}
                      </td>
                      <td className="px-4 py-3">
                        H: {voter.house_number || 'N/A'} | W: {voter.ward_number || 'N/A'}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">
                        {voter.part_number || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVoter(voter);
                          }}
                          className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-emerald-400 hover:bg-emerald-600 hover:text-slate-950 font-semibold transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {response.total_pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <span className="text-xs text-slate-400">
                Page {response.page} of {response.total_pages} ({response.total} total records)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={response.page <= 1}
                  onClick={() => handlePageChange(response.page - 1)}
                  className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>

                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: Math.min(5, response.total_pages) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePageChange(p)}
                        className={`h-8 w-8 rounded-lg text-xs font-bold transition-colors ${
                          response.page === p
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={response.page >= response.total_pages}
                  onClick={() => handlePageChange(response.page + 1)}
                  className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Zero Results / Empty State */
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-lg font-bold text-white">No Voter Records Found</h3>
          <p className="mt-1 text-sm text-slate-400 max-w-md mx-auto">
            No records matched your search query or filters. Upload electoral rolls in the Ingestion Hub or adjust your search terms.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <a
              href="/batches"
              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors"
            >
              Upload Electoral Roll (PDF / CSV / XLSX)
            </a>
          </div>
        </div>
      )}

      {/* Voter Profile Modal */}
      <VoterDetailModal
        voter={selectedVoter}
        onClose={() => setSelectedVoter(null)}
      />
    </div>
  );
}
