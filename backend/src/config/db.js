const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'company',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

module.exports = {
    query: async (sql, params) => {
        const [results] = await promisePool.query(sql, params);
        return results;
    },
    getOne: async (sql, params) => {
        const [results] = await promisePool.query(sql, params);
        return results[0] || null;
    },
    execute: async (sql, params) => {
        const [result] = await promisePool.execute(sql, params);
        return result;
    }
};