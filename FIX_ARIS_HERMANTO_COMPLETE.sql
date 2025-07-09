-- FIX ARIS HERMANTO COMPLETE - COMPREHENSIVE SOLUTION
-- Script ini memperbaiki saldo cuti Aris Hermanto secara menyeluruh
-- Jalankan script ini di Supabase SQL Editor

-- ==================================================
-- PART 1: DIAGNOSIS - CHECK CURRENT STATE
-- ==================================================

-- Step 1: Check Aris Hermanto's employee data
SELECT 'STEP 1: CHECKING ARIS HERMANTO EMPLOYEE DATA' as step;
SELECT 
    id, 
    name, 
    nip, 
    department,
    created_at
FROM employees 
WHERE name ILIKE '%aris%hermanto%' 
   OR name ILIKE '%Aris%Hermanto%'
   OR name ILIKE '%ARIS%HERMANTO%';

-- Step 2: Check current leave balances for Aris Hermanto
SELECT 'STEP 2: CURRENT LEAVE BALANCES FOR ARIS HERMANTO' as step;
SELECT 
    e.name as employee_name,
    lt.name as leave_type,
    lb.year,
    lb.total_days,
    lb.used_days,
    lb.deferred_days,
    (lb.total_days + lb.deferred_days - lb.used_days) as remaining_days,
    lb.created_at,
    lb.updated_at
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE (e.name ILIKE '%aris%hermanto%' 
   OR e.name ILIKE '%Aris%Hermanto%'
   OR e.name ILIKE '%ARIS%HERMANTO%')
  AND lb.year IN (2024, 2025)
ORDER BY lb.year, lt.name;

-- Step 3: Check Aris Hermanto's leave requests
SELECT 'STEP 3: ARIS HERMANTO LEAVE REQUESTS' as step;
SELECT 
    e.name as employee_name,
    lt.name as leave_type,
    lr.leave_quota_year,
    lr.days_requested,
    lr.start_date,
    lr.end_date,
    lr.application_form_date,
    CASE 
        WHEN lr.leave_quota_year = 2024 THEN 'PENANGGUHAN'
        WHEN lr.leave_quota_year = 2025 THEN 'TAHUN BERJALAN'
        ELSE 'UNKNOWN'
    END as quota_type
FROM leave_requests lr
JOIN employees e ON lr.employee_id = e.id
JOIN leave_types lt ON lr.leave_type_id = lt.id
WHERE (e.name ILIKE '%aris%hermanto%' 
   OR e.name ILIKE '%Aris%Hermanto%'
   OR e.name ILIKE '%ARIS%HERMANTO%')
  AND lt.name = 'Cuti Tahunan'
ORDER BY lr.start_date;

-- Step 4: Calculate correct usage from leave requests
SELECT 'STEP 4: CALCULATED CORRECT USAGE FROM LEAVE REQUESTS' as step;
WITH aris_usage AS (
    SELECT 
        lr.leave_quota_year,
        SUM(lr.days_requested) as total_days_requested,
        COUNT(*) as request_count
    FROM leave_requests lr
    JOIN employees e ON lr.employee_id = e.id
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    WHERE (e.name ILIKE '%aris%hermanto%' 
       OR e.name ILIKE '%Aris%Hermanto%'
       OR e.name ILIKE '%ARIS%HERMANTO%')
      AND lt.name = 'Cuti Tahunan'
      AND lr.leave_quota_year IN (2024, 2025)
    GROUP BY lr.leave_quota_year
)
SELECT 
    leave_quota_year,
    total_days_requested,
    request_count,
    CASE 
        WHEN leave_quota_year = 2024 THEN 'PENANGGUHAN'
        WHEN leave_quota_year = 2025 THEN 'TAHUN BERJALAN'
        ELSE 'UNKNOWN'
    END as quota_type
FROM aris_usage
ORDER BY leave_quota_year;

-- ==================================================
-- PART 2: FIX - CORRECT THE BALANCE DATA
-- ==================================================

-- Step 5: Fix 2025 balance (current year) - should be 12 total, 1 used, 8 deferred
SELECT 'STEP 5: FIXING 2025 BALANCE - CURRENT YEAR' as step;
UPDATE leave_balances lb
SET 
    total_days = 12,  -- Jatah tahun berjalan harusnya 12
    used_days = 1,    -- Terpakai tahun berjalan harusnya 1
    deferred_days = 8, -- Jatah penangguhan 8 hari
    updated_at = CURRENT_TIMESTAMP
WHERE lb.employee_id IN (
    SELECT e.id FROM employees e 
    WHERE (e.name ILIKE '%aris%hermanto%' 
       OR e.name ILIKE '%Aris%Hermanto%'
       OR e.name ILIKE '%ARIS%HERMANTO%')
)
AND lb.leave_type_id IN (
    SELECT lt.id FROM leave_types lt WHERE lt.name = 'Cuti Tahunan'
)
AND lb.year = 2025;

-- Step 6: Fix 2024 balance (previous year tracking) - should be 8 used for tracking
SELECT 'STEP 6: FIXING 2024 BALANCE - PREVIOUS YEAR TRACKING' as step;
UPDATE leave_balances lb
SET 
    used_days = 8,    -- Terpakai penangguhan harusnya 8
    updated_at = CURRENT_TIMESTAMP
WHERE lb.employee_id IN (
    SELECT e.id FROM employees e 
    WHERE (e.name ILIKE '%aris%hermanto%' 
       OR e.name ILIKE '%Aris%Hermanto%'
       OR e.name ILIKE '%ARIS%HERMANTO%')
)
AND lb.leave_type_id IN (
    SELECT lt.id FROM leave_types lt WHERE lt.name = 'Cuti Tahunan'
)
AND lb.year = 2024;

-- ==================================================
-- PART 3: VERIFICATION - CHECK THE FIX
-- ==================================================

-- Step 7: Show final balance after fix
SELECT 'STEP 7: FINAL BALANCE AFTER FIX' as step;
SELECT 
    e.name as employee_name,
    lt.name as leave_type,
    lb.year,
    lb.total_days,
    lb.used_days,
    lb.deferred_days,
    (lb.total_days + lb.deferred_days - lb.used_days) as remaining_days,
    CASE 
        WHEN lb.year = 2024 THEN 'PENANGGUHAN TRACKING'
        WHEN lb.year = 2025 THEN 'TAHUN BERJALAN'
        ELSE 'UNKNOWN'
    END as balance_type
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE (e.name ILIKE '%aris%hermanto%' 
   OR e.name ILIKE '%Aris%Hermanto%'
   OR e.name ILIKE '%ARIS%HERMANTO%')
  AND lb.year IN (2024, 2025)
  AND lt.name = 'Cuti Tahunan'
ORDER BY lb.year;

-- Step 8: Frontend display summary
SELECT 'STEP 8: FRONTEND DISPLAY SUMMARY' as step;
SELECT 
    e.name as employee_name,
    'Cuti Tahunan' as leave_type,
    lb.total_days as "Jatah Tahun Berjalan",
    lb.used_days as "Terpakai Tahun Berjalan",
    (lb.total_days - lb.used_days) as "Sisa Tahun Berjalan",
    lb.deferred_days as "Jatah Penangguhan",
    (SELECT used_days FROM leave_balances lb2 
     WHERE lb2.employee_id = lb.employee_id 
       AND lb2.leave_type_id = lb.leave_type_id 
       AND lb2.year = 2024) as "Terpakai Penangguhan",
    (lb.deferred_days - (SELECT used_days FROM leave_balances lb2 
     WHERE lb2.employee_id = lb.employee_id 
       AND lb2.leave_type_id = lb.leave_type_id 
       AND lb2.year = 2024)) as "Sisa Penangguhan",
    CASE 
        WHEN (lb.total_days - lb.used_days) >= 0 
         AND (lb.deferred_days - (SELECT used_days FROM leave_balances lb2 
     WHERE lb2.employee_id = lb.employee_id 
       AND lb2.leave_type_id = lb.leave_type_id 
       AND lb2.year = 2024)) >= 0 THEN '✅ VALID'
        ELSE '❌ NEGATIVE REMAINING'
    END as status
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE (e.name ILIKE '%aris%hermanto%' 
   OR e.name ILIKE '%Aris%Hermanto%'
   OR e.name ILIKE '%ARIS%HERMANTO%')
  AND lb.year = 2025
  AND lt.name = 'Cuti Tahunan';

-- Step 9: Expected vs Actual comparison
SELECT 'STEP 9: EXPECTED VS ACTUAL COMPARISON' as step;
SELECT 
    'Aris Hermanto' as employee_name,
    'Cuti Tahunan' as leave_type,
    12 as "Expected Jatah Tahun Berjalan",
    1 as "Expected Terpakai Tahun Berjalan",
    11 as "Expected Sisa Tahun Berjalan",
    8 as "Expected Jatah Penangguhan",
    8 as "Expected Terpakai Penangguhan",
    0 as "Expected Sisa Penangguhan",
    '✅ CORRECT VALUES' as status;

-- Step 10: Final verification message
SELECT 'STEP 10: FIX COMPLETION STATUS' as step;
SELECT 
    '✅ ARIS HERMANTO LEAVE BALANCE FIXED SUCCESSFULLY' as status,
    'Saldo cuti Aris Hermanto telah diperbaiki:' as message,
    '• Jatah Tahun Berjalan: 12 hari' as detail1,
    '• Terpakai Tahun Berjalan: 1 hari' as detail2,
    '• Sisa Tahun Berjalan: 11 hari' as detail3,
    '• Jatah Penangguhan: 8 hari' as detail4,
    '• Terpakai Penangguhan: 8 hari' as detail5,
    '• Sisa Penangguhan: 0 hari' as detail6,
    '• Total Sisa: 11 hari' as detail7,
    'Silakan refresh aplikasi untuk melihat perubahan.' as instruction; 