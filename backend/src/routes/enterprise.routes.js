const express = require('express');
const router = express.Router();
const db = require('../config/db');
const axios = require('axios');
const { authenticateToken } = require('../middleware/authMiddleware');

const ENTERPRISE_ENGINE_URL = 'http://127.0.0.1:8003';

// =====================================================
// ENTERPRISE MULTI-TENANT ROUTES
// =====================================================

/**
 * GET /api/enterprise/health
 * Check enterprise engine health
 */
router.get('/health', async (req, res) => {
    try {
        const response = await axios.get(`${ENTERPRISE_ENGINE_URL}/health`, { timeout: 5000 });
        res.json({ success: true, ...response.data });
    } catch (error) {
        res.json({
            success: false,
            status: 'enterprise_engine_unavailable',
            fallback_mode: true
        });
    }
});

/**
 * GET /api/enterprise/clients
 * List all configured clients
 */
router.get('/clients', authenticateToken, async (req, res) => {
    try {
        const response = await axios.get(`${ENTERPRISE_ENGINE_URL}/clients`, { timeout: 5000 });
        res.json(response.data);
    } catch (error) {
        // Fallback to database
        try {
            const [clients] = await db.execute(`SELECT * FROM enterprise_clients WHERE status = 'active'`);
            res.json({ success: true, clients: clients || [], source: 'database' });
        } catch (dbError) {
            res.json({ success: true, clients: [], error: 'Could not fetch clients' });
        }
    }
});

/**
 * POST /api/enterprise/clients
 * Create new client
 */
router.post('/clients', authenticateToken, async (req, res) => {
    try {
        const { client_key, client_name, industry, primary_contact_email, primary_contact_name } = req.body;
        const clientId = 'CLT' + Date.now().toString().slice(-6);

        await db.execute(`
            INSERT INTO enterprise_clients 
            (client_id, client_key, client_name, industry, primary_contact_email, primary_contact_name)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [clientId, client_key, client_name, industry, primary_contact_email, primary_contact_name]);

        // Create default environments
        for (const env of ['sandbox', 'staging', 'production']) {
            const autoApprove = env === 'production' ? 1 : 0;
            const hrReview = env === 'staging' ? 1 : 0;
            
            await db.execute(`
                INSERT INTO client_environments 
                (client_id, environment, subdomain, database_name, auto_approve, hr_review_required, description)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                clientId, 
                env, 
                `${env}.${client_key}`,
                `${client_key}_${env}`,
                autoApprove,
                hrReview,
                env === 'sandbox' ? 'Testing new rules with real data' :
                env === 'staging' ? 'Real data, manual HR review required' :
                'Real data, fully automated'
            ]);
        }

        // Log audit
        await logAudit(req, 'client_created', 'enterprise_clients', clientId, 'success');

        res.json({
            success: true,
            client_id: clientId,
            message: 'Client created with 3 environments (sandbox, staging, production)'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/enterprise/client/:clientId/environments
 * Get all environments for a client
 */
router.get('/client/:clientId/environments', authenticateToken, async (req, res) => {
    try {
        const response = await axios.get(
            `${ENTERPRISE_ENGINE_URL}/client/${req.params.clientId}/environments`,
            { timeout: 5000 }
        );
        res.json(response.data);
    } catch (error) {
        try {
            const [environments] = await db.execute(`
                SELECT * FROM client_environments WHERE client_id = ?
            `, [req.params.clientId]);
            res.json({ success: true, environments: environments || [] });
        } catch (dbError) {
            res.status(500).json({ success: false, error: dbError.message });
        }
    }
});

/**
 * GET /api/enterprise/client/:clientId/environment/:env
 * Get specific environment configuration
 */
router.get('/client/:clientId/environment/:env', authenticateToken, async (req, res) => {
    try {
        const response = await axios.get(
            `${ENTERPRISE_ENGINE_URL}/client/${req.params.clientId}/environment/${req.params.env}`,
            { timeout: 5000 }
        );
        res.json(response.data);
    } catch (error) {
        try {
            const [envs] = await db.execute(`
                SELECT e.*, c.client_name, c.industry 
                FROM client_environments e
                JOIN enterprise_clients c ON e.client_id = c.client_id
                WHERE e.client_id = ? AND e.environment = ?
            `, [req.params.clientId, req.params.env]);
            
            if (envs.length === 0) {
                return res.status(404).json({ success: false, error: 'Environment not found' });
            }
            res.json({ success: true, environment: envs[0] });
        } catch (dbError) {
            res.status(500).json({ success: false, error: dbError.message });
        }
    }
});

// =====================================================
// APPROVAL CHAIN ROUTES
// =====================================================

/**
 * POST /api/enterprise/approval/determine
 * Determine approval type needed
 */
router.post('/approval/determine', authenticateToken, async (req, res) => {
    try {
        const response = await axios.post(`${ENTERPRISE_ENGINE_URL}/approval/determine`, req.body, {
            timeout: 5000
        });
        res.json(response.data);
    } catch (error) {
        // Fallback logic
        const { request } = req.body;
        let approvalLevel = 'auto_approved';
        
        if (request?.cross_border || request?.visa_sponsorship) approvalLevel = 'legal_approval';
        else if (request?.policy_exception || request?.compensation_adjustment) approvalLevel = 'hr_approval';
        else if (request?.budget_override || request?.schedule_exception) approvalLevel = 'manager_approval';
        
        res.json({
            success: true,
            approval_type: approvalLevel,
            auto_approved: approvalLevel === 'auto_approved',
            source: 'fallback'
        });
    }
});

/**
 * POST /api/enterprise/approval/request
 * Create approval request
 */
router.post('/approval/request', authenticateToken, async (req, res) => {
    try {
        const { client_id, environment, request_type, request_data } = req.body;
        
        // Determine approval level
        let approvalResponse;
        try {
            approvalResponse = await axios.post(`${ENTERPRISE_ENGINE_URL}/approval/determine`, {
                client_id, environment, request: request_data
            }, { timeout: 5000 });
        } catch (e) {
            approvalResponse = { data: { approval_type: 'manager_approval' } };
        }

        const requestId = 'APR' + Date.now();
        const approvalLevel = approvalResponse.data.approval_type;

        await db.execute(`
            INSERT INTO approval_requests 
            (request_id, client_id, environment, request_type, approval_level, 
             requestor_id, requestor_name, request_data, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            requestId, client_id, environment, request_type, approvalLevel,
            req.user?.emp_id, req.user?.name, JSON.stringify(request_data),
            approvalLevel === 'auto_approved' ? 'approved' : 'pending'
        ]);

        await logAudit(req, 'approval_requested', 'approval_requests', requestId, 'success');

        res.json({
            success: true,
            request_id: requestId,
            approval_level: approvalLevel,
            auto_approved: approvalLevel === 'auto_approved',
            status: approvalLevel === 'auto_approved' ? 'approved' : 'pending'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/enterprise/approval/:requestId
 * Process approval (approve/reject)
 */
router.put('/approval/:requestId', authenticateToken, async (req, res) => {
    try {
        const { action, comments } = req.body;
        const status = action === 'approve' ? 'approved' : 'rejected';

        await db.execute(`
            UPDATE approval_requests 
            SET status = ?, current_approver = ?, completed_at = NOW()
            WHERE request_id = ?
        `, [status, req.user?.name, req.params.requestId]);

        await db.execute(`
            INSERT INTO approval_chain_history 
            (request_id, approval_level, approver_id, approver_name, action, comments)
            SELECT request_id, approval_level, ?, ?, ?, ?
            FROM approval_requests WHERE request_id = ?
        `, [req.user?.emp_id, req.user?.name, action, comments, req.params.requestId]);

        await logAudit(req, `approval_${action}`, 'approval_requests', req.params.requestId, 'success');

        res.json({ success: true, status, message: `Request ${status}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/enterprise/approval/pending
 * Get pending approvals for current user
 */
router.get('/approval/pending', authenticateToken, async (req, res) => {
    try {
        const [pending] = await db.execute(`
            SELECT * FROM approval_requests 
            WHERE status = 'pending'
            ORDER BY created_at DESC
        `);
        res.json({ success: true, pending: pending || [] });
    } catch (error) {
        res.json({ success: true, pending: [] });
    }
});

// =====================================================
// ROLLBACK & INCIDENT ROUTES
// =====================================================

/**
 * GET /api/enterprise/rollback/status
 * Get current system status and rollback status
 */
router.get('/rollback/status', authenticateToken, async (req, res) => {
    try {
        const response = await axios.get(`${ENTERPRISE_ENGINE_URL}/rollback/status`, { timeout: 5000 });
        res.json(response.data);
    } catch (error) {
        res.json({
            success: true,
            status: 'healthy',
            current_mode: 'normal',
            metrics: { compliance_score: 100, error_rate: 0, satisfaction_score: 5 },
            alerts: [],
            source: 'fallback'
        });
    }
});

/**
 * POST /api/enterprise/rollback/trigger
 * Trigger manual rollback
 */
router.post('/rollback/trigger', authenticateToken, async (req, res) => {
    try {
        const { reason, client_id, environment } = req.body;
        const incidentId = 'INC' + Date.now();

        await db.execute(`
            INSERT INTO system_incidents 
            (incident_id, client_id, incident_type, severity, trigger_rule, status, mode_after, actions_taken)
            VALUES (?, ?, 'manual_rollback', 'high', ?, 'active', 'manual_process', ?)
        `, [incidentId, client_id, reason, JSON.stringify(['manual_trigger', 'notify_hr', 'pause_automation'])]);

        await logAudit(req, 'rollback_triggered', 'system_incidents', incidentId, 'success');

        res.json({
            success: true,
            incident_id: incidentId,
            message: 'Rollback initiated - switching to manual process',
            recovery_steps: [
                'Review failed constraints',
                'Identify root cause',
                'Apply fixes in sandbox',
                'Test in staging',
                'Deploy to production'
            ]
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/enterprise/rollback/resolve/:incidentId
 * Resolve incident
 */
router.post('/rollback/resolve/:incidentId', authenticateToken, async (req, res) => {
    try {
        const { resolution_notes } = req.body;

        await db.execute(`
            UPDATE system_incidents 
            SET status = 'resolved', resolved_at = NOW(), resolved_by = ?, resolution_notes = ?
            WHERE incident_id = ?
        `, [req.user?.name, resolution_notes, req.params.incidentId]);

        await logAudit(req, 'incident_resolved', 'system_incidents', req.params.incidentId, 'success');

        res.json({ success: true, message: 'Incident resolved' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/enterprise/incidents
 * Get all incidents
 */
router.get('/incidents', authenticateToken, async (req, res) => {
    try {
        const [incidents] = await db.execute(`
            SELECT * FROM system_incidents ORDER BY created_at DESC LIMIT 100
        `);
        res.json({ success: true, incidents: incidents || [] });
    } catch (error) {
        res.json({ success: true, incidents: [] });
    }
});

// =====================================================
// METRICS ROUTES
// =====================================================

/**
 * GET /api/enterprise/metrics
 * Get system metrics
 */
router.get('/metrics', authenticateToken, async (req, res) => {
    try {
        const response = await axios.get(`${ENTERPRISE_ENGINE_URL}/metrics`, { timeout: 5000 });
        res.json(response.data);
    } catch (error) {
        try {
            const [summary] = await db.execute(`
                SELECT * FROM metrics_daily_summary 
                ORDER BY summary_date DESC LIMIT 1
            `);
            res.json({
                success: true,
                performance: summary[0] || {},
                targets: {
                    constraint_check_ms: { target: 100 },
                    api_response_ms: { target: 200 },
                    workflow_execution_minutes: { target: 5 },
                    uptime_percent: { target: 99.95 }
                },
                source: 'database'
            });
        } catch (dbError) {
            res.json({ success: true, metrics: {}, source: 'unavailable' });
        }
    }
});

/**
 * POST /api/enterprise/metrics/record
 * Record a metric
 */
router.post('/metrics/record', authenticateToken, async (req, res) => {
    try {
        const { client_id, metric_name, metric_value, metric_unit } = req.body;
        
        await db.execute(`
            INSERT INTO system_metrics 
            (client_id, metric_name, metric_value, metric_unit)
            VALUES (?, ?, ?, ?)
        `, [client_id, metric_name, metric_value, metric_unit]);

        // Also send to enterprise engine
        try {
            await axios.post(`${ENTERPRISE_ENGINE_URL}/metrics/record`, req.body, { timeout: 2000 });
        } catch (e) {}

        res.json({ success: true, message: 'Metric recorded' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/enterprise/metrics/summary/:clientId
 * Get metrics summary for client
 */
router.get('/metrics/summary/:clientId', authenticateToken, async (req, res) => {
    try {
        const [summary] = await db.execute(`
            SELECT * FROM metrics_daily_summary 
            WHERE client_id = ?
            ORDER BY summary_date DESC 
            LIMIT 30
        `, [req.params.clientId]);

        const [successMetrics] = await db.execute(`
            SELECT * FROM success_metrics_tracking
            WHERE client_id = ?
            ORDER BY measured_date DESC
            LIMIT 20
        `, [req.params.clientId]);

        res.json({
            success: true,
            daily_summary: summary || [],
            success_metrics: successMetrics || []
        });
    } catch (error) {
        res.json({ success: true, daily_summary: [], success_metrics: [] });
    }
});

// =====================================================
// SECURITY & COMPLIANCE ROUTES
// =====================================================

/**
 * GET /api/enterprise/security/compliance/:industry
 * Get compliance requirements for industry
 */
router.get('/security/compliance/:industry', authenticateToken, async (req, res) => {
    try {
        const response = await axios.get(
            `${ENTERPRISE_ENGINE_URL}/security/compliance/${req.params.industry}`,
            { timeout: 5000 }
        );
        res.json(response.data);
    } catch (error) {
        const industryCompliance = {
            healthcare: ['HIPAA', 'HITECH', 'SOC2', 'ISO27001'],
            finance: ['FINRA', 'PCI-DSS', 'SOX', 'SOC2'],
            technology: ['SOC2', 'ISO27001', 'GDPR'],
            default: ['SOC2', 'ISO27001']
        };
        res.json({
            success: true,
            industry: req.params.industry,
            requirements: industryCompliance[req.params.industry] || industryCompliance.default,
            source: 'fallback'
        });
    }
});

/**
 * GET /api/enterprise/audit-log
 * Get audit log entries
 */
router.get('/audit-log', authenticateToken, async (req, res) => {
    try {
        const { client_id, limit = 100 } = req.query;
        
        let query = `SELECT * FROM security_audit_log`;
        const params = [];
        
        if (client_id) {
            query += ` WHERE client_id = ?`;
            params.push(client_id);
        }
        
        query += ` ORDER BY created_at DESC LIMIT ?`;
        params.push(parseInt(limit));

        const [logs] = await db.execute(query, params);
        res.json({ success: true, logs: logs || [] });
    } catch (error) {
        res.json({ success: true, logs: [] });
    }
});

/**
 * POST /api/enterprise/security/mask-pii
 * Mask PII in data
 */
router.post('/security/mask-pii', authenticateToken, async (req, res) => {
    try {
        const response = await axios.post(`${ENTERPRISE_ENGINE_URL}/security/mask-pii`, req.body, {
            timeout: 5000
        });
        res.json(response.data);
    } catch (error) {
        // Fallback masking
        const { data } = req.body;
        const piiFields = ['ssn', 'dob', 'bank_account', 'address', 'phone', 'email'];
        const masked = { ...data };
        
        for (const field of piiFields) {
            if (masked[field]) {
                const value = String(masked[field]);
                masked[field] = value.length > 4 ? '*'.repeat(value.length - 4) + value.slice(-4) : '****';
            }
        }
        
        res.json({ success: true, masked_data: masked, source: 'fallback' });
    }
});

// =====================================================
// DISASTER RECOVERY ROUTES
// =====================================================

/**
 * GET /api/enterprise/disaster-recovery/config
 * Get DR configuration
 */
router.get('/disaster-recovery/config', authenticateToken, async (req, res) => {
    try {
        const response = await axios.get(`${ENTERPRISE_ENGINE_URL}/disaster-recovery/config`, {
            timeout: 5000
        });
        res.json(response.data);
    } catch (error) {
        res.json({
            success: true,
            disaster_recovery: {
                backup: { frequency: 'daily', retention_days: 30 },
                failover: { rto_hours: 2, rpo_minutes: 15 },
                point_in_time_recovery: { max_data_loss_minutes: 15 }
            },
            source: 'fallback'
        });
    }
});

/**
 * GET /api/enterprise/backups
 * Get backup history
 */
router.get('/backups', authenticateToken, async (req, res) => {
    try {
        const [backups] = await db.execute(`
            SELECT * FROM backup_history 
            ORDER BY completed_at DESC 
            LIMIT 30
        `);
        res.json({ success: true, backups: backups || [] });
    } catch (error) {
        res.json({ success: true, backups: [] });
    }
});

// =====================================================
// DEPLOYMENT ROUTES
// =====================================================

/**
 * POST /api/enterprise/deploy
 * Create deployment request
 */
router.post('/deploy', authenticateToken, async (req, res) => {
    try {
        const { client_id, environment, version, notes } = req.body;
        
        // Get previous version
        const [prev] = await db.execute(`
            SELECT version FROM deployment_history 
            WHERE client_id = ? AND environment = ? AND status = 'completed'
            ORDER BY completed_at DESC LIMIT 1
        `, [client_id, environment]);

        const deploymentId = await db.execute(`
            INSERT INTO deployment_history 
            (client_id, environment, version, previous_version, deployed_by, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [client_id, environment, version, prev[0]?.version || 'initial', req.user?.name, notes]);

        // If staging/production, require approval
        if (environment !== 'sandbox') {
            await db.execute(`
                INSERT INTO deployment_approvals 
                (deployment_id, approval_stage, status)
                VALUES (?, ?, 'pending')
            `, [deploymentId.insertId, environment === 'staging' ? 'hr_approval' : 'manager_approval']);
        }

        await logAudit(req, 'deployment_created', 'deployment_history', deploymentId.insertId, 'success');

        res.json({
            success: true,
            deployment_id: deploymentId.insertId,
            requires_approval: environment !== 'sandbox',
            message: environment === 'sandbox' ? 'Deployed to sandbox' : 'Deployment pending approval'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/enterprise/deployments
 * Get deployment history
 */
router.get('/deployments', authenticateToken, async (req, res) => {
    try {
        const [deployments] = await db.execute(`
            SELECT d.*, c.client_name 
            FROM deployment_history d
            LEFT JOIN enterprise_clients c ON d.client_id = c.client_id
            ORDER BY d.started_at DESC 
            LIMIT 50
        `);
        res.json({ success: true, deployments: deployments || [] });
    } catch (error) {
        res.json({ success: true, deployments: [] });
    }
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function logAudit(req, action, resourceType, resourceId, result) {
    try {
        await db.execute(`
            INSERT INTO security_audit_log 
            (client_id, user_id, action, resource_type, resource_id, result, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            req.body?.client_id || 'system',
            req.user?.emp_id || 'unknown',
            action,
            resourceType,
            resourceId,
            result,
            req.ip
        ]);
    } catch (e) {
        console.log('Audit log error:', e.message);
    }
}

module.exports = router;
