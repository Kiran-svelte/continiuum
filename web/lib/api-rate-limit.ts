/**
 * API Rate Limiting Utility
 * Centralized rate limiting for all API routes
 * 
 * Features:
 * - Per-endpoint configuration
 * - User-based and IP-based tracking
 * - Graceful degradation
 * - Rate limit headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';

// Rate limit store (in-memory - use Redis for production cluster)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Cleanup expired entries every minute
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, value] of rateLimitStore.entries()) {
            if (value.resetTime < now) {
                rateLimitStore.delete(key);
            }
        }
    }, 60000);
}

// Rate limit configurations per endpoint type
export const RATE_LIMIT_CONFIG = {
    // Leave management - moderate limits
    leaves: { windowMs: 60000, maxRequests: 20 },
    leaveSubmit: { windowMs: 60000, maxRequests: 5 },
    
    // Attendance - higher limits for clock in/out
    attendance: { windowMs: 60000, maxRequests: 60 },
    attendanceCorrection: { windowMs: 60000, maxRequests: 10 },
    
    // Documents - moderate limits
    documents: { windowMs: 60000, maxRequests: 10 },
    documentUpload: { windowMs: 60000, maxRequests: 5 },
    
    // Reports - low limits (expensive operations)
    reports: { windowMs: 60000, maxRequests: 5 },
    
    // AI services - low limits (expensive)
    ai: { windowMs: 60000, maxRequests: 10 },
    aiAnalysis: { windowMs: 60000, maxRequests: 5 },
    
    // Policies - low limits (admin operations)
    policies: { windowMs: 60000, maxRequests: 10 },
    
    // Payroll - low limits (sensitive data)
    payroll: { windowMs: 60000, maxRequests: 10 },
    
    // Billing - very low limits
    billing: { windowMs: 60000, maxRequests: 5 },
    
    // Employees/Teams - moderate limits
    employees: { windowMs: 60000, maxRequests: 20 },
    teams: { windowMs: 60000, maxRequests: 20 },
    
    // Default fallback
    default: { windowMs: 60000, maxRequests: 30 },
} as const;

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIG;

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
}

/**
 * Check rate limit for a request
 */
export async function checkApiRateLimit(
    req: NextRequest,
    type: RateLimitType = 'default'
): Promise<RateLimitResult> {
    const config = RATE_LIMIT_CONFIG[type];
    const now = Date.now();
    
    // Get identifier (user ID if authenticated, IP otherwise)
    let identifier: string;
    try {
        const user = await getUser();
        identifier = user?.id || getClientIP(req);
    } catch {
        identifier = getClientIP(req);
    }
    
    const key = `ratelimit:${type}:${identifier}`;
    
    let entry = rateLimitStore.get(key);
    
    if (!entry || entry.resetTime < now) {
        // Create new window
        entry = {
            count: 1,
            resetTime: now + config.windowMs,
        };
        rateLimitStore.set(key, entry);
        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetTime: entry.resetTime,
        };
    }
    
    entry.count++;
    
    if (entry.count > config.maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        return {
            allowed: false,
            remaining: 0,
            resetTime: entry.resetTime,
            retryAfter,
        };
    }
    
    return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetTime: entry.resetTime,
    };
}

/**
 * Get client IP from request headers
 */
function getClientIP(req: NextRequest): string {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
           req.headers.get('x-real-ip') ||
           'unknown';
}

/**
 * Create rate limited response
 */
export function rateLimitedResponse(result: RateLimitResult): NextResponse {
    return NextResponse.json(
        { 
            error: 'Too many requests. Please try again later.',
            retryAfter: result.retryAfter,
        },
        { 
            status: 429,
            headers: {
                'Retry-After': String(result.retryAfter || 60),
                'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG.default.maxRequests),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(result.resetTime),
            },
        }
    );
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
    response: NextResponse,
    result: RateLimitResult,
    type: RateLimitType = 'default'
): NextResponse {
    const config = RATE_LIMIT_CONFIG[type];
    response.headers.set('X-RateLimit-Limit', String(config.maxRequests));
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Reset', String(result.resetTime));
    return response;
}

/**
 * Higher-order function to wrap API handlers with rate limiting
 */
export function withRateLimit(
    type: RateLimitType,
    handler: (req: NextRequest, ...args: unknown[]) => Promise<NextResponse>
) {
    return async (req: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
        const result = await checkApiRateLimit(req, type);
        
        if (!result.allowed) {
            return rateLimitedResponse(result);
        }
        
        const response = await handler(req, ...args);
        return addRateLimitHeaders(response, result, type);
    };
}
