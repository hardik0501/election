import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

export interface StoredFileResult {
  storagePath: string;
  fileHashSha256: string;
  fileSizeBytes: number;
}

export class FileStorageService {
  private baseDir: string;

  constructor(customDir?: string) {
    if (customDir) {
      this.baseDir = customDir;
    } else if (process.env.STORAGE_LOCAL_DIR) {
      this.baseDir = process.env.STORAGE_LOCAL_DIR;
    } else if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      this.baseDir = path.join(os.tmpdir(), 'voter_storage_uploads');
    } else {
      this.baseDir = path.join(process.cwd(), 'storage_uploads');
    }
    this.ensureBaseDir();
  }

  private ensureBaseDir() {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch {
      // Fallback to os.tmpdir if root directory is read-only
      this.baseDir = path.join(os.tmpdir(), 'voter_storage_uploads');
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
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
