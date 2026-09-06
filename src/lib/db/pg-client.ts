import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';

export class PostgresClient {
  private static instance: PostgresClient | null = null;
  private pool: Pool | null = null;
  private isConnected = false;

  private constructor() {
    this.initPool();
  }

  public static getInstance(): PostgresClient {
    if (!PostgresClient.instance) {
      PostgresClient.instance = new PostgresClient();
    }
    return PostgresClient.instance;
  }

  private initPool() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return;
    }

    const maxConnections = process.env.DATABASE_MAX_CONNECTIONS
      ? parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10)
      : 20;

    const useSsl = process.env.DATABASE_SSL === 'true';

    const config: PoolConfig = {
      connectionString,
      max: maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    };

    try {
      this.pool = new Pool(config);

      this.pool.on('error', (err) => {
        console.error('Unexpected error on idle PostgreSQL client', err);
      });
    } catch (err) {
      console.warn('PostgreSQL pool initialization skipped:', err);
      this.pool = null;
    }
  }

  /**
   * Check whether PostgreSQL is configured and active
   */
  public async isHealthy(): Promise<boolean> {
    if (!this.pool) return false;
    try {
      const res = await this.pool.query('SELECT 1 AS health');
      this.isConnected = res.rows.length > 0;
      return this.isConnected;
    } catch (err) {
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Execute parameterized SQL query
   */
  public async query<T extends QueryResultRow = any>(
    text: string,
    params: any[] = []
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('PostgreSQL pool is not initialized. Please set DATABASE_URL.');
    }
    return this.pool.query<T>(text, params);
  }

  /**
   * Get raw pool
   */
  public getPool(): Pool | null {
    return this.pool;
  }

  /**
   * Close pool on application shutdown
   */
  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
    }
  }
}

export const pgClient = PostgresClient.getInstance();
