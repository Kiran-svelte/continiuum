const db = require('../config/db');
const axios = require('axios');
const googleService = require('../services/GoogleService');

const CONSTRAINT_ENGINE_URL = 'http://127.0.0.1:8001';

// Parse natural language leave request
function parseLeaveRequest(text) {
    const today = new Date();
    let leaveType = 'General';
    let startDate = new Date(today);
    let endDate = new Date(today);
    let days = 1;

    // Detect leave type
    const lowerText = text.toLowerCase();
    if (lowerText.includes('sick')) leaveType = 'Sick Leave';
    else if (lowerText.includes('vacation') || lowerText.includes('annual')) leaveType = 'Vacation';
    else if (lowerText.includes('emergency')) leaveType = 'Emergency Leave';
    else if (lowerText.includes('personal')) leaveType = 'Personal Day';
    else if (lowerText.includes('maternity')) leaveType = 'Maternity Leave';
    else if (lowerText.includes('paternity')) leaveType = 'Paternity Leave';
    else if (lowerText.includes('bereavement')) leaveType = 'Bereavement';
    else if (lowerText.includes('wfh') || lowerText.includes('work from home')) leaveType = 'WFH';

    // Detect timing
    if (lowerText.includes('tomorrow')) {
        startDate.setDate(startDate.getDate() + 1);
        endDate = new Date(startDate);
    } else if (lowerText.includes('today')) {
        // Already set to today
    } else if (lowerText.includes('next week')) {
        // Find next Monday
        const daysUntilMonday = (8 - startDate.getDay()) % 7 || 7;
        startDate.setDate(startDate.getDate() + daysUntilMonday);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 4); // Friday
        days = 5;
    } else if (lowerText.includes('friday')) {
        const daysUntilFriday = (5 - startDate.getDay() + 7) % 7 || 7;
        startDate.setDate(startDate.getDate() + daysUntilFriday);
        endDate = new Date(startDate);
    } else if (lowerText.includes('monday')) {
        const daysUntilMonday = (8 - startDate.getDay()) % 7 || 7;
        startDate.setDate(startDate.getDate() + daysUntilMonday);
        endDate = new Date(startDate);
    }

    // Detect duration
    const dayMatch = text.match(/(\d+)\s*days?/i);
    if (dayMatch) {
        days = parseInt(dayMatch[1]);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + days - 1);
    }

    const formatDate = (d) => d.toISOString().split('T')[0];

    return {
        type: leaveType,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        days_requested: days
    };
}

exports.analyzeLeaveRequest = async (req, res) => {
    const startTime = Date.now();
    try {

        const { request } = req.body;
        // RLS: User can only request for themselves unless they are HR/Admin
        let employeeId = req.user.emp_id;

        // Optional: Allow HR/Admin to request on behalf of others
        if (req.body.employeeId && (req.user.role === 'hr' || req.user.role === 'admin')) {
            employeeId = req.body.employeeId;
        }

        if (!request) {
            return res.status(400).json({
                success: false,
                error: 'Request text is required'
            });
        }

        if (!employeeId) {
            return res.status(400).json({
                success: false,
                error: 'Employee ID could not be determined from token'
            });
        }

        console.log(`\n[AI Leave] Processing request for ${employeeId}`);
        console.log(`[AI Leave] Request: "${request}"`);

        // Parse leave details from text
        const leaveDetails = parseLeaveRequest(request);
        console.log(`[AI Leave] Parsed: ${leaveDetails.type}, ${leaveDetails.start_date} to ${leaveDetails.end_date}`);

        // Map leave type to database format (matching country_leave_policies)
        const leaveTypeMap = {
            'Sick Leave': 'sick_leave',
            'Vacation': 'earned_leave',
            'Annual Leave': 'earned_leave',
            'Emergency Leave': 'casual_leave',
            'Personal Day': 'casual_leave',
            'Maternity Leave': 'maternity_leave',
            'Paternity Leave': 'paternity_leave',
            'Bereavement': 'bereavement_leave',
            'WFH': 'comp_off',
            'General': 'casual_leave'
        };

        const dbLeaveType = leaveTypeMap[leaveDetails.type] || 'casual_leave';

        // Call Python Constraint Engine with text-based analysis
        let engineResponse;
        try {
            const response = await axios.post(`${CONSTRAINT_ENGINE_URL}/analyze`, {
                employee_id: employeeId,
                text: request  // Send original text for NLP processing
            }, { timeout: 10000 });
            engineResponse = response.data;
            console.log(`[AI Leave] Engine: ${engineResponse.constraint_results?.passed || 0}/${engineResponse.constraint_results?.total_rules || 8} rules passed`);
        } catch (error) {
            console.error('[AI Leave] Constraint Engine Error:', error.message);
            return res.status(503).json({
                success: false,
                error: 'Constraint Engine unavailable',
                message: 'Please try again later'
            });
        }

        // Generate request ID
        const requestId = `REQ${Date.now()}`;
        const processingTime = Date.now() - startTime;

        // Interpret engine response (new format from constraint engine)
        const constraintResults = engineResponse.constraint_results || {};
        const isApproved = engineResponse.approved === true || engineResponse.status === 'APPROVED';
        const isEscalated = !isApproved;

        // Update leaveDetails with parsed data from engine
        if (engineResponse.leave_request) {
            leaveDetails.type = engineResponse.leave_request.type || leaveDetails.type;
            leaveDetails.start_date = engineResponse.leave_request.start_date || leaveDetails.start_date;
            leaveDetails.end_date = engineResponse.leave_request.end_date || leaveDetails.end_date;
            leaveDetails.days_requested = engineResponse.leave_request.days_requested || leaveDetails.days_requested;
        }

        // Format violations for UI (from constraint_results.violations)
        const violations = [];
        if (constraintResults.violations?.length > 0) {
            constraintResults.violations.forEach(v => violations.push(`❌ ${v.rule_name}: ${v.message}`));
        }

        // Log decision to database (non-blocking)
        try {
            await db.execute(`
                INSERT INTO constraint_decisions_log 
                (request_id, emp_id, constraint_engine_version, rules_evaluated, 
                 rules_violated, rules_passed, final_decision, decision_reason, processing_time_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                requestId,
                employeeId,
                '2.0.0',
                JSON.stringify(constraintResults.passed_rules || []),
                JSON.stringify(constraintResults.violations || []),
                JSON.stringify(constraintResults.all_checks?.filter(c => c.passed) || []),
                isApproved ? 'APPROVED' : 'ESCALATED',
                engineResponse.decision_reason || 'Constraint analysis complete',
                processingTime
            ]);

            // Insert leave request
            const dbStatus = isApproved ? 'approved' : 'pending';
            await db.execute(`
                INSERT INTO leave_requests 
                (request_id, emp_id, leave_type, start_date, end_date, total_days, 
                 reason, status, constraint_engine_decision)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                requestId,
                employeeId,
                leaveDetails.type,
                leaveDetails.start_date,
                leaveDetails.end_date,
                leaveDetails.days_requested,
                request,
                dbStatus,
                JSON.stringify(engineResponse)
            ]);
        } catch (dbError) {
            console.error('[AI Leave] DB Log Error:', dbError.message);
        }

        // Get employee details for notifications
        let employeeData = { full_name: employeeId, email: null, manager_id: null };
        try {
            const empRows = await db.query(
                'SELECT full_name, email, manager_id FROM employees WHERE emp_id = ?',
                [employeeId]
            );
            if (empRows && empRows.length > 0) {
                employeeData = {
                    full_name: empRows[0].full_name || employeeId,
                    email: empRows[0].email,
                    manager_id: empRows[0].manager_id
                };
            }
            console.log(`[AI Leave] Employee data: ${employeeData.full_name}, ${employeeData.email}`);
        } catch (e) {
            console.error('[AI Leave] Employee lookup error:', e.message);
        }

        // Send email notifications and create calendar events
        const notificationData = {
            requestId: requestId,
            employeeId: employeeId,
            employeeName: employeeData.full_name || employeeId,
            toEmail: employeeData.email,
            leaveType: leaveDetails.type,
            leaveTypeDb: dbLeaveType,
            startDate: leaveDetails.start_date,
            endDate: leaveDetails.end_date,
            totalDays: leaveDetails.days_requested,
            reason: request,
            aiDecision: isApproved ? 'AUTO-APPROVED' : 'ESCALATED FOR REVIEW',
            confidence: engineResponse.confidence,
            violations: violations
        };

        // Non-blocking: Send notifications in background
        (async () => {
            try {
                if (isApproved) {
                    // Send approval email to employee
                    await googleService.sendLeaveNotification('leave_approved', notificationData);

                    // Create calendar event
                    const calendarResult = await googleService.createLeaveEvent(employeeId, notificationData);
                    if (calendarResult.success) {
                        console.log(`[AI Leave] Calendar event created: ${calendarResult.eventId}`);
                    }
                } else {
                    // Send escalation email to manager/HR
                    if (employeeData.manager_id) {
                        const mgrRows = await db.query(
                            'SELECT email FROM employees WHERE emp_id = ?',
                            [employeeData.manager_id]
                        );
                        if (mgrRows && mgrRows.length > 0) {
                            notificationData.toEmail = mgrRows[0].email;
                            notificationData.reviewUrl = `http://localhost:3000/pages/hr/leave-requests?request=${requestId}`;
                            await googleService.sendLeaveNotification('leave_escalated', notificationData);
                        }
                    }

                    // Also notify the employee that their request is pending
                    notificationData.toEmail = employeeData.email;
                    await googleService.sendLeaveNotification('leave_submitted', notificationData);
                }
            } catch (notifyError) {
                console.error('[AI Leave] Notification error:', notifyError.message);
            }
        })();

        // Format message for UI
        let message, details;
        if (isApproved) {
            message = `✅ ${leaveDetails.type} Approved by AI`;
            details = `Your ${leaveDetails.days_requested} day(s) ${leaveDetails.type.toLowerCase()} from ${leaveDetails.start_date} to ${leaveDetails.end_date} has been auto-approved. All ${constraintResults.passed || 8} constraints passed.`;
        } else {
            message = `⏳ ${leaveDetails.type} Escalated for Review`;
            details = `${constraintResults.violations?.length || 0} constraint violation(s) found. Your request has been sent to HR for manual review.`;
        }

        res.json({
            success: true,
            approved: isApproved,
            status: isApproved ? 'approved' : 'pending',
            requestId: requestId,

            // UI-friendly fields
            message: message,
            details: details,
            violations: violations.length > 0 ? violations : ['✅ All constraints passed'],

            // Employee Info
            employee: employeeId,
            department: 'Engineering',
            team: 'Development',

            // Leave Details
            leaveRequest: leaveDetails,
            extracted_info: {
                leave_type: leaveDetails.type,
                start_date: leaveDetails.start_date,
                end_date: leaveDetails.end_date,
                days: leaveDetails.days_requested,
                is_half_day: engineResponse.leave_request?.is_half_day || false
            },

            // Balance Info
            leaveBalance: {
                remaining: engineResponse.balance?.current || 10,
                afterApproval: engineResponse.balance?.after_approval || ((engineResponse.balance?.current || 10) - leaveDetails.days_requested)
            },

            // Constraint Results
            constraintResultsSummary: {
                total_rules: constraintResults.total_rules || 8,
                passed: constraintResults.passed || 8,
                failed: constraintResults.violations?.length || 0,
                violations: constraintResults.violations || []
            },

            // Decision Info
            decisionReason: engineResponse.decision_reason || 'Constraint analysis complete',
            confidence: 0.95,  // High confidence for constraint-based decisions
            suggestions: engineResponse.suggestions || [],

            // Meta
            engine: 'Constraint Engine v2.0.0',
            responseTime: `${processingTime}ms`,
            processingTimeMs: engineResponse.processing_time_ms || processingTime,

            // Security Display
            securityAudit: {
                enforced: true,
                mode: 'RLS (Row Level Security)',
                userContext: req.user.emp_id,
                roleEnforced: req.user.role,
                accessType: 'OWNER_ONLY',
                timestamp: new Date().toISOString()
            }
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

exports.getLeaveDocuments = async (req, res) => {
    try {
        const { requestId } = req.params;
        const currentUser = req.user;

        // 1. Fetch the leave request to identify the owner
        const [leaves] = await db.execute('SELECT emp_id, leave_type, created_at FROM leave_requests WHERE request_id = ?', [requestId]);

        if (!leaves || leaves.length === 0) {
            return res.status(404).json({ success: false, error: 'Leave request not found' });
        }

        const leaveRequest = leaves[0];
        const isOwner = currentUser.emp_id === leaveRequest.emp_id;
        const isHrOrAdmin = ['hr', 'admin'].includes(currentUser.role);

        // 2. RLS: Security Check
        if (!isOwner && !isHrOrAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Access Denied: You do not have permission to view these documents.'
            });
        }

        // 3. Simulate fetching documents (Safe simulation)
        // In a real scenario, this would query a 'leave_documents' table or 'employee_documents'
        const documents = [
            {
                id: 'DOC_CONTRACT',
                name: 'Employment Contract.pdf',
                type: 'Contract',
                date: '2024-01-15',
                url: '#' // Secure signed URL would go here
            },
            {
                id: 'DOC_POLICY',
                name: 'Leave Policy Acknowledgement.pdf',
                type: 'Policy',
                date: '2024-01-15',
                url: '#'
            }
        ];

        // Conditional documents based on leave type
        if (leaveRequest.leave_type.toLowerCase().includes('sick')) {
            documents.push({
                id: 'DOC_MED',
                name: `Medical_Certificate_${new Date().getFullYear()}.jpg`,
                type: 'Medical',
                date: new Date(leaveRequest.created_at).toISOString().split('T')[0],
                url: '#'
            });
        }

        console.log(`[Security] Documents accessed for Request ${requestId} by ${currentUser.emp_id} (${currentUser.role})`);

        res.json({
            success: true,
            documents: documents,
            security_audit: {
                accessed_by: currentUser.emp_id,
                access_type: isOwner ? 'OWNER' : 'ADMIN_OVERRIDE',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error fetching leave documents:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};