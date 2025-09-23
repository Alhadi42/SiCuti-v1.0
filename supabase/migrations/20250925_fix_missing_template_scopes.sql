-- Migration: Fix missing template scopes
-- Description: This script ensures that all existing templates without a scope are assigned as 'global'.
-- This is necessary to ensure that the master_admin can still access templates created before the scope system was implemented.

UPDATE public.templates
SET template_scope = 'global'
WHERE template_scope IS NULL;
