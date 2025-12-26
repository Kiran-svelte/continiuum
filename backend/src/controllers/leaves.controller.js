const db = require('../config/db');
const axios = require('axios');

const CONSTRAINT_ENGINE_URL = 'http://127.0.0.1:8001';

exports.analyzeLeaveRequest = async (req, res) => {
    const startTime = Date.now();
    try {
        const { request, employeeId } = req.body;
        
        if (!request || !employeeId) {
            return res.status(400).json({
                success: false,
                error: 'Request text and employeeId are required'
            });
        }

        console.log(`\n🚀 Processing Leave Request for ${employeeId}`);
        console.log(`Request: "${request}"`);

        // Call Python Constraint Engine
        let engineResponse;
        try {
            const response = await axios.post(`${CONSTRAINT_ENGINE_URL}/analyze`, {
                text: request,
                employee_id: employeeId
            }, { timeout: 10000 });
            engineResponse = response.data;
        } catch (error) {
            console.error('❌ Constraint Engine Error:', error.message);
            return res.status(503).json({
                success: false,
                error: 'Constraint Engine unavailable',
                message: 'Please try again later'
            });
        }

        // Generate request ID
        const requestId = `REQ${Date.now()}`;
        const processingTime = Date.now() - startTime;

        // Log decision to database
        try {
            await db.execute(`
                INSERT INTO constraint_decisions_log 
                (request_id, emp_id, constraint_engine_version, rules_evaluated, 
                 rules_violated, rules_passed, final_decision, decision_reason, processing_time_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                requestId,
                employeeId,
                '1.0.0',
                JSON.stringify(engineResponse.constraint_results?.all_checks?.map(c => c.rule_id) || []),
                JSON.stringify(engineResponse.constraint_results?.violations || []),
                JSON.stringify(engineResponse.constraint_results?.passed_rules || []),
                engineResponse.approved ? 'APPROVED' : 'ESCALATED',
                engineResponse.decision_reason,
                processingTime
            ]);

            // Insert leave request
            const dbStatus = engineResponse.approved ? 'approved' : 'pending';
            await db.execute(`
                INSERT INTO leave_requests 
                (request_id, emp_id, leave_type, start_date, end_date, total_days, 
                 reason, status, constraint_engine_decision)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                requestId,
                employeeId,
                engineResponse.leave_request.type,
                engineResponse.leave_request.start_date,
                engineResponse.leave_request.end_date,
                engineResponse.leave_request.days_requested,
                request,
                dbStatus,
                JSON.stringify(engineResponse)
            ]);
        } catch (dbError) {
            console.error('DB Log Error:', dbError.message);
        }

        // Return formatted response for frontend
        const leaveType = engineResponse.leave_request.type;
        const daysRequested = engineResponse.leave_request.days_requested;
        const startDate = engineResponse.leave_request.start_date;
        const endDate = engineResponse.leave_request.end_date;
        
        // Format message for UI
        let message, details;
        if (engineResponse.approved) {
            message = `✅ ${leaveType} Approved`;
            details = `Your ${daysRequested} day(s) ${leaveType.toLowerCase()} from ${startDate} to ${endDate} has been approved.`;
        } else {
            message = `❌ ${leaveType} Escalated to HR`;
            details = `${engineResponse.constraint_results.failed} constraint(s) need review. ${engineResponse.decision_reason}`;
        }
        
        // Format violations for UI
        const violations = engineResponse.constraint_results.violations.map(v => 
            `${v.rule_id}: ${v.rule_name} - ${v.message}`
        );
        
        res.json({
            success: true,
            approved: engineResponse.approved,
            status: engineResponse.status,
            requestId: requestId,
            
            // UI-friendly fields
            message: message,
            details: details,
            violations: violations,
            
            // Employee Info
            employee: engineResponse.employee?.name || 'Unknown',
            department: engineResponse.employee?.department || 'Unknown',
            team: engineResponse.team_status?.team_name || 'No Team',
            
            // Leave Details
            leaveRequest: engineResponse.leave_request,
            
            // Balance Info
            balance: engineResponse.balance,
            leaveBalance: {
                remaining: engineResponse.balance?.current || 0,
                afterApproval: engineResponse.balance?.after_approval || 0
            },
            
            // Team Status
            teamStatus: engineResponse.team_status,
            
            // Constraint Results
            constraintResults: engineResponse.constraint_results,
            
            // Decision Info
            decisionReason: engineResponse.decision_reason,
            suggestions: engineResponse.suggestions || [],
            
            // Meta
            engine: 'Constraint Satisfaction Engine v1.0',
            responseTime: `${processingTime}ms`,
            processingTimeMs: engineResponse.processing_time_ms
        });

    } catch (error) {
        console.error('❌ Workflow Error:', error);
        res.status(500).json({
            success: false,
            error: 'Leave analysis failed',
            message: error.message
        });
    }
};

exports.batchSchedule = async (req, res) => {
    // Placeholder for batch optimization
    res.json({ message: 'Batch optimization active' });
};

exports.getMyLeaves = async (req, res) => {
    try {
        const userId = req.user.id; // From JWT token

        // Get user's email to find their employee record
        const users = await db.query('SELECT email FROM users WHERE id = ?', [userId]);
        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userEmail = users[0].email;

        // Find employee by email
        const employees = await db.query('SELECT emp_id FROM employees WHERE email = ?', [userEmail]);
        if (!employees || employees.length === 0) {
            // If no employee record, return empty array
            return res.json([]);
        }

        const empId = employees[0].emp_id;

        // Get leave requests for this employee
        const leaves = await db.query(`
            SELECT 
                request_id,
                leave_type,
                start_date,
                end_date,
                total_days,
                reason,
                status,
                created_at,
                constraint_engine_decision
            FROM leave_requests 
            WHERE emp_id = ? 
            ORDER BY created_at DESC
        `, [empId]);

        res.json(leaves || []);
    } catch (error) {
        console.error('Error fetching leaves:', error);
        res.status(500).json({ message: 'Failed to fetch leave requests', error: error.message });
    }
};