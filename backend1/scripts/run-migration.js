// Script to run the homework status column migration
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load database configuration from your environment or config
// Update these with your actual database credentials
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'your_database_name',
  user: process.env.DB_USER || 'your_username',
  password: process.env.DB_PASSWORD || 'your_password',
});

async function runMigration() {
  try {
    const sqlFile = path.join(__dirname, 'add-homework-status-column.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('Running migration: add-homework-status-column.sql');
    await pool.query(sql);
    console.log('✅ Migration completed successfully!');
    
    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'homework_scans' AND column_name = 'status'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Status column exists:', result.rows[0]);
    } else {
      console.log('⚠️ Status column not found');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

