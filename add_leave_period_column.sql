-- ==================================================
-- MIGRATION SCRIPT: Add Leave Period Column
-- Jalankan script ini di Supabase SQL Editor
-- ==================================================

-- Add leave_period column to leave_requests table
ALTER TABLE leave_requests 
ADD COLUMN IF NOT EXISTS leave_period INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN leave_requests.leave_period IS 'Periode tahun cuti yang sedang diinput - menentukan konteks tahun untuk jatah cuti';

-- Update existing records: set leave_period based on leave_quota_year or start_date
-- Priority: leave_quota_year > EXTRACT(YEAR FROM start_date)
UPDATE leave_requests 
SET leave_period = COALESCE(leave_quota_year, EXTRACT(YEAR FROM start_date))
WHERE leave_period IS NULL OR leave_period = EXTRACT(YEAR FROM CURRENT_DATE);

-- For records that still don't have leave_period, use start_date year as fallback
UPDATE leave_requests 
SET leave_period = EXTRACT(YEAR FROM start_date)
WHERE leave_period IS NULL;

-- Verify migration success
SELECT 'Migration completed successfully!' as status;

-- Show new column structure
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'leave_requests'
  AND column_name = 'leave_period'
ORDER BY column_name;
