-- Add completion tracking columns to leave_proposals table
ALTER TABLE public.leave_proposals 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update the status enum to include 'completed'
ALTER TABLE public.leave_proposals 
DROP CONSTRAINT IF EXISTS leave_proposals_status_check;

ALTER TABLE public.leave_proposals
ADD CONSTRAINT leave_proposals_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'processed', 'completed'));

-- Create an index for better performance on completion status
CREATE INDEX IF NOT EXISTS idx_leave_proposals_completed 
ON public.leave_proposals(completed_at, completed_by) 
WHERE status = 'completed';

-- Add comment to document the new status
COMMENT ON COLUMN public.leave_proposals.completed_at IS 'Timestamp when the proposal was marked as completed';
COMMENT ON COLUMN public.leave_proposals.completed_by IS 'User ID who marked the proposal as completed';

-- Update RLS policies to allow setting completion status
-- (The existing policies should already cover this, but we'll verify)

-- This migration will be applied when the application starts up
