-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.leave_proposal_items CASCADE;
DROP TABLE IF EXISTS public.leave_proposals CASCADE;

-- Create leave_proposals table
CREATE TABLE public.leave_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_title TEXT NOT NULL,
    proposed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    proposer_name TEXT NOT NULL,
    proposer_unit TEXT NOT NULL,
    proposal_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_employees INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed', 'completed')),
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_date TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    letter_number TEXT,
    letter_date DATE,
    completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    processed_at TIMESTAMPTZ,
    read_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create leave_proposal_items table
CREATE TABLE public.leave_proposal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES public.leave_proposals(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    employee_name TEXT NOT NULL,
    employee_nip TEXT NOT NULL,
    employee_department TEXT NOT NULL,
    employee_position TEXT,
    leave_type_id UUID REFERENCES public.leave_types(id) ON DELETE SET NULL,
    leave_type_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INTEGER NOT NULL DEFAULT 0 CHECK (days_requested > 0),
    leave_quota_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    reason TEXT,
    address_during_leave TEXT,
    status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

-- Create indexes
CREATE INDEX idx_leave_proposals_proposer_unit ON public.leave_proposals(proposer_unit);
CREATE INDEX idx_leave_proposals_status ON public.leave_proposals(status);
CREATE INDEX idx_leave_proposals_created_at ON public.leave_proposals(created_at DESC);
CREATE INDEX idx_leave_proposals_completed ON public.leave_proposals(completed_at, completed_by) WHERE status = 'completed';

CREATE INDEX idx_leave_proposal_items_proposal_id ON public.leave_proposal_items(proposal_id);
CREATE INDEX idx_leave_proposal_items_employee_id ON public.leave_proposal_items(employee_id);
CREATE INDEX idx_leave_proposal_items_status ON public.leave_proposal_items(status);

-- Enable RLS
ALTER TABLE public.leave_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_proposal_items ENABLE ROW LEVEL SECURITY;

-- Create policies for leave_proposals
CREATE POLICY "Admin units can manage their proposals" ON public.leave_proposals
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        auth.jwt() ->> 'role' = 'admin_unit' AND 
        proposer_unit = (auth.jwt() ->> 'unit_kerja')::text
    );

CREATE POLICY "Master admin can manage all proposals" ON public.leave_proposals
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        auth.jwt() ->> 'role' = 'master_admin'
    );

-- Create policies for leave_proposal_items
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

-- Create update trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_leave_proposals_updated_at
BEFORE UPDATE ON public.leave_proposals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_proposal_items_updated_at
BEFORE UPDATE ON public.leave_proposal_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to mark proposal as completed
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
        RAISE EXCEPTION 'Proposal % not found', p_proposal_id;
    END IF;
    
    RAISE NOTICE 'Successfully marked proposal % as completed', p_proposal_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in mark_proposal_completed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON TABLE public.leave_proposals TO authenticated;
GRANT ALL ON TABLE public.leave_proposal_items TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_proposal_completed(UUID, UUID) TO authenticated;

-- Add comments
COMMENT ON TABLE public.leave_proposals IS 'Tabel untuk menyimpan usulan cuti dari unit kerja';
COMMENT ON COLUMN public.leave_proposals.completed_at IS 'Timestamp ketika usulan ditandai sebagai selesai';
COMMENT ON COLUMN public.leave_proposals.completed_by IS 'ID user yang menandai usulan sebagai selesai';

COMMENT ON TABLE public.leave_proposal_items IS 'Tabel untuk menyimpan detail item usulan cuti';
COMMENT ON COLUMN public.leave_proposal_items.status IS 'Status persetujuan item usulan (proposed/approved/rejected)';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Successfully recreated leave_proposals and leave_proposal_items tables with proper structure and policies';
END $$;
