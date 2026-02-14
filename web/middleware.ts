import { createServerClient } from "@supabase/ssr";
import { NextResponse, NextRequest } from "next/server";

// ============================================================
// SECURITY CONFIGURATION
// ============================================================

const SECURITY_HEADERS = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// Rate limiting store (in-memory - use Redis for production cluster)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration per route type
const RATE_LIMITS = {
    api: { windowMs: 60000, maxRequests: 200 },      // 200 req/min for API
    auth: { windowMs: 300000, maxRequests: 20 },     // 20 req/5min for auth
    default: { windowMs: 60000, maxRequests: 500 }   // 500 req/min default
};

// ============================================================
// ROUTE MATCHERS
// ============================================================

const publicRoutes = [
    '/',
    '/marketing',
    '/privacy',
    '/terms',
    '/waitlist',
    '/sign-in',
    '/sign-up',
    '/auth/callback',
    '/auth/auth-error',
    '/employee/auth',
    '/employee/sign-in',
    '/employee/sign-up',
    '/employee/register',
    '/hr/auth',
    '/hr/sign-in',
    '/hr/sign-up',
    '/api/webhook',
    '/api/holidays',
    '/api/test-gmail',
    '/api/test-email',
    '/api/health',
    '/api/status',
    '/api/debug/backend-check',
    '/api/platform',
    '/api/cron',
    '/api/admin',
    '/api/enterprise',
    '/api/waitlist',
    '/status',
];

function isPublicRoute(pathname: string): boolean {
    return publicRoutes.some(route => 
        pathname === route || pathname.startsWith(`${route}/`) || pathname.startsWith(`${route}?`)
    );
}

function isOnboardingRoute(pathname: string): boolean {
    return pathname.startsWith('/onboarding');
}

function isAPIRoute(pathname: string): boolean {
    return pathname.startsWith('/api');
}

function isAuthRoute(pathname: string): boolean {
    return pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') || pathname.startsWith('/auth');
}

function isSensitiveRoute(pathname: string): boolean {
    return pathname.startsWith('/api/payroll') || 
           pathname.startsWith('/api/company/settings') ||
           pathname.startsWith('/hr/payroll') ||
           pathname.startsWith('/hr/security');
}

// ============================================================
// RATE LIMITING
// ============================================================

function checkRateLimit(identifier: string, config: { windowMs: number; maxRequests: number }): boolean {
    const now = Date.now();
    const entry = rateLimitStore.get(identifier);
    
    if (!entry || entry.resetTime < now) {
        rateLimitStore.set(identifier, { count: 1, resetTime: now + config.windowMs });
        return true;
    }
    
    entry.count++;
    if (entry.count > config.maxRequests) {
        return false;
    }
    
    return true;
}

function getClientIP(req: NextRequest): string {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
           req.headers.get('x-real-ip') || 
           'unknown';
}

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================

function applySecurityHeaders(response: NextResponse): NextResponse {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        response.headers.set(key, value);
    }
    return response;
}

export async function middleware(req: NextRequest) {
    const ip = getClientIP(req);
    const path = req.nextUrl.pathname;

    // Create a response object to modify
    let response = NextResponse.next({
        request: {
            headers: req.headers,
        },
    });

    // ============================================================
    // SUPABASE SESSION MANAGEMENT
    // ============================================================
    
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return req.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        req.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request: req,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refresh session if expired - this is important for server components
    const { data: { user } } = await supabase.auth.getUser();
    
    // ============================================================
    // RATE LIMITING - Skip for public routes to allow health checks
    // ============================================================
    
    if (!isPublicRoute(path)) {
        let rateLimitConfig = RATE_LIMITS.default;
        let rateLimitKey = `default:${ip}`;
        
        if (isAuthRoute(path)) {
            rateLimitConfig = RATE_LIMITS.auth;
            rateLimitKey = `auth:${ip}`;
        } else if (isAPIRoute(path)) {
            rateLimitConfig = RATE_LIMITS.api;
            rateLimitKey = `api:${ip}:${path}`;
        }
        
        if (!checkRateLimit(rateLimitKey, rateLimitConfig)) {
            const rateLimitResponse = NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429 }
            );
            rateLimitResponse.headers.set('Retry-After', '60');
            return applySecurityHeaders(rateLimitResponse);
        }
    }
    
    // ============================================================
    // ROUTE PROTECTION
    // ============================================================
    
    // If user IS authenticated and trying to visit sign-in/sign-up, redirect them away
    // This prevents the bug where a logged-in user sees the login page again
    const isUserOnAuthPage = path.startsWith('/sign-in') || path.startsWith('/sign-up') ||
        path.startsWith('/hr/sign-in') || path.startsWith('/hr/sign-up') ||
        path.startsWith('/employee/sign-in') || path.startsWith('/employee/sign-up') ||
        path === '/hr/auth' || path === '/employee/auth';
    if (user && isUserOnAuthPage) {
        const redirectUrl = new URL('/onboarding', req.url);
        return NextResponse.redirect(redirectUrl);
    }

    // Public routes - no auth needed
    if (isPublicRoute(path)) {
        return applySecurityHeaders(response);
    }
    
    // Not logged in - redirect to sign-in
    if (!user) {
        // For API routes, return 401 instead of redirect
        if (isAPIRoute(path)) {
            const unauthorizedResponse = NextResponse.json(
                { error: 'Unauthorized. Please sign in.' },
                { status: 401 }
            );
            return applySecurityHeaders(unauthorizedResponse);
        }
        const signInUrl = new URL('/sign-in', req.url);
        signInUrl.searchParams.set('redirect', path);
        return NextResponse.redirect(signInUrl);
    }
    
    // User is logged in but on onboarding - let them continue
    if (isOnboardingRoute(path)) {
        return applySecurityHeaders(response);
    }
    
    // Log access to sensitive routes
    if (isSensitiveRoute(path)) {
        console.log(`[SECURITY] Sensitive access: ${path} by user ${user.id} from ${ip}`);
    }
    
    // For employee/HR routes, we let them through
    // The individual pages will check for profile completion and role
    return applySecurityHeaders(response);
}

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};

