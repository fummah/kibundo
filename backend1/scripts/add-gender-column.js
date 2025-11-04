// Script to add gender column to users table
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Sequelize } = require('sequelize');
const config = require('../config/db.config.js');

// Validate config
if (!config.DB || !config.USER || !config.PASSWORD) {
  console.error('✗ Missing database configuration. Please check your .env file.');
  console.error('Required: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
  process.exit(1);
}

// Ensure password is a string
const password = String(config.PASSWORD || '');

// Create Sequelize instance using config
const sequelize = new Sequelize(
  config.DB,
  config.USER,
  password,
  {
    host: config.HOST,
    dialect: config.dialect,
    port: config.PORT || 5432,
    logging: console.log
  }
);

async function addGenderColumn() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connection established successfully.');

    // Check if gender column exists (PostgreSQL)
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND column_name = 'gender'
    `);

    if (results.length > 0) {
      console.log('✓ Gender column already exists in users table.');
    } else {
      console.log('Adding gender column to users table...');
      
      // First, create the ENUM type if it doesn't exist
      await sequelize.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_gender') THEN
            CREATE TYPE enum_users_gender AS ENUM ('male', 'female');
          END IF;
        END $$;
      `);
      
      // Add the column
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN gender enum_users_gender
      `);
      
      console.log('✓ Gender column added successfully!');
    }

    await sequelize.close();
    console.log('✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

addGenderColumn();

