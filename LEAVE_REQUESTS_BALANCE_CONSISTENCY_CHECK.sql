-- LEAVE REQUESTS AND BALANCE CONSISTENCY CHECK
-- Run this script in Supabase SQL Editor to verify data consistency

-- ==================================================
-- PART 1: CHECK LEAVE REQUESTS VS BALANCE USAGE
-- ==================================================

-- 1.1 Check if used_days in leave_balances matches actual leave requests
SELECT '1.1 LEAVE REQUESTS VS BALANCE USAGE CHECK' as check_section;
WITH leave_usage_summary AS (
    SELECT 
        lr.employee_id,
        lr.leave_type_id,
        lr.leave_quota_year,
        SUM(lr.days_requested) as calculated_used_days
    FROM leave_requests lr
    WHERE lr.leave_quota_year = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY lr.employee_id, lr.leave_type_id, lr.leave_quota_year
)
SELECT 
    e.name as employee_name,
    lt.name as leave_type,
    lb.used_days as balance_used_days,
    COALESCE(lus.calculated_used_days, 0) as requests_calculated_days,
    CASE 
        WHEN lb.used_days != COALESCE(lus.calculated_used_days, 0) THEN '❌ MISMATCH'
        ELSE '✅ MATCH'
    END as status,
    ABS(lb.used_days - COALESCE(lus.calculated_used_days, 0)) as difference
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
LEFT JOIN leave_usage_summary lus ON lb.employee_id = lus.employee_id 
    AND lb.leave_type_id = lus.leave_type_id
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND lb.used_days != COALESCE(lus.calculated_used_days, 0)
ORDER BY difference DESC, e.name, lt.name;

-- 1.2 Check for employees with leave requests but no balance records
SELECT '1.2 EMPLOYEES WITH REQUESTS BUT NO BALANCES' as check_section;
SELECT DISTINCT
    e.name as employee_name,
    lt.name as leave_type,
    COUNT(lr.id) as request_count,
    SUM(lr.days_requested) as total_days_requested
FROM leave_requests lr
JOIN employees e ON lr.employee_id = e.id
JOIN leave_types lt ON lr.leave_type_id = lt.id
WHERE lr.leave_quota_year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND NOT EXISTS (
        SELECT 1 FROM leave_balances lb 
        WHERE lb.employee_id = lr.employee_id 
        AND lb.leave_type_id = lr.leave_type_id
        AND lb.year = lr.leave_quota_year
    )
GROUP BY e.name, lt.name
ORDER BY e.name, lt.name;

-- 1.3 Check for orphaned leave balance records (no employee)
SELECT '1.3 ORPHANED LEAVE BALANCE RECORDS' as check_section;
SELECT 
    lb.id,
    lb.employee_id,
    lb.leave_type_id,
    lb.year,
    lb.total_days,
    lb.used_days,
    CASE 
        WHEN e.id IS NULL THEN '❌ ORPHANED - NO EMPLOYEE'
        WHEN lt.id IS NULL THEN '❌ ORPHANED - NO LEAVE TYPE'
        ELSE '✅ VALID'
    END as status
FROM leave_balances lb
LEFT JOIN employees e ON lb.employee_id = e.id
LEFT JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND (e.id IS NULL OR lt.id IS NULL);

-- ==================================================
-- PART 2: CHECK DEFERRED LEAVE LOGIC
-- ==================================================

-- 2.1 Check deferred leave usage from previous year
SELECT '2.1 DEFERRED LEAVE USAGE CHECK' as check_section;
WITH deferred_usage AS (
    SELECT 
        lr.employee_id,
        lr.leave_type_id,
        SUM(lr.days_requested) as deferred_used_days
    FROM leave_requests lr
    WHERE lr.leave_quota_year < EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY lr.employee_id, lr.leave_type_id
)
SELECT 
    e.name as employee_name,
    lt.name as leave_type,
    lb.deferred_days as balance_deferred_days,
    COALESCE(du.deferred_used_days, 0) as calculated_deferred_used,
    CASE 
        WHEN lb.deferred_days != COALESCE(du.deferred_used_days, 0) THEN '❌ MISMATCH'
        ELSE '✅ MATCH'
    END as status
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
LEFT JOIN deferred_usage du ON lb.employee_id = du.employee_id 
    AND lb.leave_type_id = du.leave_type_id
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND lb.deferred_days != COALESCE(du.deferred_used_days, 0)
ORDER BY e.name, lt.name;

-- 2.2 Check leave_deferrals table consistency
SELECT '2.2 LEAVE DEFERRALS TABLE CHECK' as check_section;
SELECT 
    e.name as employee_name,
    ld.year,
    ld.days_deferred,
    CASE 
        WHEN lb.deferred_days IS NULL THEN '❌ NO BALANCE RECORD'
        WHEN lb.deferred_days != ld.days_deferred THEN '❌ MISMATCH'
        ELSE '✅ MATCH'
    END as status
FROM leave_deferrals ld
JOIN employees e ON ld.employee_id = e.id
LEFT JOIN leave_balances lb ON ld.employee_id = lb.employee_id 
    AND lb.year = ld.year + 1 -- Deferred from previous year
    AND lb.leave_type_id = (SELECT id FROM leave_types WHERE name = 'Cuti Tahunan' LIMIT 1)
WHERE ld.year = EXTRACT(YEAR FROM CURRENT_DATE) - 1
ORDER BY e.name;

-- ==================================================
-- PART 3: DATA INTEGRITY CHECKS
-- ==================================================

-- 3.1 Check for negative remaining days
SELECT '3.1 NEGATIVE REMAINING DAYS CHECK' as check_section;
SELECT 
    e.name as employee_name,
    lt.name as leave_type,
    lb.total_days,
    lb.used_days,
    lb.deferred_days,
    (lb.total_days + lb.deferred_days - lb.used_days) as remaining_days,
    CASE 
        WHEN (lb.total_days + lb.deferred_days - lb.used_days) < 0 THEN '❌ NEGATIVE REMAINING'
        ELSE '✅ VALID'
    END as status
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND (lb.total_days + lb.deferred_days - lb.used_days) < 0
ORDER BY remaining_days, e.name, lt.name;

-- 3.2 Check for invalid year values
SELECT '3.2 INVALID YEAR VALUES CHECK' as check_section;
SELECT 
    e.name as employee_name,
    lt.name as leave_type,
    lb.year,
    CASE 
        WHEN lb.year < 2020 OR lb.year > 2030 THEN '❌ INVALID YEAR'
        ELSE '✅ VALID YEAR'
    END as status
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE lb.year < 2020 OR lb.year > 2030
ORDER BY lb.year, e.name, lt.name;

-- 3.3 Check for duplicate leave balance records
SELECT '3.3 DUPLICATE LEAVE BALANCE RECORDS' as check_section;
SELECT 
    e.name as employee_name,
    lt.name as leave_type,
    lb.year,
    COUNT(*) as duplicate_count
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY e.name, lt.name, lb.year
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, e.name, lt.name;

-- ==================================================
-- PART 4: SUMMARY REPORT
-- ==================================================

-- 4.1 Overall consistency summary
SELECT '4.1 OVERALL CONSISTENCY SUMMARY' as summary_section;
WITH consistency_checks AS (
    -- Check 1: Used days mismatch
    SELECT COUNT(*) as used_days_mismatch
    FROM leave_balances lb
    LEFT JOIN (
        SELECT 
            lr.employee_id,
            lr.leave_type_id,
            SUM(lr.days_requested) as calculated_used_days
        FROM leave_requests lr
        WHERE lr.leave_quota_year = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY lr.employee_id, lr.leave_type_id
    ) lus ON lb.employee_id = lus.employee_id AND lb.leave_type_id = lus.leave_type_id
    WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
        AND lb.used_days != COALESCE(lus.calculated_used_days, 0)
),
negative_remaining AS (
    -- Check 2: Negative remaining days
    SELECT COUNT(*) as negative_count
    FROM leave_balances lb
    WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
        AND (lb.total_days + lb.deferred_days - lb.used_days) < 0
),
orphaned_records AS (
    -- Check 3: Orphaned records
    SELECT COUNT(*) as orphaned_count
    FROM leave_balances lb
    LEFT JOIN employees e ON lb.employee_id = e.id
    LEFT JOIN leave_types lt ON lb.leave_type_id = lt.id
    WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
        AND (e.id IS NULL OR lt.id IS NULL)
)
SELECT 
    'Used Days Mismatch' as issue_type,
    used_days_mismatch as count,
    CASE 
        WHEN used_days_mismatch = 0 THEN '✅ NO ISSUES'
        ELSE '❌ NEEDS FIXING'
    END as status
FROM consistency_checks
UNION ALL
SELECT 
    'Negative Remaining Days' as issue_type,
    negative_count as count,
    CASE 
        WHEN negative_count = 0 THEN '✅ NO ISSUES'
        ELSE '❌ NEEDS FIXING'
    END as status
FROM negative_remaining
UNION ALL
SELECT 
    'Orphaned Records' as issue_type,
    orphaned_count as count,
    CASE 
        WHEN orphaned_count = 0 THEN '✅ NO ISSUES'
        ELSE '❌ NEEDS FIXING'
    END as status
FROM orphaned_records;

-- 4.2 Data quality score
SELECT '4.2 DATA QUALITY SCORE' as summary_section;
WITH total_records AS (
    SELECT COUNT(*) as total
    FROM leave_balances 
    WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
),
issue_records AS (
    SELECT COUNT(*) as issues
    FROM leave_balances lb
    LEFT JOIN employees e ON lb.employee_id = e.id
    LEFT JOIN leave_types lt ON lb.leave_type_id = lt.id
    WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
        AND (
            e.id IS NULL 
            OR lt.id IS NULL 
            OR (lb.total_days + lb.deferred_days - lb.used_days) < 0
        )
)
SELECT 
    tr.total as total_records,
    ir.issues as issue_records,
    (tr.total - ir.issues) as clean_records,
    ROUND(((tr.total - ir.issues)::DECIMAL / tr.total::DECIMAL) * 100, 2) as quality_score,
    CASE 
        WHEN ROUND(((tr.total - ir.issues)::DECIMAL / tr.total::DECIMAL) * 100, 2) >= 95 THEN '✅ EXCELLENT'
        WHEN ROUND(((tr.total - ir.issues)::DECIMAL / tr.total::DECIMAL) * 100, 2) >= 90 THEN '⚠️ GOOD'
        WHEN ROUND(((tr.total - ir.issues)::DECIMAL / tr.total::DECIMAL) * 100, 2) >= 80 THEN '⚠️ FAIR'
        ELSE '❌ POOR'
    END as quality_rating
FROM total_records tr, issue_records ir; 