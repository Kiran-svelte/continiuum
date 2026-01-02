/**
 * Company HR System - Production Server
 * 
 * Robust server with:
 * - Process management and graceful shutdown
 * - Rate limiting and security middleware
 * - Comprehensive error handling
 * - Health checks and monitoring
 * - Scheduler with error recovery
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./src/config/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// GLOBAL ERROR HANDLERS - Prevent server crashes
// ============================================================
process.on('uncaughtException', (err) => {
    console.error('[CRITICAL] Uncaught Exception:', err.message);
    console.error(err.stack);
    // Log to file in production
    logError('uncaughtException', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRITICAL] Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    logError('unhandledRejection', reason);
});

// Graceful shutdown handler
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function logError(type, error) {
    const fs = require('fs');
    const logDir = process.env.LOG_DIR || './logs';
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    const logEntry = {
        timestamp: new Date().toISOString(),
        type,
        message: error?.message || String(error),
        stack: error?.stack
    };
    fs.appendFileSync(
        path.join(logDir, 'errors.log'),
        JSON.stringify(logEntry) + '\n'
    );
}

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================

// Basic security headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for development
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Body parsing with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// RATE LIMITING
// ============================================================

// General API rate limit
const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/ping' || req.path === '/api/health'
});

// Strict rate limit for login endpoint
const loginLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS) || 5 * 60 * 1000, // 5 minutes
    max: parseInt(process.env.RATE_LIMIT_LOGIN_MAX_ATTEMPTS) || 5,
    message: { error: 'Too many login attempts. Account temporarily locked. Try again in 5 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.body?.email || req.ip // Rate limit by email
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', loginLimiter);

// ============================================================
// REQUEST LOGGING
// ============================================================
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (process.env.LOG_LEVEL === 'debug') {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        }
    });
    next();
});

// ============================================================
// HEALTH CHECK ENDPOINTS
// ============================================================

// Simple ping for load balancers
app.get('/ping', (req, res) => {
    res.json({ pong: true, time: Date.now() });
});

// Comprehensive health check
app.get('/api/health', async (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        services: {
            database: 'unknown',
            ai: {
                leave: { port: 8001, status: 'unknown' },
                onboarding: { port: 8002, status: 'unknown' },
                performance: { port: 8003, status: 'unknown' },
                recruitment: { port: 8004, status: 'unknown' }
            }
        }
    };

    try {
        // Check database
        await db.execute('SELECT 1');
        health.services.database = 'connected';

        // Check AI services
        const axios = require('axios');
        const timeout = parseInt(process.env.AI_SERVICE_TIMEOUT) || 2000;
        
        for (const [name, info] of Object.entries(health.services.ai)) {
            try {
                await axios.get(`http://127.0.0.1:${info.port}/health`, { timeout });
                health.services.ai[name].status = 'running';
            } catch {
                health.services.ai[name].status = 'offline';
            }
        }

        res.json(health);
    } catch (error) {
        health.status = 'unhealthy';
        health.services.database = 'disconnected';
        health.error = error.message;
        res.status(503).json(health);
    }
});

// ============================================================
// STATIC FILES
// ============================================================
app.use('/app', express.static(path.join(__dirname, '..', 'app')));

// File uploads directory
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const fs = require('fs');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// ============================================================
// API ROUTES
// ============================================================

// Authentication
app.use('/api/auth', require('./src/routes/authRoutes'));
try {
    app.use('/api/auth', require('./src/routes/google.auth.routes'));
} catch (e) {
    console.log('Google OAuth routes not loaded:', e.message);
}

// Core CRUD routes
app.use('/api/users', require('./src/routes/users.routes'));
app.use('/api/employees', require('./src/routes/employees.routes'));
app.use('/api/leaves', require('./src/routes/leaves.routes'));
app.use('/api/leaves/v2', require('./src/routes/enterprise.leaves.routes'));
app.use('/api/onboarding', require('./src/routes/onboarding.routes'));
app.use('/api/performance', require('./src/routes/performance.routes'));
app.use('/api/recruitment', require('./src/routes/recruitment.routes'));
app.use('/api/payroll', require('./src/routes/payroll.routes'));
app.use('/api/ai-system', require('./src/routes/ai-system.routes'));

// Optional enterprise routes
const optionalRoutes = [
    { path: '/api/enterprise', module: './src/routes/enterprise.routes' },
    { path: '/api/leave', module: './src/routes/leave.workflow.routes' },
    { path: '/api/ai-leave-mode', module: './src/routes/ai.leave.mode.routes' },
    { path: '/api/v3', module: './src/routes/enterprise.production.routes' },
    { path: '/api/enterprise', module: './src/routes/enterprise.real.routes' }
];

optionalRoutes.forEach(({ path: routePath, module: modulePath }) => {
    try {
        app.use(routePath, require(modulePath));
        console.log(`✅ Loaded: ${routePath}`);
    } catch (e) {
        console.log(`⚠️  Optional route ${routePath} not loaded: ${e.message}`);
    }
});

// Dashboard Stats
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const [leaveStats] = await Promise.all([
            db.query(`
                SELECT 
                    COUNT(*) as total_requests,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
                FROM leave_requests WHERE MONTH(created_at) = MONTH(NOW())
            `)
        ]);
        
        const [empResult] = await db.query('SELECT COUNT(*) as count FROM employees');
        const [onbResult] = await db.query(`
            SELECT COUNT(*) as active_onboarding 
            FROM employee_onboarding_new WHERE status = 'in_progress'
        `).catch(() => [{ active_onboarding: 0 }]);
        
        res.json({
            success: true,
            stats: {
                employees: empResult?.count || 0,
                leaveRequests: leaveStats[0] || { total_requests: 0, pending: 0, approved: 0 },
                onboarding: onbResult || { active_onboarding: 0 }
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error.message);
        res.json({ success: true, stats: { employees: 0, leaveRequests: {}, onboarding: {} } });
    }
});

// ============================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString()
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    logError('routeError', err);
    
    // Don't expose internal errors in production
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.status(err.status || 500).json({
        error: err.name || 'InternalServerError',
        message: isProduction ? 'An unexpected error occurred' : err.message,
        ...(isProduction ? {} : { stack: err.stack })
    });
});

// ============================================================
// SERVER STARTUP
// ============================================================

let server;

async function startServer() {
    try {
        // Test database connection before starting
        console.log('🔌 Testing database connection...');
        await db.execute('SELECT 1');
        console.log('✅ Database connected');

        server = app.listen(PORT, () => {
            console.log('\n' + '='.repeat(60));
            console.log('🚀 COMPANY HR SYSTEM - SERVER STARTED');
            console.log('='.repeat(60));
            console.log(`📡 Port: ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔒 Rate Limiting: Enabled`);
            console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
            console.log('='.repeat(60) + '\n');
            
            // Initialize scheduler if enabled
            if (process.env.SCHEDULER_ENABLED !== 'false') {
                initializeScheduler();
            }
        });

        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use`);
                console.log('   Try: netstat -ano | findstr :' + PORT);
                process.exit(1);
            }
            throw error;
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

function initializeScheduler() {
    try {
        const leaveScheduler = require('./src/services/leaveScheduler');
        leaveScheduler.initialize();
        console.log('⏰ Scheduler initialized');
    } catch (e) {
        console.log('⚠️  Scheduler not started:', e.message);
        // Don't crash - scheduler is optional
    }
}

async function gracefulShutdown(signal) {
    console.log(`\n📴 ${signal} received. Starting graceful shutdown...`);
    
    if (server) {
        server.close(async () => {
            console.log('✅ HTTP server closed');
            
            // Close database connections
            try {
                await db.end();
                console.log('✅ Database connections closed');
            } catch (e) {
                console.log('⚠️  Database close error:', e.message);
            }
            
            console.log('👋 Goodbye!');
            process.exit(0);
        });

        // Force close after 10 seconds
        setTimeout(() => {
            console.error('⚠️  Forcing shutdown after timeout');
            process.exit(1);
        }, 10000);
    } else {
        process.exit(0);
    }
}

// Start the server
startServer();

// Export for testing
module.exports = { app, startServer };
