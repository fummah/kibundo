-- Add profile, interests, and buddy columns to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS profile JSONB;
ALTER TABLE students ADD COLUMN IF NOT EXISTS interests JSONB;
ALTER TABLE students ADD COLUMN IF NOT EXISTS buddy JSONB;

