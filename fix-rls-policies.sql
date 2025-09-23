-- Fix RLS policies for leave_proposals table

-- 1. Enable RLS if not already enabled
ALTER TABLE public.leave_proposals ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leave_proposals' AND policyname = 'Admins can do anything') THEN
        DROP POLICY "Admins can do anything" ON public.leave_proposals;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leave_proposals' AND policyname = 'Users can see their own proposals') THEN
        DROP POLICY "Users can see their own proposals" ON public.leave_proposals;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leave_proposals' AND policyname = 'Service role can do anything') THEN
        DROP POLICY "Service role can do anything" ON public.leave_proposals;
    END IF;
END $$;

-- 3. Create new policies
-- Policy to allow admins to do anything
CREATE POLICY "Admins can do anything" 
ON public.leave_proposals
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'master_admin')
WITH CHECK (true);

-- Policy to allow users to see their own proposals
CREATE POLICY "Users can see their own proposals" 
ON public.leave_proposals
FOR SELECT
TO authenticated
USING (proposed_by = (auth.jwt() ->> 'sub')::uuid);

-- Policy to allow service role to do anything
CREATE POLICY "Service role can do anything" 
ON public.leave_proposals
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Verify the policies
SELECT 
    policyname as name, 
    cmd, 
    roles, 
    qual as using_condition, 
    with_check 
FROM 
    pg_policies 
WHERE 
    tablename = 'leave_proposals';

-- 5. Check if RLS is enabled
SELECT 
    relname as table_name, 
    relrowsecurity as rls_enabled
FROM 
    pg_class 
WHERE 
    relname = 'leave_proposals';
