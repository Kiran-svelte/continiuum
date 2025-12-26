const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createTestUsers() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'company'
    });

    try {
        // Hash passwords
        const adminPassword = await bcrypt.hash('admin123', 10);
        const employeePassword = await bcrypt.hash('employee123', 10);
        const hrPassword = await bcrypt.hash('hr123', 10);

        // Check if users exist
        const [existing] = await connection.query('SELECT email FROM users WHERE email IN (?, ?, ?)',
            ['admin@company.com', 'employee@company.com', 'hr@company.com']);

        if (existing.length > 0) {
            console.log('⚠️  Users already exist. Updating passwords...');

            await connection.query('UPDATE users SET password = ? WHERE email = ?', [adminPassword, 'admin@company.com']);
            await connection.query('UPDATE users SET password = ? WHERE email = ?', [employeePassword, 'employee@company.com']);
            await connection.query('UPDATE users SET password = ? WHERE email = ?', [hrPassword, 'hr@company.com']);

            console.log('✅ Passwords updated!');
        } else {
            console.log('Creating new test users...');

            await connection.query(`
                INSERT INTO users (name, email, password, role, created_at, updated_at)
                VALUES 
                    ('Admin User', 'admin@company.com', ?, 'admin', NOW(), NOW()),
                    ('John Employee', 'employee@company.com', ?, 'employee', NOW(), NOW()),
                    ('HR Manager', 'hr@company.com', ?, 'hr', NOW(), NOW())
            `, [adminPassword, employeePassword, hrPassword]);

            console.log('✅ Test users created!');
        }

        // Display users
        const [users] = await connection.query('SELECT id, name, email, role FROM users');
        console.log('\n📋 Available Users:');
        console.table(users);

        console.log('\n🔑 Login Credentials:');
        console.log('Admin:    admin@company.com / admin123');
        console.log('Employee: employee@company.com / employee123');
        console.log('HR:       hr@company.com / hr123');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

createTestUsers();
