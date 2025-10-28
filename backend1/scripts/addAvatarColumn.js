// Script to add avatar column to users table
const { Sequelize } = require('sequelize');
const config = require('../config/db.config.js');

// Create Sequelize instance using config
const sequelize = new Sequelize(
  config.DB,
  config.USER,
  config.PASSWORD,
  {
    host: config.HOST,
    dialect: config.dialect,
    port: config.PORT || 5432,
    logging: console.log
  }
);

async function addAvatarColumn() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connection established successfully.');

    // Check if avatar column exists (PostgreSQL)
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND column_name = 'avatar'
    `);

    if (results.length > 0) {
      console.log('✓ Avatar column already exists in users table.');
    } else {
      console.log('Adding avatar column to users table...');
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN avatar VARCHAR(255)
      `);
      console.log('✓ Avatar column added successfully!');
    }

    await sequelize.close();
    console.log('✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

addAvatarColumn();

