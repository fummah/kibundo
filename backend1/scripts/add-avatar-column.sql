-- Add avatar column to users table
-- Run this SQL in your PostgreSQL database

-- Check if column exists and add it if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'avatar'
    ) THEN
        ALTER TABLE users ADD COLUMN avatar VARCHAR(255);
        RAISE NOTICE 'Avatar column added successfully';
    ELSE
        RAISE NOTICE 'Avatar column already exists';
    END IF;
END $$;

