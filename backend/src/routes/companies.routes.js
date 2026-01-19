const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');

// Helper to generate random 6-digit code
function generateCompanyCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/companies/register
 * Register a new company and get a unique code
 */
router.post('/register', authenticateToken, async (req, res) => {
    try {
        const { company_name, industry } = req.body;
        const empId = req.user?.emp_id || req.user?.employeeId;

        if (!company_name) {
            return res.status(400).json({ success: false, error: 'Company name is required' });
        }

        // Generate unique code
        let code = generateCompanyCode();
        let isUnique = false;
        while (!isUnique) {
            const [existing] = await db.execute('SELECT id FROM companies WHERE code = ?', [code]);
            if (existing.length === 0) isUnique = true;
            else code = generateCompanyCode();
        }

        const companyId = 'COM' + Date.now();

        // Create company
        await db.execute(`
            INSERT INTO companies (id, name, code, industry, admin_id)
            VALUES (?, ?, ?, ?, ?)
        `, [companyId, company_name, code, industry || 'Tech', empId]);

        // Update employee to be admin of this org
        await db.execute(`
            UPDATE employees SET org_id = ?, role = 'hr' WHERE emp_id = ?
        `, [companyId, empId]);

        res.json({
            success: true,
            message: 'Company registered successfully',
            company: {
                id: companyId,
                name: company_name,
                code: code
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/companies/join
 * Join a company using a code
 */
router.post('/join', authenticateToken, async (req, res) => {
    try {
        const { code } = req.body;
        const empId = req.user?.emp_id || req.user?.employeeId;

        if (!code) {
            return res.status(400).json({ success: false, error: 'Company code is required' });
        }

        // Find company
        const [company] = await db.execute('SELECT * FROM companies WHERE code = ?', [code]);
        if (!company || company.length === 0) {
            return res.status(404).json({ success: false, error: 'Invalid company code' });
        }

        const orgId = company[0].id;

        // Update employee
        await db.execute(`
            UPDATE employees SET org_id = ? WHERE emp_id = ?
        `, [orgId, empId]);

        res.json({
            success: true,
            message: `Successfully joined ${company[0].name}`,
            company: company[0]
        });
    } catch (error) {
        console.error('Join error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/companies/activity
 * Get activity feed for the user's organization
 */
router.get('/activity', authenticateToken, async (req, res) => {
    try {
        const empId = req.user?.emp_id || req.user?.employeeId;

        // Get user's org_id
        const emp = await db.getOne('SELECT org_id FROM employees WHERE emp_id = ?', [empId]);
        if (!emp || !emp.org_id) {
            return res.json({ success: true, activities: [] });
        }

        const orgId = emp.org_id;

        // Fetch logs
        const logs = await db.execute(`
            SELECT at.*, e.full_name as actor_name 
            FROM audit_trail at
            LEFT JOIN employees e ON at.actor_emp_id = e.emp_id
            WHERE at.org_id = ?
            ORDER BY at.created_at DESC
            LIMIT 50
        `, [orgId]);

        res.json({
            success: true,
            activities: logs
        });
    } catch (error) {
        console.error('Activity feed error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
