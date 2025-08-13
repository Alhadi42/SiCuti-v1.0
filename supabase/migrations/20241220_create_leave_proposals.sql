-- Migration: Create leave proposals system
-- Description: Tables for unit-based leave proposal workflow

-- 1. Main leave proposals table
CREATE TABLE IF NOT EXISTS leave_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_title VARCHAR(255) NOT NULL,
  proposed_by UUID NOT NULL REFERENCES users(id),
  proposer_name VARCHAR(255) NOT NULL,
  proposer_unit VARCHAR(255) NOT NULL,
  proposal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_employees INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  approved_by UUID REFERENCES users(id),
  approved_date TIMESTAMP,
  rejection_reason TEXT,
  notes TEXT,
  letter_number VARCHAR(100),
  letter_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Individual leave items within proposals
CREATE TABLE IF NOT EXISTS leave_proposal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES leave_proposals(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  employee_name VARCHAR(255) NOT NULL,
  employee_nip VARCHAR(50) NOT NULL,
  employee_department VARCHAR(255) NOT NULL,
  employee_position VARCHAR(255),
  leave_type_id UUID NOT NULL REFERENCES leave_types(id),
  leave_type_name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested INTEGER NOT NULL,
  leave_quota_year INTEGER NOT NULL,
  reason TEXT,
  address_during_leave TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leave_proposals_proposed_by ON leave_proposals(proposed_by);
CREATE INDEX IF NOT EXISTS idx_leave_proposals_status ON leave_proposals(status);
CREATE INDEX IF NOT EXISTS idx_leave_proposals_proposer_unit ON leave_proposals(proposer_unit);
CREATE INDEX IF NOT EXISTS idx_leave_proposals_proposal_date ON leave_proposals(proposal_date);

CREATE INDEX IF NOT EXISTS idx_leave_proposal_items_proposal_id ON leave_proposal_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_leave_proposal_items_employee_id ON leave_proposal_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_proposal_items_leave_type ON leave_proposal_items(leave_type_id);

-- 4. RLS (Row Level Security) policies
ALTER TABLE leave_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_proposal_items ENABLE ROW LEVEL SECURITY;

-- Policy: Admin unit can only see their own unit proposals
CREATE POLICY "admin_unit_proposals_policy" ON leave_proposals
  FOR ALL USING (
    auth.role() = 'authenticated' AND (
      -- Master admin can see all
      (SELECT role FROM users WHERE id = auth.uid()) = 'master_admin' OR
      -- Admin unit can only see their unit
      ((SELECT role FROM users WHERE id = auth.uid()) = 'admin_unit' AND 
       proposer_unit = (SELECT unit_kerja FROM users WHERE id = auth.uid()))
    )
  );

-- Policy: Items follow the same rules as proposals  
CREATE POLICY "admin_unit_proposal_items_policy" ON leave_proposal_items
  FOR ALL USING (
    auth.role() = 'authenticated' AND (
      -- Master admin can see all
      (SELECT role FROM users WHERE id = auth.uid()) = 'master_admin' OR
      -- Admin unit can only see items from their unit proposals
      ((SELECT role FROM users WHERE id = auth.uid()) = 'admin_unit' AND 
       proposal_id IN (
         SELECT id FROM leave_proposals 
         WHERE proposer_unit = (SELECT unit_kerja FROM users WHERE id = auth.uid())
       ))
    )
  );

-- 5. Update trigger for proposals
CREATE OR REPLACE FUNCTION update_leave_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leave_proposals_updated_at
  BEFORE UPDATE ON leave_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_leave_proposals_updated_at();

-- 6. Function to update total employees count
CREATE OR REPLACE FUNCTION update_proposal_employee_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
    UPDATE leave_proposals 
    SET total_employees = (
      SELECT COUNT(*) 
      FROM leave_proposal_items 
      WHERE proposal_id = COALESCE(NEW.proposal_id, OLD.proposal_id)
    )
    WHERE id = COALESCE(NEW.proposal_id, OLD.proposal_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_proposal_employee_count
  AFTER INSERT OR DELETE ON leave_proposal_items
  FOR EACH ROW
  EXECUTE FUNCTION update_proposal_employee_count();

-- 7. Add comments for documentation
COMMENT ON TABLE leave_proposals IS 'Main table for leave proposals submitted by admin units';
COMMENT ON TABLE leave_proposal_items IS 'Individual employee leave items within each proposal';

COMMENT ON COLUMN leave_proposals.status IS 'pending: awaiting master admin review, approved: approved by master admin, rejected: rejected by master admin, processed: letter generated';
COMMENT ON COLUMN leave_proposal_items.status IS 'proposed: in proposal, approved: approved in final letter, rejected: excluded from final letter';
