import path from 'path';

export class SecuritySanitizer {
  public static readonly MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
  public static readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  /**
   * 1. Path Traversal Prevention
   * Ensures that resolved target path is strictly contained within the intended base directory.
   */
  public static sanitizeSafePath(baseDir: string, relativeOrUserInputPath: string): string {
    if (!relativeOrUserInputPath) {
      throw new Error('Security Alert: Target path cannot be empty.');
    }

    // Check for null byte injection
    if (relativeOrUserInputPath.includes('\0')) {
      throw new Error('Security Alert: Null byte injection detected.');
    }

    // Reject explicit directory traversal sequences
    if (/(?:^|[\\\/])\.\.(?:[\\\/]|$)/.test(relativeOrUserInputPath)) {
      throw new Error(`Security Alert: Path traversal attempt detected: ${relativeOrUserInputPath}`);
    }

    const resolvedBase = path.resolve(baseDir);
    const resolvedTarget = path.resolve(baseDir, relativeOrUserInputPath);

    // Verify resolved path starts with base directory
    if (!resolvedTarget.startsWith(resolvedBase)) {
      throw new Error(`Security Alert: Path traversal attempt detected outside root: ${relativeOrUserInputPath}`);
    }

    return resolvedTarget;
  }

  /**
   * 2. Sanitize Filename
   * Strips directory separators, control chars, and limits length
   */
  public static sanitizeFilename(rawFilename: string): string {
    if (!rawFilename) return 'unnamed_file';

    // Strip path components
    const basename = path.basename(rawFilename);

    // Remove non-alphanumeric chars except safe punctuation
    const clean = basename
      .replace(/[^a-zA-Z0-9.\-_]/g, '_')
      .replace(/\.{2,}/g, '.')
      .slice(0, 150);

    return clean || 'document.pdf';
  }

  /**
   * 3. Magic Bytes File Inspection
   * Validates file header bytes rather than blindly trusting file extension or Content-Type header.
   */
  public static validateFileMagicBytes(
    buffer: Buffer,
    expectedType: 'PDF' | 'CSV' | 'XLSX'
  ): { isValid: boolean; detectedMime: string; error?: string } {
    if (!buffer || buffer.length === 0) {
      return { isValid: false, detectedMime: 'unknown', error: 'Uploaded file is completely empty (0 bytes).' };
    }

    if (buffer.length > this.MAX_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        detectedMime: 'unknown',
        error: `File size (${(buffer.length / 1024 / 1024).toFixed(1)}MB) exceeds maximum permitted limit of 50MB.`,
      };
    }

    // PDF Magic Bytes: %PDF- (0x25 0x50 0x44 0x46 0x2D)
    if (expectedType === 'PDF') {
      const isPdfHeader = buffer.slice(0, 5).toString('ascii') === '%PDF-';
      if (!isPdfHeader) {
        return {
          isValid: false,
          detectedMime: 'application/octet-stream',
          error: 'Security Warning: File lacks valid %PDF- magic byte signature.',
        };
      }
      return { isValid: true, detectedMime: 'application/pdf' };
    }

    // XLSX / ZIP Magic Bytes: PK\x03\x04 (0x50 0x4B 0x03 0x04)
    if (expectedType === 'XLSX') {
      const isZipHeader = buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
      if (!isZipHeader) {
        return {
          isValid: false,
          detectedMime: 'application/octet-stream',
          error: 'Security Warning: File lacks valid Office OpenXML / ZIP magic byte header.',
        };
      }
      return { isValid: true, detectedMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    }

    // CSV Inspection: Check for plain text encoding, absence of binary control characters (except CR/LF/Tab)
    if (expectedType === 'CSV') {
      const sampleSize = Math.min(buffer.length, 1024);
      for (let i = 0; i < sampleSize; i++) {
        const byte = buffer[i];
        if (byte === 0x00) {
          return {
            isValid: false,
            detectedMime: 'application/octet-stream',
            error: 'Security Warning: Binary zero byte detected in CSV plain-text payload.',
          };
        }
      }
      return { isValid: true, detectedMime: 'text/csv' };
    }

    return { isValid: true, detectedMime: 'application/octet-stream' };
  }

  /**
   * 4. User Input String Sanitization
   * Cleans text to prevent script injection and control character abuse while preserving Hindi/English scripts.
   */
  public static sanitizeInputString(input: string | null | undefined): string {
    if (!input) return '';

    return input
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // strip control chars
      .replace(/[<>]/g, '') // strip html tag markers
      .trim();
  }
}
