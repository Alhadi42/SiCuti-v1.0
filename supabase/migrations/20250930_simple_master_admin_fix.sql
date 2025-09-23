-- Migration: Simple fix for Master Admin template access
-- Description: This migration ensures Master Admin can access all templates

-- 1. Temporarily disable RLS to ensure we can make changes
ALTER TABLE public.templates DISABLE ROW LEVEL SECURITY;

-- 2. Ensure all existing templates have proper global scope
UPDATE public.templates
SET template_scope = 'global',
    unit_scope = NULL
WHERE template_scope IS NULL OR template_scope != 'unit';

-- 3. Re-enable RLS with corrected policies
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow read access based on role" ON public.templates;
DROP POLICY IF EXISTS "Allow insert based on role" ON public.templates;
DROP POLICY IF EXISTS "Allow update based on role" ON public.templates;
DROP POLICY IF EXISTS "Allow delete based on role" ON public.templates;
DROP POLICY IF EXISTS "Master Admin Full Access" ON public.templates;
DROP POLICY IF EXISTS "Admin Unit Access" ON public.templates;

-- 5. Create new simple policies
-- Master Admin can access ALL templates
CREATE POLICY "Master Admin All Templates" ON public.templates
FOR ALL
USING (
  auth.uid() = '5c9b0e6d-380e-4654-b511-7e27c26ac485'::uuid
);

-- 6. Grant necessary permissions
GRANT ALL ON public.templates TO authenticated;
