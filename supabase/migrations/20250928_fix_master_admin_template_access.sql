-- Migration: Fix RLS policy for Master Admin template access
-- Description: Update the RLS policy to allow master_admin to see all templates

DROP POLICY IF EXISTS "Allow read access based on role" ON public.templates;
CREATE POLICY "Allow read access based on role" ON public.templates
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM get_user_details() d
    WHERE d.user_role = 'master_admin'  -- Master admin can see all templates
       OR (d.user_role = 'admin_unit' AND template_scope = 'unit' AND unit_scope = d.user_unit)
  )
);

DROP POLICY IF EXISTS "Allow insert based on role" ON public.templates;
CREATE POLICY "Allow insert based on role" ON public.templates
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM get_user_details() d
    WHERE d.user_role = 'master_admin'  -- Master admin can insert all templates
       OR (d.user_role = 'admin_unit' AND template_scope = 'unit' AND unit_scope = d.user_unit)
  )
);

DROP POLICY IF EXISTS "Allow update based on role" ON public.templates;
CREATE POLICY "Allow update based on role" ON public.templates
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM get_user_details() d
    WHERE d.user_role = 'master_admin'  -- Master admin can update all templates
       OR (d.user_role = 'admin_unit' AND template_scope = 'unit' AND unit_scope = d.user_unit)
  )
);

DROP POLICY IF EXISTS "Allow delete based on role" ON public.templates;
CREATE POLICY "Allow delete based on role" ON public.templates
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM get_user_details() d
    WHERE d.user_role = 'master_admin'  -- Master admin can delete all templates
       OR (d.user_role = 'admin_unit' AND template_scope = 'unit' AND unit_scope = d.user_unit)
  )
);
