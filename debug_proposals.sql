-- Debug queries untuk memeriksa data usulan cuti
-- Jalankan di Supabase SQL Editor untuk debug

-- 1. Cek semua usulan yang ada di database
SELECT 
    id,
    proposal_title,
    proposer_name,
    proposer_unit,
    status,
    total_employees,
    created_at
FROM leave_proposals 
ORDER BY created_at DESC;

-- 2. Cek item usulan untuk melihat detail pegawai
SELECT 
    lp.proposal_title,
    lp.proposer_unit,
    lpi.employee_name,
    lpi.employee_department,
    lpi.leave_type_name,
    lpi.start_date,
    lpi.end_date,
    lpi.days_requested
FROM leave_proposals lp
JOIN leave_proposal_items lpi ON lp.id = lpi.proposal_id
ORDER BY lp.created_at DESC;

-- 3. Cek RLS policies untuk leave_proposals
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'leave_proposals';

-- 4. Cek unit kerja yang berbeda di database
SELECT DISTINCT proposer_unit 
FROM leave_proposals 
ORDER BY proposer_unit;

-- 5. Cek apakah ada usulan dari user adminsdma
SELECT 
    lp.*,
    u.username,
    u.unit_kerja as user_unit
FROM leave_proposals lp
LEFT JOIN users u ON lp.proposed_by = u.id
WHERE u.username = 'adminsdma' OR lp.proposer_name ILIKE '%ali%hamzah%';

-- 6. Count usulan per unit
SELECT 
    proposer_unit,
    COUNT(*) as total_proposals,
    COUNT(lpi.id) as total_items
FROM leave_proposals lp
LEFT JOIN leave_proposal_items lpi ON lp.id = lpi.proposal_id
GROUP BY proposer_unit
ORDER BY total_proposals DESC;
