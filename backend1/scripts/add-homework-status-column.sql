-- Adds status column to homework_scans table if it does not already exist.
-- Status options: 'pending', 'completed', 'do_it_later'
DO $$
BEGIN
  -- Check if status column exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'homework_scans'
      AND column_name = 'status'
  ) THEN
    -- Add status column with default value 'pending'
    ALTER TABLE homework_scans
      ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
    
    -- Add check constraint to ensure only valid values
    ALTER TABLE homework_scans
      ADD CONSTRAINT homework_scans_status_check 
      CHECK (status IN ('pending', 'completed', 'do_it_later'));
    
    -- Update existing records:
    -- If completed_at is set, mark as 'completed'
    UPDATE homework_scans
    SET status = 'completed'
    WHERE completed_at IS NOT NULL OR completion_photo_url IS NOT NULL;
    
    -- All other records remain as 'pending' (default)
    
    RAISE NOTICE 'Status column added successfully';
  ELSE
    RAISE NOTICE 'Status column already exists';
  END IF;
END;
$$;

