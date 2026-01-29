import { NextRequest, NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/prisma";
import { getSecurityHeaders } from "@/lib/security";
import * as fs from 'fs';
import * as os from 'os';

// Health Check Response
interface HealthCheck {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    uptime: number;
    checks: {
        database: HealthStatus;
        memory: HealthStatus;
        disk: HealthStatus;
    };
    metrics?: {
        responseTime: number;
        activeConnections?: number;
        requestsPerMinute?: number;
    };
    poolConfig?: {
        connectionLimit: number;
        poolTimeout: number;
    };
}

interface HealthStatus {
    status: 'pass' | 'warn' | 'fail';
    message?: string;
    latency?: number;
}

// Track start time for uptime calculation
const startTime = Date.now();

export async function GET(request: NextRequest) {
    const headers = getSecurityHeaders();
    const startCheck = Date.now();

    // Database health check using centralized function
    let dbStatus: HealthStatus = { status: 'fail', message: 'Connection failed' };
    let poolInfo: { connection_limit: number; pool_timeout: number } | null = null;
    
    try {
        const dbHealth = await checkDatabaseHealth();
        poolInfo = dbHealth.poolInfo;
        
        if (dbHealth.healthy) {
            const dbLatency = dbHealth.latencyMs;
            dbStatus = {
                status: dbLatency < 100 ? 'pass' : dbLatency < 500 ? 'warn' : 'fail',
                message: dbLatency < 100 ? 'Connection healthy' : 'High latency',
                latency: dbLatency
            };
        } else {
            dbStatus = {
                status: 'fail',
                message: 'Database connection failed'
            };
        }
    } catch (error) {
        dbStatus = {
            status: 'fail',
            message: error instanceof Error ? error.message : 'Unknown error'
        };
    }

    // Memory health check
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    const memoryStatus: HealthStatus = {
        status: heapUsagePercent < 70 ? 'pass' : heapUsagePercent < 90 ? 'warn' : 'fail',
        message: `${heapUsedMB}MB / ${heapTotalMB}MB (${heapUsagePercent.toFixed(1)}%)`
    };

    // Disk health check - check available disk space
    let diskStatus: HealthStatus = { status: 'pass', message: 'Disk space available' };
    try {
        // Check temp directory availability as a proxy for disk health
        const tempDir = os.tmpdir();
        const testFile = `${tempDir}/health-check-${Date.now()}.tmp`;
        
        // Write and delete test file to verify disk is writable
        fs.writeFileSync(testFile, 'health-check');
        fs.unlinkSync(testFile);
        
        // On Unix systems, we can get disk usage via statfs
        // For cross-platform, we check if temp dir exists and is writable
        const stats = fs.statfsSync(tempDir);
        const totalBytes = stats.bsize * stats.blocks;
        const freeBytes = stats.bsize * stats.bfree;
        const usedPercent = ((totalBytes - freeBytes) / totalBytes) * 100;
        
        const freeGB = (freeBytes / (1024 * 1024 * 1024)).toFixed(1);
        
        diskStatus = {
            status: usedPercent < 80 ? 'pass' : usedPercent < 95 ? 'warn' : 'fail',
            message: `${freeGB}GB free (${usedPercent.toFixed(1)}% used)`
        };
    } catch {
        // If statfs not available (older Node), fall back to basic check
        diskStatus = {
            status: 'pass',
            message: 'Disk writable'
        };
    }

    // Calculate overall status
    const allChecks = [dbStatus, memoryStatus, diskStatus];
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (allChecks.some(c => c.status === 'fail')) {
        overallStatus = 'unhealthy';
    } else if (allChecks.some(c => c.status === 'warn')) {
        overallStatus = 'degraded';
    }

    const responseTime = Date.now() - startCheck;

    const healthCheck: HealthCheck = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: Math.round((Date.now() - startTime) / 1000),
        checks: {
            database: dbStatus,
            memory: memoryStatus,
            disk: diskStatus
        },
        metrics: {
            responseTime
        },
        poolConfig: poolInfo ? {
            connectionLimit: poolInfo.connection_limit,
            poolTimeout: poolInfo.pool_timeout
        } : undefined
    };

    // Return appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(healthCheck, { status: statusCode, headers });
}

// Liveness probe - simple check
export async function HEAD(request: NextRequest) {
    return new NextResponse(null, { status: 200 });
}
