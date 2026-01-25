import { PrismaClient } from '@prisma/client';

// ============================================================
// CONNECTION POOL CONFIGURATION
// ============================================================

/**
 * Connection Pool Settings for Supabase PostgreSQL
 * 
 * Supabase provides two connection modes:
 * 1. Direct connection (port 5432) - for migrations
 * 2. Pooled connection (port 6543) - for application queries
 * 
 * For serverless environments like Vercel:
 * - Use connection pooling to prevent connection exhaustion
 * - Keep pool small since each serverless function instance has its own pool
 * - Use pgbouncer mode when available
 */

const CONNECTION_POOL_CONFIG = {
    // Connection limits optimized for serverless
    connection_limit: parseInt(process.env.DATABASE_POOL_SIZE || '5'),
    
    // Statement timeout (prevents long-running queries)
    statement_timeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT || '30000'), // 30 seconds
    
    // Idle timeout for connections
    pool_timeout: parseInt(process.env.DATABASE_POOL_TIMEOUT || '10'), // seconds
};

/**
 * Build connection URL with pool parameters
 * Adds pgbouncer=true for Supabase pooler compatibility
 */
function getConnectionUrl(): string {
    const baseUrl = process.env.DATABASE_URL || '';
    
    // If already using Supabase pooler (port 6543), add pgbouncer param
    if (baseUrl.includes(':6543')) {
        const url = new URL(baseUrl);
        url.searchParams.set('pgbouncer', 'true');
        url.searchParams.set('connection_limit', String(CONNECTION_POOL_CONFIG.connection_limit));
        url.searchParams.set('pool_timeout', String(CONNECTION_POOL_CONFIG.pool_timeout));
        return url.toString();
    }
    
    return baseUrl;
}

const prismaClientSingleton = () => {
    return new PrismaClient({
        log: process.env.NODE_ENV === 'development' 
            ? ['query', 'error', 'warn'] 
            : ['error'],
        datasources: {
            db: {
                url: getConnectionUrl(),
            },
        },
    });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// Reuse client in development to prevent hot-reload connection leaks
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ============================================================
// CONNECTION HEALTH & MONITORING
// ============================================================

/**
 * Check database connection health
 * Returns latency in ms or -1 if connection failed
 */
export async function checkDatabaseHealth(): Promise<{ 
    healthy: boolean; 
    latencyMs: number; 
    poolInfo: typeof CONNECTION_POOL_CONFIG;
}> {
    const start = Date.now();
    try {
        await prisma.$queryRaw`SELECT 1`;
        const latencyMs = Date.now() - start;
        return {
            healthy: true,
            latencyMs,
            poolInfo: CONNECTION_POOL_CONFIG
        };
    } catch (error) {
        console.error('[Prisma] Health check failed:', error);
        return {
            healthy: false,
            latencyMs: -1,
            poolInfo: CONNECTION_POOL_CONFIG
        };
    }
}

/**
 * Gracefully disconnect Prisma client
 * Call this in cleanup/shutdown handlers
 */
export async function disconnectPrisma(): Promise<void> {
    try {
        await prisma.$disconnect();
        console.log('[Prisma] Disconnected successfully');
    } catch (error) {
        console.error('[Prisma] Disconnect error:', error);
    }
}

// Log database connection status on startup (helpful for debugging)
if (typeof window === 'undefined') {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('[Prisma] DATABASE_URL is not set!');
    } else {
        // Mask the password in logs
        const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
        const isPooled = dbUrl.includes(':6543');
        console.log(`[Prisma] Database configured (pooled: ${isPooled}):`, maskedUrl.substring(0, 50) + '...');
        console.log(`[Prisma] Pool config: limit=${CONNECTION_POOL_CONFIG.connection_limit}, timeout=${CONNECTION_POOL_CONFIG.pool_timeout}s`);
    }
}
