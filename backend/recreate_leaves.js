const mysql = require('mysql2/promise');
require('dotenv').config();

async function recreateLeavesTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'company'
    });

    try {
        // Disable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS=0');
        console.log('✅ Foreign key checks disabled');

        // Drop table
        await connection.query('DROP TABLE IF EXISTS leaves');
        console.log('✅ Leaves table dropped');

        // Re-enable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS=1');

        // Create table
        const query = `
            CREATE TABLE leaves (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT UNSIGNED NOT NULL,
                leave_type VARCHAR(50) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                reason TEXT,
                status VARCHAR(20) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        await connection.query(query);
        console.log('✅ Leaves table created successfully');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

recreateLeavesTable();
