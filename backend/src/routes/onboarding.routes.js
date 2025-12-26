const express = require('express');
const router = express.Router();
const db = require('../config/db');
const axios = require('axios');
const { authenticateToken } = require('../middleware/authMiddleware');

// =====================================================
// ONBOARDING ROUTES - HR Panel
// =====================================================

/**
 * GET /api/onboarding/workflows
 * Get all onboarding workflows (HR/Admin)
 */
router.get('/workflows', authenticateToken, async (req, res) => {
    try {
        const [workflows] = await db.execute(`
            SELECT w.*, 
                   COUNT(t.task_id) as task_count
            FROM onboarding_workflows w
            LEFT JOIN onboarding_tasks t ON w.workflow_id = t.workflow_id
            WHERE w.is_active = TRUE
            GROUP BY w.workflow_id
            ORDER BY w.workflow_name
        `);
        res.json({ success: true, workflows });
    } catch (error) {
        console.error('Error fetching workflows:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/onboarding/workflows/:id/tasks
 * Get tasks for a specific workflow
 */
router.get('/workflows/:id/tasks', authenticateToken, async (req, res) => {
    try {
        const [tasks] = await db.execute(`
            SELECT * FROM onboarding_tasks 
            WHERE workflow_id = ?
            ORDER BY day_offset, task_id
        `, [req.params.id]);
        res.json({ success: true, tasks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/onboarding/start
 * Start onboarding for a new employee (HR action)
 */
router.post('/start', authenticateToken, async (req, res) => {
    const { emp_id, workflow_id, start_date, assigned_buddy, assigned_hr } = req.body;
    
    try {
        const [workflow] = await db.execute(
            'SELECT estimated_days FROM onboarding_workflows WHERE workflow_id = ?',
            [workflow_id]
        );
        
        if (!workflow.length) {
            return res.status(404).json({ success: false, error: 'Workflow not found' });
        }
        
        const expectedCompletion = new Date(start_date);
        expectedCompletion.setDate(expectedCompletion.getDate() + workflow[0].estimated_days);
        
        const [result] = await db.execute(`
            INSERT INTO employee_onboarding 
            (emp_id, workflow_id, start_date, expected_completion, status, assigned_buddy, assigned_hr)
            VALUES (?, ?, ?, ?, 'in_progress', ?, ?)
        `, [emp_id, workflow_id, start_date, expectedCompletion.toISOString().split('T')[0], assigned_buddy, assigned_hr]);
        
        const onboardingId = result.insertId;
        
        const [tasks] = await db.execute(
            'SELECT task_id FROM onboarding_tasks WHERE workflow_id = ?',
            [workflow_id]
        );
        
        for (const task of tasks) {
            await db.execute(`
                INSERT INTO onboarding_task_progress (onboarding_id, task_id, emp_id, status)
                VALUES (?, ?, ?, 'pending')
            `, [onboardingId, task.task_id, emp_id]);
        }
        
        res.json({ 
            success: true, 
            message: 'Onboarding started successfully',
            onboarding_id: onboardingId,
            expected_completion: expectedCompletion.toISOString().split('T')[0]
        });
    } catch (error) {
        console.error('Error starting onboarding:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/onboarding/employee/:empId
 * Get onboarding status for an employee
 */
router.get('/employee/:empId', authenticateToken, async (req, res) => {
    try {
        const [onboarding] = await db.execute(`
            SELECT o.*, w.workflow_name, w.total_steps, w.estimated_days,
                   e.full_name as employee_name, e.department,
                   b.full_name as buddy_name,
                   h.full_name as hr_name
            FROM employee_onboarding o
            JOIN onboarding_workflows w ON o.workflow_id = w.workflow_id
            JOIN employees e ON o.emp_id = e.emp_id
            LEFT JOIN employees b ON o.assigned_buddy = b.emp_id
            LEFT JOIN employees h ON o.assigned_hr = h.emp_id
            WHERE o.emp_id = ?
            ORDER BY o.created_at DESC
            LIMIT 1
        `, [req.params.empId]);
        
        if (!onboarding.length) {
            return res.status(404).json({ success: false, error: 'No onboarding found' });
        }
        
        const [tasks] = await db.execute(`
            SELECT tp.*, t.task_name, t.task_description, t.task_type, 
                   t.assigned_to, t.day_offset, t.duration_hours, t.is_mandatory
            FROM onboarding_task_progress tp
            JOIN onboarding_tasks t ON tp.task_id = t.task_id
            WHERE tp.onboarding_id = ?
            ORDER BY t.day_offset, t.task_id
        `, [onboarding[0].onboarding_id]);
        
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const progressPercentage = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
        
        await db.execute(
            'UPDATE employee_onboarding SET progress_percentage = ? WHERE onboarding_id = ?',
            [progressPercentage, onboarding[0].onboarding_id]
        );
        
        res.json({ 
            success: true, 
            onboarding: { ...onboarding[0], progress_percentage: progressPercentage },
            tasks,
            summary: {
                total: tasks.length,
                completed: completedTasks,
                in_progress: tasks.filter(t => t.status === 'in_progress').length,
                pending: tasks.filter(t => t.status === 'pending').length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/onboarding/task/:progressId
 * Update task status
 */
router.put('/task/:progressId', authenticateToken, async (req, res) => {
    const { status, notes, completed_by } = req.body;
    
    try {
        let query = 'UPDATE onboarding_task_progress SET status = ?';
        const values = [status];
        
        if (status === 'in_progress') {
            query += ', started_at = NOW()';
        } else if (status === 'completed') {
            query += ', completed_at = NOW(), completed_by = ?';
            values.push(completed_by);
        }
        
        if (notes) {
            query += ', notes = ?';
            values.push(notes);
        }
        
        query += ' WHERE progress_id = ?';
        values.push(req.params.progressId);
        
        await db.execute(query, values);
        res.json({ success: true, message: 'Task updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/onboarding/hr/dashboard
 * HR Dashboard
 */
router.get('/hr/dashboard', authenticateToken, async (req, res) => {
    try {
        const [activeOnboarding] = await db.execute(`
            SELECT o.*, e.full_name, e.department, e.position, w.workflow_name,
                   DATEDIFF(o.expected_completion, CURDATE()) as days_remaining
            FROM employee_onboarding o
            JOIN employees e ON o.emp_id = e.emp_id
            JOIN onboarding_workflows w ON o.workflow_id = w.workflow_id
            WHERE o.status IN ('not_started', 'in_progress')
            ORDER BY o.start_date DESC
        `);
        
        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total_active,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                AVG(progress_percentage) as avg_progress
            FROM employee_onboarding
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `);
        
        res.json({ 
            success: true, 
            dashboard: { active_onboarding: activeOnboarding, statistics: stats[0] }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/onboarding/ask
 * Ask AI about onboarding policies
 */
router.post('/ask', authenticateToken, async (req, res) => {
    const { question, emp_id } = req.body;
    
    try {
        const aiResponse = await axios.post('http://127.0.0.1:8002/ask', {
            question, emp_id, context: 'onboarding'
        }, { timeout: 10000 });
        
        res.json({ success: true, answer: aiResponse.data.answer });
    } catch (error) {
        res.json({ 
            success: true, 
            answer: "Please contact HR directly for assistance with onboarding questions."
        });
    }
});

module.exports = router;
