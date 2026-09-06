import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface StoredFileResult {
  storagePath: string;
  fileHashSha256: string;
  fileSizeBytes: number;
}

export class FileStorageService {
  private baseDir: string;

  constructor(customDir?: string) {
    this.baseDir = customDir || process.env.STORAGE_LOCAL_DIR || path.join(process.cwd(), 'storage_uploads');
    this.ensureBaseDir();
  }

  private ensureBaseDir() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Compute SHA-256 checksum of a buffer
   */
  public computeSha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Save an uploaded file buffer into the organized storage directory
   */
  public async saveFile(
    batchId: string,
    originalFilename: string,
    buffer: Buffer
  ): Promise<StoredFileResult> {
    this.ensureBaseDir();
    const batchFolder = path.join(this.baseDir, batchId);
    if (!fs.existsSync(batchFolder)) {
      fs.mkdirSync(batchFolder, { recursive: true });
    }

    const sha256 = this.computeSha256(buffer);
    const sanitizedName = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${sha256.substring(0, 12)}_${sanitizedName}`;
    const filePath = path.join(batchFolder, filename);

    // Write file securely
    await fs.promises.writeFile(filePath, buffer);

    const stats = await fs.promises.stat(filePath);

    return {
      storagePath: filePath,
      fileHashSha256: sha256,
      fileSizeBytes: stats.size,
    };
  }

  /**
   * Read stored file buffer
   */
  public async getFileBuffer(storagePath: string): Promise<Buffer> {
    if (!fs.existsSync(storagePath)) {
      throw new Error(`Storage file not found: ${storagePath}`);
    }
    return fs.promises.readFile(storagePath);
  }

  /**
   * Check if file exists
   */
  public exists(storagePath: string): boolean {
    return fs.existsSync(storagePath);
  }
}

export const storageService = new FileStorageService();
