import sql from 'mssql';
import { getDatabaseConfig } from '@/lib/config/env';

const POOL_MAX_CONNECTIONS = 10;
const IDLE_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 15_000;

// Survive Next.js dev hot reloads so we do not leak one pool per reload
const globalForPool = globalThis as unknown as { mssqlPool?: Promise<sql.ConnectionPool> };

function createPool(): Promise<sql.ConnectionPool> {
  const config = getDatabaseConfig();
  const pool = new sql.ConnectionPool({
    server: config.server,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    requestTimeout: REQUEST_TIMEOUT_MS,
    pool: { max: POOL_MAX_CONNECTIONS, idleTimeoutMillis: IDLE_TIMEOUT_MS },
    options: { encrypt: config.encrypt, trustServerCertificate: config.trustServerCertificate },
  });
  return pool.connect();
}

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!globalForPool.mssqlPool) {
    globalForPool.mssqlPool = createPool().catch((error: unknown) => {
      // Drop the failed attempt so the next request retries the connection
      globalForPool.mssqlPool = undefined;
      throw error;
    });
  }
  return globalForPool.mssqlPool;
}

export { sql };
