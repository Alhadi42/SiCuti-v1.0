-- Fix leave types default days to match Settings configuration
-- Run this script in Supabase SQL Editor

-- First, check current leave types
SELECT 'Current Leave Types' as info;
SELECT id, name, default_days, can_defer FROM leave_types ORDER BY name;

-- Update default days for all leave types
UPDATE leave_types 
SET default_days = 12 
WHERE name = 'Cuti Tahunan';

UPDATE leave_types 
SET default_days = 12 
WHERE name = 'Cuti Sakit';

UPDATE leave_types 
SET default_days = 30 
WHERE name = 'Cuti Alasan Penting';

UPDATE leave_types 
SET default_days = 60 
WHERE name = 'Cuti Besar';

UPDATE leave_types 
SET default_days = 90 
WHERE name = 'Cuti Melahirkan';

-- Verify the updates
SELECT 'After Update' as info;
SELECT id, name, default_days, can_defer FROM leave_types ORDER BY name;

-- Show expected configuration
SELECT 'Expected Configuration' as info;
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