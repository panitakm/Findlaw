const db = require('./config/db');

async function alterTables() {
    try {
        console.log("Altering users table...");
        await db.promise().query("ALTER TABLE users MODIFY COLUMN image_path VARCHAR(255);");
        console.log("Successfully altered users table.");

        console.log("Altering lawyers table...");
        await db.promise().query("ALTER TABLE lawyers MODIFY COLUMN license_file VARCHAR(255);");
        console.log("Successfully altered lawyers table.");
    } catch (err) {
        console.error("Error altering tables:", err);
    } finally {
        process.exit(0);
    }
}

alterTables();
