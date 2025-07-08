-- Update default days for leave types to match Settings configuration
-- Run this script in Supabase SQL Editor

-- Update Cuti Sakit default days
UPDATE leave_types 
SET default_days = 12 
WHERE name = 'Cuti Sakit';

-- Update Cuti Alasan Penting default days
UPDATE leave_types 
SET default_days = 30 
WHERE name = 'Cuti Alasan Penting';

-- Update Cuti Besar default days
UPDATE leave_types 
SET default_days = 60 
WHERE name = 'Cuti Besar';

-- Update Cuti Melahirkan default days
UPDATE leave_types 
SET default_days = 90 
WHERE name = 'Cuti Melahirkan';

-- Verify the updates
SELECT name, default_days, can_defer 
FROM leave_types 
ORDER BY name;

-- Show current configuration
SELECT 
    'Cuti Tahunan' as leave_type,
    12 as default_days,
    true as can_defer
UNION ALL
SELECT 
    'Cuti Sakit' as leave_type,
    12 as default_days,
    false as can_defer
UNION ALL
SELECT 
    'Cuti Alasan Penting' as leave_type,
    30 as default_days,
    false as can_defer
UNION ALL
SELECT 
    'Cuti Besar' as leave_type,
    60 as default_days,
    false as can_defer
UNION ALL
SELECT 
    'Cuti Melahirkan' as leave_type,
    90 as default_days,
    false as can_defer; 