-- ==================================================
-- FIX SCRIPT: Update leave_period for existing data
-- Jalankan script ini di Supabase SQL Editor
-- ==================================================

-- Update leave_period based on leave_quota_year or start_date
-- This fixes data that was incorrectly set to current year (2026)
UPDATE leave_requests 
SET leave_period = COALESCE(leave_quota_year, EXTRACT(YEAR FROM start_date))
WHERE leave_period = EXTRACT(YEAR FROM CURRENT_DATE) 
   OR leave_period IS NULL;

-- Verify the fix
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN leave_period = 2025 THEN 1 END) as period_2025,
  COUNT(CASE WHEN leave_period = 2026 THEN 1 END) as period_2026,
  COUNT(CASE WHEN leave_period IS NULL THEN 1 END) as period_null
FROM leave_requests;

-- Show sample data to verify
SELECT id, start_date, leave_quota_year, leave_period
FROM leave_requests
ORDER BY start_date DESC
LIMIT 10;
