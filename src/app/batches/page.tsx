'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  Layers,
  Database,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FileSpreadsheet,
  FileType as FileIcon,
  Eye,
  Sliders,
  Download,
  Check,
  X,
  AlertOctagon,
  Sparkles,
  HelpCircle,
  FileCode
} from 'lucide-react';
import {
  ImportBatch,
  SourceFile,
  IngestionProgress,
  ColumnMappingConfig,
  CsvPreviewResponse,
  ImportReport,
} from '@/types';
import { GeminiKeyModal } from '@/components/GeminiKeyModal';

export default function BatchesPage() {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedBatchFiles, setSelectedBatchFiles] = useState<SourceFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [geminiConfigured, setGeminiConfigured] = useState(false);

  useEffect(() => {
    fetch('/api/settings/api-key')
      .then((res) => res.json())
      .then((data) => setGeminiConfigured(!!data.configured))
      .catch(() => {});
  }, []);

  // Active Job Progress
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [activeProgress, setActiveProgress] = useState<IngestionProgress | null>(null);

  // Batch Report Modal
  const [reportModal, setReportModal] = useState<ImportReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Form State
  const [batchName, setBatchName] = useState('');
  const [assembly, setAssembly] = useState('');
  const [ward, setWard] = useState('');
  const [partNo, setPartNo] = useState('');
  const [district, setDistrict] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // CSV / XLSX Preview & Column Mapping State
  const [previewData, setPreviewData] = useState<CsvPreviewResponse | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMappingConfig>({});
  const [showMappingModal, setShowMappingModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/batches');
      const data = await res.json();
      setBatches(data.batches || []);
    } catch (e) {
      console.error('Error fetching batches:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/batches/${id}`);
      const data = await res.json();
      setSelectedBatchId(id);
      setSelectedBatchFiles(data.source_files || []);
    } catch (e) {
      console.error('Error fetching batch details:', e);
    }
  };

  const fetchBatchReport = async (id: string) => {
    setLoadingReport(true);
    try {
      const res = await fetch(`/api/batches/${id}/report`);
      const data = await res.json();
      setReportModal(data);
    } catch (e) {
      console.error('Failed to load batch report:', e);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  // Poll progress for active batch
  useEffect(() => {
    if (!activeBatchId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/batches/${activeBatchId}/progress`);
        if (res.ok) {
          const prog: IngestionProgress = await res.json();
          setActiveProgress(prog);

          if (
            prog.current_stage === 'COMPLETED' ||
            prog.current_stage === 'COMPLETED_WITH_WARNINGS' ||
            prog.current_stage === 'FAILED'
          ) {
            setUploading(false);
            fetchBatches();
            if (prog.current_stage === 'FAILED') {
              setUploadError(prog.stage_message || 'Batch failed');
            } else {
              setUploadSuccess(
                `Batch finished: ${prog.records_detected} records detected (${prog.records_valid} valid, ${prog.warnings_count} flagged).`
              );
            }
            clearInterval(interval);
          }
        }
      } catch (e) {
        console.error('Progress poll error:', e);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeBatchId]);

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles(files);
      await checkAndTriggerPreview(files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      await checkAndTriggerPreview(files[0]);
    }
  };

  const checkAndTriggerPreview = async (file: File) => {
    const ext = file.name.split('.').pop()?.toUpperCase();
    if (ext === 'CSV' || ext === 'XLSX' || ext === 'XLS') {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload/preview', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const preview: CsvPreviewResponse = await res.json();
          setPreviewData(preview);
          setColumnMapping(preview.suggested_mapping || {});
          setShowMappingModal(true);
        }
      } catch (err) {
        console.error('Preview error:', err);
      }
    }
  };

  const handleUploadSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedFiles.length === 0) {
      setUploadError('Please select at least one file (PDF, CSV, or XLSX).');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    setShowMappingModal(false);

    try {
      const formData = new FormData();
      if (batchName) formData.append('batch_name', batchName);
      if (assembly) formData.append('assembly', assembly);
      if (ward) formData.append('ward', ward);
      if (partNo) formData.append('part_no', partNo);
      if (district) formData.append('district', district);

      if (Object.keys(columnMapping).length > 0) {
        formData.append('column_mapping', JSON.stringify(columnMapping));
      }

      for (const file of selectedFiles) {
        formData.append('files', file);
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process electoral upload');
      }

      setActiveBatchId(data.batch_id);
      setActiveProgress({
        percentage: 10,
        current_stage: 'QUEUED',
        current_page: 1,
        total_pages: 1,
        records_detected: 0,
        records_valid: 0,
        warnings_count: 0,
        errors_count: 0,
        duplicates_count: 0,
        current_file: selectedFiles[0]?.name || '',
        elapsed_ms: 0,
        stage_message: 'Job queued in background. Ingestion starting...',
      });

      fetchBatches();
    } catch (err: any) {
      setUploadError(err.message || 'Error occurred during ingestion');
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Data Ingestion & Electoral Roll Hub
            </h1>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              Phase 4 Ingestion Engine
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Multi-page PDF processor with OCR fallback, interactive CSV/XLSX column mapping, and live background ingestion tracking.
          </p>
        </div>

        <button
          onClick={fetchBatches}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Batches</span>
        </button>
      </div>

      {/* Live Active Ingestion Progress Bar Card */}
      {uploading && activeProgress && (
        <div className="rounded-3xl border border-emerald-500/40 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    Ingestion in Progress...
                  </h3>
                  <span className="rounded-md bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 font-mono text-xs font-bold text-emerald-300 uppercase">
                    {activeProgress.current_stage}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{activeProgress.stage_message}</p>
              </div>
            </div>

            <span className="text-2xl font-mono font-extrabold text-emerald-400">
              {activeProgress.percentage}%
            </span>
          </div>

          {/* Progress Visual Bar */}
          <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 transition-all duration-300"
              style={{ width: `${activeProgress.percentage}%` }}
            />
          </div>

          {/* Live Progress Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs">
            <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Pages Processed</span>
              <span className="font-mono font-bold text-white">
                {activeProgress.current_page} / {activeProgress.total_pages}
              </span>
            </div>

            <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Records Detected</span>
              <span className="font-mono font-bold text-emerald-400">
                {activeProgress.records_detected.toLocaleString()}
              </span>
            </div>

            <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Valid Records</span>
              <span className="font-mono font-bold text-teal-400">
                {activeProgress.records_valid.toLocaleString()}
              </span>
            </div>

            <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Warnings / Flagged</span>
              <span className="font-mono font-bold text-amber-400">
                {activeProgress.warnings_count.toLocaleString()}
              </span>
            </div>

            <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Errors / Discarded</span>
              <span className="font-mono font-bold text-rose-400">
                {activeProgress.errors_count.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Upload Dropzone Form */}
      <form onSubmit={handleUploadSubmit} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-bold text-white">
            <UploadCloud className="h-5 w-5 text-emerald-400" />
            <span>Ingest Electoral Roll (PDF, CSV, XLSX)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGeminiModal(true)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                geminiConfigured
                  ? 'border-purple-500/40 bg-purple-950/40 text-purple-300 hover:bg-purple-900/50'
                  : 'border-amber-500/40 bg-amber-950/40 text-amber-300 hover:bg-amber-900/50 animate-pulse'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              <span>{geminiConfigured ? 'Gemini AI Vision Active' : 'Configure Gemini API Key'}</span>
            </button>

            {previewData && (
              <button
                type="button"
                onClick={() => setShowMappingModal(true)}
                className="flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-300 hover:bg-teal-500/20 transition-colors"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>Configure Column Mapping ({previewData.headers.length} Columns)</span>
              </button>
            )}
          </div>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/60 p-8 text-center transition-all hover:border-emerald-500 hover:bg-slate-950 cursor-pointer"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-emerald-400 border border-slate-800 group-hover:scale-110 transition-transform">
            <UploadCloud className="h-7 w-7" />
          </div>

          <p className="mt-4 text-base font-bold text-slate-200">
            Click to upload or drag & drop electoral files
          </p>
          <p className="mt-1 text-xs text-slate-400">
            PDF Electoral Rolls, Scanned Images (.png, .jpg, .webp), CSV spreadsheets, and Excel tables.
          </p>

          <div className="mt-3 flex items-center gap-2 text-[11px] text-purple-300 bg-purple-950/40 border border-purple-800/30 px-3 py-1 rounded-full">
            <Sparkles className="h-3 w-3 text-purple-400" />
            <span>Google Gemini AI Vision automatically scans voter boxes and Devanagari/English text</span>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {selectedFiles.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800/60 px-3 py-1 text-xs font-semibold text-emerald-300"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {f.name} ({(f.size / 1024).toFixed(0)} KB)
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Metadata Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Batch Title</label>
            <input
              type="text"
              placeholder="e.g. Ward 14 Mother Roll 2026"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Assembly Constituency</label>
            <input
              type="text"
              placeholder="e.g. 182-Patna Sahib"
              value={assembly}
              onChange={(e) => setAssembly(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Ward Number</label>
            <input
              type="text"
              placeholder="e.g. 14"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Part Number</label>
            <input
              type="text"
              placeholder="e.g. 102"
              value={partNo}
              onChange={(e) => setPartNo(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">District</label>
            <input
              type="text"
              placeholder="e.g. Patna"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Feedback Messages */}
        {uploadError && (
          <div className="rounded-xl border border-rose-900/50 bg-rose-950/30 p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{uploadError}</span>
          </div>
        )}

        {uploadSuccess && (
          <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-3 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{uploadSuccess}</span>
          </div>
        )}

        {/* Submit Action */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={uploading || selectedFiles.length === 0}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-xs font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Queueing & Ingesting Dataset...</span>
              </>
            ) : (
              <>
                <span>Start Ingestion Pipeline</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Batches Overview Table */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Database className="h-5 w-5 text-emerald-400" />
          <span>Ingested Import Batches ({batches.length})</span>
        </h3>

        {batches.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
            No batches imported yet. Upload a PDF or CSV electoral roll file above to begin.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Batch Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Files</th>
                  <th className="px-4 py-3">Processed</th>
                  <th className="px-4 py-3">Valid</th>
                  <th className="px-4 py-3">Flagged</th>
                  <th className="px-4 py-3">Created At</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {batches.map((b) => (
                  <tr
                    key={b.id}
                    className={`hover:bg-slate-800/50 transition-colors ${
                      selectedBatchId === b.id ? 'bg-slate-800/70 border-l-2 border-emerald-400' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-white">
                      {b.batch_name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          b.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : b.status === 'COMPLETED_WITH_WARNINGS'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : b.status === 'PROCESSING' || b.status === 'PARSING' || b.status === 'OCR_PROCESSING'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {(b.status === 'COMPLETED' || b.status === 'COMPLETED_WITH_WARNINGS') && (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">{b.total_files}</td>
                    <td className="px-4 py-3 font-mono font-bold text-white">
                      {b.total_records_processed.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-400">
                      {b.total_records_valid.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-amber-400">
                      {b.total_records_flagged.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(b.created_at).toLocaleDateString()} {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fetchBatchDetails(b.id)}
                          className="flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-600 hover:text-slate-950 font-semibold transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" /> Files
                        </button>
                        <button
                          type="button"
                          onClick={() => fetchBatchReport(b.id)}
                          className="flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-xs text-teal-400 hover:bg-teal-600 hover:text-slate-950 font-semibold transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5" /> Report
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Batch Files Inspection Card */}
      {selectedBatchId && selectedBatchFiles.length > 0 && (
        <div className="rounded-3xl border border-indigo-900/40 bg-slate-900/90 p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base font-bold text-white">
              <ShieldCheck className="h-5 w-5 text-indigo-400" />
              <span>Preserved Raw Source Files & SHA-256 Digest Lineage</span>
            </div>

            <span className="text-xs text-slate-400">
              {selectedBatchFiles.length} file(s) in batch
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedBatchFiles.map((file) => (
              <div
                key={file.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100 flex items-center gap-1.5 truncate">
                    <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="truncate">{file.original_filename}</span>
                  </span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                    {file.file_type} • {file.total_pages} page(s)
                  </span>
                </div>

                <div className="text-slate-400">
                  <span>Size: {(file.file_size_bytes / 1024).toFixed(1)} KB</span>
                </div>

                <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">SHA-256 Digest:</span>
                  <span className="font-mono text-[11px] text-emerald-400 break-all select-all">
                    {file.file_hash_sha256}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSV / XLSX Column Mapping Modal */}
      {showMappingModal && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-400 border border-teal-500/20">
                    Interactive Field Mapping
                  </span>
                  <span className="text-xs text-slate-400">{previewData.total_rows_estimate} estimated records</span>
                </div>
                <h3 className="mt-1 text-xl font-bold text-white">
                  Map Spreadsheet Columns to Electoral Database Schema
                </h3>
              </div>
              <button
                onClick={() => setShowMappingModal(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mapping Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Voter Name (Hindi / English)</label>
                <select
                  value={columnMapping.name_auto || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, name_auto: e.target.value || undefined })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
                >
                  <option value="">-- Select Column --</option>
                  {previewData.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">EPIC / Voter ID</label>
                <select
                  value={columnMapping.epic_number || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, epic_number: e.target.value || undefined })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
                >
                  <option value="">-- Select Column --</option>
                  {previewData.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Relative Name</label>
                <select
                  value={columnMapping.relation_name || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, relation_name: e.target.value || undefined })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
                >
                  <option value="">-- Select Column --</option>
                  {previewData.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Relation Type</label>
                <select
                  value={columnMapping.relation_type || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, relation_type: e.target.value || undefined })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
                >
                  <option value="">-- Select Column --</option>
                  {previewData.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Gender</label>
                <select
                  value={columnMapping.gender || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, gender: e.target.value || undefined })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
                >
                  <option value="">-- Select Column --</option>
                  {previewData.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Age</label>
                <select
                  value={columnMapping.age || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, age: e.target.value || undefined })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
                >
                  <option value="">-- Select Column --</option>
                  {previewData.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">House Number</label>
                <select
                  value={columnMapping.house_number || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, house_number: e.target.value || undefined })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
                >
                  <option value="">-- Select Column --</option>
                  {previewData.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Ward Number</label>
                <select
                  value={columnMapping.ward_number || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, ward_number: e.target.value || undefined })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
                >
                  <option value="">-- Select Column --</option>
                  {previewData.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Part Number</label>
                <select
                  value={columnMapping.part_number || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, part_number: e.target.value || undefined })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200"
                >
                  <option value="">-- Select Column --</option>
                  {previewData.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sample Rows Preview Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Sample Raw Rows Preview (Top 5)
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-[11px] text-slate-300">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                    <tr>
                      {previewData.headers.map((h) => (
                        <th key={h} className="px-3 py-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {previewData.sample_rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {previewData.headers.map((h) => (
                          <td key={h} className="px-3 py-1.5 whitespace-nowrap">{String(row[h] || '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowMappingModal(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUploadSubmit()}
                className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
              >
                Confirm Mapping & Ingest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Import Summary Report Modal */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                    Import Quality & Audit Report
                  </span>
                  <span className="text-xs text-slate-400">Batch ID: {reportModal.batch_id.slice(0, 8)}...</span>
                </div>
                <h3 className="mt-1 text-2xl font-bold text-white">{reportModal.batch_name}</h3>
              </div>
              <button
                onClick={() => setReportModal(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* High Level Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-2xl bg-slate-950 p-3 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Processed</span>
                <span className="text-xl font-mono font-bold text-white">
                  {reportModal.records_processed.toLocaleString()}
                </span>
              </div>

              <div className="rounded-2xl bg-slate-950 p-3 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Valid Records</span>
                <span className="text-xl font-mono font-bold text-emerald-400">
                  {reportModal.records_valid.toLocaleString()} ({reportModal.summary.valid_pct}%)
                </span>
              </div>

              <div className="rounded-2xl bg-slate-950 p-3 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Flagged / Warnings</span>
                <span className="text-xl font-mono font-bold text-amber-400">
                  {reportModal.records_flagged.toLocaleString()}
                </span>
              </div>

              <div className="rounded-2xl bg-slate-950 p-3 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Average Confidence</span>
                <span className="text-xl font-mono font-bold text-indigo-400">
                  {(reportModal.summary.avg_confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Error Breakdown */}
            {Object.keys(reportModal.summary.error_breakdown).length > 0 && (
              <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <AlertOctagon className="h-4 w-4 text-amber-400" />
                  <span>Validation Warning & Exception Breakdown</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.entries(reportModal.summary.error_breakdown).map(([code, count]) => (
                    <div key={code} className="flex justify-between rounded-lg bg-slate-900 p-2 border border-slate-800">
                      <span className="font-mono text-slate-300">{code}</span>
                      <span className="font-bold text-amber-400">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Source Files Provenance List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Source Files Ingested ({reportModal.files.length})
              </h4>
              <div className="space-y-2">
                {reportModal.files.map((f) => (
                  <div key={f.id} className="flex flex-wrap items-center justify-between rounded-xl bg-slate-950 p-3 border border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-400" />
                      <span className="font-semibold text-white">{f.filename}</span>
                      <span className="text-slate-500">({f.file_type} • {f.total_pages} page(s))</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 truncate max-w-[200px]">
                      SHA256: {f.file_hash_sha256.slice(0, 16)}...
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <a
                href={`/api/batches/${reportModal.batch_id}/report?format=json_download`}
                download
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <span>Download Report (JSON)</span>
              </a>
              <button
                type="button"
                onClick={() => setReportModal(null)}
                className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gemini AI Key Setup Modal */}
      <GeminiKeyModal
        isOpen={showGeminiModal}
        onClose={() => setShowGeminiModal(false)}
        onSaved={() => setGeminiConfigured(true)}
      />
    </div>
  );
}
