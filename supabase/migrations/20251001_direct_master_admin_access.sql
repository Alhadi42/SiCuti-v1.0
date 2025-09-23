-- Emergency fix: Create a simple policy that allows the Master Admin to access all templates
-- This bypasses complex RLS logic and directly grants access to the specific user

DROP POLICY IF EXISTS "Master Admin Direct Access" ON public.templates;

CREATE POLICY "Master Admin Direct Access" ON public.templates
FOR ALL
USING (auth.uid() = '5c9b0e6d-380e-4654-b511-7e27c26ac485'::uuid);

-- Ensure all templates are marked as accessible
UPDATE public.templates
SET template_scope = 'global'
WHERE template_scope IS NULL OR template_scope = '';
