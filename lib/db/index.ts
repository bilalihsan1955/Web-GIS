import 'server-only';
import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';

// ============================================================================
// lib/db/index.ts: Standalone PostgreSQL Singleton Connection Pool
// Protected by 'server-only' (Next.js 16 AppSec) to prevent client-side leaks
// Implements singleton pattern on globalThis to prevent HMR connection exhaustion
// ============================================================================

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  'postgresql://postgres:postgres@localhost:5432/webgis';

const isProduction = process.env.NODE_ENV === 'production';

const poolConfig: PoolConfig = {
  connectionString,
  max: isProduction ? 20 : 10, // Max concurrent connections in pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Error out if connection takes > 5s
  ssl:
    process.env.DATABASE_SSL === 'true' || (isProduction && !connectionString.includes('localhost'))
      ? { rejectUnauthorized: false }
      : false,
};

// Singleton pool instance across Next.js HMR reloads
export const pool = globalThis._pgPool ?? new Pool(poolConfig);

if (!isProduction) {
  globalThis._pgPool = pool;
}

// Pool error listener to prevent unhandled process crashes
pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]: Unexpected client error on idle connection', err);
});

/**
 * Standard parameterized query runner.
 * Enforces prepared/parameterized queries to prevent SQL Injection (OWASP A03:2021).
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    if (!isProduction && process.env.DEBUG_SQL === 'true') {
      const duration = Date.now() - start;
      console.log('[SQL Execution]', { text, duration: `${duration}ms`, rows: res.rowCount });
    }
    return res;
  } catch (error: any) {
    console.error('[SQL Execution Error]', { text, error: error.message });
    throw error;
  }
}

/**
 * Transaction helper for atomic operations (OWASP A04 / A08).
 * Ensures rollback on failure and proper client release.
 */
export async function withTransaction<T>(
  callback: (client: import('pg').PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
