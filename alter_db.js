const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'server/.env' });

async function alterTables() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        console.log("Altering users table...");
        await db.query("ALTER TABLE users MODIFY COLUMN image_path VARCHAR(255);");
        console.log("Successfully altered users table.");

        console.log("Altering lawyers table...");
        await db.query("ALTER TABLE lawyers MODIFY COLUMN license_file VARCHAR(255);");
        console.log("Successfully altered lawyers table.");
    } catch (err) {
        console.error("Error altering tables:", err);
    } finally {
        await db.end();
    }
}

alterTables();
