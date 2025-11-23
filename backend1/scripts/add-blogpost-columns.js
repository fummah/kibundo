// Script to add thumbnail_url and subtitle columns to blog_posts table
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

async function addBlogPostColumns() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connection established successfully.');

    // Check if columns exist (PostgreSQL)
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'blog_posts' 
        AND column_name IN ('thumbnail_url', 'subtitle')
    `);

    const existingColumns = results.map(r => r.column_name);
    
    // Add subtitle column if it doesn't exist
    if (!existingColumns.includes('subtitle')) {
      console.log('Adding subtitle column to blog_posts table...');
      await sequelize.query(`
        ALTER TABLE blog_posts 
        ADD COLUMN subtitle TEXT
      `);
      console.log('✓ Subtitle column added successfully!');
    } else {
      console.log('✓ Subtitle column already exists in blog_posts table.');
    }

    // Add thumbnail_url column if it doesn't exist
    if (!existingColumns.includes('thumbnail_url')) {
      console.log('Adding thumbnail_url column to blog_posts table...');
      await sequelize.query(`
        ALTER TABLE blog_posts 
        ADD COLUMN thumbnail_url TEXT
      `);
      console.log('✓ Thumbnail_url column added successfully!');
    } else {
      console.log('✓ Thumbnail_url column already exists in blog_posts table.');
    }

    await sequelize.close();
    console.log('✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

addBlogPostColumns();

