const db = require('./config/db');

async function fixAndAlter() {
    try {
        console.log("Fixing long image paths in users table...");
        await db.promise().query("UPDATE users SET image_path = NULL WHERE LENGTH(image_path) > 255;");

        console.log("Fixing long license files in lawyers table...");
        await db.promise().query("UPDATE lawyers SET license_file = NULL WHERE LENGTH(license_file) > 255;");

        console.log("Altering users table...");
        await db.promise().query("ALTER TABLE users MODIFY COLUMN image_path VARCHAR(255);");
        
        console.log("Altering lawyers table...");
        await db.promise().query("ALTER TABLE lawyers MODIFY COLUMN license_file VARCHAR(255);");
        
        console.log("Successfully altered both tables to VARCHAR(255).");
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

fixAndAlter();
