// Script to add age column to students table
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

async function addAgeColumn() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connection established successfully.');

    // Check if age column exists (PostgreSQL)
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'students' 
        AND column_name = 'age'
    `);

    if (results.length > 0) {
      console.log('✓ Age column already exists in students table.');
    } else {
      console.log('Adding age column to students table...');
      await sequelize.query(`
        ALTER TABLE students 
        ADD COLUMN age INTEGER
      `);
      console.log('✓ Age column added successfully!');
    }

    await sequelize.close();
    console.log('✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

addAgeColumn();

