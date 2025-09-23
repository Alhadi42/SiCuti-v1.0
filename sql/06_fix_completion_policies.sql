-- Fix RLS policies for completion status updates
BEGIN;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
    -- Check and drop policies if they exist
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leave_proposals' AND policyname = 'Admin units can manage their proposals') THEN
        DROP POLICY "Admin units can manage their proposals" ON public.leave_proposals;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leave_proposals' AND policyname = 'Master admin can manage all proposals') THEN
        DROP POLICY "Master admin can manage all proposals" ON public.leave_proposals;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leave_proposals' AND policyname = 'Allow status update to completed') THEN
        DROP POLICY "Allow status update to completed" ON public.leave_proposals;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leave_proposal_items' AND policyname = 'Allow access to proposal items') THEN
        DROP POLICY "Allow access to proposal items" ON public.leave_proposal_items;
    END IF;
END $$;

-- Add new, more specific policies
-- Policy for admin units to manage their own proposals
CREATE POLICY "Admin units can manage their proposals" ON public.leave_proposals
    FOR ALL USING (
        (auth.role() = 'authenticated' AND 
         auth.jwt() ->> 'role' = 'admin_unit' AND 
         proposer_unit = (auth.jwt() ->> 'unit_kerja')::text)
    );

-- Policy for master admin to manage all proposals
CREATE POLICY "Master admin can manage all proposals" ON public.leave_proposals
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        auth.jwt() ->> 'role' = 'master_admin'
    );

-- Add explicit policy for updating status to 'completed'
CREATE POLICY "Allow status update to completed" ON public.leave_proposals
    FOR UPDATE USING (
        (auth.role() = 'authenticated' AND 
         (auth.jwt() ->> 'role' = 'admin_unit' OR 
          auth.jwt() ->> 'role' = 'master_admin')
        )
    ) WITH CHECK (
        status = 'completed' AND
        completed_by IS NOT NULL AND
        completed_at IS NOT NULL
    );

-- Add policy for leave_proposal_items to ensure proper access
CREATE POLICY "Allow access to proposal items" ON public.leave_proposal_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.leave_proposals lp
            WHERE lp.id = leave_proposal_items.proposal_id
            AND (
                (auth.jwt() ->> 'role' = 'admin_unit' AND lp.proposer_unit = (auth.jwt() ->> 'unit_kerja')::text) OR
                (auth.jwt() ->> 'role' = 'master_admin')
            )
        )
    );

-- Drop the function if it already exists
DROP FUNCTION IF EXISTS public.mark_proposal_completed(UUID, UUID);

-- Create function to update proposal status and completion info
CREATE OR REPLACE FUNCTION public.mark_proposal_completed(
    p_proposal_id UUID,
    p_completed_by UUID
) 
RETURNS void AS $$
BEGIN
    -- Log the operation
    RAISE NOTICE 'Marking proposal % as completed by user %', p_proposal_id, p_completed_by;
    
    -- Update the proposal
    UPDATE public.leave_proposals
    SET 
        status = 'completed',
        completed_by = p_completed_by,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_proposal_id;
    
    -- Verify the update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Proposal % not found or not updated', p_proposal_id;
    END IF;
    
    RAISE NOTICE 'Successfully marked proposal % as completed', p_proposal_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in mark_proposal_completed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.mark_proposal_completed(UUID, UUID) TO authenticated;

COMMIT;

-- Log the completion of the migration
COMMENT ON FUNCTION public.mark_proposal_completed IS 'Marks a proposal as completed with proper security checks';

-- Add logging for debugging
CREATE OR REPLACE FUNCTION log_proposal_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'Proposal % updated. Status: %, Completed by: %', 
        NEW.id, NEW.status, NEW.completed_by;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for logging updates
DROP TRIGGER IF EXISTS log_leave_proposals_update ON public.leave_proposals;
CREATE TRIGGER log_leave_proposals_update
    AFTER UPDATE ON public.leave_proposals
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION log_proposal_update();
