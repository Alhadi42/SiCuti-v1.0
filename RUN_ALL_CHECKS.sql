-- RUN ALL LEAVE BALANCE CHECKS
-- Master script to run all leave balance audits and fixes
-- Run this script in Supabase SQL Editor

-- ==================================================
-- PART 1: INITIAL STATUS CHECK
-- ==================================================

SELECT '🚀 STARTING COMPREHENSIVE LEAVE BALANCE AUDIT' as status;
SELECT 'Timestamp: ' || CURRENT_TIMESTAMP as start_time;

-- ==================================================
-- PART 2: COMPREHENSIVE AUDIT
-- ==================================================

SELECT '📊 RUNNING COMPREHENSIVE AUDIT...' as status;

-- 2.1 Employee coverage check
SELECT '2.1 EMPLOYEE COVERAGE CHECK' as check_type;
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

-- 2.2 Leave types configuration check
SELECT '2.2 LEAVE TYPES CONFIGURATION CHECK' as check_type;
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

-- 2.3 Zero total_days check
SELECT '2.3 ZERO TOTAL_DAYS CHECK' as check_type;
SELECT 
    COUNT(*) as zero_total_days_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO ZERO TOTAL_DAYS'
        ELSE '❌ HAS ZERO TOTAL_DAYS'
    END as status
FROM leave_balances lb
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND lb.total_days = 0;

-- 2.4 Data consistency check
SELECT '2.4 DATA CONSISTENCY CHECK' as check_type;
SELECT 
    COUNT(*) as inconsistency_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO INCONSISTENCIES'
        ELSE '❌ HAS INCONSISTENCIES'
    END as status
FROM leave_balances lb
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND lb.total_days != lt.default_days;

-- ==================================================
-- PART 3: CONSISTENCY CHECK
-- ==================================================

SELECT '🔍 RUNNING CONSISTENCY CHECK...' as status;

-- 3.1 Used days mismatch check
SELECT '3.1 USED DAYS MISMATCH CHECK' as check_type;
WITH leave_usage_summary AS (
    SELECT 
        lr.employee_id,
        lr.leave_type_id,
        SUM(lr.days_requested) as calculated_used_days
    FROM leave_requests lr
    WHERE lr.leave_quota_year = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY lr.employee_id, lr.leave_type_id
)
SELECT 
    COUNT(*) as mismatch_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO MISMATCHES'
        ELSE '❌ HAS MISMATCHES'
    END as status
FROM leave_balances lb
LEFT JOIN leave_usage_summary lus ON lb.employee_id = lus.employee_id 
    AND lb.leave_type_id = lus.leave_type_id
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND lb.used_days != COALESCE(lus.calculated_used_days, 0);

-- 3.2 Negative remaining days check
SELECT '3.2 NEGATIVE REMAINING DAYS CHECK' as check_type;
SELECT 
    COUNT(*) as negative_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO NEGATIVE REMAINING'
        ELSE '❌ HAS NEGATIVE REMAINING'
    END as status
FROM leave_balances lb
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND (lb.total_days + lb.deferred_days - lb.used_days) < 0;

-- 3.3 Orphaned records check
SELECT '3.3 ORPHANED RECORDS CHECK' as check_type;
SELECT 
    COUNT(*) as orphaned_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO ORPHANED RECORDS'
        ELSE '❌ HAS ORPHANED RECORDS'
    END as status
FROM leave_balances lb
LEFT JOIN employees e ON lb.employee_id = e.id
LEFT JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND (e.id IS NULL OR lt.id IS NULL);

-- 3.4 Duplicate records check
SELECT '3.4 DUPLICATE RECORDS CHECK' as check_type;
SELECT 
    COUNT(*) as duplicate_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO DUPLICATE RECORDS'
        ELSE '❌ HAS DUPLICATE RECORDS'
    END as status
FROM (
    SELECT COUNT(*) as cnt
    FROM leave_balances lb
    WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY lb.employee_id, lb.leave_type_id, lb.year
    HAVING COUNT(*) > 1
) as duplicates;

-- ==================================================
-- PART 4: AUTOMATIC FIXES
-- ==================================================

SELECT '🔧 RUNNING AUTOMATIC FIXES...' as status;

-- 4.1 Fix zero total_days
SELECT '4.1 FIXING ZERO TOTAL_DAYS' as fix_type;
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

-- 4.2 Create missing balance records
SELECT '4.2 CREATING MISSING BALANCE RECORDS' as fix_type;
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

-- 4.3 Fix total_days mismatches
SELECT '4.3 FIXING TOTAL_DAYS MISMATCHES' as fix_type;
UPDATE leave_balances 
SET total_days = lt.default_days
FROM employees e, leave_types lt
WHERE lb.employee_id = e.id 
  AND lb.leave_type_id = lt.id
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND lb.total_days != lt.default_days;

-- 4.4 Recalculate used_days
SELECT '4.4 RECALCULATING USED_DAYS' as fix_type;
UPDATE leave_balances 
SET used_days = COALESCE(calculated_used, 0),
    updated_at = CURRENT_TIMESTAMP
FROM (
    SELECT 
        lr.employee_id,
        lr.leave_type_id,
        SUM(lr.days_requested) as calculated_used
    FROM leave_requests lr
    WHERE lr.leave_quota_year = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY lr.employee_id, lr.leave_type_id
) as usage_calc
WHERE lb.employee_id = usage_calc.employee_id
  AND lb.leave_type_id = usage_calc.leave_type_id
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- 4.5 Fix negative remaining days
SELECT '4.5 FIXING NEGATIVE REMAINING DAYS' as fix_type;
UPDATE leave_balances 
SET used_days = total_days + deferred_days,
    updated_at = CURRENT_TIMESTAMP
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND (total_days + deferred_days - used_days) < 0;

-- 4.6 Clean orphaned records
SELECT '4.6 CLEANING ORPHANED RECORDS' as fix_type;
DELETE FROM leave_balances 
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND (
    employee_id NOT IN (SELECT id FROM employees)
    OR leave_type_id NOT IN (SELECT id FROM leave_types)
  );

-- 4.7 Remove duplicate records
SELECT '4.7 REMOVING DUPLICATE RECORDS' as fix_type;
DELETE FROM leave_balances 
WHERE id IN (
    SELECT lb2.id
    FROM leave_balances lb2
    WHERE lb2.year = EXTRACT(YEAR FROM CURRENT_DATE)
      AND lb2.id NOT IN (
        SELECT MIN(lb3.id)
        FROM leave_balances lb3
        WHERE lb3.year = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY lb3.employee_id, lb3.leave_type_id, lb3.year
      )
);

-- ==================================================
-- PART 5: FINAL VERIFICATION
-- ==================================================

SELECT '✅ RUNNING FINAL VERIFICATION...' as status;

-- 5.1 Final coverage check
SELECT '5.1 FINAL COVERAGE CHECK' as verification_type;
SELECT 
    COUNT(DISTINCT e.id) as total_employees,
    COUNT(DISTINCT lb.employee_id) as employees_with_balances,
    ROUND((COUNT(DISTINCT lb.employee_id)::DECIMAL / COUNT(DISTINCT e.id)::DECIMAL) * 100, 2) as coverage_percentage,
    CASE 
        WHEN COUNT(DISTINCT e.id) = COUNT(DISTINCT lb.employee_id) THEN '✅ 100% COVERAGE'
        ELSE '❌ INCOMPLETE COVERAGE'
    END as status
FROM employees e
LEFT JOIN leave_balances lb ON e.id = lb.employee_id 
    AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- 5.2 Final data quality score
SELECT '5.2 FINAL DATA QUALITY SCORE' as verification_type;
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
            OR lb.total_days = 0
        )
)
SELECT 
    tr.total as total_records,
    ir.issues as issue_records,
    (tr.total - ir.issues) as clean_records,
    ROUND(((tr.total - ir.issues)::DECIMAL / tr.total::DECIMAL) * 100, 2) as quality_score,
    CASE 
        WHEN ROUND(((tr.total - ir.issues)::DECIMAL / tr.total::DECIMAL) * 100, 2) >= 95 THEN '✅ EXCELLENT - READY FOR PRODUCTION'
        WHEN ROUND(((tr.total - ir.issues)::DECIMAL / tr.total::DECIMAL) * 100, 2) >= 90 THEN '⚠️ GOOD - MINOR ISSUES REMAIN'
        WHEN ROUND(((tr.total - ir.issues)::DECIMAL / tr.total::DECIMAL) * 100, 2) >= 80 THEN '⚠️ FAIR - NEEDS ATTENTION'
        ELSE '❌ POOR - MAJOR ISSUES'
    END as production_readiness
FROM total_records tr, issue_records ir;

-- 5.3 Final summary
SELECT '5.3 FINAL SUMMARY' as verification_type;
WITH final_checks AS (
    -- Coverage check
    SELECT 
        CASE 
            WHEN COUNT(DISTINCT e.id) = COUNT(DISTINCT lb.employee_id) THEN 1
            ELSE 0
        END as coverage_ok
    FROM employees e
    LEFT JOIN leave_balances lb ON e.id = lb.employee_id 
        AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
),
zero_check AS (
    -- Zero total_days check
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 1
            ELSE 0
        END as zero_ok
    FROM leave_balances lb
    WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
        AND lb.total_days = 0
),
negative_check AS (
    -- Negative remaining days check
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 1
            ELSE 0
        END as negative_ok
    FROM leave_balances lb
    WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
        AND (lb.total_days + lb.deferred_days - lb.used_days) < 0
),
orphaned_check AS (
    -- Orphaned records check
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 1
            ELSE 0
        END as orphaned_ok
    FROM leave_balances lb
    LEFT JOIN employees e ON lb.employee_id = e.id
    LEFT JOIN leave_types lt ON lb.leave_type_id = lt.id
    WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
        AND (e.id IS NULL OR lt.id IS NULL)
)
SELECT 
    'Coverage' as check_name,
    CASE WHEN fc.coverage_ok = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM final_checks fc
UNION ALL
SELECT 
    'Zero Total Days' as check_name,
    CASE WHEN zc.zero_ok = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM zero_check zc
UNION ALL
SELECT 
    'Negative Remaining Days' as check_name,
    CASE WHEN nc.negative_ok = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM negative_check nc
UNION ALL
SELECT 
    'Orphaned Records' as check_name,
    CASE WHEN oc.orphaned_ok = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM orphaned_check oc;

-- ==================================================
-- PART 6: COMPLETION STATUS
-- ==================================================

SELECT '🎉 AUDIT COMPLETED' as status;
SELECT 'Timestamp: ' || CURRENT_TIMESTAMP as end_time;
SELECT 'All checks and fixes have been completed. Review the results above.' as message; 