-- Migration: Fix RLS policies for templates table
-- Description: Simple RLS policies to allow users to manage their own templates

-- 1. Enable RLS if not already enabled
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DO $$
BEGIN
    -- Drop all existing policies on templates table
    DROP POLICY IF EXISTS "Allow read access based on role" ON public.templates;
    DROP POLICY IF EXISTS "Allow insert based on role" ON public.templates;
    DROP POLICY IF EXISTS "Allow update based on role" ON public.templates;
    DROP POLICY IF EXISTS "Allow delete based on role" ON public.templates;
    DROP POLICY IF EXISTS "Master Admin Full Access" ON public.templates;
    DROP POLICY IF EXISTS "Admin Unit Access" ON public.templates;
    DROP POLICY IF EXISTS "Master Admin All Templates" ON public.templates;
    DROP POLICY IF EXISTS "Master Admin Direct Access" ON public.templates;
    DROP POLICY IF EXISTS "User Access" ON public.templates;
END $$;

-- 3. Create or update policies
DO $$
BEGIN
    -- Create or replace the template creation policy
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Allow template creation' AND tablename = 'templates') THEN
        EXECUTE 'CREATE POLICY "Allow template creation" ON public.templates
                FOR INSERT
                TO authenticated
                WITH CHECK (true);';
    END IF;
    
    -- Create or replace the user access policy
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'User template access' AND tablename = 'templates') THEN
        EXECUTE 'CREATE POLICY "User template access" ON public.templates
                USING (auth.uid() = created_by)
                WITH CHECK (auth.uid() = created_by);';
    END IF;
    
    -- Create or replace the admin access policy
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Admin template access' AND tablename = 'templates') THEN
        EXECUTE 'CREATE POLICY "Admin template access" ON public.templates
                USING (EXISTS (
                    SELECT 1 FROM auth.users
                    WHERE id = auth.uid() 
                    AND (raw_user_meta_data->>''role'' = ''admin_unit'' OR 
                         raw_user_meta_data->>''role'' = ''master_admin'')
                ))
                WITH CHECK (EXISTS (
                    SELECT 1 FROM auth.users
                    WHERE id = auth.uid() 
                    AND (raw_user_meta_data->>''role'' = ''admin_unit'' OR 
                         raw_user_meta_data->>''role'' = ''master_admin'')
                ));';
    END IF;
END $$;

-- 3.1 Create or replace the function to set created_by
CREATE OR REPLACE FUNCTION public.handle_new_template()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.2 Create or replace the trigger
DROP TRIGGER IF EXISTS on_template_created ON public.templates;
CREATE TRIGGER on_template_created
BEFORE INSERT ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_template();

-- 4. Grant necessary permissions
GRANT ALL ON public.templates TO authenticated;

-- 5. Add a comment to explain the policies
COMMENT ON TABLE public.templates IS 'Templates for documents. Access controlled by RLS policies.';

-- 6. Verify the policies
SELECT 
    tablename, 
    policyname, 
    roles, 
    cmd, 
    qual as using_condition, 
    with_check 
FROM 
    pg_policies 
WHERE 
    tablename = 'templates' 
ORDER BY 
    policyname;
