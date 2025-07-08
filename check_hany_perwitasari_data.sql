-- Check and fix Hany Perwitasari's leave balance data
-- Run this script in Supabase SQL Editor

-- First, find Hany Perwitasari's employee record
SELECT 'Hany Perwitasari Employee Data' as info;
SELECT id, name, nip, department, position_name, rank_group 
FROM employees 
WHERE name ILIKE '%hany%perwitasari%' 
   OR name ILIKE '%perwitasari%hany%'
   OR name ILIKE '%Hany%Perwitasari%';

-- Check if Hany has any leave balance records
SELECT 'Hany Perwitasari Leave Balances' as info;
SELECT 
    lb.id,
    lb.employee_id,
    lb.leave_type_id,
    lb.year,
    lb.total_days,
    lb.used_days,
    lb.deferred_days,
    lt.name as leave_type_name,
    e.name as employee_name
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE e.name ILIKE '%hany%perwitasari%' 
   OR e.name ILIKE '%perwitasari%hany%'
   OR e.name ILIKE '%Hany%Perwitasari%'
ORDER BY lt.name;

-- Check if Hany has any leave requests
SELECT 'Hany Perwitasari Leave Requests' as info;
SELECT 
    lr.id,
    lr.employee_id,
    lr.leave_type_id,
    lr.start_date,
    lr.end_date,
    lr.days_requested,
    lr.leave_quota_year,
    lt.name as leave_type_name,
    e.name as employee_name
FROM leave_requests lr
JOIN employees e ON lr.employee_id = e.id
JOIN leave_types lt ON lr.leave_type_id = lt.id
WHERE e.name ILIKE '%hany%perwitasari%' 
   OR e.name ILIKE '%perwitasari%hany%'
   OR e.name ILIKE '%Hany%Perwitasari%'
ORDER BY lr.start_date DESC;

-- Get leave type ID for Cuti Sakit
SELECT 'Leave Type IDs' as info;
SELECT id, name, default_days FROM leave_types WHERE name = 'Cuti Sakit';

-- Create or update Hany's Cuti Sakit balance specifically
-- First, get Hany's employee ID
WITH hany_employee AS (
    SELECT id FROM employees 
    WHERE name ILIKE '%hany%perwitasari%' 
       OR name ILIKE '%perwitasari%hany%'
       OR name ILIKE '%Hany%Perwitasari%'
    LIMIT 1
),
sick_leave_type AS (
    SELECT id FROM leave_types WHERE name = 'Cuti Sakit' LIMIT 1
)
INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days, deferred_days)
SELECT 
    h.id as employee_id,
    s.id as leave_type_id,
    EXTRACT(YEAR FROM CURRENT_DATE) as year,
    12 as total_days, -- Default for Cuti Sakit
    0 as used_days,
    0 as deferred_days
FROM hany_employee h
CROSS JOIN sick_leave_type s
WHERE NOT EXISTS (
    SELECT 1 FROM leave_balances lb 
    WHERE lb.employee_id = h.id 
    AND lb.leave_type_id = s.id 
    AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
);

-- Verify the fix
SELECT 'After Fix - Hany Perwitasari Leave Balances' as info;
SELECT 
    lb.id,
    lb.employee_id,
    lb.leave_type_id,
    lb.year,
    lb.total_days,
    lb.used_days,
    lb.deferred_days,
    lt.name as leave_type_name,
    e.name as employee_name,
    (lb.total_days + lb.deferred_days - lb.used_days) as remaining_days
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE e.name ILIKE '%hany%perwitasari%' 
   OR e.name ILIKE '%perwitasari%hany%'
   OR e.name ILIKE '%Hany%Perwitasari%'
ORDER BY lt.name; 