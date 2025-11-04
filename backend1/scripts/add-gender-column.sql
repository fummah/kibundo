-- Add gender column to users table
-- Run this SQL in your PostgreSQL database

-- Check if column exists and add it if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'gender'
    ) THEN
        -- Create ENUM type if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_gender') THEN
            CREATE TYPE enum_users_gender AS ENUM ('male', 'female');
        END IF;
        
        ALTER TABLE users ADD COLUMN gender enum_users_gender;
        RAISE NOTICE 'Gender column added successfully';
    ELSE
        RAISE NOTICE 'Gender column already exists';
    END IF;
END $$;

