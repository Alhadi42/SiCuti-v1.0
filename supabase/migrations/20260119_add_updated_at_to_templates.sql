-- Migration: Add updated_at column to templates table
-- Description: Adds updated_at column and sets up auto-update trigger

-- 1. Add updated_at column if it doesn't exist
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Update existing records to have a valid updated_at
UPDATE templates 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- 5. Add comment
COMMENT ON COLUMN templates.updated_at IS 'Timestamp when the template was last updated';
