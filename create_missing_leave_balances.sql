-- Create missing leave balance records for all employees
-- Run this script in Supabase SQL Editor

-- First, let's see what we have
SELECT 
    'Current Status' as info,
    COUNT(DISTINCT e.id) as total_employees,
    COUNT(DISTINCT lb.employee_id) as employees_with_balances,
    COUNT(lb.id) as total_balance_records
FROM employees e
LEFT JOIN leave_balances lb ON e.id = lb.employee_id 
    AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Create missing balance records for all employees and leave types
INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days, deferred_days)
SELECT 
    e.id as employee_id,
    lt.id as leave_type_id,
    EXTRACT(YEAR FROM CURRENT_DATE) as year,
    lt.default_days as total_days,
    0 as used_days,
    0 as deferred_days
FROM employees e
CROSS JOIN leave_types lt
WHERE NOT EXISTS (
    SELECT 1 FROM leave_balances lb 
    WHERE lb.employee_id = e.id 
    AND lb.leave_type_id = lt.id 
    AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
);

-- Show the results after creation
SELECT 
    'After Creation' as info,
    COUNT(DISTINCT e.id) as total_employees,
    COUNT(DISTINCT lb.employee_id) as employees_with_balances,
    COUNT(lb.id) as total_balance_records
FROM employees e
LEFT JOIN leave_balances lb ON e.id = lb.employee_id 
    AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Show sample data for verification
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
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY e.name, lt.name
LIMIT 20; 