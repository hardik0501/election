'use client';

import React from 'react';
import { SearchQueryFilters, Gender, RelationType } from '@/types';
import { Filter, RotateCcw, Sparkles, Hash, MapPin, User, Home, Layers } from 'lucide-react';

interface AdvancedFilterDrawerProps {
  filters: SearchQueryFilters;
  onChange: (updated: Partial<SearchQueryFilters>) => void;
  onReset: () => void;
  onApply: () => void;
}

export const AdvancedFilterDrawer: React.FC<AdvancedFilterDrawerProps> = ({
  filters,
  onChange,
  onReset,
  onApply,
}) => {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 backdrop-blur-xl shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-bold tracking-wide uppercase text-white">
            Advanced Voter Query Filters
          </h3>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Mode */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Search Mode
          </label>
          <select
            value={filters.search_mode || 'all'}
            onChange={(e) => onChange({ search_mode: e.target.value as any })}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">⚡ Hybrid (Exact + Transliterated + Fuzzy)</option>
            <option value="exact">🎯 Exact Match Only</option>
            <option value="fuzzy">🌊 Fuzzy / Typo Tolerant</option>
            <option value="transliterated">🔤 Transliterated (Hindi ↔ English)</option>
          </select>
        </div>

        {/* EPIC / Voter ID */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
            EPIC / Voter ID Number
          </label>
          <input
            type="text"
            placeholder="e.g. ABC1234567"
            value={filters.epic || ''}
            onChange={(e) => onChange({ epic: e.target.value })}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono uppercase text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Gender */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-slate-400" /> Gender
          </label>
          <select
            value={filters.gender || ''}
            onChange={(e) => onChange({ gender: (e.target.value || undefined) as Gender })}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All Genders</option>
            <option value="MALE">पुरुष (Male)</option>
            <option value="FEMALE">महिला (Female)</option>
            <option value="OTHER">अन्य (Other / Third Gender)</option>
          </select>
        </div>

        {/* Relation Type */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
            Relation Type
          </label>
          <select
            value={filters.relation_type || ''}
            onChange={(e) => onChange({ relation_type: (e.target.value || undefined) as RelationType })}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All Relations</option>
            <option value="FATHER">पिता (Father)</option>
            <option value="HUSBAND">पति (Husband)</option>
            <option value="MOTHER">माता (Mother)</option>
            <option value="OTHER">अन्य (Other)</option>
          </select>
        </div>

        {/* House Number */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Home className="h-3.5 w-3.5 text-slate-400" /> House Number (मकान नं.)
          </label>
          <input
            type="text"
            placeholder="e.g. 42-B, Flat 101"
            value={filters.house_no || ''}
            onChange={(e) => onChange({ house_no: e.target.value })}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Ward Number */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-slate-400" /> Ward Number (वार्ड नं.)
          </label>
          <input
            type="text"
            placeholder="e.g. 14, Ward 5"
            value={filters.ward || ''}
            onChange={(e) => onChange({ ward: e.target.value })}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Part Number */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-slate-400" /> Part Number (भाग संख्या)
          </label>
          <input
            type="text"
            placeholder="e.g. 102"
            value={filters.part_no || ''}
            onChange={(e) => onChange({ part_no: e.target.value })}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Serial Number */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-slate-400" /> Serial Number (क्रमांक)
          </label>
          <input
            type="number"
            placeholder="e.g. 245"
            value={filters.serial_no || ''}
            onChange={(e) => onChange({ serial_no: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onApply}
          className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
        >
          Apply Compound Filters
        </button>
      </div>
    </div>
  );
};
