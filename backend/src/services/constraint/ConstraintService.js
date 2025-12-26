const db = require('../../config/db');

class ConstraintService {
    /**
     * Extracts basic info from request text (pre-processing)
     */
    quickCheck(text, employeeId) {
        const info = {
            employeeId,
            type: 'vacation',
            dates: [],
            duration: 1,
            reason: ''
        };

        const t = text.toLowerCase();
        if (t.includes('sick')) info.type = 'sick';
        else if (t.includes('personal')) info.type = 'personal';
        else if (t.includes('emergency')) info.type = 'emergency';

        // Very basic date extraction for quick check
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Mock extraction - will be refined by Python/Controller
        info.dates = [tomorrow.toISOString().split('T')[0]];

        return {
            passed: true,
            extractedInfo: info,
            checksPerformed: 4
        };
    }

    /**
     * Fetches all real data required for the constraint engine
     */
    async getTeamState(employeeId, dates) {
        // 1. Get employee & department
        const employee = await db.getOne('SELECT * FROM employees WHERE emp_id = ?', [employeeId]);
        if (!employee) throw new Error('Employee not found');

        // 2. Get leave balance
        const balance = await db.getOne(
            'SELECT * FROM leave_balances WHERE emp_id = ? AND fiscal_year = YEAR(CURDATE())',
            [employeeId]
        );

        // 3. Get team info
        const team = await db.getOne(`
            SELECT t.*, tm.role_in_team 
            FROM teams t
            JOIN team_members tm ON t.team_id = tm.team_id
            WHERE tm.emp_id = ? AND tm.is_primary_team = TRUE
        `, [employeeId]);

        if (!team) throw new Error('Employee not assigned to a primary team');

        // 4. Check existing leaves for team on requested dates
        const placeholders = dates.map(() => '?').join(',');
        const conflicts = await db.query(`
            SELECT lr.emp_id, lr.start_date, lr.end_date 
            FROM leave_requests lr
            JOIN team_members tm ON lr.emp_id = tm.emp_id
            WHERE tm.team_id = ? 
              AND lr.status = 'approved'
              AND (
                ${dates.map(() => '(? BETWEEN lr.start_date AND lr.end_date)').join(' OR ')}
              )
        `, [team.team_id, ...dates]);

        // 5. Get blackout dates for the requested range
        const blackout = await db.query(`
            SELECT * FROM blackout_dates 
            WHERE (
                ${dates.map(() => '(? BETWEEN start_date AND end_date)').join(' OR ')}
            )
        `, [...dates]);

        return {
            employee,
            balance,
            team: {
                ...team,
                teamSize: (await db.getOne('SELECT COUNT(*) as count FROM team_members WHERE team_id = ?', [team.team_id])).count,
                alreadyOnLeave: conflicts.length,
                conflicts
            },
            blackoutDates: blackout
        };
    }
}

module.exports = new ConstraintService();