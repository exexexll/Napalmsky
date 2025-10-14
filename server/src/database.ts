/**
 * Database Abstraction Layer for PostgreSQL
 * Replaces in-memory store.ts for production deployment
 * Connection pooling, error handling, query logging
 */

import { Pool, QueryResult } from 'pg';

// Initialize connection pool with better error handling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DATABASE_POOL_MAX || '20'), // Maximum connections
  min: parseInt(process.env.DATABASE_POOL_MIN || '2'), // Minimum connections
  idleTimeoutMillis: 30000, // Remove idle clients after 30s
  connectionTimeoutMillis: parseInt(process.env.DATABASE_TIMEOUT || '30000'),
  // Allow pool to recover from connection errors
  allowExitOnIdle: false, // Keep pool alive even with no connections
  // Add statement timeout to prevent hanging queries
  statement_timeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT || '30000'),
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // For AWS RDS
  } : false,
});

// Connection error handling
// Note: This handles errors on idle clients in the pool
pool.on('error', (err: any) => {
  console.error('[Database] Unexpected error on idle client:', {
    message: err.message,
    code: err.code,
    errno: err.errno
  });
  
  // Only exit on critical connection errors
  // Don't exit on client disconnections or transient network issues
  const criticalErrors = ['ECONNREFUSED', 'ENOTFOUND', 'PROTOCOL_CONNECTION_LOST'];
  
  if (criticalErrors.includes(err.code)) {
    console.error('[Database] CRITICAL: Database connection lost, attempting graceful shutdown...');
    // Give active requests 10 seconds to complete before forcing exit
    setTimeout(() => {
      console.error('[Database] Forcing exit due to unrecoverable database error');
      process.exit(1);
    }, 10000);
  } else {
    // Log but don't exit for non-critical errors (like connection reset by peer)
    console.warn('[Database] Non-critical error, continuing operation. Pool will handle reconnection.');
  }
});

// Log connection lifecycle events (helps with debugging)
pool.on('connect', (client) => {
  console.log('[Database] New client connected to pool');
});

pool.on('acquire', (client) => {
  console.log('[Database] Client acquired from pool');
});

pool.on('remove', (client) => {
  console.log('[Database] Client removed from pool');
});

// Query helper with logging and error handling
export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const start = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (>100ms)
    if (duration > 100) {
      console.warn('[Database] Slow query detected:', {
        query: text.substring(0, 100) + '...',
        duration: `${duration}ms`,
        rows: result.rowCount
      });
    } else {
      console.log('[Database] Query executed:', {
        duration: `${duration}ms`,
        rows: result.rowCount
      });
    }
    
    return result;
  } catch (error: any) {
    console.error('[Database] Query error:', {
      query: text,
      params,
      error: error.message,
      code: error.code
    });
    throw error;
  }
}

// Transaction helper (atomic operations)
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Database] Transaction rolled back:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Health check
export async function checkConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('[Database] Health check OK:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('[Database] Health check FAILED:', error);
    return false;
  }
}

// Get connection pool stats (for monitoring)
export function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  console.log('[Database] Closing connection pool...');
  await pool.end();
  console.log('[Database] Pool closed');
}

// Auto-cleanup jobs (should be run via cron or Lambda)
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await query('DELETE FROM sessions WHERE expires_at < NOW()');
  console.log(`[Cleanup] Deleted ${result.rowCount} expired sessions`);
  return result.rowCount || 0;
}

export async function cleanupExpiredCooldowns(): Promise<number> {
  const result = await query('DELETE FROM cooldowns WHERE expires_at < NOW()');
  console.log(`[Cleanup] Deleted ${result.rowCount} expired cooldowns`);
  return result.rowCount || 0;
}

export async function archiveOldChatHistory(daysOld: number = 365): Promise<number> {
  const result = await query(
    `DELETE FROM chat_history WHERE started_at < NOW() - INTERVAL '${daysOld} days'`
  );
  console.log(`[Cleanup] Archived ${result.rowCount} chat histories older than ${daysOld} days`);
  return result.rowCount || 0;
}

// Export pool for direct access if needed
export { pool };

