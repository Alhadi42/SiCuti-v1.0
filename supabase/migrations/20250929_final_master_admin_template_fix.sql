-- Migration: Final fix for Master Admin template access
-- Description: This migration ensures Master Admin can access all templates and fixes any data relationships

-- 1. First, disable RLS temporarily to ensure we can make changes
ALTER TABLE public.templates DISABLE ROW LEVEL SECURITY;

-- 2. Ensure all existing templates have proper global scope
UPDATE public.templates
SET template_scope = 'global',
    unit_scope = NULL
WHERE template_scope IS NULL OR template_scope != 'unit';

-- 3. Ensure Master Admin user exists with correct permissions
INSERT INTO public.users (
  id,
  name,
  username,
  password,
  email,
  role,
  unit_kerja,
  status,
  created_at,
  updated_at,
  metadata
)
SELECT
  '5c9b0e6d-380e-4654-b511-7e27c26ac485'::uuid,
  'Master Admin',
  'masteradmin',
  '$2b$10$placeholder_hash_for_security', -- This will be ignored by Supabase Auth
  'admin@example.com', -- Replace with actual email if known
  'master_admin',
  'Pusat',
  'active',
  NOW(),
  NOW(),
  '{}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.users
  WHERE id = '5c9b0e6d-380e-4654-b511-7e27c26ac485'::uuid
);

-- 4. Re-enable RLS with corrected policies
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow read access based on role" ON public.templates;
DROP POLICY IF EXISTS "Allow insert based on role" ON public.templates;
DROP POLICY IF EXISTS "Allow update based on role" ON public.templates;
DROP POLICY IF EXISTS "Allow delete based on role" ON public.templates;

-- 6. Create new comprehensive policies
-- Master Admin can access ALL templates (global and unit-scoped)
CREATE POLICY "Master Admin Full Access" ON public.templates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
    AND u.role = 'master_admin'
  )
);

-- Admin Unit can only access their own unit templates
CREATE POLICY "Admin Unit Access" ON public.templates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin_unit'
    AND (public.templates.unit_scope = u.unit_kerja OR public.templates.unit_scope = u.unitKerja)
  )
);

-- 7. Grant necessary permissions
GRANT ALL ON public.templates TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
