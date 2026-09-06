import { ParsedRecordDraft } from './csv-parser';
import {
  masterHindiPdfExtractor,
  ExtractionReport,
  ExtractedVoterCard,
  ExtractionProgressCallback,
  FieldDetector,
  VoterBlockDetector,
  PdfPageExtractor,
} from './pdf-extractor';

export interface PdfParseProgressCallback {
  (progress: {
    currentPage: number;
    totalPages: number;
    recordsExtracted: number;
    isOcrFallback: boolean;
    stageMessage?: string;
  }): void;
}

export interface PdfParseResult {
  totalPages: number;
  records: ParsedRecordDraft[];
  pagesProcessed: number;
  ocrFallbackPages: number[];
  textQualityScore: number;
  report?: ExtractionReport;
}

export class PdfElectoralRollParser {
  /**
   * Parse electoral roll PDF buffer with page-by-page tracking and OCR fallback
   */
  public async parseBuffer(
    buffer: Buffer,
    batchMeta?: Record<string, any>,
    onProgress?: PdfParseProgressCallback
  ): Promise<ParsedRecordDraft[]> {
    const res = await this.parsePdfDetailed(buffer, batchMeta, onProgress);
    return res.records;
  }

  /**
   * Detailed multi-page parser returning metrics & page stats using Master Hindi PDF Extractor
   */
  public async parsePdfDetailed(
    buffer: Buffer,
    batchMeta?: Record<string, any>,
    onProgress?: PdfParseProgressCallback
  ): Promise<PdfParseResult> {
    const progressAdapter: ExtractionProgressCallback | undefined = onProgress
      ? (p) => {
          onProgress({
            currentPage: p.currentPage,
            totalPages: p.totalPages,
            recordsExtracted: p.recordsExtracted,
            isOcrFallback: p.isOcrFallback,
            stageMessage: p.stageMessage,
          });
        }
      : undefined;

    const extractionResult = await masterHindiPdfExtractor.extractElectoralRollPdf(
      buffer,
      batchMeta,
      progressAdapter
    );

    return {
      totalPages: extractionResult.report.total_pages,
      records: extractionResult.records,
      pagesProcessed: extractionResult.report.pages_processed,
      ocrFallbackPages: extractionResult.report.ocr_fallback_pages,
      textQualityScore: extractionResult.report.text_quality_score,
      report: extractionResult.report,
    };
  }

  /**
   * Helper to parse a single voter text block directly
   */
  public parseVoterTextBlock(
    blockText: string,
    fallbackSerial: number,
    meta?: Record<string, any>
  ): ParsedRecordDraft | null {
    return FieldDetector.parseVoterCard(blockText, fallbackSerial, 1, meta);
  }
}

export const pdfElectoralRollParser = new PdfElectoralRollParser();

export {
  masterHindiPdfExtractor,
  FieldDetector,
  VoterBlockDetector,
  PdfPageExtractor,
  type ExtractedVoterCard,
  type ExtractionReport,
};
