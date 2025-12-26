const mysql = require('mysql2/promise');

async function addLeaveBalanceColumns() {
    try {
        // Create connection
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'company'
        });

        console.log('✅ Connected to database');

        // Add columns
        console.log('📝 Adding leave balance columns...');

        await connection.execute(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS sick_leave_balance INT DEFAULT 10
        `);
        console.log('✅ Added sick_leave_balance column');

        await connection.execute(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS annual_leave_balance INT DEFAULT 20
        `);
        console.log('✅ Added annual_leave_balance column');

        await connection.execute(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS emergency_leave_balance INT DEFAULT 5
        `);
        console.log('✅ Added emergency_leave_balance column');

        await connection.execute(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'General'
        `);
        console.log('✅ Added department column');

        // Update existing users
        console.log('📝 Updating existing users with default values...');

        await connection.execute(`
            UPDATE users 
            SET 
                sick_leave_balance = COALESCE(sick_leave_balance, 10),
                annual_leave_balance = COALESCE(annual_leave_balance, 20),
                emergency_leave_balance = COALESCE(emergency_leave_balance, 5),
                department = COALESCE(department, 
                    CASE 
                        WHEN role = 'employee' THEN 'Engineering'
                        WHEN role = 'hr' THEN 'Human Resources'
                        WHEN role = 'admin' THEN 'Administration'
                        ELSE 'General'
                    END
                )
        `);
        console.log('✅ Updated all users with default balances and departments');

        // Show results
        const [users] = await connection.execute('SELECT id, name, role, department, sick_leave_balance, annual_leave_balance, emergency_leave_balance FROM users');
        console.log('\n📊 Current user balances:');
        console.table(users);

        await connection.end();
        console.log('\n✅ Migration complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

addLeaveBalanceColumns();
