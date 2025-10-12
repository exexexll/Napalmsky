"use strict";
/**
 * Database Abstraction Layer for PostgreSQL
 * Replaces in-memory store.ts for production deployment
 * Connection pooling, error handling, query logging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.transaction = transaction;
exports.checkConnection = checkConnection;
exports.getPoolStats = getPoolStats;
exports.closePool = closePool;
exports.cleanupExpiredSessions = cleanupExpiredSessions;
exports.cleanupExpiredCooldowns = cleanupExpiredCooldowns;
exports.archiveOldChatHistory = archiveOldChatHistory;
const pg_1 = require("pg");
// Initialize connection pool
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    max: parseInt(process.env.DATABASE_POOL_MAX || '20'), // Maximum connections
    min: parseInt(process.env.DATABASE_POOL_MIN || '2'), // Minimum connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: parseInt(process.env.DATABASE_TIMEOUT || '30000'),
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false // For AWS RDS
    } : false,
});
exports.pool = pool;
// Connection error handling
pool.on('error', (err) => {
    console.error('[Database] Unexpected error on idle client', err);
    process.exit(-1);
});
// Query helper with logging and error handling
async function query(text, params) {
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
        }
        else {
            console.log('[Database] Query executed:', {
                duration: `${duration}ms`,
                rows: result.rowCount
            });
        }
        return result;
    }
    catch (error) {
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
async function transaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('[Database] Transaction rolled back:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
// Health check
async function checkConnection() {
    try {
        const result = await query('SELECT NOW() as current_time');
        console.log('[Database] Health check OK:', result.rows[0].current_time);
        return true;
    }
    catch (error) {
        console.error('[Database] Health check FAILED:', error);
        return false;
    }
}
// Get connection pool stats (for monitoring)
function getPoolStats() {
    return {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
    };
}
// Graceful shutdown
async function closePool() {
    console.log('[Database] Closing connection pool...');
    await pool.end();
    console.log('[Database] Pool closed');
}
// Auto-cleanup jobs (should be run via cron or Lambda)
async function cleanupExpiredSessions() {
    const result = await query('DELETE FROM sessions WHERE expires_at < NOW()');
    console.log(`[Cleanup] Deleted ${result.rowCount} expired sessions`);
    return result.rowCount || 0;
}
async function cleanupExpiredCooldowns() {
    const result = await query('DELETE FROM cooldowns WHERE expires_at < NOW()');
    console.log(`[Cleanup] Deleted ${result.rowCount} expired cooldowns`);
    return result.rowCount || 0;
}
async function archiveOldChatHistory(daysOld = 365) {
    const result = await query(`DELETE FROM chat_history WHERE started_at < NOW() - INTERVAL '${daysOld} days'`);
    console.log(`[Cleanup] Archived ${result.rowCount} chat histories older than ${daysOld} days`);
    return result.rowCount || 0;
}
