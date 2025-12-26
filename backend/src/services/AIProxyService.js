const axios = require('axios');
const ConstraintService = require('./constraint/ConstraintService');

class AIProxyService {
    static async sendToLeaveAI(reason, employeeId) {
        try {
            // 1. Quick local constraint check first
            const quickCheck = await ConstraintService.quickValidate({
                text: reason,
                employee_id: employeeId
            });

            if (!quickCheck.isValid) {
                // Return early if basic constraints fail
                return {
                    approved: false,
                    message: `Quick check failed: ${quickCheck.violations.join(', ')}`,
                    source: 'nodejs_constraints'
                };
            }

            // 2. Send to Python constraint engine
            const response = await axios.post('http://localhost:8001/analyze', {
                text: reason,
                employee_id: employeeId
            }, {
                timeout: 5000  // 5 second timeout
            });

            return response.data;

        } catch (error) {
            console.error('AI Service error:', error.message);

            // Fallback: Basic rule-based approval if AI service is down
            return this.fallbackApproval(reason, employeeId);
        }
    }

    static fallbackApproval(reason, employeeId) {
        // Simple fallback when Python service is unavailable
        const hasSick = reason.toLowerCase().includes('sick');
        const hasEmergency = reason.toLowerCase().includes('emergency');

        return {
            approved: hasSick || hasEmergency,  // Only approve sick/emergency
            message: hasSick || hasEmergency
                ? 'Approved (fallback mode - AI service unavailable)'
                : 'Pending - AI service unavailable',
            source: 'fallback'
        };
    }
}

module.exports = AIProxyService;