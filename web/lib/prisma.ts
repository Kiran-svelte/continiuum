import { PrismaClient } from '@prisma/client';

// ============================================================
// CONNECTION POOL CONFIGURATION FOR SUPABASE + VERCEL
// ============================================================

/**
 * Connection Pool Settings for Supabase PostgreSQL with Vercel Serverless
 * 
 * CRITICAL: Supabase Session Mode (port 6543) has strict pooler limits:
 * - Free tier: ~20 concurrent connections across all serverless functions
 * - Each function instance creates its own connection
 * 
 * Solution: Use minimal connection_limit per instance and rely on pgbouncer
 */

const CONNECTION_POOL_CONFIG = {
    // CRITICAL: Keep very low for serverless - Supabase pooler handles the rest
    connection_limit: 1,  // One connection per serverless function instance
    
    // Statement timeout (prevents long-running queries)
    statement_timeout: 30000, // 30 seconds
    
    // Idle timeout - release connections quickly
    pool_timeout: 10, // seconds
};

/**
 * Build connection URL with pool parameters
 * Adds pgbouncer=true for Supabase pooler compatibility
 */
function getConnectionUrl(): string {
    const baseUrl = process.env.DATABASE_URL || '';
    
    if (!baseUrl) {
        console.error('[Prisma] DATABASE_URL is not set!');
        return '';
    }
    
    try {
        const url = new URL(baseUrl);
        
        // Always set pgbouncer mode for Supabase
        url.searchParams.set('pgbouncer', 'true');
        
        // Set connection_limit to 1 for serverless
        url.searchParams.set('connection_limit', '1');
        
        // Add pool_timeout for faster release
        url.searchParams.set('pool_timeout', '10');
        
        return url.toString();
    } catch (e) {
        console.error('[Prisma] Failed to parse DATABASE_URL:', e);
        return baseUrl;
    }
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
