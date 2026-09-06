'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, UploadCloud, BarChart3, ShieldCheck, Database, ShieldAlert, Lock, Sparkles } from 'lucide-react';
import { GeminiKeyModal } from './GeminiKeyModal';

export const Navbar = () => {
  const pathname = usePathname();
  const [showGeminiModal, setShowGeminiModal] = useState(false);

  const navItems = [
    { href: '/', label: 'Voter Search', icon: Search },
    { href: '/batches', label: 'Ingestion & Batches', icon: UploadCloud },
    { href: '/validation-queue', label: 'Validation Queue', icon: ShieldAlert },
    { href: '/audit-logs', label: 'Audit Trail', icon: Lock },
    { href: '/dashboard', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Database className="h-5 w-5 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  VoterFinder
                </span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  PROD-GRADE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Electoral Roll Data Platform</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800/90 text-emerald-400 shadow-inner border border-slate-700/50'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGeminiModal(true)}
            className="flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-950/40 hover:bg-purple-900/60 px-3 py-1.5 text-xs text-purple-300 font-medium transition-all shadow-sm hover:shadow-purple-500/20"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
            <span>Gemini AI Scanner</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs text-slate-300">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Dual-Script Engine</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/50 px-2.5 py-1 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="font-mono text-[11px]">RBAC: SECURE</span>
          </div>
        </div>
      </div>

      <GeminiKeyModal
        isOpen={showGeminiModal}
        onClose={() => setShowGeminiModal(false)}
      />
    </header>
  );
};
