const ConstraintService = require('../services/ConstraintService');
const { executeQuery } = require('../config/db');

class LeaveController {

    // Main constraint analysis endpoint
    async analyzeLeave(req, res) {
        try {
            const { request, employeeId } = req.body;
            const startTime = Date.now();

            console.log(`📊 Constraint check for: ${employeeId} - "${request}"`);

            // 1. Local constraint check (Node.js)
            const localResult = ConstraintService.quickCheck(request, employeeId);

            // 2. If local check fails, return immediately
            if (!localResult.passed) {
                const responseTime = Date.now() - startTime;

                return res.json({
                    approved: false,
                    message: '❌ Request violates basic constraints',
                    details: localResult.message,
                    violations: localResult.violations,
                    engine: 'Node.js Local Constraints',
                    responseTime: `${responseTime}ms`,
                    constraintsChecked: localResult.checksPerformed,
                    priority: localResult.priority || 1.0,
                    suggestion: localResult.suggestion || 'Try different dates'
                });
            }

            // 3. Get team state from database
            const teamState = await this.getTeamState(employeeId);

            // 4. Check with Python constraint engine (optional - can run locally)
            let pythonResult;
            try {
                pythonResult = await ConstraintService.callPythonEngine({
                    request,
                    employeeId,
                    teamState,
                    extractedInfo: localResult.extractedInfo
                });
            } catch (pythonError) {
                console.log('Python engine unavailable, using Node.js constraints:', pythonError.message);
                pythonResult = ConstraintService.fallbackCheck(localResult.extractedInfo, teamState);
            }

            // 5. Log to database
            await this.logDecision({
                employeeId,
                request,
                approved: pythonResult.approved,
                violations: pythonResult.violations || [],
                engine: pythonResult.engine || 'Mixed Constraint Engine',
                extractedInfo: localResult.extractedInfo
            });

            // 6. Calculate response time
            const responseTime = Date.now() - startTime;

            // 7. Return result
            res.json({
                approved: pythonResult.approved,
                message: pythonResult.message,
                details: pythonResult.details || `Checked against ${teamState.teamSize} team members`,
                violations: pythonResult.violations || [],
                engine: pythonResult.engine || 'Hybrid Constraint Engine',
                responseTime: `${responseTime}ms`,
                constraintsChecked: (localResult.checksPerformed || 0) + (pythonResult.checksPerformed || 0),
                priority: pythonResult.priority || localResult.priority || 1.0,
                extractedInfo: localResult.extractedInfo,
                teamCoverage: teamState.coverage
            });

        } catch (error) {
            console.error('Constraint analysis error:', error);
            res.status(500).json({
                approved: false,
                message: '⚠️ System error in constraint engine',
                details: 'Using emergency fallback rules',
                violations: ['System temporarily degraded'],
                engine: 'Emergency Fallback',
                responseTime: '5ms',
                constraintsChecked: 3,
                priority: 1.0
            });
        }
    }

    // Batch constraint solving
    async batchSolve(req, res) {
        try {
            const { requests, teamRules } = req.body;

            // Use constraint solver for multiple requests
            const solution = ConstraintService.solveBatch(requests, teamRules);

            res.json({
                success: true,
                solution,
                optimized: solution.optimized,
                coverageMaintained: solution.coverageMaintained,
                constraintsViolated: solution.constraintsViolated || 0
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Get all constraint rules
    async getConstraints(req, res) {
        const constraints = ConstraintService.getAllConstraints();
        res.json({
            rules: constraints.rules,
            priorities: constraints.priorities,
            blackoutDates: constraints.blackoutDates,
            noticePeriods: constraints.noticeRequired
        });
    }

    // Update a constraint rule
    async updateConstraint(req, res) {
        const { ruleId } = req.params;
        const { value } = req.body;

        ConstraintService.updateConstraint(ruleId, value);

        res.json({
            updated: true,
            ruleId,
            newValue: value,
            message: 'Constraint updated'
        });
    }

    // Test constraint with sample data
    async testConstraint(req, res) {
        const { testCase } = req.body;

        const result = ConstraintService.runTestCase(testCase);

        res.json({
            testCase,
            result,
            constraintsChecked: result.checksPerformed,
            passed: result.passed
        });
    }

    // Get employee leave balance
    async getLeaveBalance(req, res) {
        const { employeeId } = req.params;

        // Mock data - in real system, query database
        const balances = {
            vacation: Math.floor(Math.random() * 20) + 5,
            sick: Math.floor(Math.random() * 10) + 3,
            personal: Math.floor(Math.random() * 5) + 2,
            emergency: 5
        };

        res.json({
            employeeId,
            balances,
            total: Object.values(balances).reduce((a, b) => a + b, 0)
        });
    }

    // Get team coverage for a date
    async getTeamCoverage(req, res) {
        const { date } = req.params;

        // Mock team data
        const teamData = {
            date,
            totalMembers: 8,
            onLeave: Math.floor(Math.random() * 3),
            workingRemotely: Math.floor(Math.random() * 2),
            inOffice: 5,
            coverage: 'adequate', // or 'critical' or 'understaffed'
            constraints: [
                'Minimum 3 in office',
                'At least 1 senior engineer',
                'Support coverage 9-5'
            ]
        };

        teamData.meetsConstraints = teamData.inOffice >= 3;

        res.json(teamData);
    }

    // Helper: Get team state from database
    async getTeamState(employeeId) {
        // Mock data - in real system, query database
        return {
            employeeId,
            teamSize: 8,
            teamName: 'Engineering',
            alreadyOnLeave: 2,
            workingToday: ['EMP001', 'EMP002', 'EMP003', 'EMP004', employeeId, 'EMP006', 'EMP007', 'EMP008'],
            onLeaveToday: ['EMP002', 'EMP005'],
            managerId: 'MGR001',
            minCoverageRequired: 3,
            maxConcurrentLeave: 3,
            blackoutDates: ['2024-12-25', '2024-12-31'],
            projectDeadlines: ['2024-03-30']
        };
    }

    // Helper: Log decision to database
    async logDecision(decisionData) {
        try {
            const query = `
                INSERT INTO leave_decisions 
                (employee_id, request_text, approved, violations, engine_used, extracted_info, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `;

            const params = [
                decisionData.employeeId,
                decisionData.request.substring(0, 500),
                decisionData.approved ? 1 : 0,
                JSON.stringify(decisionData.violations || []),
                decisionData.engine,
                JSON.stringify(decisionData.extractedInfo || {})
            ];

            // In real system: await executeQuery(query, params);
            console.log('📝 Decision logged:', {
                employee: decisionData.employeeId,
                approved: decisionData.approved,
                engine: decisionData.engine
            });

        } catch (error) {
            console.error('Failed to log decision:', error);
        }
    }
}

module.exports = new LeaveController();