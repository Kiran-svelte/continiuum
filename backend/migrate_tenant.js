const db = require('./src/config/db');

async function setup() {
    console.log('Starting migration...');
    try {
        // Create companies table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS companies (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                code VARCHAR(10) UNIQUE NOT NULL,
                industry VARCHAR(100),
                admin_id VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Created companies table');

        // Add org_id to audit_trail
        try {
            await db.execute('ALTER TABLE audit_trail ADD COLUMN org_id VARCHAR(36)');
            console.log('✅ Added org_id to audit_trail');
        } catch (e) {
            if (e.message.includes('Duplicate column')) {
                console.log('ℹ️ org_id already in audit_trail');
            } else {
                console.log('⚠️ audit_trail alter skipped: ' + e.message);
            }
        }

        // Add org_id to employees
        try {
            await db.execute('ALTER TABLE employees ADD COLUMN org_id VARCHAR(36)');
            console.log('✅ Added org_id to employees');
        } catch (e) {
            if (e.message.includes('Duplicate column')) {
                console.log('ℹ️ org_id already in employees');
            } else {
                console.log('⚠️ employees alter skipped: ' + e.message);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

setup();
