-- COMPREHENSIVE LEAVE BALANCE AUDIT FOR ALL EMPLOYEES
-- Run this script in Supabase SQL Editor to audit and fix all leave balance issues

-- ==================================================
-- PART 1: AUDIT CURRENT STATE
-- ==================================================

-- 1.1 Check total employees vs employees with leave balances
SELECT '1.1 EMPLOYEE COVERAGE AUDIT' as audit_section;
SELECT 
    COUNT(DISTINCT e.id) as total_employees,
    COUNT(DISTINCT lb.employee_id) as employees_with_balances,
    COUNT(DISTINCT e.id) - COUNT(DISTINCT lb.employee_id) as employees_missing_balances,
    ROUND((COUNT(DISTINCT lb.employee_id)::DECIMAL / COUNT(DISTINCT e.id)::DECIMAL) * 100, 2) as coverage_percentage
FROM employees e
LEFT JOIN leave_balances lb ON e.id = lb.employee_id 
    AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- 1.2 Check leave types configuration
SELECT '1.2 LEAVE TYPES CONFIGURATION' as audit_section;
SELECT 
    name,
    default_days,
    can_defer,
    CASE 
        WHEN name = 'Cuti Tahunan' AND default_days = 12 THEN '✅ CORRECT'
        WHEN name = 'Cuti Sakit' AND default_days = 12 THEN '✅ CORRECT'
        WHEN name = 'Cuti Alasan Penting' AND default_days = 30 THEN '✅ CORRECT'
        WHEN name = 'Cuti Besar' AND default_days = 60 THEN '✅ CORRECT'
        WHEN name = 'Cuti Melahirkan' AND default_days = 90 THEN '✅ CORRECT'
        ELSE '❌ INCORRECT'
    END as status
FROM leave_types 
ORDER BY name;

-- 1.3 Check for employees with zero total_days
SELECT '1.3 ZERO TOTAL_DAYS AUDIT' as audit_section;
SELECT 
    e.name as employee_name,
    lt.name as leave_type,
    lb.total_days,
    lb.used_days,
    lb.deferred_days,
    CASE 
        WHEN lb.total_days = 0 THEN '❌ ZERO TOTAL_DAYS'
        ELSE '✅ OK'
    END as status
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND lb.total_days = 0
ORDER BY e.name, lt.name;

-- 1.4 Check for missing leave balance records
SELECT '1.4 MISSING LEAVE BALANCE RECORDS' as audit_section;
SELECT 
    e.name as employee_name,
    lt.name as leave_type,
    'MISSING' as status
FROM employees e
CROSS JOIN leave_types lt
WHERE NOT EXISTS (
    SELECT 1 FROM leave_balances lb 
    WHERE lb.employee_id = e.id 
    AND lb.leave_type_id = lt.id 
    AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
)
ORDER BY e.name, lt.name
LIMIT 20; -- Show first 20 missing records

-- 1.5 Check for data inconsistencies
SELECT '1.5 DATA INCONSISTENCY AUDIT' as audit_section;
SELECT 
    e.name as employee_name,
    lt.name as leave_type,
    lb.total_days as db_total_days,
    lt.default_days as config_default_days,
    CASE 
        WHEN lb.total_days != lt.default_days THEN '❌ MISMATCH'
        ELSE '✅ MATCH'
    END as status
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND lb.total_days != lt.default_days
ORDER BY e.name, lt.name;

-- ==================================================
-- PART 2: FIX ISSUES
-- ==================================================

-- 2.1 Update all zero total_days to correct values
SELECT '2.1 FIXING ZERO TOTAL_DAYS' as fix_section;
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
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND lb.total_days = 0;

-- 2.2 Create missing leave balance records for all employees
SELECT '2.2 CREATING MISSING LEAVE BALANCE RECORDS' as fix_section;
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

-- 2.3 Fix total_days mismatches with config
SELECT '2.3 FIXING TOTAL_DAYS MISMATCHES' as fix_section;
UPDATE leave_balances 
SET total_days = lt.default_days
FROM employees e, leave_types lt
WHERE lb.employee_id = e.id 
  AND lb.leave_type_id = lt.id
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND lb.total_days != lt.default_days;

-- ==================================================
-- PART 3: VERIFICATION
-- ==================================================

-- 3.1 Final employee coverage check
SELECT '3.1 FINAL EMPLOYEE COVERAGE CHECK' as verification_section;
SELECT 
    COUNT(DISTINCT e.id) as total_employees,
    COUNT(DISTINCT lb.employee_id) as employees_with_balances,
    COUNT(DISTINCT e.id) - COUNT(DISTINCT lb.employee_id) as employees_missing_balances,
    ROUND((COUNT(DISTINCT lb.employee_id)::DECIMAL / COUNT(DISTINCT e.id)::DECIMAL) * 100, 2) as coverage_percentage,
    CASE 
        WHEN COUNT(DISTINCT e.id) = COUNT(DISTINCT lb.employee_id) THEN '✅ 100% COVERAGE'
        ELSE '❌ INCOMPLETE COVERAGE'
    END as status
FROM employees e
LEFT JOIN leave_balances lb ON e.id = lb.employee_id 
    AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- 3.2 Final zero total_days check
SELECT '3.2 FINAL ZERO TOTAL_DAYS CHECK' as verification_section;
SELECT 
    COUNT(*) as remaining_zero_total_days,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO ZERO TOTAL_DAYS'
        ELSE '❌ STILL HAS ZERO TOTAL_DAYS'
    END as status
FROM leave_balances lb
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND lb.total_days = 0;

-- 3.3 Sample verification data
SELECT '3.3 SAMPLE VERIFICATION DATA' as verification_section;
SELECT 
    e.name as employee_name,
    lt.name as leave_type,
    lb.total_days,
    lb.used_days,
    lb.deferred_days,
    (lb.total_days + lb.deferred_days - lb.used_days) as remaining_days,
    CASE 
        WHEN lb.total_days = lt.default_days THEN '✅ CORRECT'
        ELSE '❌ INCORRECT'
    END as status
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY e.name, lt.name
LIMIT 30;

-- 3.4 Summary statistics
SELECT '3.4 SUMMARY STATISTICS' as verification_section;
SELECT 
    'Total Leave Balance Records' as metric,
    COUNT(*) as value
FROM leave_balances 
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
UNION ALL
SELECT 
    'Average Total Days per Record' as metric,
    ROUND(AVG(total_days), 2) as value
FROM leave_balances 
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
UNION ALL
SELECT 
    'Total Used Days' as metric,
    SUM(COALESCE(used_days, 0)) as value
FROM leave_balances 
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
UNION ALL
SELECT 
    'Total Deferred Days' as metric,
    SUM(COALESCE(deferred_days, 0)) as value
FROM leave_balances 
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE); 