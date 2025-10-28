-- Add API usage tracking columns to homework_scans table
ALTER TABLE homework_scans 
ADD COLUMN IF NOT EXISTS api_tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS api_cost_usd DECIMAL(10, 6) DEFAULT 0.000000;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_homework_scans_student_id ON homework_scans(student_id);
CREATE INDEX IF NOT EXISTS idx_homework_scans_created_at ON homework_scans(created_at);

-- Show sample data
SELECT 
  id, 
  student_id, 
  detected_subject, 
  api_tokens_used, 
  api_cost_usd, 
  created_at 
FROM homework_scans 
WHERE api_tokens_used > 0 
ORDER BY created_at DESC 
LIMIT 10;

