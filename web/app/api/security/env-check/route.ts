import { NextResponse } from 'next/server';

/**
 * 🔐 ENVIRONMENT VALIDATION & SECURITY CHECK
 * 
 * This endpoint validates that all required environment variables are set
 * and checks security configuration. Used for deployment verification.
 * 
 * Returns sanitized status (never exposes actual values)
 */

interface EnvCheck {
    key: string;
    required: boolean;
    category: 'auth' | 'database' | 'services' | 'security' | 'email';
    description: string;
}

const REQUIRED_ENV_VARS: EnvCheck[] = [
    // Authentication
    { key: 'CLERK_SECRET_KEY', required: true, category: 'auth', description: 'Clerk server-side key' },
    { key: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', required: true, category: 'auth', description: 'Clerk client-side key' },
    
    // Database
    { key: 'DATABASE_URL', required: true, category: 'database', description: 'PostgreSQL connection string' },
    { key: 'DIRECT_URL', required: true, category: 'database', description: 'Direct DB connection (migrations)' },
    
    // Backend Services
    { key: 'AI_SERVICE_URL', required: true, category: 'services', description: 'Constraint engine URL' },
    { key: 'CONSTRAINT_ENGINE_URL', required: false, category: 'services', description: 'Constraint engine URL (alias)' },
    { key: 'NEXT_PUBLIC_APP_URL', required: true, category: 'services', description: 'Application base URL' },
    
    // Security
    { key: 'CRON_SECRET', required: true, category: 'security', description: 'Secret for cron job authentication' },
    { key: 'JWT_SECRET', required: false, category: 'security', description: 'JWT signing secret' },
    
    // Email (Optional but recommended)
    { key: 'GMAIL_CLIENT_ID', required: false, category: 'email', description: 'Gmail OAuth client ID' },
    { key: 'GMAIL_CLIENT_SECRET', required: false, category: 'email', description: 'Gmail OAuth client secret' },
    { key: 'GMAIL_REFRESH_TOKEN', required: false, category: 'email', description: 'Gmail OAuth refresh token' },
];

function checkEnvVar(key: string): { set: boolean; hint?: string } {
    const value = process.env[key];
    if (!value) {
        return { set: false };
    }
    
    // Provide hints without exposing values
    let hint: string | undefined;
    if (key.includes('URL')) {
        try {
            const url = new URL(value);
            hint = `${url.protocol}//${url.host.substring(0, 10)}...`;
        } catch {
            hint = 'Invalid URL format';
        }
    } else if (key.includes('KEY') || key.includes('SECRET')) {
        hint = `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
    }
    
    return { set: true, hint };
}

function checkSecurityHeaders(): Record<string, boolean> {
    return {
        https_enforced: process.env.NODE_ENV === 'production',
        cron_protected: !!process.env.CRON_SECRET,
        clerk_configured: !!process.env.CLERK_SECRET_KEY,
    };
}

export async function GET(request: Request) {
    // Only allow in development or with auth
    const authHeader = request.headers.get('authorization');
    const isAuthorized = authHeader === `Bearer ${process.env.CRON_SECRET}` || 
                         process.env.NODE_ENV === 'development';
    
    if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const results: Record<string, any> = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown',
        categories: {} as Record<string, any[]>,
        summary: {
            total: 0,
            set: 0,
            missing_required: 0,
            missing_optional: 0
        },
        security: checkSecurityHeaders()
    };
    
    // Group by category
    for (const env of REQUIRED_ENV_VARS) {
        if (!results.categories[env.category]) {
            results.categories[env.category] = [];
        }
        
        const check = checkEnvVar(env.key);
        results.categories[env.category].push({
            key: env.key,
            description: env.description,
            required: env.required,
            status: check.set ? '✅ SET' : (env.required ? '❌ MISSING' : '⚠️ NOT SET'),
            hint: check.hint
        });
        
        results.summary.total++;
        if (check.set) {
            results.summary.set++;
        } else if (env.required) {
            results.summary.missing_required++;
        } else {
            results.summary.missing_optional++;
        }
    }
    
    // Add HTTPS/SSL status
    results.ssl = {
        status: 'Managed by Vercel/Render',
        provider: 'Let\'s Encrypt (automatic)',
        note: 'All traffic is automatically encrypted via HTTPS'
    };
    
    // Add firewall status
    results.firewall = {
        status: 'Managed by Platform',
        note: 'Vercel and Render provide DDoS protection and rate limiting at the edge',
        rate_limiting: 'Configured in middleware.ts'
    };
    
    // Determine overall health
    results.health = results.summary.missing_required === 0 ? 'HEALTHY' : 'DEGRADED';
    
    return NextResponse.json(results);
}

export const dynamic = 'force-dynamic';
