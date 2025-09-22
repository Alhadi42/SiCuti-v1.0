-- Migration: Enhance leave_proposals for better completion tracking
-- Description: Add indexes and ensure proper completion status tracking

-- 1. Ensure the completed status is properly supported
ALTER TABLE leave_proposals 
DROP CONSTRAINT IF EXISTS leave_proposals_status_check;

ALTER TABLE leave_proposals 
ADD CONSTRAINT leave_proposals_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'processed', 'completed'));

-- 2. Ensure completion tracking columns exist
ALTER TABLE leave_proposals 
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES users(id);

ALTER TABLE leave_proposals 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- 3. Add composite index for efficient querying of completed proposals by unit and date
CREATE INDEX IF NOT EXISTS idx_leave_proposals_unit_date_status 
ON leave_proposals(proposer_unit, proposal_date, status);

-- 4. Add index for completion queries
CREATE INDEX IF NOT EXISTS idx_leave_proposals_completed_status 
ON leave_proposals(status) WHERE status = 'completed';

-- 5. Add index for completion tracking
CREATE INDEX IF NOT EXISTS idx_leave_proposals_completed_by ON leave_proposals(completed_by);
CREATE INDEX IF NOT EXISTS idx_leave_proposals_completed_at ON leave_proposals(completed_at);

-- 6. Update the comment to reflect enhanced completion tracking
COMMENT ON COLUMN leave_proposals.status IS 'pending: awaiting master admin review, approved: approved by master admin, rejected: rejected by master admin, processed: letter generated, completed: marked as finished and submitted by master admin';

-- 7. Add function to automatically update proposal_date if not set
CREATE OR REPLACE FUNCTION ensure_proposal_date()
RETURNS TRIGGER AS $$
BEGIN
  -- If proposal_date is not set, use the creation date
  IF NEW.proposal_date IS NULL THEN
    NEW.proposal_date = CURRENT_DATE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to ensure proposal_date is always set
DROP TRIGGER IF EXISTS trigger_ensure_proposal_date ON leave_proposals;
CREATE TRIGGER trigger_ensure_proposal_date
  BEFORE INSERT ON leave_proposals
  FOR EACH ROW
  EXECUTE FUNCTION ensure_proposal_date();

-- 9. Enable realtime for leave_proposals if not already enabled
ALTER PUBLICATION supabase_realtime ADD TABLE leave_proposals;