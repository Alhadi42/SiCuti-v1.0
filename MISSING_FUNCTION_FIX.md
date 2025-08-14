# Fix Missing Database Function

## ❌ Error Encountered:
```
Could not find the function public.update_leave_balance_with_splitting(p_days, p_employee_id, p_leave_type_id, p_requested_year) in the schema cache
```

## ✅ Quick Fix:

### Step 1: Run SQL Script
1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy and paste the content of `sql/03_create_leave_balance_functions.sql`
4. Click **Run** to execute the script

### Step 2: Verify Function Creation
After running the script, verify the functions exist:

```sql
-- Check if functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%leave_balance%';
```

## 🎯 What This Fixes:

- **Leave Request Form** - Ability to create and update leave requests
- **Leave Balance Updates** - Automatic balance calculation
- **Smart Splitting** - Uses deferred leave first, then current year balance
- **Balance Tracking** - Proper tracking across multiple years

## 📋 Functions Created:

1. **`update_leave_balance`** - Basic balance update function
2. **`update_leave_balance_with_splitting`** - Advanced function with smart balance allocation

## 🔧 Technical Details:

The missing function handles:
- **Parameter matching**: `(p_employee_id, p_leave_type_id, p_requested_year, p_days)`
- **Smart balance allocation**: Uses deferred balance first, then current year
- **Automatic record creation**: Creates balance records if they don't exist
- **Cross-year handling**: Manages leave spanning multiple years

## ⚡ Expected Result:

After running the SQL script:
- Leave request forms will work without errors
- Balance updates will process correctly
- No more "function not found" errors
- Proper leave balance tracking across years

## 🚨 Important Note:

Make sure to run this script in the **same Supabase project** where you're experiencing the error. The functions need to be created in the public schema of your database.
