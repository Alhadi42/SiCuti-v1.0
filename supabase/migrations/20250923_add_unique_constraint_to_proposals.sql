-- Add a unique constraint to the leave_proposals table
-- This ensures that there can only be one proposal per unit per day.
-- This is required for the 'upsert' operation to work correctly.

ALTER TABLE public.leave_proposals
ADD CONSTRAINT leave_proposals_proposer_unit_proposal_date_key
UNIQUE (proposer_unit, proposal_date);

COMMENT ON CONSTRAINT leave_proposals_proposer_unit_proposal_date_key ON public.leave_proposals IS 'Ensures each unit can only have one proposal per day.';
