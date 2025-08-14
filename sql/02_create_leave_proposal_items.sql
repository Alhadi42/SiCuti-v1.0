-- Create leave_proposal_items table
-- This table stores individual employee leave details within each proposal

CREATE TABLE IF NOT EXISTS public.leave_proposal_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
    days_requested INTEGER NOT NULL DEFAULT 0,
    leave_quota_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    reason TEXT,
    address_during_leave TEXT,
    status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.leave_proposal_items ENABLE ROW LEVEL SECURITY;

-- Policy: Admin units can view/manage items for their own proposals
CREATE POLICY "Admin units can manage their proposal items" ON public.leave_proposal_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.leave_proposals 
            WHERE id = proposal_id 
            AND (
                (auth.jwt() ->> 'role' = 'admin_unit' AND proposer_unit = auth.jwt() ->> 'unit_kerja')
                OR auth.jwt() ->> 'role' = 'master_admin'
            )
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leave_proposal_items_proposal_id ON public.leave_proposal_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_leave_proposal_items_employee_id ON public.leave_proposal_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_proposal_items_start_date ON public.leave_proposal_items(start_date);
CREATE INDEX IF NOT EXISTS idx_leave_proposal_items_status ON public.leave_proposal_items(status);

-- Add constraints
ALTER TABLE public.leave_proposal_items 
ADD CONSTRAINT check_dates CHECK (end_date >= start_date);

ALTER TABLE public.leave_proposal_items 
ADD CONSTRAINT check_days_positive CHECK (days_requested > 0);

-- Grant permissions
GRANT ALL ON public.leave_proposal_items TO authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
