-- Migration: Add template scope system for admin_unit access
-- Description: Allow admin_unit users to have their own separate templates

-- 1. Add columns to templates table for scope management
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS unit_scope TEXT;

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS template_scope TEXT DEFAULT 'global' CHECK (template_scope IN ('global', 'unit'));

-- 2. Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by);
CREATE INDEX IF NOT EXISTS idx_templates_unit_scope ON templates(unit_scope);
CREATE INDEX IF NOT EXISTS idx_templates_scope ON templates(template_scope);

-- 3. Add composite index for unit-scoped template queries
CREATE INDEX IF NOT EXISTS idx_templates_unit_scope_type ON templates(unit_scope, type) WHERE template_scope = 'unit';

-- 4. Update existing templates to be global scope (master_admin accessible)
UPDATE templates 
SET template_scope = 'global', 
    created_by = (SELECT id FROM users WHERE role = 'master_admin' LIMIT 1)
WHERE template_scope IS NULL OR template_scope = '';

-- 5. Add comments for clarity
COMMENT ON COLUMN templates.created_by IS 'User who created this template';
COMMENT ON COLUMN templates.unit_scope IS 'Unit/department that owns this template (for unit-scoped templates)';
COMMENT ON COLUMN templates.template_scope IS 'global: accessible by master_admin, unit: accessible only by admin_unit of the same unit';

-- 6. Create function to get templates based on user role and unit
CREATE OR REPLACE FUNCTION get_user_accessible_templates(
  user_role TEXT,
  user_unit TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  type TEXT,
  template_data TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by UUID,
  unit_scope TEXT,
  template_scope TEXT
) AS $$
BEGIN
  IF user_role = 'master_admin' THEN
    -- Master admin can see all global templates
    RETURN QUERY
    SELECT t.id, t.name, t.description, t.type, t.template_data, 
           t.created_at, t.updated_at, t.created_by, t.unit_scope, t.template_scope
    FROM templates t
    WHERE t.template_scope = 'global'
    ORDER BY t.updated_at DESC;
    
  ELSIF user_role = 'admin_unit' AND user_unit IS NOT NULL THEN
    -- Admin unit can only see their own unit's templates
    RETURN QUERY
    SELECT t.id, t.name, t.description, t.type, t.template_data, 
           t.created_at, t.updated_at, t.created_by, t.unit_scope, t.template_scope
    FROM templates t
    WHERE t.template_scope = 'unit' AND t.unit_scope = user_unit
    ORDER BY t.updated_at DESC;
    
  ELSE
    -- Other roles have no access to templates
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to check if user can access specific template
CREATE OR REPLACE FUNCTION can_user_access_template(
  template_id UUID,
  user_role TEXT,
  user_unit TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  template_record RECORD;
BEGIN
  -- Get template info
  SELECT template_scope, unit_scope INTO template_record
  FROM templates 
  WHERE id = template_id;
  
  -- Template not found
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Master admin can access global templates
  IF user_role = 'master_admin' AND template_record.template_scope = 'global' THEN
    RETURN TRUE;
  END IF;
  
  -- Admin unit can access their own unit's templates
  IF user_role = 'admin_unit' 
     AND template_record.template_scope = 'unit' 
     AND template_record.unit_scope = user_unit THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 8. Enable realtime for templates table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'templates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE templates;
  END IF;
END $$;