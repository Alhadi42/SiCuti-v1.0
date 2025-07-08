-- Fix all leave types total_days for Hany Perwitasari
-- Run this script in Supabase SQL Editor

-- First, check current status for all Hany's leave types
SELECT 'Current Hany All Leave Types Status' as info;
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
   AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY lt.name;

-- Update all Hany's leave balances with correct total_days
UPDATE leave_balances 
SET total_days = CASE 
    WHEN lt.name = 'Cuti Tahunan' THEN 12
    WHEN lt.name = 'Cuti Sakit' THEN 12
    WHEN lt.name = 'Cuti Alasan Penting' THEN 30
    WHEN lt.name = 'Cuti Besar' THEN 60
    WHEN lt.name = 'Cuti Melahirkan' THEN 90
    ELSE lb.total_days
END
FROM employees e, leave_types lt
WHERE lb.employee_id = e.id 
  AND lb.leave_type_id = lt.id
  AND (e.name ILIKE '%hany%perwitasari%' 
       OR e.name ILIKE '%perwitasari%hany%'
       OR e.name ILIKE '%Hany%Perwitasari%'
       OR e.name ILIKE '%HANY%PERWITASARI%')
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND lb.total_days = 0;

-- Create missing leave balance records for Hany
INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days, deferred_days)
SELECT 
    e.id as employee_id,
    lt.id as leave_type_id,
    EXTRACT(YEAR FROM CURRENT_DATE) as year,
    CASE 
        WHEN lt.name = 'Cuti Tahunan' THEN 12
        WHEN lt.name = 'Cuti Sakit' THEN 12
        WHEN lt.name = 'Cuti Alasan Penting' THEN 30
        WHEN lt.name = 'Cuti Besar' THEN 60
        WHEN lt.name = 'Cuti Melahirkan' THEN 90
        ELSE lt.default_days
    END as total_days,
    0 as used_days,
    0 as deferred_days
FROM employees e
CROSS JOIN leave_types lt
WHERE (e.name ILIKE '%hany%perwitasari%' 
   OR e.name ILIKE '%perwitasari%hany%'
   OR e.name ILIKE '%Hany%Perwitasari%'
   OR e.name ILIKE '%HANY%PERWITASARI%')
   AND NOT EXISTS (
    SELECT 1 FROM leave_balances lb 
    WHERE lb.employee_id = e.id 
    AND lb.leave_type_id = lt.id 
    AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
);

-- Verify the fix
SELECT 'After Fix - Hany All Leave Types Status' as info;
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
   AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY lt.name; 