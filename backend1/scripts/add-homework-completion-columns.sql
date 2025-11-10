-- Adds completed_at and completion_photo_url columns to homework_scans table if they do not already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'homework_scans'
      AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE homework_scans
      ADD COLUMN completed_at TIMESTAMP NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'homework_scans'
      AND column_name = 'completion_photo_url'
  ) THEN
    ALTER TABLE homework_scans
      ADD COLUMN completion_photo_url TEXT;
  END IF;
END;
$$;


