# 🚨 URGENT: Database Setup Required

## Issue
The "Selesai di Ajukan" (completion) feature is failing because the database is missing required columns:
- `completed_at` 
- `completed_by`

## Quick Fix
**You need to run SQL commands in your Supabase database RIGHT NOW:**

### Step 1: Go to Supabase
1. Open your Supabase project dashboard
2. Click **SQL Editor** in the left menu
3. Click **"New Query"**

### Step 2: Copy & Run This SQL
```sql
-- Add missing columns for completion tracking
ALTER TABLE leave_proposals 
DROP CONSTRAINT IF EXISTS leave_proposals_status_check;

ALTER TABLE leave_proposals 
ADD CONSTRAINT leave_proposals_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'processed', 'completed'));

ALTER TABLE leave_proposals 
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES users(id);

ALTER TABLE leave_proposals 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_leave_proposals_completed_by ON leave_proposals(completed_by);
CREATE INDEX IF NOT EXISTS idx_leave_proposals_completed_at ON leave_proposals(completed_at);

SELECT 'Database update completed successfully!' as result;
```

### Step 3: Verify
After running the SQL:
1. Refresh the Batch Leave Proposals page
2. The yellow warning should disappear
3. The "Selesai di Ajukan" feature will work properly

## What This Fixes
- ✅ Stops the "column does not exist" errors
- ✅ Enables persistent completion status in database
- ✅ Allows proper tracking of who marked proposals as complete
- ✅ Enables audit trail with completion timestamps

## If You Don't Run This
- ❌ "Selesai di Ajukan" will continue to show errors
- ❌ Completion status will only be saved locally (lost on refresh)
- ❌ No audit trail of who completed what
- ❌ Multiple error messages in console

**Please run this SQL now to fix the errors!** 🙏
