-- Check and create missing foreign key relationships
-- Run this in Supabase SQL Editor

-- 1. Check if users table exists and has the expected structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 2. Check existing foreign key constraints on leave_proposals
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'leave_proposals';

-- 3. Check if proposed_by column exists in leave_proposals
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'leave_proposals'
AND column_name = 'proposed_by';

-- 4. Create foreign key constraint if it doesn't exist (only if users table exists)
DO $$
BEGIN
    -- Check if users table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        -- Check if foreign key constraint already exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_type = 'FOREIGN KEY'
            AND table_name = 'leave_proposals'
            AND constraint_name = 'leave_proposals_proposed_by_fkey'
        ) THEN
            -- Add the foreign key constraint
            ALTER TABLE public.leave_proposals 
            ADD CONSTRAINT leave_proposals_proposed_by_fkey 
            FOREIGN KEY (proposed_by) REFERENCES public.users(id) ON DELETE CASCADE;
            
            RAISE NOTICE 'Foreign key constraint created: leave_proposals_proposed_by_fkey';
        ELSE
            RAISE NOTICE 'Foreign key constraint already exists';
        END IF;
    ELSE
        -- If using auth.users instead
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_type = 'FOREIGN KEY'
            AND table_name = 'leave_proposals'
            AND constraint_name = 'leave_proposals_proposed_by_fkey'
        ) THEN
            -- Add foreign key to auth.users
            ALTER TABLE public.leave_proposals 
            ADD CONSTRAINT leave_proposals_proposed_by_fkey 
            FOREIGN KEY (proposed_by) REFERENCES auth.users(id) ON DELETE CASCADE;
            
            RAISE NOTICE 'Foreign key constraint created: leave_proposals_proposed_by_fkey (to auth.users)';
        ELSE
            RAISE NOTICE 'Foreign key constraint already exists';
        END IF;
    END IF;
END $$;

-- 5. Similarly for approved_by if it doesn't exist
DO $$
BEGIN
    -- Check if users table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        -- Check if foreign key constraint already exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_type = 'FOREIGN KEY'
            AND table_name = 'leave_proposals'
            AND constraint_name = 'leave_proposals_approved_by_fkey'
        ) THEN
            -- Add the foreign key constraint
            ALTER TABLE public.leave_proposals 
            ADD CONSTRAINT leave_proposals_approved_by_fkey 
            FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;
            
            RAISE NOTICE 'Foreign key constraint created: leave_proposals_approved_by_fkey';
        END IF;
    ELSE
        -- If using auth.users instead
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_type = 'FOREIGN KEY'
            AND table_name = 'leave_proposals'
            AND constraint_name = 'leave_proposals_approved_by_fkey'
        ) THEN
            -- Add foreign key to auth.users
            ALTER TABLE public.leave_proposals 
            ADD CONSTRAINT leave_proposals_approved_by_fkey 
            FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
            
            RAISE NOTICE 'Foreign key constraint created: leave_proposals_approved_by_fkey (to auth.users)';
        END IF;
    END IF;
END $$;

-- 6. Check final foreign key constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'leave_proposals';

-- 7. Test query to verify data is accessible
SELECT 
    COUNT(*) as total_proposals,
    COUNT(DISTINCT proposer_unit) as unique_units
FROM public.leave_proposals;
