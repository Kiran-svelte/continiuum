/**
 * Database Configuration Module (PostgreSQL Adapter)
 * 
 * Provides a secure, configurable database connection pool for PostgreSQL
 * seamlessly adapting MySQL-style queries (?) to Postgres syntax ($n).
 * 
 * @module config/db
 */

const { Pool } = require('pg');
const env = require('./environment');

// Parse database URL if provided, otherwise construct config
const dbConfig = env.database.url ? {
    connectionString: env.database.url,
    ssl: { rejectUnauthorized: false } // Required for Supabase
} : {
    host: env.database.host || 'localhost',
    user: env.database.user || 'root',
    password: env.database.password || '',
    database: env.database.name || 'company',
    port: 5432,
    ssl: env.database.ssl?.enabled ? { rejectUnauthorized: false } : false
};

// Create a new pool
const pool = new Pool({
    ...dbConfig,
    max: 20, // max connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

/**
 * Helper to convert MySQL '?' placeholders to Postgres '$n' syntax
 * @param {string} sql 
 * @returns {string} converted sql
 */
function convertQuery(sql) {
    let i = 1;
    return sql.replace(/\?/g, () => `$${i++}`);
}

/**
 * Clean up query result to match mysql2 format [rows, fields]
 * Postgres returns { rows: [], fields: [] }
 * Mysql2 execute returns [rows, fields]
 */
function normalizeResult(result) {
    // If it's a SELECT, return rows
    if (result.command === 'SELECT') {
        return [result.rows, result.fields];
    }
    // If INSERT/UPDATE/DELETE, return compatibility object
    // Mysql2 returns { insertId, affectedRows, ... }
    return [{
        affectedRows: result.rowCount,
        insertId: result.rows[0]?.id || 0, // Assuming 'RETURNING id' is used or we can't get it easily without it
        ...result
    }, result.fields];
}

/**
 * Execute a query (mimicking mysql2 pool.execute/query)
 * @param {string} sql 
 * @param {Array} params 
 */
async function query(sql, params = []) {
    const client = await pool.connect();
    try {
        const pgSql = convertQuery(sql);
        const result = await client.query(pgSql, params);

        // Return structure compatible with mysql2 destructuring: const [rows] = await db.query...
        if (result.command === 'SELECT') {
            // Attach array-like properties if needed, but usually just returning array of rows is enough for [rows] destructuring?
            // No, [rows] destructuring expects the FIRST element to be the rows array.
            return [result.rows, result.fields];
        } else {
            // For Insert/Update
            const info = {
                affectedRows: result.rowCount,
                insertId: 0 // Warning: Postgres doesn't return ID unless RETURNING id is used
            };
            return [info, result.fields];
        }
    } finally {
        client.release();
    }
}

// Alias execute to query for compatibility
const execute = query;

/**
 * Get a single result
 */
async function getOne(sql, params) {
    const [rows] = await query(sql, params);
    return rows[0] || null;
}

/**
 * Health Check
 */
async function getHealth() {
    try {
        const start = Date.now();
        await pool.query('SELECT 1');
        return {
            connected: true,
            responseTime: Date.now() - start,
            poolInfo: {
                total: pool.totalCount,
                idle: pool.idleCount,
                waiting: pool.waitingCount
            }
        };
    } catch (e) {
        return { connected: false, error: e.message };
    }
}

// Initialize
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

console.log('🔌 Database Adapter: PostgreSQL (Neon Ready)');

module.exports = {
    pool,
    query,
    execute,
    getOne,
    getHealth,
    close: () => pool.end()
};