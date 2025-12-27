const express = require('express');
const cors = require('cors');
const db = require('./src/config/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Global error handlers to prevent server crashes
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.use(cors());
app.use(express.json());

// Main App Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/leaves', require('./src/routes/leaves.routes'));
app.use('/api/onboarding', require('./src/routes/onboarding.routes'));
app.use('/api/performance', require('./src/routes/performance.routes'));
app.use('/api/recruitment', require('./src/routes/recruitment.routes'));
app.use('/api/enterprise', require('./src/routes/enterprise.routes'));

// Health Check
app.get('/api/health', async (req, res) => {
    try {
        // Check database connection
        await db.execute('SELECT 1');
        
        // Check AI services
        const services = {
            leave: { port: 8001, status: 'unknown' },
            onboarding: { port: 8002, status: 'unknown' },
            enterprise: { port: 8003, status: 'unknown' },
            recruitment: { port: 8004, status: 'unknown' }
        };
        
        const axios = require('axios');
        for (const [name, info] of Object.entries(services)) {
            try {
                await axios.get(`http://127.0.0.1:${info.port}/health`, { timeout: 1000 });
                services[name].status = 'running';
            } catch {
                services[name].status = 'offline';
            }
        }
        
        res.json({ 
            status: 'healthy', 
            database: 'connected',
            aiServices: services,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'unhealthy', 
            database: 'disconnected',
            error: error.message 
        });
    }
});

// Dashboard Stats
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const leaveResult = await db.execute(`
            SELECT 
                COUNT(*) as total_requests,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
            FROM leave_requests WHERE MONTH(created_at) = MONTH(NOW())
        `);
        const leaveStats = leaveResult[0] || { total_requests: 0, pending: 0, approved: 0 };
        
        const empResult = await db.execute(`SELECT COUNT(*) as count FROM employees`);
        const employeeCount = empResult[0] || { count: 0 };
        
        const onbResult = await db.execute(`
            SELECT COUNT(*) as active_onboarding 
            FROM employee_onboarding_new WHERE status = 'in_progress'
        `);
        const onboardingStats = onbResult[0] || { active_onboarding: 0 };
        
        const recResult = await db.execute(`
            SELECT 
                COUNT(*) as open_positions,
                (SELECT COUNT(*) FROM candidates WHERE status = 'new') as new_applicants
            FROM job_postings WHERE status = 'open'
        `);
        const recruitmentStats = recResult[0] || { open_positions: 0, new_applicants: 0 };
        
        res.json({
            success: true,
            stats: {
                employees: employeeCount.count || 0,
                leaveRequests: leaveStats,
                onboarding: onboardingStats,
                recruitment: recruitmentStats
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error.message);
        res.json({ 
            success: true, 
            stats: {
                employees: 0,
                leaveRequests: { total_requests: 0, pending: 0, approved: 0 },
                onboarding: { active_onboarding: 0 },
                recruitment: { open_positions: 0, new_applicants: 0 }
            }
        });
    }
});

const server = app.listen(PORT, () => {
    console.log(`🚀 Production Server running on port ${PORT}`);
    console.log(`📊 API Endpoints:`);
    console.log(`   - /api/auth`);
    console.log(`   - /api/leaves`);
    console.log(`   - /api/onboarding`);
    console.log(`   - /api/performance`);
    console.log(`   - /api/recruitment`);
});

// Keep server reference for graceful shutdown
module.exports = { app, server };
