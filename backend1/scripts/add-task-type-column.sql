-- Adds task_type column to homework_scans table if it does not already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'homework_scans'
      AND column_name = 'task_type'
  ) THEN
    ALTER TABLE homework_scans
      ADD COLUMN task_type VARCHAR(50);
  END IF;
END;
$$;


