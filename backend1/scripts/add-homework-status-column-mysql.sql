-- MySQL version: Adds status column to homework_scans table if it does not already exist.
-- Status options: 'pending', 'completed', 'do_it_later'

-- Check if status column exists and add it if it doesn't
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'homework_scans'
    AND COLUMN_NAME = 'status'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE homework_scans ADD COLUMN status VARCHAR(20) DEFAULT ''pending''',
    'SELECT ''Status column already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add check constraint (MySQL 8.0.16+)
SET @constraint_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'homework_scans'
    AND CONSTRAINT_NAME = 'homework_scans_status_check'
);

SET @sql_constraint = IF(@constraint_exists = 0,
    'ALTER TABLE homework_scans ADD CONSTRAINT homework_scans_status_check CHECK (status IN (''pending'', ''completed'', ''do_it_later''))',
    'SELECT ''Constraint already exists'' AS message'
);

PREPARE stmt_constraint FROM @sql_constraint;
EXECUTE stmt_constraint;
DEALLOCATE PREPARE stmt_constraint;

-- Update existing records:
-- If completed_at is set, mark as 'completed'
UPDATE homework_scans
SET status = 'completed'
WHERE (completed_at IS NOT NULL OR completion_photo_url IS NOT NULL)
AND status = 'pending';

-- All other records remain as 'pending' (default)

SELECT 'Migration completed successfully!' AS message;

