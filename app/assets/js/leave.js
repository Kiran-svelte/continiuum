const API_BASE = 'http://localhost:5000/api';

// Main function called from HTML
window.checkLeaveConstraints = async function (requestText) {
    try {
        console.log('🚀 Sending request for constraint analysis...');

        // Demo: Hardcoded employee ID for testing
        const employeeId = 'EMP001';

        const response = await fetch(`${API_BASE}/leaves/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer demo-token-123'
            },
            body: JSON.stringify({
                request: requestText,
                employeeId: employeeId
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Server error');
        }

        const data = await response.json();
        console.log('✅ Result received:', data);

        // Display mapping for the detailed UI
        window.displayResult({
            approved: data.approved,
            message: data.message,
            details: data.details,
            violations: data.violations,
            engine: data.engine,
            responseTime: data.responseTime,
            constraintsChecked: '14+ rules',
            priority: data.approved ? (data.message.includes('Sick') ? '3.0' : '1.5') : '1.0',
            history: {
                employee: data.employee,
                department: data.department,
                team: data.team,
                balance: data.leaveBalance ? `${data.leaveBalance.remaining} days remaining` : 'Unknown'
            },
            suggestions: data.suggestions,
            alternatives: data.alternativeDates
        });

    } catch (error) {
        console.error('❌ Error:', error);
        window.displayResult({
            approved: false,
            message: '⚠️ Service Error',
            details: error.message,
            violations: ['Failed to reach backend analysis services'],
            engine: 'Frontend Fallback',
            responseTime: '0ms'
        });
    }
};