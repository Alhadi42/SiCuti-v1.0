-- Disable RLS temporarily for testing
ALTER TABLE public.leave_proposals DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('leave_proposals', 'leave_proposal_items');

-- To re-enable RLS after testing, run:
-- ALTER TABLE public.leave_proposals ENABLE ROW LEVEL SECURITY;
