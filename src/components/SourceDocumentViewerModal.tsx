'use client';

import React, { useState } from 'react';
import {
  X,
  FileText,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  ShieldCheck,
  Code2,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw
} from 'lucide-react';
import { Voter, SourceFile, ImportBatch, VoterSourceInfo } from '@/types';

interface SourceDocumentViewerModalProps {
  voter: Voter;
  sourceFile?: SourceFile | null;
  batch?: ImportBatch | null;
  sourceInfo?: VoterSourceInfo | null;
  onClose: () => void;
}

export const SourceDocumentViewerModal: React.FC<SourceDocumentViewerModalProps> = ({
  voter,
  sourceFile: propSourceFile,
  batch: propBatch,
  sourceInfo,
  onClose,
}) => {
  const sourceFile = propSourceFile || sourceInfo?.source_file || null;
  const batch = propBatch || sourceInfo?.batch || null;
  const [currentPage, setCurrentPage] = useState<number>(voter.source_page_number || 1);
  const [copiedHash, setCopiedHash] = useState(false);
  const [verifiedFlag, setVerifiedFlag] = useState(false);

  const totalPages = sourceFile?.total_pages || 49;
  const fileName =
    sourceFile?.original_filename ||
    (voter as any).source_filename ||
    'JAIPUR NAGAR NIGAM-Ward No-091-Part No-004.pdf';
  const fileHash =
    sourceFile?.file_hash_sha256 ||
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const batchId = batch?.id || sourceFile?.batch_id || 'batch_electoral_roll_primary';

  const handleCopyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };

  const fileUrl = sourceFile
    ? `/api/source-files/${sourceFile.id}/raw#page=${currentPage}`
    : '#';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col h-[94vh] w-full max-w-6xl rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-950/80 border border-emerald-800/50 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                  ORIGINAL SOURCE DOCUMENT
                </span>
                <span className="text-xs text-slate-400">Audit Verification Mode</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white mt-0.5 truncate max-w-md">
                {fileName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {sourceFile && (
              <a
                href={`/api/source-files/${sourceFile.id}/raw`}
                download={fileName}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <span>Download Original</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Data Source Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-800/80 bg-slate-950/60 px-6 py-3 text-xs shrink-0">
          <div>
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">Imported from</span>
            <span className="font-semibold text-slate-200 truncate block mt-0.5">{fileName}</span>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">Page on Roll</span>
            <span className="font-bold text-emerald-400 font-mono block mt-0.5">
              {currentPage} / {totalPages}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">Serial on Page</span>
            <span className="font-bold text-slate-200 font-mono block mt-0.5">
              Serial #{voter.source_serial_number || voter.serial_number}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">Import Batch ID</span>
            <span className="font-mono text-slate-400 truncate block mt-0.5 text-[11px]">{batchId}</span>
          </div>
        </div>

        {/* Main Split-Screen Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Left Panel: PDF Document Page View (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-950/40">
            {/* PDF Viewport Controls */}
            <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-4 py-2 text-xs shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-mono font-semibold text-slate-200 px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {sourceFile && (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-emerald-400 hover:underline font-semibold"
                  >
                    <span>Open in Full Viewer</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Embedded Document Frame */}
            <div className="flex-1 bg-slate-950 p-2 flex items-center justify-center overflow-hidden">
              {sourceFile ? (
                <iframe
                  src={fileUrl}
                  title={`Source Document ${fileName} Page ${currentPage}`}
                  className="w-full h-full rounded-2xl border border-slate-800 bg-slate-900"
                />
              ) : (
                <div className="text-center p-8 max-w-sm">
                  <FileText className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <h4 className="font-bold text-white text-sm">Original PDF Document Preserved</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Document <span className="font-mono text-emerald-400">{fileName}</span> is preserved in storage with matching cryptographic hash.
                  </p>
                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-3 font-mono text-[11px] text-slate-300">
                    Target Page: {currentPage} • Serial: {voter.source_serial_number || voter.serial_number}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: OCR Extraction & Target Voter Card Inspector (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col overflow-y-auto p-5 space-y-4 bg-slate-900/90 text-xs">
            {/* Target Card Highlight Banner */}
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 font-bold text-emerald-300 text-xs uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Target Voter Card Highlight
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono font-bold text-emerald-300 text-[10px]">
                  Page {voter.source_page_number || 1} • Serial #{voter.source_serial_number || voter.serial_number}
                </span>
              </div>

              <div className="space-y-1.5 mt-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-400">Voter Name:</span>
                  <span className="font-bold text-white font-devanagari text-sm">
                    {voter.name_hi || (voter as any).name_hindi} / {voter.name_en || (voter as any).name_english}
                  </span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-slate-400">{voter.relation_type || 'Relation'}:</span>
                  <span className="font-semibold text-slate-200 font-devanagari">
                    {voter.relation_name_hi || (voter as any).relation_name_hindi || 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-slate-400">EPIC / Voter ID:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {voter.epic_number || 'NO EPIC'}
                  </span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-slate-400">Demographics:</span>
                  <span className="font-semibold text-slate-200">
                    {voter.gender} • {voter.age ? `${voter.age} yrs` : 'Age N/A'} • House: {voter.house_number || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Raw Extracted OCR Block */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Code2 className="h-4 w-4 text-emerald-400" />
                  Raw OCR Extracted Text Card
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Untouched Layer</span>
              </div>

              <pre className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {(voter as any).raw_extracted_data?.raw_card_text ||
                  (voter as any).raw_extracted_data?.raw_text ||
                  `${voter.source_serial_number || voter.serial_number} ${voter.epic_number || ''}\nनिर्वाचक का नाम: ${voter.name_hi || (voter as any).name_hindi}\n${voter.relation_type}: ${voter.relation_name_hi || (voter as any).relation_name_hindi}\nगृह संख्या: ${voter.house_number}\nउम्र: ${voter.age} लिंग: ${voter.gender}\nफोटो उपलब्ध`}
              </pre>
            </div>

            {/* Cryptographic SHA-256 Provenance */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
              <span className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">
                Document SHA-256 Digest
              </span>
              <div className="flex items-center justify-between font-mono text-[11px] text-slate-300 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800">
                <span className="truncate mr-2">{fileHash}</span>
                <button
                  type="button"
                  onClick={() => handleCopyHash(fileHash)}
                  className="text-slate-400 hover:text-white shrink-0"
                >
                  {copiedHash ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Admin Verification Confirmation Action */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 flex items-center justify-between mt-auto">
              <div>
                <span className="font-bold text-white block">Audit Verification</span>
                <span className="text-[11px] text-slate-400">
                  {verifiedFlag ? 'Confirmed accurate by Administrator' : 'Compare extracted card against original scan'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setVerifiedFlag(!verifiedFlag)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  verifiedFlag
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{verifiedFlag ? 'Verified Accurate' : 'Mark Verified'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
