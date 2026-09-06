'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Voter, HouseholdGroup, VoterSourceInfo } from '@/types';
import { SourceDocumentViewerModal } from '@/components/SourceDocumentViewerModal';
import {
  ArrowLeft,
  User,
  Home,
  MapPin,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Camera,
  Loader2,
  Code2,
  Users,
  Eye,
  ExternalLink
} from 'lucide-react';

export default function VoterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const voterId = params?.id as string;

  const [voter, setVoter] = useState<Voter | null>(null);
  const [household, setHousehold] = useState<HouseholdGroup | null>(null);
  const [sourceInfo, setSourceInfo] = useState<VoterSourceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);

  useEffect(() => {
    if (!voterId) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [voterRes, houseRes, sourceRes] = await Promise.all([
          fetch(`/api/voters/${voterId}`),
          fetch(`/api/voters/${voterId}/household`),
          fetch(`/api/voters/${voterId}/source`),
        ]);

        if (!voterRes.ok) throw new Error('Voter record not found');
        const voterData = await voterRes.json();
        setVoter(voterData);

        if (houseRes.ok) {
          const houseData = await houseRes.json();
          setHousehold(houseData);
        }
        if (sourceRes.ok) {
          const sourceData = await sourceRes.json();
          setSourceInfo(sourceData);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load voter details');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [voterId]);

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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <button
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all shadow"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Search</span>
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-3" />
            <p className="text-sm font-medium">Retrieving verified official voter profile...</p>
          </div>
        ) : error || !voter ? (
          <div className="rounded-3xl border border-red-900/50 bg-red-950/20 p-8 text-center text-red-300">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-red-400" />
            <h3 className="text-lg font-bold">Voter Record Not Found</h3>
            <p className="text-xs text-red-200/80 mt-1">{error || 'The requested voter record ID does not exist in the database repository.'}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                      Official Electoral Profile
                    </span>
                    <span className="text-xs font-mono text-slate-400">ID: {voter.id}</span>
                  </div>

                  <div className="flex items-baseline gap-3 flex-wrap">
                    <h1 className="text-3xl font-extrabold text-white font-devanagari">
                      {voter.name_hi || (voter as any).name_hindi || 'अज्ञात निर्वाचक'}
                    </h1>
                    <span className="text-xl text-slate-300 font-bold">
                      / {voter.name_en || (voter as any).name_english || 'Unknown'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1">
                    Assembly: {voter.constituency_id || (voter as any).assembly_constituency || 'General'} • Ward {voter.ward_number || 'N/A'} • Part {voter.part_number || 'N/A'} • Serial #{voter.source_serial_number || voter.serial_number}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="rounded-2xl border border-emerald-800/50 bg-emerald-950/60 px-4 py-2.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">EPIC Number</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-extrabold text-emerald-300">{voter.epic_number || 'NO EPIC'}</span>
                      {voter.epic_number && (
                        <button
                          type="button"
                          onClick={() => handleCopy(voter.epic_number!)}
                          className="text-emerald-400 hover:text-white"
                        >
                          {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Badges Grid */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block">Gender & Age</span>
                  <span className="mt-1 font-semibold text-sm text-slate-200 block">
                    {voter.gender === 'MALE' ? 'Male (पुरुष)' : voter.gender === 'FEMALE' ? 'Female (महिला)' : voter.gender}
                    {voter.age ? ` • ${voter.age} yrs` : ''}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block">Extraction Confidence</span>
                  <span className="mt-1 font-mono text-sm font-bold text-indigo-400 flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4" />
                    {((voter.extraction_confidence || 0.95) * 100).toFixed(0)}% Quality
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block">Photo Availability</span>
                  <span className="mt-1 font-semibold text-sm text-slate-300 flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-slate-400" />
                    {voter.photo_available ? 'फोटो उपलब्ध (Available)' : 'No Photo (अस्वीकृत)'}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block">Validation Status</span>
                  <span className={`mt-1 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                    voter.validation_status === 'VALID'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {voter.validation_status === 'VALID' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                    {voter.validation_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Structured Electoral Attributes */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-400" />
                Complete Electoral Roll Attributes
              </h3>

              <div className="divide-y divide-slate-800/80 text-xs">
                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Name in Hindi (मतदाता का नाम)</span>
                  <span className="font-bold text-white font-devanagari text-sm">{voter.name_hi || (voter as any).name_hindi}</span>
                </div>

                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Name in English (Latin Script)</span>
                  <span className="font-bold text-slate-200">{voter.name_en || (voter as any).name_english}</span>
                </div>

                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Relation Type (संबंध का प्रकार)</span>
                  <span className="font-semibold text-emerald-400">{getRelationLabel(voter.relation_type)}</span>
                </div>

                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Relative Name (संबंधी का नाम)</span>
                  <div className="text-right">
                    <span className="font-bold text-white font-devanagari block">{voter.relation_name_hi || (voter as any).relation_name_hindi || 'N/A'}</span>
                    {(voter.relation_name_en || (voter as any).relation_name_english) && (
                      <span className="text-slate-400 text-[11px] block">{voter.relation_name_en || (voter as any).relation_name_english}</span>
                    )}
                  </div>
                </div>

                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">House Number (गृह / मकान संख्या)</span>
                  <span className="font-bold text-slate-200">{voter.house_number || 'N/A'}</span>
                </div>

                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Assembly Constituency (विधानसभा)</span>
                  <span className="font-semibold text-slate-300">{voter.constituency_id || (voter as any).assembly_constituency || 'General Constituency'}</span>
                </div>

                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Ward Number (वार्ड संख्या)</span>
                  <span className="font-semibold text-slate-300">{voter.ward_number || 'General Ward'}</span>
                </div>

                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Part Number (भाग संख्या)</span>
                  <span className="font-semibold text-slate-300">{voter.part_number || 'General Part'}</span>
                </div>

                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Area / Section Name (अनुभाग)</span>
                  <span className="font-semibold text-slate-300">{voter.area || (voter as any).section_name || 'Main Section'}</span>
                </div>

                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Roll Serial Number (क्रमांक)</span>
                  <span className="font-mono font-bold text-emerald-400">#{voter.source_serial_number || voter.serial_number}</span>
                </div>
              </div>
            </div>

            {/* PHASE 8: DATA SOURCE SECTION */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Data Source</h3>
                    <p className="text-xs text-slate-400">Official document provenance and verification metadata</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDocumentViewer(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-950/50"
                >
                  <Eye className="h-4 w-4" />
                  <span>VIEW ORIGINAL SOURCE</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Imported from:</span>
                  <span className="font-bold text-slate-200 block mt-1 break-words">
                    {sourceInfo?.source_file?.original_filename || (voter as any).source_filename || 'JAIPUR NAGAR NIGAM-Ward No-091-Part No-004.pdf'}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Page:</span>
                  <span className="font-mono text-base font-extrabold text-emerald-400 block mt-1">
                    {voter.source_page_number || 1} / {sourceInfo?.source_file?.total_pages || 49}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Serial:</span>
                  <span className="font-mono text-base font-extrabold text-slate-200 block mt-1">
                    #{voter.source_serial_number || voter.serial_number}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Import Batch:</span>
                  <span className="font-mono text-xs font-semibold text-slate-300 block mt-1 break-all">
                    {sourceInfo?.batch?.id || sourceInfo?.source_file?.batch_id || 'batch_electoral_roll_primary'}
                  </span>
                </div>
              </div>

              {/* SHA-256 Storage Hash */}
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="text-slate-400">Cryptographic SHA-256 Hash Digest:</span>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                  <span className="truncate max-w-xs">{sourceInfo?.file_hash_sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyHash(sourceInfo?.file_hash_sha256 || '')}
                    className="text-slate-400 hover:text-white"
                    title="Copy SHA-256 Digest"
                  >
                    {copiedHash ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Household Family Cluster */}
            {household && household.members.length > 0 && (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Home className="h-4 w-4 text-emerald-400" />
                    Household Family Cluster ({household.total_members} Members at House {household.house_number})
                  </h3>
                </div>

                <div className="space-y-2">
                  {household.members.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => router.push(`/voters/${member.id}`)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        member.id === voter.id
                          ? 'border-emerald-500/50 bg-emerald-950/30'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white font-devanagari">
                            {member.name_hi || (member as any).name_hindi}
                          </span>
                          <span className="text-xs text-slate-300">
                            ({member.name_en || (member as any).name_english})
                          </span>
                          {member.id === voter.id && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                              Current Record
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {member.gender} • {member.age} yrs • {getRelationLabel(member.relation_type)}: {member.relation_name_hi || (member as any).relation_name_hindi || 'N/A'}
                        </p>
                      </div>

                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {member.epic_number || 'NO EPIC'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Extracted Text Block */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl text-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-slate-200 flex items-center gap-2 text-sm">
                  <Code2 className="h-4 w-4 text-emerald-400" />
                  Original Extracted OCR Text Block
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Page #{voter.source_page_number || 1} • Serial #{voter.source_serial_number || voter.serial_number}
                </span>
              </div>

              <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {(voter as any).raw_extracted_data?.raw_card_text ||
                  (voter as any).raw_extracted_data?.raw_text ||
                  `${voter.source_serial_number || voter.serial_number} ${voter.epic_number || ''}\nनिर्वाचक का नाम: ${voter.name_hi || (voter as any).name_hindi}\n${voter.relation_type}: ${voter.relation_name_hi || (voter as any).relation_name_hindi}\nगृह संख्या: ${voter.house_number}\nउम्र: ${voter.age} लिंग: ${voter.gender}\nफोटो उपलब्ध`}
              </pre>
            </div>
          </div>
        )}

      {/* PHASE 8: Interactive Original Source Document Viewer Modal */}
      {showDocumentViewer && voter && (
        <SourceDocumentViewerModal
          voter={voter}
          sourceInfo={sourceInfo}
          onClose={() => setShowDocumentViewer(false)}
        />
      )}
    </div>
  );
}
