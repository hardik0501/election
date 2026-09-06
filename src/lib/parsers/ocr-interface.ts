/**
 * Pluggable OCR Interface for Electoral Rolls
 */

export interface OcrBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrToken {
  text: string;
  confidence: number;
  bbox?: OcrBoundingBox;
}

export interface OcrPageResult {
  pageNumber: number;
  fullText: string;
  confidence: number;
  tokens: OcrToken[];
  boxesCount: number;
}

export interface OcrProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  recognizeText(imageBuffer: Buffer, language?: string): Promise<OcrPageResult>;
}

/**
 * Standard Heuristic / Mock OCR Provider for development and baseline fallback
 */
export class StandardOcrProvider implements OcrProvider {
  public name = 'standard_heuristic_ocr';

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public async recognizeText(imageBuffer: Buffer, language = 'hin+eng'): Promise<OcrPageResult> {
    // In Phase 1 foundation, standard provider returns high-confidence empty token set or passthrough
    return {
      pageNumber: 1,
      fullText: '',
      confidence: 0.85,
      tokens: [],
      boxesCount: 30,
    };
  }
}

export const defaultOcrProvider = new StandardOcrProvider();
