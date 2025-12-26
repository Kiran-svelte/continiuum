const mysql = require('mysql2/promise');

async function checkSchema() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'company'
    });

    try {
        console.log('--- TABLES ---');
        const [tables] = await connection.query('SHOW TABLES');
        console.log(JSON.stringify(tables, null, 2));

        const leaveTable = tables.find(t => Object.values(t)[0] === 'leaves');
        if (leaveTable) {
            console.log('\n--- LEAVES TABLE SCHEMA ---');
            const [columns] = await connection.query('DESCRIBE leaves');
            console.table(columns);
        } else {
            console.log('leaves table does not exist.');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkSchema();
