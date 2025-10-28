// Quick migration script - Add avatar column
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD || ''),
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  try {
    console.log('🔗 Connecting to database...');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected successfully!');
    
    // Check if column exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'avatar'
    `;
    
    const result = await pool.query(checkQuery);
    
    if (result.rows.length > 0) {
      console.log('✅ Avatar column already exists!');
    } else {
      console.log('📝 Adding avatar column...');
      await pool.query('ALTER TABLE users ADD COLUMN avatar VARCHAR(255)');
      console.log('✅ Avatar column added successfully!');
    }
    
    // Show all columns in users table
    const columnsQuery = `
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `;
    
    const columns = await pool.query(columnsQuery);
    console.log('\n📋 Users table columns:');
    columns.rows.forEach(col => {
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      console.log(`   - ${col.column_name}: ${col.data_type}${length}`);
    });
    
    await pool.end();
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n💡 Try running this SQL in pgAdmin instead:');
    console.error('   ALTER TABLE users ADD COLUMN avatar VARCHAR(255);');
    await pool.end();
    process.exit(1);
  }
}

runMigration();

