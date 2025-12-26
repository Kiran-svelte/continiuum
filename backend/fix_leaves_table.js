const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTable() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'company'
        });

        console.log('Connected to database');

        // Drop existing table
        await connection.query('DROP TABLE IF EXISTS leaves');
        console.log('✅ Dropped leaves table if existed');

        // Create table without foreign key
        await connection.query(`
            CREATE TABLE leaves (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT UNSIGNED NOT NULL,
                leave_type VARCHAR(50) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                reason TEXT,
                status VARCHAR(20) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('✅ Created leaves table successfully');

        // Verify
        const [tables] = await connection.query("SHOW TABLES LIKE 'leaves'");
        console.log('Verification:', tables.length > 0 ? '✅ Table exists' : '❌ Table not found');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

createTable();
