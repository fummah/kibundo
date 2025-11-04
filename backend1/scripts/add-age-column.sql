-- Add age column to students table
-- Run this SQL in your PostgreSQL database

-- Check if column exists and add it if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'students' 
        AND column_name = 'age'
    ) THEN
        ALTER TABLE students ADD COLUMN age INTEGER;
        RAISE NOTICE 'Age column added successfully';
    ELSE
        RAISE NOTICE 'Age column already exists';
    END IF;
END $$;

