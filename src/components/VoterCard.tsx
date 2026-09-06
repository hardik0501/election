'use client';

import React, { useState } from 'react';
import { SearchResultItem } from '@/types';
import {
  Copy,
  Check,
  User,
  Users,
  Home,
  MapPin,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText
} from 'lucide-react';

interface VoterCardProps {
  voter: SearchResultItem;
  onSelect: (voter: SearchResultItem) => void;
}

export const VoterCard: React.FC<VoterCardProps> = ({ voter, onSelect }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyEpic = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!voter.epic_number) return;
    navigator.clipboard.writeText(voter.epic_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRelationLabel = (type: string) => {
    switch (type) {
      case 'FATHER':
        return 'Father';
      case 'HUSBAND':
        return 'Husband';
      case 'MOTHER':
        return 'Mother';
      case 'OTHER':
        return 'Relative';
      default:
        return 'Relation';
    }
  };

  const genderLabel =
    voter.gender === 'MALE' ? 'Male' : voter.gender === 'FEMALE' ? 'Female' : voter.gender || 'Unknown';

  const primaryMatchReason =
    voter.matched_fields && voter.matched_fields.length > 0 ? voter.matched_fields[0] : null;

  return (
    <div
      onClick={() => onSelect(voter)}
      className="group relative flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 backdrop-blur-md transition-all duration-200 hover:border-emerald-500/60 hover:bg-slate-900 hover:shadow-xl hover:shadow-emerald-950/20 cursor-pointer"
    >
      <div>
        {/* Top Header: Name, Match Badges */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="text-xl font-bold tracking-tight text-white font-devanagari group-hover:text-emerald-300 transition-colors">
                {voter.name_hi || voter.name_hindi || 'अज्ञात'}
              </h3>
              <span className="text-sm font-semibold text-slate-300">
                / {voter.name_en || voter.name_english || 'Unknown'}
              </span>
            </div>

            {/* Demographics: Male • 39 Years */}
            <div className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-400">
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                  voter.gender === 'MALE'
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : voter.gender === 'FEMALE'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                <User className="h-3 w-3" />
                {genderLabel}
              </span>
              <span>•</span>
              <span className="text-slate-300 font-semibold">
                {voter.age ? `${voter.age} Years` : 'Age N/A'}
              </span>
            </div>
          </div>

          {/* Match Reason Indicator */}
          {primaryMatchReason && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 shrink-0">
              <Sparkles className="h-3 w-3 text-emerald-400" />
              {primaryMatchReason}
            </span>
          )}
        </div>

        {/* Content Body */}
        <div className="mt-3.5 space-y-2.5 text-xs">
          {/* Relation Details */}
          {(voter.relation_name_hi || voter.relation_name_en || voter.relation_name_hindi) && (
            <div className="flex items-start gap-2 rounded-xl bg-slate-950/40 p-2.5 border border-slate-800/60">
              <Users className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">
                  {getRelationLabel(voter.relation_type)}:
                </span>
                <span className="font-semibold text-slate-200 font-devanagari mr-1.5">
                  {voter.relation_name_hi || voter.relation_name_hindi || ''}
                </span>
                {(voter.relation_name_en || voter.relation_name_english) && (
                  <span className="text-slate-400">
                    / {voter.relation_name_en || voter.relation_name_english}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* House Number & EPIC */}
          <div className="grid grid-cols-2 gap-2">
            {/* House */}
            <div className="flex items-center gap-2 rounded-xl bg-slate-950/40 p-2.5 border border-slate-800/60">
              <Home className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                  House
                </span>
                <span className="font-semibold text-slate-200 truncate block">
                  {voter.house_number || 'N/A'}
                </span>
              </div>
            </div>

            {/* EPIC Number with Copy */}
            <div className="flex items-center justify-between rounded-xl bg-slate-950/40 p-2.5 border border-slate-800/60">
              <div className="truncate">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                  EPIC ID
                </span>
                <span className="font-mono font-bold text-emerald-400 truncate block">
                  {voter.epic_number || 'NO EPIC'}
                </span>
              </div>

              {voter.epic_number && (
                <button
                  type="button"
                  onClick={handleCopyEpic}
                  title="Copy EPIC"
                  className="rounded-lg bg-slate-800/80 p-1.5 text-slate-400 hover:bg-emerald-600 hover:text-white transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Location & Action Button */}
      <div className="mt-4 border-t border-slate-800/80 pt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate max-w-[210px]">
          <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span className="truncate font-medium">
            Ward {voter.ward_number || 'N/A'} • Part {voter.part_number || 'N/A'} • #{voter.source_serial_number || voter.serial_number}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onSelect(voter)}
          className="flex items-center gap-1 rounded-xl bg-emerald-600/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all shadow-sm group-hover:border-emerald-500"
        >
          <span>VIEW DETAILS</span>
          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
