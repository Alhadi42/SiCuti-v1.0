-- Migration: Force global scope for old templates
-- Description: This script temporarily disables RLS to ensure all templates created before the scope system are correctly assigned as 'global'.

-- 1. Temporarily disable RLS to allow the update to proceed
ALTER TABLE public.templates DISABLE ROW LEVEL SECURITY;

-- 2. Update all templates that are not specifically 'unit' scoped to be 'global'
UPDATE public.templates
SET template_scope = 'global'
WHERE template_scope IS NULL OR template_scope != 'unit';

-- 3. Re-enable RLS to secure the table again
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
