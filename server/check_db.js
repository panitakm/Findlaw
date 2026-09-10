const mysql = require('mysql2');
require('dotenv').config({path: '../.env'});
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lawyer_service_db'
});
db.query('DESCRIBE lawyers', (err, results) => {
    if (err) console.error(err);
    else console.log(results);
    process.exit();
});
