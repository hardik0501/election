'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  Layers,
  MapPin,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Database,
  Search
} from 'lucide-react';
import { SystemStats } from '@/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Stats fetch error:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const genderTotal = stats
    ? Object.values(stats.gender_distribution).reduce((a, b) => a + b, 0)
    : 1;

  const malePercent = stats && genderTotal > 0
    ? Math.round(((stats.gender_distribution['MALE'] || 0) / genderTotal) * 100)
    : 0;

  const femalePercent = stats && genderTotal > 0
    ? Math.round(((stats.gender_distribution['FEMALE'] || 0) / genderTotal) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Electoral Intelligence & Audit Dashboard
          </h1>
          <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
            Real-Time Metrics
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Demographic distributions, ingestion quality indicators, and live platform statistics.
        </p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Ingested Voters
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-white">
            {stats?.total_voters.toLocaleString() || '0'}
          </p>
          <span className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> 100% Normalized
          </span>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Import Batches
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Database className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-white">
            {stats?.total_batches || '0'}
          </p>
          <span className="mt-1 text-xs text-slate-400">
            Across {stats?.total_source_files || 0} source files
          </span>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Extraction Confidence
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-white">
            {stats ? (stats.average_confidence * 100).toFixed(1) : '100'}%
          </p>
          <span className="mt-1 text-xs text-indigo-300">
            NLP & OCR Quality Index
          </span>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Search Queries Logged
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Search className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-white">
            {stats?.recent_searches_count || '0'}
          </p>
          <span className="mt-1 text-xs text-purple-300">
            Audited & Monitored
          </span>
        </div>
      </div>

      {/* Demographics Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gender Distribution Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              <span>Gender Distribution</span>
            </h3>
            <span className="text-xs text-slate-400">Total: {genderTotal}</span>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>पुरुष (Male)</span>
                <span className="font-bold font-mono text-emerald-400">
                  {stats?.gender_distribution['MALE'] || 0} ({malePercent}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${malePercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>महिला (Female)</span>
                <span className="font-bold font-mono text-teal-400">
                  {stats?.gender_distribution['FEMALE'] || 0} ({femalePercent}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-teal-400 transition-all duration-500"
                  style={{ width: `${femalePercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>अन्य / अन्य श्रेणी (Other / Third Gender / Unknown)</span>
                <span className="font-bold font-mono text-slate-400">
                  {(stats?.gender_distribution['OTHER'] || 0) + (stats?.gender_distribution['UNKNOWN'] || 0)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-slate-600 transition-all duration-500"
                  style={{ width: `${100 - malePercent - femalePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Age Demographics Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-400" />
              <span>Age Group Breakdown</span>
            </h3>
            <span className="text-xs text-slate-400">Voter Cohorts</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-2xl bg-slate-950/60 p-4 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Youth (18-25 yrs)</span>
              <p className="mt-1 text-2xl font-bold text-emerald-400">
                {stats?.age_groups['18-25'] || 0}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-950/60 p-4 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Early Career (26-40 yrs)</span>
              <p className="mt-1 text-2xl font-bold text-teal-400">
                {stats?.age_groups['26-40'] || 0}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-950/60 p-4 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Middle Age (41-60 yrs)</span>
              <p className="mt-1 text-2xl font-bold text-indigo-400">
                {stats?.age_groups['41-60'] || 0}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-950/60 p-4 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Senior (60+ yrs)</span>
              <p className="mt-1 text-2xl font-bold text-amber-400">
                {stats?.age_groups['60+'] || 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
