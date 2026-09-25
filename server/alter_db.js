const db = require('./config/db');

async function alterDb() {
    try {
        await db.promise().query("ALTER TABLE users MODIFY COLUMN image_path LONGTEXT;");
        console.log("Altered users.image_path");
        
        await db.promise().query("ALTER TABLE lawyers MODIFY COLUMN license_file LONGTEXT;");
        console.log("Altered lawyers.license_file");
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

alterDb();
