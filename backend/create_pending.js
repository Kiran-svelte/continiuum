const db = require('./src/config/db');

async function createPendingRequest() {
    try {
        await db.execute(`
            INSERT INTO leave_requests 
            (request_id, emp_id, leave_type, start_date, end_date, total_days, reason, status, created_at) 
            VALUES 
            ('REQ_PENDING_HR', 'EMP001', 'Annual Leave', '2026-02-01', '2026-02-05', 5, 'Test pending request for HR approval', 'pending', NOW())
        `);
        console.log('✅ Created pending request: REQ_PENDING_HR');
    } catch (e) {
        console.log('Error:', e.message);
    }
    process.exit(0);
}

createPendingRequest();
