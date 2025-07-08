-- Check if new columns exist in leave_requests table
-- Run this in Supabase SQL Editor to see if migration is needed

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'leave_requests'
  AND column_name IN ('leave_quota_year', 'application_form_date')
ORDER BY column_name;

-- If the above query returns 0 rows, you need to run the migration:
-- Copy and paste the contents of add_leave_request_fields.sql

-- You can also check what columns currently exist:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'leave_requests'
ORDER BY ordinal_position;
