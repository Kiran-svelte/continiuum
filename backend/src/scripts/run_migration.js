const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function migrate() {
    // 1. Create DB if not exists
    const adminConnection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: ''
    });

    try {
        await adminConnection.query('DROP DATABASE IF EXISTS company');
        await adminConnection.query('CREATE DATABASE company');
        console.log('✅ Database reset (dropped & created)');
    } catch (e) {
        console.error('❌ Failed to reset DB:', e.message);
        process.exit(1);
    } finally {
        await adminConnection.end();
    }

    // 2. Connect to DB and Run Migration
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'company',
        multipleStatements: true
    });

    try {
        const sqlPath = path.join(__dirname, '../../migrations/complete_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('🚀 Running database migration...');
        await connection.query(sql);
        console.log('✅ Migration successful!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        fs.writeFileSync('migration_error.log', error.stack);
    } finally {
        await connection.end();
    }
}

migrate();
