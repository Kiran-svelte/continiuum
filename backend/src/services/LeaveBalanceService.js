const db = require('../config/db');

class LeaveBalanceService {
    /**
     * Get user's leave balance
     */
    async getUserBalance(userId) {
        try {
            const [rows] = await db.promise().query(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );

            if (rows.length === 0) {
                throw new Error('User not found');
            }

            // Calculate used leaves
            const [leaves] = await db.promise().query(
                `SELECT 
                    leave_type,
                    SUM(DATEDIFF(end_date, start_date) + 1) as days_used
                 FROM leaves 
                 WHERE user_id = ? 
                 AND status = 'Approved'
                 AND YEAR(start_date) = YEAR(CURDATE())
                 GROUP BY leave_type`,
                [userId]
            );

            // Default annual limits
            const limits = {
                'Sick Leave': 10,
                'Casual Leave': 12,
                'Annual Leave': 18
            };

            const balance = {};
            for (const [type, limit] of Object.entries(limits)) {
                const used = leaves.find(l => l.leave_type === type)?.days_used || 0;
                balance[type] = {
                    total: limit,
                    used: parseInt(used),
                    remaining: limit - parseInt(used)
                };
            }

            return balance;
        } catch (error) {
            console.error('Balance calculation error:', error);
            throw error;
        }
    }

    /**
     * Calculate days between dates
     */
    calculateDays(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    }
}

module.exports = new LeaveBalanceService();
