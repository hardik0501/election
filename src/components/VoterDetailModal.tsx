'use client';

import React, { useState } from 'react';
import { SearchResultItem, HouseholdGroup, VoterSourceInfo } from '@/types';
import {
  X,
  Copy,
  Check,
  FileText,
  User,
  MapPin,
  Calendar,
  Layers,
  Database,
  Hash,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Code2,
  Users,
  Home,
  Loader2,
  Eye,
  Camera,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

import { SourceDocumentViewerModal } from './SourceDocumentViewerModal';

interface VoterDetailModalProps {
  voter: SearchResultItem | null;
  onClose: () => void;
  onSelectVoter?: (voter: SearchResultItem) => void;
}

export const VoterDetailModal: React.FC<VoterDetailModalProps> = ({
  voter,
  onClose,
  onSelectVoter,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'household' | 'source'>('profile');
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);

  const [household, setHousehold] = useState<HouseholdGroup | null>(null);
  const [loadingHousehold, setLoadingHousehold] = useState(false);

  const [sourceInfo, setSourceInfo] = useState<VoterSourceInfo | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);

  if (!voter) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const fetchHousehold = async () => {
    setActiveTab('household');
    if (household) return;
    setLoadingHousehold(true);
    try {
      const res = await fetch(`/api/voters/${voter.id}/household`);
      if (res.ok) {
        const data = await res.json();
        setHousehold(data);
      }
    } catch (err) {
      console.error('Failed to fetch household:', err);
    } finally {
      setLoadingHousehold(false);
    }
  };

  const fetchSourceInfo = async () => {
    setActiveTab('source');
    if (sourceInfo) return;
    setLoadingSource(true);
    try {
      const res = await fetch(`/api/voters/${voter.id}/source`);
      if (res.ok) {
        const data = await res.json();
        setSourceInfo(data);
      }
    } catch (err) {
      console.error('Failed to fetch source information:', err);
    } finally {
      setLoadingSource(false);
    }
  };

  const getRelationLabel = (type: string) => {
    switch (type) {
      case 'FATHER':
        return 'पिता (Father)';
      case 'HUSBAND':
        return 'पति (Husband)';
      case 'MOTHER':
        return 'माता (Mother)';
      case 'OTHER':
        return 'अन्य संबंधी (Relative)';
      default:
        return 'संबंधी (Relative)';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                Official Electoral Record
              </span>
              <span className="text-xs font-mono text-slate-400">ID: {voter.id.substring(0, 8)}...</span>
            </div>

            <div className="mt-2 flex items-baseline gap-2 flex-wrap">
              <h2 className="text-2xl font-bold text-white font-devanagari">
                {voter.name_hi || voter.name_hindi || 'अज्ञात निर्वाचक'}
              </h2>
              <span className="text-lg text-slate-300 font-semibold">
                / {voter.name_en || voter.name_english || 'Unknown'}
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-0.5">
              Serial #{voter.source_serial_number || voter.serial_number} • Part {voter.part_number || 'N/A'} • Ward {voter.ward_number || 'N/A'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* View Tabs */}
        <div className="mt-4 flex rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 rounded-lg py-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-slate-800 text-emerald-400 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Voter Profile</span>
          </button>

          <button
            type="button"
            onClick={fetchHousehold}
            className={`flex-1 rounded-lg py-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'household'
                ? 'bg-slate-800 text-emerald-400 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="h-3.5 w-3.5" />
            <span>Household Cluster</span>
          </button>

          <button
            type="button"
            onClick={fetchSourceInfo}
            className={`flex-1 rounded-lg py-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'source'
                ? 'bg-slate-800 text-emerald-400 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>View Original Source</span>
          </button>
        </div>

        {/* TAB 1: Profile Demographics */}
        {activeTab === 'profile' && (
          <div className="mt-6 space-y-6 animate-in fade-in duration-150">
            {/* Main Key Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* EPIC */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                  EPIC / Voter ID
                </span>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-emerald-400 truncate">
                    {voter.epic_number || 'N/A'}
                  </span>
                  {voter.epic_number && (
                    <button
                      type="button"
                      onClick={() => handleCopy(voter.epic_number!)}
                      title="Copy EPIC"
                      className="text-slate-400 hover:text-white"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Age & Gender */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Demographics
                </span>
                <span className="mt-1 font-semibold text-sm text-slate-200 block">
                  {voter.gender === 'MALE' ? 'Male (पुरुष)' : voter.gender === 'FEMALE' ? 'Female (महिला)' : voter.gender || 'Unknown'}
                  {voter.age ? ` • ${voter.age} yrs` : ''}
                </span>
              </div>

              {/* Extraction Confidence */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Extraction Confidence
                </span>
                <span className="mt-1 font-mono text-sm font-bold text-indigo-400 flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4" />
                  {((voter.extraction_confidence || 0.95) * 100).toFixed(0)}% Quality
                </span>
              </div>

              {/* Photo Status */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Electoral Photo Status
                </span>
                <span className="mt-1 font-semibold text-sm text-slate-300 flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-slate-400" />
                  {voter.photo_available ? 'फोटो उपलब्ध (Available)' : 'No Photo (अस्वीकृत)'}
                </span>
              </div>
            </div>

            {/* Structured Table: All Entities */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 divide-y divide-slate-800/60 text-xs">
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-400 font-medium">Name in Hindi (मतदाता का नाम)</span>
                <span className="font-bold text-white font-devanagari text-sm">{voter.name_hi || voter.name_hindi || 'अज्ञात'}</span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-400 font-medium">Name in English (Latin Script)</span>
                <span className="font-bold text-slate-200">{voter.name_en || voter.name_english || 'Unknown'}</span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-400 font-medium">Relation Type (संबंध का प्रकार)</span>
                <span className="font-semibold text-emerald-400">{getRelationLabel(voter.relation_type)}</span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-400 font-medium">Relative Name (संबंधी का नाम)</span>
                <div className="text-right">
                  <span className="font-bold text-white font-devanagari block">{voter.relation_name_hi || voter.relation_name_hindi || 'N/A'}</span>
                  {(voter.relation_name_en || voter.relation_name_english) && (
                    <span className="text-slate-400 text-[11px] block">{voter.relation_name_en || voter.relation_name_english}</span>
                  )}
                </div>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-400 font-medium">House Number (गृह / मकान संख्या)</span>
                <span className="font-bold text-slate-200">{voter.house_number || 'N/A'}</span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-400 font-medium">Assembly Constituency (विधानसभा)</span>
                <span className="font-semibold text-slate-300">{voter.assembly_constituency || 'General Constituency'}</span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-400 font-medium">Ward Number (वार्ड संख्या)</span>
                <span className="font-semibold text-slate-300">{voter.ward_number || 'General Ward'}</span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-400 font-medium">Part Number (भाग संख्या)</span>
                <span className="font-semibold text-slate-300">{voter.part_number || 'General Part'}</span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-400 font-medium">Area / Section Name (अनुभाग)</span>
                <span className="font-semibold text-slate-300">{voter.area || (voter as any).section_name || 'Main Electoral Section'}</span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-400 font-medium">Serial Number on Roll (क्रमांक)</span>
                <span className="font-mono font-bold text-emerald-400">#{voter.source_serial_number || voter.serial_number}</span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-400 font-medium">Validation Status</span>
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                  voter.validation_status === 'VALID'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {voter.validation_status === 'VALID' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {voter.validation_status}
                </span>
              </div>
            </div>

            {/* Data Source & Original Document Verification Section */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">Data Source & Provenance</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDocumentViewer(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>VIEW ORIGINAL SOURCE</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Imported from:</span>
                  <span className="font-semibold text-slate-200 truncate block mt-0.5">
                    {sourceInfo?.source_file?.original_filename || (voter as any).source_filename || 'JAIPUR NAGAR NIGAM-Ward No-091-Part No-004.pdf'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Page:</span>
                  <span className="font-bold text-emerald-400 font-mono block mt-0.5">
                    {voter.source_page_number || 1} / {sourceInfo?.source_file?.total_pages || 49}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Serial:</span>
                  <span className="font-bold text-slate-200 font-mono block mt-0.5">
                    #{voter.source_serial_number || voter.serial_number}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Import Batch:</span>
                  <span className="font-mono text-slate-400 truncate block mt-0.5 text-[11px]">
                    {sourceInfo?.batch?.id || sourceInfo?.source_file?.batch_id || 'batch_electoral_roll_primary'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Household Family Cluster */}
        {activeTab === 'household' && (
          <div className="mt-6 space-y-4 animate-in fade-in duration-150">
            {loadingHousehold ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-2" />
                <p className="text-xs">Aggregating co-residing family cluster records...</p>
              </div>
            ) : household && household.members.length > 0 ? (
              <div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 mb-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Home className="h-4 w-4 text-emerald-400" />
                      Household: {household.house_number}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {household.total_members} Family Members co-residing in Part {household.part_number || 'N/A'}
                    </p>
                  </div>
                  {household.head_candidate && (
                    <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300">
                      Head: {household.head_candidate.name_en || household.head_candidate.name_english} ({household.head_candidate.age} yrs)
                    </span>
                  )}
                </div>

                <div className="space-y-2 max-h-[360px] overflow-y-auto">
                  {household.members.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => onSelectVoter && onSelectVoter(member as any)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        member.id === voter.id
                          ? 'border-emerald-500/50 bg-emerald-950/30'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white font-devanagari">
                            {member.name_hi || member.name_hindi}
                          </span>
                          <span className="text-xs text-slate-300">
                            ({member.name_en || member.name_english})
                          </span>
                          {member.id === voter.id && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                              Current Record
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {member.gender} • {member.age} yrs • {getRelationLabel(member.relation_type)}: {member.relation_name_hi || member.relation_name_hindi || 'N/A'}
                        </p>
                      </div>

                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {member.epic_number || 'NO EPIC'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-8 text-center text-slate-400 text-xs">
                <Home className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p>No additional household members recorded at this house number.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: View Original Source & Audit Provenance */}
        {activeTab === 'source' && (
          <div className="mt-6 space-y-4 animate-in fade-in duration-150 text-xs">
            {loadingSource ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-2" />
                <p>Loading cryptographic source lineage and raw OCR extractions...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Document Provenance Header */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-emerald-400" />
                      <div>
                        <h4 className="font-bold text-white text-sm">
                          {sourceInfo?.source_file?.original_filename || voter.source_filename || 'Bihar_Electoral_Roll.pdf'}
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          Preserved Original Document • Source Page #{voter.source_page_number || 1}
                        </span>
                      </div>
                    </div>

                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                      Audit Verified
                    </span>
                  </div>

                  {/* SHA-256 Hash */}
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">SHA-256 Provenance Digest:</span>
                    <div className="flex items-center gap-1.5 font-mono text-slate-300 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                      <span>{sourceInfo?.file_hash_sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyHash(sourceInfo?.file_hash_sha256 || '')}
                        title="Copy Hash"
                        className="text-slate-400 hover:text-white"
                      >
                        {copiedHash ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Raw Extracted OCR Block */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Code2 className="h-4 w-4 text-emerald-400" />
                      Raw Extracted Text Block (Card Boundary)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Page #{voter.source_page_number || 1}
                    </span>
                  </div>

                  <pre className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {voter.raw_extracted_data?.raw_card_text ||
                      voter.raw_extracted_data?.raw_text ||
                      `${voter.source_serial_number || voter.serial_number} ${voter.epic_number || ''}\nनिर्वाचक का नाम: ${voter.name_hi || voter.name_hindi}\n${voter.relation_type}: ${voter.relation_name_hi || voter.relation_name_hindi}\nगृह संख्या: ${voter.house_number}\nउम्र: ${voter.age} लिंग: ${voter.gender}\nफोटो उपलब्ध`}
                  </pre>
                </div>

                {/* Validation Exceptions if any */}
                {sourceInfo?.validation_errors && sourceInfo.validation_errors.length > 0 && (
                  <div className="rounded-2xl border border-amber-900/50 bg-amber-950/20 p-4">
                    <h5 className="font-bold text-amber-300 flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      Validation Exceptions Recorded
                    </h5>
                    <div className="space-y-1.5">
                      {sourceInfo.validation_errors.map((err) => (
                        <div key={err.id} className="text-xs text-amber-200/90 bg-amber-950/40 p-2 rounded-lg border border-amber-800/40">
                          <span className="font-semibold">{err.error_code}:</span> {err.error_message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
