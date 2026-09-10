const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lawyer_service_db'
  });

  try {
    console.log("Starting migration...");
    
    // 1. Add status to users
    try {
      await connection.query("ALTER TABLE users ADD COLUMN status ENUM('active', 'suspended') DEFAULT 'active'");
      console.log("Added status to users table.");
    } catch (e) {
      console.log("Status column might already exist in users:", e.message);
    }

    // 2. Add reject_reason to lawyers
    try {
      await connection.query("ALTER TABLE lawyers ADD COLUMN reject_reason TEXT");
      console.log("Added reject_reason to lawyers table.");
    } catch (e) {
      console.log("reject_reason column might already exist in lawyers:", e.message);
    }

    // 3. Add status and flag_reason to reviews
    try {
      await connection.query("ALTER TABLE reviews ADD COLUMN status ENUM('published', 'reported', 'hidden') DEFAULT 'published'");
      await connection.query("ALTER TABLE reviews ADD COLUMN flag_reason VARCHAR(255)");
      console.log("Added status and flag_reason to reviews table.");
    } catch (e) {
      console.log("Columns might already exist in reviews:", e.message);
    }

    console.log("Migration complete!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await connection.end();
  }
}

runMigration();
