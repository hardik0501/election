import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pgClient } from './pg-client';

export interface MigrationRecord {
  id: number;
  name: string;
  checksum: string;
  applied_at: string;
}

export class MigrationRunner {
  private migrationsDir: string;

  constructor(customDir?: string) {
    this.migrationsDir =
      customDir || path.join(process.cwd(), 'src', 'db', 'migrations');
  }

  /**
   * Run all pending migrations
   */
  public async runMigrations(): Promise<{ applied: string[]; skipped: string[] }> {
    const isPgAvailable = await pgClient.isHealthy();
    const applied: string[] = [];
    const skipped: string[] = [];

    if (!isPgAvailable) {
      console.log('ℹ️ PostgreSQL is not connected. Standalone persistent repository will use normalized schema structure.');
      return { applied: [], skipped: ['PostgreSQL not connected, local schema active'] };
    }

    try {
      // 1. Create migrations tracking table
      await pgClient.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          checksum CHAR(64) NOT NULL,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // 2. Fetch already applied migrations
      const appliedRes = await pgClient.query<MigrationRecord>(
        'SELECT name FROM schema_migrations ORDER BY id ASC;'
      );
      const appliedSet = new Set(appliedRes.rows.map((r) => r.name));

      // 3. Read migration directory files
      if (!fs.existsSync(this.migrationsDir)) {
        return { applied, skipped };
      }

      const files = fs
        .readdirSync(this.migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

      for (const file of files) {
        if (appliedSet.has(file)) {
          skipped.push(file);
          continue;
        }

        const filePath = path.join(this.migrationsDir, file);
        const sqlContent = fs.readFileSync(filePath, 'utf-8');
        const checksum = crypto.createHash('sha256').update(sqlContent).digest('hex');

        console.log(`⏳ Applying migration: ${file}...`);

        // Execute migration
        await pgClient.query(sqlContent);

        // Record migration
        await pgClient.query(
          'INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2);',
          [file, checksum]
        );

        applied.push(file);
        console.log(`✅ Applied migration: ${file}`);
      }

      return { applied, skipped };
    } catch (err: any) {
      console.error('Migration failed:', err);
      throw err;
    }
  }
}

export const migrationRunner = new MigrationRunner();
