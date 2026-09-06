import { storageService } from '../storage/file-storage';
import { dbRepository } from '../db/database';
import { tabularParser, ParsedRecordDraft } from '../parsers/csv-parser';
import { pdfElectoralRollParser } from '../parsers/pdf-parser';
import { geminiElectoralExtractor } from '../ocr/gemini-extractor';
import {
  ImportBatch,
  SourceFile,
  FileType,
  BatchStatus,
  IngestionProgress,
  ColumnMappingConfig,
  ImportReport,
  ValidationError,
  Voter,
} from '@/types';
import crypto from 'crypto';

export interface IngestionOptions {
  batchName?: string;
  metadata?: Record<string, any>;
  columnMapping?: ColumnMappingConfig;
  files: {
    filename: string;
    buffer: Buffer;
    fileType: FileType;
  }[];
}

export class IngestionProcessor {
  private progressMap = new Map<string, IngestionProgress>();

  /**
   * Get real-time progress for an active or completed batch
   */
  public getProgress(batchId: string): IngestionProgress | null {
    return this.progressMap.get(batchId) || null;
  }

  /**
   * Set progress state
   */
  private updateProgress(batchId: string, progress: Partial<IngestionProgress>) {
    const current = this.progressMap.get(batchId) || {
      percentage: 0,
      current_stage: 'QUEUED',
      current_page: 0,
      total_pages: 1,
      records_detected: 0,
      records_valid: 0,
      warnings_count: 0,
      errors_count: 0,
      duplicates_count: 0,
      current_file: '',
      elapsed_ms: 0,
      stage_message: 'Initializing ingestion queue...',
    };

    const updated = { ...current, ...progress };
    this.progressMap.set(batchId, updated);
  }

  /**
   * Start an ingestion job asynchronously in background
   */
  public async queueBatch(
    options: IngestionOptions,
    autoStartBackground: boolean = true
  ): Promise<{ batch: ImportBatch; sourceFiles: SourceFile[] }> {
    const batchName = options.batchName || `Batch_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const batch = await dbRepository.createBatch(batchName, {
      ...options.metadata,
      column_mapping: options.columnMapping,
    });

    await dbRepository.updateBatch(batch.id, { status: 'QUEUED' });

    this.updateProgress(batch.id, {
      percentage: 5,
      current_stage: 'QUEUED',
      stage_message: 'Files uploaded. Persisting raw storage and calculating cryptographic SHA-256 digests...',
    });

    const createdSourceFiles: SourceFile[] = [];

    for (const fileInput of options.files) {
      const stored = await storageService.saveFile(batch.id, fileInput.filename, fileInput.buffer);
      const sourceFile = await dbRepository.createSourceFile({
        batch_id: batch.id,
        original_filename: fileInput.filename,
        storage_path: stored.storagePath,
        file_type: fileInput.fileType,
        file_hash_sha256: stored.fileHashSha256,
        file_size_bytes: stored.fileSizeBytes,
        total_pages: 1,
        parsing_status: 'PENDING',
        parsing_metrics: {},
      });
      createdSourceFiles.push(sourceFile);
    }

    // Trigger background execution without blocking request if requested
    if (autoStartBackground) {
      this.processBatchAsync(batch.id, options, createdSourceFiles).catch((err) => {
        console.error(`Background ingestion failure for batch ${batch.id}:`, err);
      });
    }

    return { batch, sourceFiles: createdSourceFiles };
  }

  /**
   * Process a batch synchronously (useful for test suites or synchronous worker scripts)
   */
  public async processBatch(options: IngestionOptions): Promise<{
    batch: ImportBatch;
    sourceFiles: SourceFile[];
    totalRecordsProcessed: number;
    totalRecordsValid: number;
    totalRecordsFlagged: number;
    duplicates: number;
  }> {
    const { batch, sourceFiles } = await this.queueBatch(options, false);
    await this.processBatchAsync(batch.id, options, sourceFiles);

    const updatedBatch = (await dbRepository.getBatchById(batch.id)) || batch;
    const progress = this.getProgress(batch.id);

    return {
      batch: updatedBatch,
      sourceFiles,
      totalRecordsProcessed: updatedBatch.total_records_processed,
      totalRecordsValid: updatedBatch.total_records_valid,
      totalRecordsFlagged: updatedBatch.total_records_flagged,
      duplicates: progress?.duplicates_count || 0,
    };
  }

  /**
   * Asynchronous batch execution engine
   */
  public async processBatchAsync(
    batchId: string,
    options: IngestionOptions,
    sourceFiles: SourceFile[]
  ): Promise<void> {
    const startTime = Date.now();
    await dbRepository.updateBatch(batchId, { status: 'PROCESSING' });

    this.updateProgress(batchId, {
      percentage: 15,
      current_stage: 'PROCESSING',
      stage_message: 'Starting extraction across source files...',
    });

    let totalProcessed = 0;
    let totalValid = 0;
    let totalFlagged = 0;
    let totalDuplicates = 0;
    let totalWarnings = 0;
    let totalErrors = 0;

    const seenEpicsInBatch = new Set<string>();
    const seenSerialsInPart = new Set<string>();

    try {
      for (let fIdx = 0; fIdx < sourceFiles.length; fIdx++) {
        const sourceFile = sourceFiles[fIdx];
        const fileInput = options.files[fIdx];

        this.updateProgress(batchId, {
          current_file: sourceFile.original_filename,
          stage_message: `Parsing ${sourceFile.original_filename} (${sourceFile.file_type})...`,
          current_stage: 'PARSING',
        });

        let parsedDrafts: ParsedRecordDraft[] = [];

        if (sourceFile.file_type === 'CSV' || sourceFile.file_type === 'XLSX') {
          parsedDrafts = await tabularParser.parseBuffer(
            fileInput.buffer,
            sourceFile.file_type,
            options.metadata,
            options.columnMapping
          );
        } else if (sourceFile.file_type === 'IMAGE') {
          const ext = sourceFile.original_filename.split('.').pop()?.toLowerCase() || 'png';
          let mime = 'image/png';
          if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
          else if (ext === 'webp') mime = 'image/webp';

          this.updateProgress(batchId, {
            percentage: 40,
            current_stage: 'OCR_PROCESSING',
            stage_message: `Scanning voter list image with Google Gemini AI Vision OCR...`,
          });

          const geminiRes = await geminiElectoralExtractor.extractFromMediaBuffer(
            fileInput.buffer,
            mime,
            options.metadata
          );

          if (geminiRes.success && geminiRes.records.length > 0) {
            parsedDrafts = geminiRes.records;
            sourceFile.parsing_metrics = { engine: geminiRes.modelUsed, count: parsedDrafts.length };
          } else {
            console.warn('[Ingestion] Gemini image extraction had no records or error:', geminiRes.error);
          }
        } else if (sourceFile.file_type === 'PDF') {
          const pdfRes = await pdfElectoralRollParser.parsePdfDetailed(
            fileInput.buffer,
            options.metadata,
            (progress) => {
              const basePct = 20 + Math.round((progress.currentPage / Math.max(1, progress.totalPages)) * 45);
              this.updateProgress(batchId, {
                percentage: Math.min(68, basePct),
                current_page: progress.currentPage,
                total_pages: progress.totalPages,
                records_detected: progress.recordsExtracted,
                current_stage: progress.isOcrFallback ? 'OCR_PROCESSING' : 'PARSING',
                stage_message: progress.stageMessage || `Extracting voter boxes on Page ${progress.currentPage}/${progress.totalPages}...`,
              });
            }
          );

          parsedDrafts = pdfRes.records;
          sourceFile.total_pages = pdfRes.totalPages;
          sourceFile.parsing_metrics = pdfRes.report || {};
        }

        this.updateProgress(batchId, {
          percentage: 70,
          current_stage: 'VALIDATING',
          records_detected: parsedDrafts.length,
          stage_message: `Validating ${parsedDrafts.length} records and checking integrity rules...`,
        });

        // Validation & Integrity Filter
        const recordsToInsert: any[] = [];

        for (let i = 0; i < parsedDrafts.length; i++) {
          const draft = parsedDrafts[i];
          const voterId = crypto.randomUUID();
          let isFlagged = false;

          // 1. Missing Name Check
          if (!draft.name_hi && !draft.name_en) {
            totalErrors++;
            await this.recordValidationError({
              voter_id: voterId,
              source_file_id: sourceFile.id,
              error_code: 'MISSING_MANDATORY_NAME',
              error_message: `Record #${draft.serial_number} discarded: Missing voter name in both scripts`,
              severity: 'ERROR',
              raw_data: draft.raw_extracted_data,
            });
            continue;
          }

          // 2. Age Validity Check
          if (draft.age !== null && (draft.age < 18 || draft.age > 130)) {
            totalWarnings++;
            isFlagged = true;
            await this.recordValidationError({
              voter_id: voterId,
              source_file_id: sourceFile.id,
              error_code: 'INVALID_AGE',
              error_message: `Voter age ${draft.age} is outside legal electoral threshold (18-130 yrs)`,
              severity: 'WARNING',
              raw_data: { age: draft.age, serial: draft.serial_number },
            });
          }

          // 3. EPIC Format & Missing EPIC Check
          if (!draft.epic_number) {
            totalWarnings++;
            isFlagged = true;
            await this.recordValidationError({
              voter_id: voterId,
              source_file_id: sourceFile.id,
              error_code: 'MISSING_EPIC_ID',
              error_message: `Voter record is missing official EPIC / Voter ID number`,
              severity: 'INFO',
              raw_data: { serial: draft.serial_number, name: draft.name_en },
            });
          } else if (draft.epic_number.length < 5) {
            totalWarnings++;
            isFlagged = true;
            await this.recordValidationError({
              voter_id: voterId,
              source_file_id: sourceFile.id,
              error_code: 'MALFORMED_EPIC_FORMAT',
              error_message: `EPIC number "${draft.epic_number}" is unusually short (< 5 chars)`,
              severity: 'WARNING',
              raw_data: { epic: draft.epic_number },
            });
          }

          // 4. Batch Internal Duplicate EPIC
          if (draft.epic_number) {
            const upperEpic = draft.epic_number.toUpperCase();
            if (seenEpicsInBatch.has(upperEpic)) {
              totalDuplicates++;
              isFlagged = true;
              draft.validation_status = 'DUPLICATE';
              await this.recordValidationError({
                voter_id: voterId,
                source_file_id: sourceFile.id,
                error_code: 'DUPLICATE_EPIC_IN_BATCH',
                error_message: `Duplicate EPIC "${draft.epic_number}" appears multiple times within the batch`,
                severity: 'WARNING',
                raw_data: { epic: draft.epic_number, serial: draft.serial_number },
              });
            } else {
              seenEpicsInBatch.add(upperEpic);
            }
          }

          // 5. Duplicate Serial in Part
          const serialPartKey = `${draft.part_number || '0'}_${draft.serial_number}`;
          if (seenSerialsInPart.has(serialPartKey)) {
            totalWarnings++;
            await this.recordValidationError({
              voter_id: voterId,
              source_file_id: sourceFile.id,
              error_code: 'DUPLICATE_SERIAL_IN_PART',
              error_message: `Serial #${draft.serial_number} repeated in Part ${draft.part_number || 'General'}`,
              severity: 'WARNING',
              raw_data: { part: draft.part_number, serial: draft.serial_number },
            });
          } else {
            seenSerialsInPart.add(serialPartKey);
          }

          // 6. Suspicious OCR value / Low extraction confidence
          if (draft.extraction_confidence < 0.75) {
            totalWarnings++;
            isFlagged = true;
            await this.recordValidationError({
              voter_id: voterId,
              source_file_id: sourceFile.id,
              error_code: 'LOW_OCR_CONFIDENCE',
              error_message: `OCR confidence score ${(draft.extraction_confidence * 100).toFixed(0)}% is below quality baseline`,
              severity: 'WARNING',
              raw_data: { confidence: draft.extraction_confidence },
            });
          }

          if (isFlagged && draft.validation_status === 'VALID') {
            draft.validation_status = 'WARNING';
          }

          recordsToInsert.push({
            ...draft,
            id: voterId,
            batch_id: batchId,
            source_file_id: sourceFile.id,
          });
        }

        // Bulk insert validated records into database repository
        const insertRes = await dbRepository.insertVoterRecordsBulk(recordsToInsert);

        totalProcessed += insertRes.inserted;
        totalValid += (insertRes.inserted - insertRes.flagged);
        totalFlagged += insertRes.flagged;
        totalDuplicates += insertRes.duplicates;
      }

      const finalStatus: BatchStatus =
        totalFlagged > 0 || totalWarnings > 0 ? 'COMPLETED_WITH_WARNINGS' : 'COMPLETED';

      await dbRepository.updateBatch(batchId, {
        status: finalStatus,
        total_records_processed: totalProcessed,
        total_records_valid: totalValid,
        total_records_flagged: totalFlagged,
        completed_at: new Date().toISOString(),
      });

      this.updateProgress(batchId, {
        percentage: 100,
        current_stage: finalStatus,
        records_detected: totalProcessed,
        records_valid: totalValid,
        warnings_count: totalWarnings,
        errors_count: totalErrors,
        duplicates_count: totalDuplicates,
        elapsed_ms: Date.now() - startTime,
        stage_message: `Ingestion successfully completed! Saved ${totalProcessed} voter records (${totalValid} valid, ${totalFlagged} flagged).`,
      });
    } catch (err: any) {
      console.error(`Batch processing fatal error for ${batchId}:`, err);
      await dbRepository.updateBatch(batchId, {
        status: 'FAILED',
        error_message: err.message || 'Fatal ingestion error',
      });

      this.updateProgress(batchId, {
        percentage: 100,
        current_stage: 'FAILED',
        stage_message: `Ingestion failed: ${err.message}`,
        errors_count: totalErrors + 1,
      });
    }
  }

  /**
   * Generate comprehensive import summary report
   */
  public async generateImportReport(batchId: string): Promise<ImportReport | null> {
    const batch = await dbRepository.getBatchById(batchId);
    if (!batch) return null;

    const sourceFiles = await dbRepository.getSourceFiles(batchId);
    const searchRes = await dbRepository.searchVoters({ limit: 1000 });
    const batchVoters = searchRes.results.filter((v) => v.source_file_id && sourceFiles.some((f) => f.id === v.source_file_id));

    // Aggregate validation errors across all source files in this batch
    const errors: ValidationError[] = await dbRepository.getValidationErrorsByBatchId(batchId);

    const errorBreakdown: Record<string, number> = {};
    for (const e of errors) {
      errorBreakdown[e.error_code] = (errorBreakdown[e.error_code] || 0) + 1;
    }

    const totalProcessed = batch.total_records_processed || batchVoters.length;
    const totalValid = batch.total_records_valid || (totalProcessed - batch.total_records_flagged);
    const validPct = totalProcessed > 0 ? Number(((totalValid / totalProcessed) * 100).toFixed(1)) : 100;

    let avgConf = 0.98;
    if (batchVoters.length > 0) {
      const sum = batchVoters.reduce((acc, cur) => acc + (cur.extraction_confidence || 1.0), 0);
      avgConf = Number((sum / batchVoters.length).toFixed(3));
    }

    return {
      batch_id: batch.id,
      batch_name: batch.batch_name,
      status: batch.status,
      created_at: batch.created_at,
      completed_at: batch.completed_at || null,
      total_files: sourceFiles.length,
      files: sourceFiles.map((f) => ({
        id: f.id,
        filename: f.original_filename,
        file_type: f.file_type,
        total_pages: f.total_pages,
        file_size_bytes: f.file_size_bytes,
        file_hash_sha256: f.file_hash_sha256,
      })),
      records_processed: totalProcessed,
      records_valid: totalValid,
      records_flagged: batch.total_records_flagged || 0,
      duplicates_count: errorBreakdown['DUPLICATE_EPIC'] || errorBreakdown['DUPLICATE_EPIC_IN_BATCH'] || 0,
      validation_errors: errors.slice(0, 50),
      summary: {
        valid_pct: validPct,
        avg_confidence: avgConf,
        error_breakdown: errorBreakdown,
        extraction_report: sourceFiles.find((f) => f.parsing_metrics && Object.keys(f.parsing_metrics).length > 0)?.parsing_metrics,
      },
    };
  }

  private async recordValidationError(error: Omit<ValidationError, 'id' | 'is_resolved' | 'created_at'>) {
    await dbRepository.createValidationError(error);
  }
}

export const ingestionProcessor = new IngestionProcessor();
