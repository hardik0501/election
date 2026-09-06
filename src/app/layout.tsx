import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'VoterFinder — Production-Grade Election Voter Data Search Platform',
  description: 'Enterprise electoral roll search engine with Hindi/English transliteration, exact, partial, fuzzy matching, and raw PDF/CSV audit lineage.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-400">
          <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© Election Voter Data Search Platform • Dual-Script Indic NLP Engine</span>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span>PostgreSQL & pg_trgm Ready</span>
              <span>•</span>
              <span>Raw Provenance Preserved</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
