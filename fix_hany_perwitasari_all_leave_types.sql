-- Fix all leave types for Hany Perwitasari specifically
-- Run this script in Supabase SQL Editor

-- First, get Hany's employee ID
WITH hany_employee AS (
    SELECT id FROM employees 
    WHERE name ILIKE '%hany%perwitasari%' 
       OR name ILIKE '%perwitasari%hany%'
       OR name ILIKE '%Hany%Perwitasari%'
       OR name ILIKE '%HANY%PERWITASARI%'
    LIMIT 1
)
-- Create all leave balance records for Hany
INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days, deferred_days)
SELECT 
    h.id as employee_id,
    lt.id as leave_type_id,
    EXTRACT(YEAR FROM CURRENT_DATE) as year,
    lt.default_days as total_days,
    0 as used_days,
    0 as deferred_days
FROM hany_employee h
CROSS JOIN leave_types lt
WHERE NOT EXISTS (
    SELECT 1 FROM leave_balances lb 
    WHERE lb.employee_id = h.id 
    AND lb.leave_type_id = lt.id 
    AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
);

-- Show Hany's complete leave balance data
SELECT 
    'Hany Perwitasari Complete Leave Balances' as info;
SELECT 
    e.name as employee_name,
    lt.name as leave_type,
    lb.year,
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
   AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY lt.name; 