const express = require('express');
const cors = require('cors');
const db = require('./src/config/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Main App Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/leaves', require('./src/routes/leaves.routes'));
app.use('/api/onboarding', require('./src/routes/onboarding.routes'));
app.use('/api/performance', require('./src/routes/performance.routes'));
app.use('/api/recruitment', require('./src/routes/recruitment.routes'));

// Health Check
app.get('/api/health', async (req, res) => {
    try {
        // Check database connection
        await db.execute('SELECT 1');
        
        // Check AI services
        const services = {
            leave: { port: 8001, status: 'unknown' },
            onboarding: { port: 8002, status: 'unknown' },
            performance: { port: 8003, status: 'unknown' },
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
        const [[leaveStats]] = await db.execute(`
            SELECT 
                COUNT(*) as total_requests,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
            FROM leave_requests WHERE MONTH(created_at) = MONTH(NOW())
        `);
        
        const [[employeeCount]] = await db.execute(`SELECT COUNT(*) as count FROM employees`);
        
        const [[onboardingStats]] = await db.execute(`
            SELECT COUNT(*) as active_onboarding 
            FROM employee_onboarding WHERE status = 'in_progress'
        `);
        
        const [[recruitmentStats]] = await db.execute(`
            SELECT 
                COUNT(*) as open_positions,
                (SELECT COUNT(*) FROM candidates WHERE status = 'new') as new_applicants
            FROM job_postings WHERE status = 'open'
        `);
        
        res.json({
            success: true,
            stats: {
                employees: employeeCount.count,
                leaveRequests: leaveStats,
                onboarding: onboardingStats,
                recruitment: recruitmentStats
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Production Server running on port ${PORT}`);
    console.log(`📊 API Endpoints:`);
    console.log(`   - /api/auth`);
    console.log(`   - /api/leaves`);
    console.log(`   - /api/onboarding`);
    console.log(`   - /api/performance`);
    console.log(`   - /api/recruitment`);
});
