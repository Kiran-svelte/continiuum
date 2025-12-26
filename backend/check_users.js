const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function checkAndCreateUsers() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'company'
    });

    try {
        const [users] = await connection.query('SELECT id, name, email FROM users');
        console.log('--- USERS ---');
        console.log(JSON.stringify(users, null, 2));

        const employee = users.find(u => u.email === 'employee@company.com');
        if (!employee) {
            console.log('Creating employee user...');
            const password = await bcrypt.hash('employee123', 10);
            await connection.query(`
                INSERT INTO users (name, email, password, role, created_at, updated_at)
                VALUES ('John Employee', 'employee@company.com', ?, 'employee', NOW(), NOW())
            `, [password]);
            console.log('✅ Employee user created.');
        } else {
            console.log('✅ Employee user already exists (ID: ' + employee.id + ')');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkAndCreateUsers();
