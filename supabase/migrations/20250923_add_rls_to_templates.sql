-- Migration: Add RLS policies to templates table
-- Description: Secure template access based on user roles (master_admin and admin_unit)

-- 1. Enable Row-Level Security on the templates table
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow master_admin to manage global templates" ON public.templates;
DROP POLICY IF EXISTS "Allow admin_unit to manage their own unit templates" ON public.templates;
DROP POLICY IF EXISTS "Allow read access based on role" ON public.templates;

-- 3. Create a helper function to get user details from the current session
CREATE OR REPLACE FUNCTION get_user_details()
RETURNS TABLE(user_role TEXT, user_unit TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT role, unit_kerja
  FROM public.users
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS Policy for SELECT
DROP POLICY IF EXISTS "Allow read access based on role" ON public.templates;
CREATE POLICY "Allow read access based on role" ON public.templates
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM get_user_details() d
    WHERE (d.user_role = 'master_admin' AND template_scope = 'global')
       OR (d.user_role = 'admin_unit' AND template_scope = 'unit' AND unit_scope = d.user_unit)
  )
);

-- 5. RLS Policy for INSERT
DROP POLICY IF EXISTS "Allow insert based on role" ON public.templates;
CREATE POLICY "Allow insert based on role" ON public.templates
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM get_user_details() d
    WHERE (d.user_role = 'master_admin' AND template_scope = 'global')
       OR (d.user_role = 'admin_unit' AND template_scope = 'unit' AND unit_scope = d.user_unit)
  )
);

-- 6. RLS Policy for UPDATE
DROP POLICY IF EXISTS "Allow update based on role" ON public.templates;
CREATE POLICY "Allow update based on role" ON public.templates
FOR UPDATE USING (
  EXISTS (
    SELECT 1
    FROM get_user_details() d
    WHERE (d.user_role = 'master_admin' AND template_scope = 'global')
       OR (d.user_role = 'admin_unit' AND template_scope = 'unit' AND unit_scope = d.user_unit)
  )
);

-- 7. RLS Policy for DELETE
DROP POLICY IF EXISTS "Allow delete based on role" ON public.templates;
CREATE POLICY "Allow delete based on role" ON public.templates
FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM get_user_details() d
    WHERE (d.user_role = 'master_admin' AND template_scope = 'global')
       OR (d.user_role = 'admin_unit' AND template_scope = 'unit' AND unit_scope = d.user_unit)
  )
);
