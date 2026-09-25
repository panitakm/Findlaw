const db = require('./config/db');

async function checkLongData() {
    try {
        const [rows] = await db.promise().query("SELECT id, LENGTH(image_path) as len FROM users WHERE LENGTH(image_path) > 255;");
        console.log("Users with long image_path:");
        console.table(rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

checkLongData();
