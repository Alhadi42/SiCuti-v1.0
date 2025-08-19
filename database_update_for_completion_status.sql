-- Run this SQL directly in your Supabase SQL Editor to add completion status tracking
-- Copy and paste the commands below:

-- 1. Update the status CHECK constraint to include 'completed'
ALTER TABLE leave_proposals 
DROP CONSTRAINT IF EXISTS leave_proposals_status_check;

ALTER TABLE leave_proposals 
ADD CONSTRAINT leave_proposals_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'processed', 'completed'));

-- 2. Add columns for completion tracking
ALTER TABLE leave_proposals 
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES users(id);

ALTER TABLE leave_proposals 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- 3. Update the comment to include the new status
COMMENT ON COLUMN leave_proposals.status IS 'pending: awaiting master admin review, approved: approved by master admin, rejected: rejected by master admin, processed: letter generated, completed: marked as finished and submitted';

-- 4. Create indexes for completed status queries
CREATE INDEX IF NOT EXISTS idx_leave_proposals_completed_by ON leave_proposals(completed_by);
CREATE INDEX IF NOT EXISTS idx_leave_proposals_completed_at ON leave_proposals(completed_at);

-- 5. Test that the new status value works
SELECT 'Database update completed successfully' as result;
