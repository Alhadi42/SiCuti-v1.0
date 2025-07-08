-- Fix Hany Perwitasari's sick leave total_days that is still 0
-- Run this script in Supabase SQL Editor

-- First, check current status
SELECT 'Current Hany Sick Leave Status' as info;
SELECT 
    e.name as employee_name,
    lt.name as leave_type,
    lb.total_days,
    lb.used_days,
    lb.deferred_days,
    (lb.total_days + lb.deferred_days - lb.used_days) as remaining_days
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE (e.name ILIKE '%hany%perwitasari%' 
   OR e.name ILIKE '%perwitasari%hany%'
   OR e.name ILIKE '%Hany%Perwitasari%'
   OR e.name ILIKE '%HANY%PERWITASARI%')
   AND lt.name = 'Cuti Sakit'
   AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Check leave_types default_days for Cuti Sakit
SELECT 'Leave Types Default Days' as info;
SELECT id, name, default_days FROM leave_types WHERE name = 'Cuti Sakit';

-- Update Hany's sick leave total_days to 12
UPDATE leave_balances 
SET total_days = 12
WHERE employee_id IN (
    SELECT id FROM employees 
    WHERE name ILIKE '%hany%perwitasari%' 
       OR name ILIKE '%perwitasari%hany%'
       OR name ILIKE '%Hany%Perwitasari%'
       OR name ILIKE '%HANY%PERWITASARI%'
)
AND leave_type_id IN (
    SELECT id FROM leave_types WHERE name = 'Cuti Sakit'
)
AND year = EXTRACT(YEAR FROM CURRENT_DATE)
AND total_days = 0;

-- If no record exists, create it
INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days, deferred_days)
SELECT 
    e.id as employee_id,
    lt.id as leave_type_id,
    EXTRACT(YEAR FROM CURRENT_DATE) as year,
    12 as total_days,
    0 as used_days,
    0 as deferred_days
FROM employees e
CROSS JOIN leave_types lt
WHERE (e.name ILIKE '%hany%perwitasari%' 
   OR e.name ILIKE '%perwitasari%hany%'
   OR e.name ILIKE '%Hany%Perwitasari%'
   OR e.name ILIKE '%HANY%PERWITASARI%')
   AND lt.name = 'Cuti Sakit'
   AND NOT EXISTS (
    SELECT 1 FROM leave_balances lb 
    WHERE lb.employee_id = e.id 
    AND lb.leave_type_id = lt.id 
    AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
);

-- Verify the fix
SELECT 'After Fix - Hany Sick Leave Status' as info;
SELECT 
    e.name as employee_name,
    lt.name as leave_type,
    lb.total_days,
    lb.used_days,
    lb.deferred_days,
    (lb.total_days + lb.deferred_days - lb.used_days) as remaining_days
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE (e.name ILIKE '%hany%perwitasari%' 
   OR e.name ILIKE '%perwitasari%hany%'
   OR e.name ILIKE '%Hany%Perwitasari%'
   OR e.name ILIKE '%HANY%PERWITASARI%')
   AND lt.name = 'Cuti Sakit'
   AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE); 