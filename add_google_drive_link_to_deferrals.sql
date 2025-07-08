-- Add Google Drive link and notes columns to leave_deferrals table
-- This migration adds support for storing document links and additional notes

-- Add google_drive_link column
ALTER TABLE leave_deferrals 
ADD COLUMN IF NOT EXISTS google_drive_link TEXT;

-- Add notes column
ALTER TABLE leave_deferrals 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment to document the purpose of these columns
COMMENT ON COLUMN leave_deferrals.google_drive_link IS 'Link to Google Drive document for deferred leave approval';
COMMENT ON COLUMN leave_deferrals.notes IS 'Additional notes or comments for the deferred leave record';

-- Create index for better performance when searching by google_drive_link
CREATE INDEX IF NOT EXISTS idx_leave_deferrals_google_drive_link 
ON leave_deferrals(google_drive_link) 
WHERE google_drive_link IS NOT NULL;

-- Update existing records to have empty strings instead of NULL for consistency
UPDATE leave_deferrals 
SET google_drive_link = '' 
WHERE google_drive_link IS NULL;

UPDATE leave_deferrals 
SET notes = '' 
WHERE notes IS NULL;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'leave_deferrals' 
AND column_name IN ('google_drive_link', 'notes')
ORDER BY column_name; 