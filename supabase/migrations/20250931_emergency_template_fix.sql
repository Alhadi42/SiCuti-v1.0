-- Migration: Emergency fix for Master Admin template access
-- Description: This migration creates a direct policy for the specific Master Admin user ID

-- Create a simple policy that allows the specific Master Admin user to access all templates
DROP POLICY IF EXISTS "Allow read access based on role" ON public.templates;
DROP POLICY IF EXISTS "Allow insert based on role" ON public.templates;
DROP POLICY IF EXISTS "Allow update based on role" ON public.templates;
DROP POLICY IF EXISTS "Allow delete based on role" ON public.templates;
DROP POLICY IF EXISTS "Master Admin Full Access" ON public.templates;
DROP POLICY IF EXISTS "Admin Unit Access" ON public.templates;
DROP POLICY IF EXISTS "Master Admin All Templates" ON public.templates;

-- Simple policy: Master Admin can access all templates
CREATE POLICY "Master Admin Direct Access" ON public.templates
FOR ALL
USING (auth.uid() = '5c9b0e6d-380e-4654-b511-7e27c26ac485'::uuid);

-- Ensure all templates are marked as global
UPDATE public.templates
SET template_scope = 'global',
    unit_scope = NULL
WHERE template_scope IS NULL OR template_scope = '' OR template_scope != 'unit';

-- Grant basic permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO authenticated;
