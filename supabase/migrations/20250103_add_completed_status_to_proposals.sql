-- Migration: Add 'completed' status to leave_proposals
-- Description: Allow tracking when proposals are marked as "Selesai di Ajukan"

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

-- 4. Create index for completed status queries
CREATE INDEX IF NOT EXISTS idx_leave_proposals_completed_by ON leave_proposals(completed_by);
CREATE INDEX IF NOT EXISTS idx_leave_proposals_completed_at ON leave_proposals(completed_at);

-- 5. Update RLS policies to handle completed status (policies remain the same since access control doesn't change)

-- 6. Test the new constraint
DO $$
BEGIN
  -- Test that new status values are accepted
  INSERT INTO leave_proposals (
    proposal_title,
    proposed_by,
    proposer_name,
    proposer_unit,
    proposal_date,
    status
  ) VALUES (
    'Test Completed Status',
    (SELECT id FROM users WHERE role = 'master_admin' LIMIT 1),
    'Test User',
    'Test Unit',
    CURRENT_DATE,
    'completed'
  );
  
  -- Clean up test data
  DELETE FROM leave_proposals WHERE proposal_title = 'Test Completed Status';
  
  RAISE NOTICE 'Successfully added completed status to leave_proposals table';
END
$$;
