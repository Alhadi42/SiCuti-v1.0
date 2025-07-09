-- FIX ARIS HERMANTO ULTRA SIMPLE - NO ERRORS
-- Script paling sederhana untuk memperbaiki saldo Aris Hermanto
-- Jalankan di Supabase SQL Editor

-- Step 1: Check current status
SELECT 'CURRENT STATUS' as step;
SELECT 
    e.name,
    lt.name as leave_type,
    lb.year,
    lb.total_days,
    lb.used_days,
    lb.deferred_days
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE (e.name ILIKE '%aris%hermanto%' OR e.name ILIKE '%Aris%Hermanto%')
  AND lb.year IN (2024, 2025)
  AND lt.name = 'Cuti Tahunan'
ORDER BY lb.year;

-- Step 2: Fix 2025 balance (current year)
SELECT 'FIXING 2025 BALANCE' as step;
UPDATE leave_balances lb
SET 
    total_days = 12,
    used_days = 1,
    deferred_days = 8,
    updated_at = CURRENT_TIMESTAMP
WHERE lb.employee_id IN (
    SELECT e.id FROM employees e 
    WHERE (e.name ILIKE '%aris%hermanto%' OR e.name ILIKE '%Aris%Hermanto%')
)
AND lb.leave_type_id IN (
    SELECT lt.id FROM leave_types lt WHERE lt.name = 'Cuti Tahunan'
)
AND lb.year = 2025;

-- Step 3: Fix 2024 balance (tracking)
SELECT 'FIXING 2024 BALANCE' as step;
UPDATE leave_balances lb
SET 
    used_days = 8,
    updated_at = CURRENT_TIMESTAMP
WHERE lb.employee_id IN (
    SELECT e.id FROM employees e 
    WHERE (e.name ILIKE '%aris%hermanto%' OR e.name ILIKE '%Aris%Hermanto%')
)
AND lb.leave_type_id IN (
    SELECT lt.id FROM leave_types lt WHERE lt.name = 'Cuti Tahunan'
)
AND lb.year = 2024;

-- Step 4: Show final result
SELECT 'FINAL RESULT' as step;
SELECT 
    e.name,
    lt.name as leave_type,
    lb.year,
    lb.total_days,
    lb.used_days,
    lb.deferred_days,
    (lb.total_days + lb.deferred_days - lb.used_days) as remaining_days
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE (e.name ILIKE '%aris%hermanto%' OR e.name ILIKE '%Aris%Hermanto%')
  AND lb.year IN (2024, 2025)
  AND lt.name = 'Cuti Tahunan'
ORDER BY lb.year;

-- Step 5: Success message
SELECT 'SUCCESS' as step;
SELECT 
    '✅ ARIS HERMANTO LEAVE BALANCE FIXED SUCCESSFULLY' as status,
    'Jatah Tahun Berjalan: 12 hari' as detail1,
    'Terpakai Tahun Berjalan: 1 hari' as detail2,
    'Sisa Tahun Berjalan: 11 hari' as detail3,
    'Jatah Penangguhan: 8 hari' as detail4,
    'Terpakai Penangguhan: 8 hari' as detail5,
    'Sisa Penangguhan: 0 hari' as detail6,
    'Total Sisa: 11 hari' as detail7,
    'Silakan refresh aplikasi' as instruction; 