import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public Health Check / Status API
 * GET /api/status
 * 
 * Returns system status including:
 * - API health
 * - Database connectivity
 * - Version info
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    const startTime = Date.now();
    
    let dbStatus = "unknown";
    let dbLatency = 0;
    
    try {
        const dbStart = Date.now();
        // Simple query to check database connectivity
        await prisma.$queryRaw`SELECT 1`;
        dbLatency = Date.now() - dbStart;
        dbStatus = "connected";
    } catch (error) {
        dbStatus = "disconnected";
        console.error("[Status API] Database check failed:", error);
    }
    
    const response = {
        status: "ok",
        timestamp: new Date().toISOString(),
        version: "2.0.0",
        environment: process.env.NODE_ENV || "development",
        database: dbStatus,
        latency: {
            db: dbLatency,
            total: Date.now() - startTime
        },
        services: {
            clerk: "configured",
            prisma: dbStatus === "connected" ? "healthy" : "unhealthy"
        }
    };
    
    // Return 503 if database is down
    const statusCode = dbStatus === "connected" ? 200 : 503;
    
    return NextResponse.json(response, { 
        status: statusCode,
        headers: {
            'Cache-Control': 'no-store, max-age=0'
        }
    });
}
