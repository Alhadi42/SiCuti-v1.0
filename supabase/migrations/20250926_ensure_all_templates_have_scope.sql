-- Migration: Ensure all templates have a scope
-- Description: This script assigns the 'global' scope to any template that does not have a 'unit' scope.
-- This is a robust fix to ensure all templates created before the scope system are accessible by the master_admin.

UPDATE public.templates
SET template_scope = 'global'
WHERE template_scope IS NULL OR template_scope != 'unit';
