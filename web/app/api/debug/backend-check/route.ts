import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/server";

/**
 * Backend connectivity check
 * Tests: Database, AI Service, Environment
 * 
 * ⚠️ Requires authentication in production
 */

// Development check - disable sensitive info in production
function isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.ALLOW_DEBUG_ENDPOINTS === 'true';
}

export async function GET(request: NextRequest) {
    // In production, require authentication
    if (!isDevelopment()) {
        const user = await getUser();
        if (!user) {
            return NextResponse.json({ 
                error: "Unauthorized - Debug endpoints require authentication in production",
                hint: "Set ALLOW_DEBUG_ENDPOINTS=true to bypass"
            }, { status: 403 });
        }
    }

    const checks: Record<string, any> = {};
    
    // 1. Environment Variables (sanitized in production)
    checks.env = {
        DATABASE_URL: process.env.DATABASE_URL ? "✅ SET" : "❌ MISSING",
        DIRECT_URL: process.env.DIRECT_URL ? "✅ SET" : "⚠️ MISSING",
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ SET" : "❌ MISSING",
        AI_SERVICE_URL: process.env.AI_SERVICE_URL ? "✅ SET" : "❌ MISSING",
        CONSTRAINT_ENGINE_URL: process.env.CONSTRAINT_ENGINE_URL ? "✅ SET" : "❌ MISSING",
    };
    
    // 2. Database Connection
    try {
        const start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        checks.database = {
            status: "✅ CONNECTED",
            latency: `${Date.now() - start}ms`
        };
    } catch (error: any) {
        checks.database = {
            status: "❌ FAILED",
            error: error?.message || "Unknown error"
        };
    }
    
    // 3. AI Service Connection
    const aiUrl = process.env.AI_SERVICE_URL || process.env.CONSTRAINT_ENGINE_URL;
    if (aiUrl) {
        try {
            const start = Date.now();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const res = await fetch(`${aiUrl}/health`, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (res.ok) {
                const data = await res.json();
                checks.ai_service = {
                    status: "✅ CONNECTED",
                    latency: `${Date.now() - start}ms`,
                    response: data
                };
            } else {
                checks.ai_service = {
                    status: "⚠️ UNHEALTHY",
                    httpStatus: res.status
                };
            }
        } catch (error: any) {
            checks.ai_service = {
                status: "❌ UNREACHABLE",
                url: aiUrl,
                error: error?.name === 'AbortError' ? "Timeout (10s)" : error?.message
            };
        }
    } else {
        checks.ai_service = {
            status: "❌ NOT CONFIGURED",
            hint: "Set AI_SERVICE_URL or CONSTRAINT_ENGINE_URL env var"
        };
    }
    
    // Overall status
    const allPassing = 
        checks.database.status?.includes("✅") && 
        checks.ai_service.status?.includes("✅");
    
    return NextResponse.json({
        status: allPassing ? "healthy" : "issues_detected",
        timestamp: new Date().toISOString(),
        checks
    });
}
