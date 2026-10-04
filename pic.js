const mysql = require('mysql2');
const path  = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = mysql.createPool({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    }
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('เชื่อมต่อฐานข้อมูลล้มเหลว: ', err);
        return;
    }
    console.log('เชื่อมต่อฐานข้อมูลสำเร็จ!!!');
    connection.release();
});

module.exports = db;
