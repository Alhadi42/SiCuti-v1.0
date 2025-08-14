# Database Setup Instructions for Leave Proposals Feature

## Overview
To enable the Leave Proposals batch feature, you need to create two main tables in your Supabase database.

## Required Tables

### 1. `leave_proposals`
Main table for storing proposal records from admin units.

### 2. `leave_proposal_items` 
Detail table for storing individual employee leave requests within each proposal.

## Setup Methods

### Method 1: Using Supabase Dashboard (Recommended)

1. **Login to Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Navigate to your project

2. **Execute SQL Scripts**
   - Go to SQL Editor in the sidebar
   - Copy and execute the content of `sql/01_create_leave_proposals.sql`
   - Then copy and execute the content of `sql/02_create_leave_proposal_items.sql`

### Method 2: Using Supabase CLI

```bash
# Make sure you're logged in and connected to your project
supabase db reset
# Or apply individual migrations
supabase db push
```

### Method 3: Manual SQL Execution

If you have direct database access, you can run the SQL files directly:

```bash
psql -h your-db-host -U postgres -d postgres -f sql/01_create_leave_proposals.sql
psql -h your-db-host -U postgres -d postgres -f sql/02_create_leave_proposal_items.sql
```

## Security Features Included

- **Row Level Security (RLS)** enabled on both tables
- **Admin Unit Access**: Admin units can only see/manage their own proposals
- **Master Admin Access**: Master admins can see/manage all proposals
- **Foreign Key Constraints** for data integrity
- **Check Constraints** for data validation

## Verification

After running the scripts, verify the tables exist:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('leave_proposals', 'leave_proposal_items');

-- Check table structure
\d+ leave_proposals
\d+ leave_proposal_items
```

## Expected Result

Once tables are created successfully:
- The warning message in the Leave Proposals pages will disappear
- Admin units can create batch leave proposals
- Master admin can view and manage all proposals by unit
- Batch letter generation will work properly

## Troubleshooting

### Common Issues:

1. **Permission Errors**
   - Make sure you have admin access to the database
   - Check that your user has CREATE TABLE permissions

2. **Foreign Key Errors**
   - Ensure `employees` and `leave_types` tables exist first
   - Modify the foreign key references if your table names differ

3. **RLS Policy Errors**
   - Verify that your authentication system provides the expected JWT claims
   - Adjust policies if your user role field names differ

### Contact Information

If you encounter issues:
- Check Supabase logs in the dashboard
- Verify your database connection
- Ensure all prerequisite tables (`employees`, `leave_types`, etc.) exist

## Next Steps

After successful setup:
1. Test creating a proposal as an admin unit user
2. Test approving proposals as a master admin
3. Test batch letter generation
4. Verify data appears correctly in the dashboard
