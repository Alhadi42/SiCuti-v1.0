-- Temporarily disable RLS for testing proposal creation
-- ONLY use this for debugging! Re-enable RLS after testing

-- Check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    hasrls
FROM pg_tables 
WHERE tablename IN ('leave_proposals', 'leave_proposal_items');

-- Disable RLS temporarily for testing
ALTER TABLE public.leave_proposals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_proposal_items DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    hasrls
FROM pg_tables 
WHERE tablename IN ('leave_proposals', 'leave_proposal_items');

-- Test insert to verify it works
INSERT INTO public.leave_proposals (
    proposal_title,
    proposed_by,
    proposer_name,
    proposer_unit,
    notes,
    total_employees
) VALUES (
    'Test Proposal - Direct SQL',
    '00000000-0000-0000-0000-000000000000', -- Dummy UUID
    'Test User SQL',
    'Test Unit SQL',
    'Test insert dari SQL',
    1
) RETURNING *;

-- Check if data was inserted
SELECT 
    COUNT(*) as total_proposals,
    MAX(created_at) as latest_proposal
FROM public.leave_proposals;

-- Clean up test data
DELETE FROM public.leave_proposals 
WHERE proposal_title = 'Test Proposal - Direct SQL';

-- IMPORTANT: Re-enable RLS after testing
-- Uncomment these lines after successful test:
-- ALTER TABLE public.leave_proposals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.leave_proposal_items ENABLE ROW LEVEL SECURITY;

-- Verify RLS status after re-enabling
-- SELECT 
--     schemaname,
--     tablename,
--     rowsecurity,
--     hasrls
-- FROM pg_tables 
-- WHERE tablename IN ('leave_proposals', 'leave_proposal_items');
