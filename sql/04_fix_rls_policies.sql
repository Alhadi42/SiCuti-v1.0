-- Fix RLS policies to ensure Master Admin can see all proposals
-- Run this in Supabase SQL Editor

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Admin units can manage their proposals" ON public.leave_proposals;
DROP POLICY IF EXISTS "Master admin can manage all proposals" ON public.leave_proposals;
DROP POLICY IF EXISTS "Admin units can manage their proposal items" ON public.leave_proposal_items;

-- Check if we have users table with proper structure
-- If using auth.users, adjust accordingly
DO $$
BEGIN
    -- Check if users table exists in public schema
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        RAISE NOTICE 'Using public.users table for RLS policies';
        
        -- Policies for leave_proposals using public.users
        CREATE POLICY "Admin units can manage their proposals" ON public.leave_proposals
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() 
                    AND role = 'admin_unit' 
                    AND unit_kerja = leave_proposals.proposer_unit
                )
                OR
                EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() 
                    AND role = 'master_admin'
                )
            );

        -- Policies for leave_proposal_items using public.users  
        CREATE POLICY "Admin units can manage their proposal items" ON public.leave_proposal_items
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.leave_proposals lp
                    JOIN public.users u ON u.id = auth.uid()
                    WHERE lp.id = leave_proposal_items.proposal_id 
                    AND (
                        (u.role = 'admin_unit' AND u.unit_kerja = lp.proposer_unit)
                        OR u.role = 'master_admin'
                    )
                )
            );
            
    ELSE
        RAISE NOTICE 'Using auth.users for RLS policies - simpler approach';
        
        -- Simplified policies if using auth.users or different structure
        CREATE POLICY "Allow all for authenticated users" ON public.leave_proposals
            FOR ALL USING (auth.role() = 'authenticated');
            
        CREATE POLICY "Allow all for authenticated users" ON public.leave_proposal_items
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Alternative: Temporarily disable RLS for debugging (ONLY for testing)
-- Uncomment these lines ONLY if you want to test without RLS temporarily
-- ALTER TABLE public.leave_proposals DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.leave_proposal_items DISABLE ROW LEVEL SECURITY;

-- Check current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('leave_proposals', 'leave_proposal_items');

-- Test query to see if data is visible
SELECT 
    'leave_proposals' as table_name,
    COUNT(*) as total_rows
FROM public.leave_proposals
UNION ALL
SELECT 
    'leave_proposal_items' as table_name,
    COUNT(*) as total_rows  
FROM public.leave_proposal_items;
