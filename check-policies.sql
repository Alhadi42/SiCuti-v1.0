-- Check current RLS status and policies
SELECT 
    tablename, 
    rowsecurity,
    has_row_security
FROM 
    pg_tables 
WHERE 
    schemaname = 'public' 
    AND tablename = 'leave_proposals';

-- List all policies on leave_proposals
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies
WHERE 
    tablename = 'leave_proposals';

-- Check if RLS is enabled
SELECT 
    relname, 
    relrowsecurity, 
    relforcerowsecurity
FROM 
    pg_class 
WHERE 
    oid = 'public.leave_proposals'::regclass;
