-- FIX LEAVE BALANCE ISSUES
-- Run this script in Supabase SQL Editor to fix identified issues

-- ==================================================
-- PART 1: FIX USED_DAYS MISMATCHES
-- ==================================================

-- 1.1 Recalculate used_days based on actual leave requests
SELECT '1.1 FIXING USED_DAYS MISMATCHES' as fix_section;

-- Create a function to recalculate used_days
CREATE OR REPLACE FUNCTION recalculate_used_days()
RETURNS TABLE (
    employee_name TEXT,
    leave_type_name TEXT,
    old_used_days INTEGER,
    new_used_days INTEGER,
    status TEXT
) AS $$
DECLARE
    balance_record RECORD;
    calculated_used INTEGER;
BEGIN
    -- Loop through all leave balances for current year
    FOR balance_record IN 
        SELECT lb.*, e.name as employee_name, lt.name as leave_type_name
        FROM leave_balances lb
        JOIN employees e ON lb.employee_id = e.id
        JOIN leave_types lt ON lb.leave_type_id = lt.id
        WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
    LOOP
        -- Calculate actual used days from leave requests
        SELECT COALESCE(SUM(lr.days_requested), 0) INTO calculated_used
        FROM leave_requests lr
        WHERE lr.employee_id = balance_record.employee_id
          AND lr.leave_type_id = balance_record.leave_type_id
          AND lr.leave_quota_year = balance_record.year;
        
        -- Update if there's a mismatch
        IF balance_record.used_days != calculated_used THEN
            UPDATE leave_balances 
            SET used_days = calculated_used,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = balance_record.id;
            
            -- Return the change record
            RETURN QUERY SELECT 
                balance_record.employee_name::TEXT,
                balance_record.leave_type_name::TEXT,
                balance_record.used_days,
                calculated_used,
                'Updated'::TEXT;
        ELSE
            -- Return unchanged record
            RETURN QUERY SELECT 
                balance_record.employee_name::TEXT,
                balance_record.leave_type_name::TEXT,
                balance_record.used_days,
                balance_record.used_days,
                'No Change'::TEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the recalculation
SELECT * FROM recalculate_used_days();

-- ==================================================
-- PART 2: FIX DEFERRED DAYS MISMATCHES
-- ==================================================

-- 2.1 Recalculate deferred_days based on previous year usage
SELECT '2.1 FIXING DEFERRED_DAYS MISMATCHES' as fix_section;

-- Create a function to recalculate deferred_days
CREATE OR REPLACE FUNCTION recalculate_deferred_days()
RETURNS TABLE (
    employee_name TEXT,
    leave_type_name TEXT,
    old_deferred_days INTEGER,
    new_deferred_days INTEGER,
    status TEXT
) AS $$
DECLARE
    balance_record RECORD;
    calculated_deferred INTEGER;
BEGIN
    -- Loop through all leave balances for current year
    FOR balance_record IN 
        SELECT lb.*, e.name as employee_name, lt.name as leave_type_name
        FROM leave_balances lb
        JOIN employees e ON lb.employee_id = e.id
        JOIN leave_types lt ON lb.leave_type_id = lt.id
        WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
    LOOP
        -- Calculate actual deferred usage from previous year requests
        SELECT COALESCE(SUM(lr.days_requested), 0) INTO calculated_deferred
        FROM leave_requests lr
        WHERE lr.employee_id = balance_record.employee_id
          AND lr.leave_type_id = balance_record.leave_type_id
          AND lr.leave_quota_year < balance_record.year;
        
        -- Update if there's a mismatch
        IF balance_record.deferred_days != calculated_deferred THEN
            UPDATE leave_balances 
            SET deferred_days = calculated_deferred,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = balance_record.id;
            
            -- Return the change record
            RETURN QUERY SELECT 
                balance_record.employee_name::TEXT,
                balance_record.leave_type_name::TEXT,
                balance_record.deferred_days,
                calculated_deferred,
                'Updated'::TEXT;
        ELSE
            -- Return unchanged record
            RETURN QUERY SELECT 
                balance_record.employee_name::TEXT,
                balance_record.leave_type_name::TEXT,
                balance_record.deferred_days,
                balance_record.deferred_days,
                'No Change'::TEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the recalculation
SELECT * FROM recalculate_deferred_days();

-- ==================================================
-- PART 3: FIX NEGATIVE REMAINING DAYS
-- ==================================================

-- 3.1 Fix negative remaining days by adjusting used_days
SELECT '3.1 FIXING NEGATIVE REMAINING DAYS' as fix_section;

-- Create a function to fix negative remaining days
CREATE OR REPLACE FUNCTION fix_negative_remaining_days()
RETURNS TABLE (
    employee_name TEXT,
    leave_type_name TEXT,
    old_used_days INTEGER,
    new_used_days INTEGER,
    remaining_days INTEGER,
    status TEXT
) AS $$
DECLARE
    balance_record RECORD;
    max_used_days INTEGER;
BEGIN
    -- Loop through all leave balances with negative remaining days
    FOR balance_record IN 
        SELECT lb.*, e.name as employee_name, lt.name as leave_type_name
        FROM leave_balances lb
        JOIN employees e ON lb.employee_id = e.id
        JOIN leave_types lt ON lb.leave_type_id = lt.id
        WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
          AND (lb.total_days + lb.deferred_days - lb.used_days) < 0
    LOOP
        -- Calculate maximum allowed used days
        max_used_days := balance_record.total_days + balance_record.deferred_days;
        
        -- Update used_days to prevent negative remaining
        UPDATE leave_balances 
        SET used_days = max_used_days,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = balance_record.id;
        
        -- Return the fix record
        RETURN QUERY SELECT 
            balance_record.employee_name::TEXT,
            balance_record.leave_type_name::TEXT,
            balance_record.used_days,
            max_used_days,
            0, -- remaining days after fix
            'Fixed'::TEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the fix
SELECT * FROM fix_negative_remaining_days();

-- ==================================================
-- PART 4: CLEAN UP ORPHANED RECORDS
-- ==================================================

-- 4.1 Remove orphaned leave balance records
SELECT '4.1 CLEANING UP ORPHANED RECORDS' as fix_section;

-- Delete orphaned records (no employee or no leave type)
DELETE FROM leave_balances 
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND (
    employee_id NOT IN (SELECT id FROM employees)
    OR leave_type_id NOT IN (SELECT id FROM leave_types)
  );

-- Show count of deleted records
SELECT 
    'Orphaned records cleaned' as action,
    COUNT(*) as deleted_count
FROM (
    SELECT 1 FROM leave_balances 
    WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
      AND (
        employee_id NOT IN (SELECT id FROM employees)
        OR leave_type_id NOT IN (SELECT id FROM leave_types)
      )
) as orphaned;

-- ==================================================
-- PART 5: REMOVE DUPLICATE RECORDS
-- ==================================================

-- 5.1 Remove duplicate leave balance records
SELECT '5.1 REMOVING DUPLICATE RECORDS' as fix_section;

-- Create a function to remove duplicates
CREATE OR REPLACE FUNCTION remove_duplicate_balances()
RETURNS TABLE (
    employee_name TEXT,
    leave_type_name TEXT,
    year INTEGER,
    deleted_count INTEGER,
    status TEXT
) AS $$
DECLARE
    duplicate_record RECORD;
BEGIN
    -- Loop through duplicates
    FOR duplicate_record IN 
        SELECT 
            e.name as employee_name,
            lt.name as leave_type_name,
            lb.year,
            COUNT(*) as duplicate_count
        FROM leave_balances lb
        JOIN employees e ON lb.employee_id = e.id
        JOIN leave_types lt ON lb.leave_type_id = lt.id
        WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY e.name, lt.name, lb.year
        HAVING COUNT(*) > 1
    LOOP
        -- Delete duplicates, keeping the one with the latest updated_at
        DELETE FROM leave_balances 
        WHERE id IN (
            SELECT lb2.id
            FROM leave_balances lb2
            JOIN employees e2 ON lb2.employee_id = e2.id
            JOIN leave_types lt2 ON lb2.leave_type_id = lt2.id
            WHERE e2.name = duplicate_record.employee_name
              AND lt2.name = duplicate_record.leave_type_name
              AND lb2.year = duplicate_record.year
              AND lb2.id NOT IN (
                SELECT lb3.id
                FROM leave_balances lb3
                JOIN employees e3 ON lb3.employee_id = e3.id
                JOIN leave_types lt3 ON lb3.leave_type_id = lt3.id
                WHERE e3.name = duplicate_record.employee_name
                  AND lt3.name = duplicate_record.leave_type_name
                  AND lb3.year = duplicate_record.year
                ORDER BY COALESCE(lb3.updated_at, lb3.created_at) DESC
                LIMIT 1
              )
        );
        
        -- Return the cleanup record
        RETURN QUERY SELECT 
            duplicate_record.employee_name::TEXT,
            duplicate_record.leave_type_name::TEXT,
            duplicate_record.year,
            duplicate_record.duplicate_count - 1,
            'Duplicates Removed'::TEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the cleanup
SELECT * FROM remove_duplicate_balances();

-- ==================================================
-- PART 6: FINAL VERIFICATION
-- ==================================================

-- 6.1 Final verification summary
SELECT '6.1 FINAL VERIFICATION SUMMARY' as verification_section;

-- Check remaining issues
WITH final_checks AS (
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
),
duplicate_records AS (
    -- Check 4: Duplicate records
    SELECT COUNT(*) as duplicate_count
    FROM (
        SELECT COUNT(*) as cnt
        FROM leave_balances lb
        WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY lb.employee_id, lb.leave_type_id, lb.year
        HAVING COUNT(*) > 1
    ) as duplicates
)
SELECT 
    'Used Days Mismatch' as issue_type,
    used_days_mismatch as remaining_count,
    CASE 
        WHEN used_days_mismatch = 0 THEN '✅ FIXED'
        ELSE '❌ STILL HAS ISSUES'
    END as status
FROM final_checks
UNION ALL
SELECT 
    'Negative Remaining Days' as issue_type,
    negative_count as remaining_count,
    CASE 
        WHEN negative_count = 0 THEN '✅ FIXED'
        ELSE '❌ STILL HAS ISSUES'
    END as status
FROM negative_remaining
UNION ALL
SELECT 
    'Orphaned Records' as issue_type,
    orphaned_count as remaining_count,
    CASE 
        WHEN orphaned_count = 0 THEN '✅ FIXED'
        ELSE '❌ STILL HAS ISSUES'
    END as status
FROM orphaned_records
UNION ALL
SELECT 
    'Duplicate Records' as issue_type,
    duplicate_count as remaining_count,
    CASE 
        WHEN duplicate_count = 0 THEN '✅ FIXED'
        ELSE '❌ STILL HAS ISSUES'
    END as status
FROM duplicate_records;

-- 6.2 Final data quality score
SELECT '6.2 FINAL DATA QUALITY SCORE' as verification_section;
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
        WHEN ROUND(((tr.total - ir.issues)::DECIMAL / tr.total::DECIMAL) * 100, 2) >= 95 THEN '✅ EXCELLENT - READY FOR PRODUCTION'
        WHEN ROUND(((tr.total - ir.issues)::DECIMAL / tr.total::DECIMAL) * 100, 2) >= 90 THEN '⚠️ GOOD - MINOR ISSUES REMAIN'
        WHEN ROUND(((tr.total - ir.issues)::DECIMAL / tr.total::DECIMAL) * 100, 2) >= 80 THEN '⚠️ FAIR - NEEDS ATTENTION'
        ELSE '❌ POOR - MAJOR ISSUES'
    END as production_readiness
FROM total_records tr, issue_records ir; 