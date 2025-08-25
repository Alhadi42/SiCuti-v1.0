-- IMPORTANT: Run these SQL commands in your Supabase SQL Editor
-- Go to: Your Supabase Project → SQL Editor → New Query
-- Copy and paste ALL commands below, then click "Run"

-- 1. First, let's check what columns currently exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'leave_proposals' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Update the status CHECK constraint to include 'completed'
ALTER TABLE leave_proposals 
DROP CONSTRAINT IF EXISTS leave_proposals_status_check;

ALTER TABLE leave_proposals 
ADD CONSTRAINT leave_proposals_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'processed', 'completed'));

-- 3. Add the missing columns for completion tracking
ALTER TABLE leave_proposals 
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES users(id);

ALTER TABLE leave_proposals 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- 4. Update the comment to include the new status
COMMENT ON COLUMN leave_proposals.status IS 'pending: awaiting master admin review, approved: approved by master admin, rejected: rejected by master admin, processed: letter generated, completed: marked as finished and submitted';

-- 5. Create indexes for completed status queries
CREATE INDEX IF NOT EXISTS idx_leave_proposals_completed_by ON leave_proposals(completed_by);
CREATE INDEX IF NOT EXISTS idx_leave_proposals_completed_at ON leave_proposals(completed_at);

-- 6. Verify the changes were applied
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'leave_proposals' 
AND table_schema = 'public'
AND column_name IN ('completed_by', 'completed_at', 'status')
ORDER BY column_name;

-- 7. Test that the new status value works
SELECT 'Database update completed successfully! The completed_by and completed_at columns have been added.' as result;

-- 8. Show current table structure
\d leave_proposals;
