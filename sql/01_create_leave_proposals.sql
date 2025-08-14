-- Create leave_proposals table
-- This table stores the main proposal records from admin units

CREATE TABLE IF NOT EXISTS public.leave_proposals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    proposal_title TEXT NOT NULL,
    proposed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    proposer_name TEXT NOT NULL,
    proposer_unit TEXT NOT NULL,
    proposal_date DATE DEFAULT CURRENT_DATE,
    total_employees INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_date TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    notes TEXT,
    letter_number TEXT,
    letter_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.leave_proposals ENABLE ROW LEVEL SECURITY;

-- Policy: Admin units can view/create proposals for their own unit
CREATE POLICY "Admin units can manage their proposals" ON public.leave_proposals
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin_unit' AND 
        proposer_unit = auth.jwt() ->> 'unit_kerja'
    );

-- Policy: Master admin can view/manage all proposals
CREATE POLICY "Master admin can manage all proposals" ON public.leave_proposals
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'master_admin'
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leave_proposals_proposer_unit ON public.leave_proposals(proposer_unit);
CREATE INDEX IF NOT EXISTS idx_leave_proposals_status ON public.leave_proposals(status);
CREATE INDEX IF NOT EXISTS idx_leave_proposals_created_at ON public.leave_proposals(created_at DESC);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leave_proposals_updated_at 
    BEFORE UPDATE ON public.leave_proposals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.leave_proposals TO authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
