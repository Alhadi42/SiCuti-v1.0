-- ==================================================
-- MIGRATION SCRIPT: Leave Quota Year Feature
-- Jalankan script ini di Supabase SQL Editor
-- ==================================================

-- Step 1: Add new columns to leave_requests table
ALTER TABLE leave_requests 
ADD COLUMN IF NOT EXISTS leave_quota_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);

ALTER TABLE leave_requests 
ADD COLUMN IF NOT EXISTS application_form_date DATE DEFAULT CURRENT_DATE;

-- Step 2: Add comments for documentation
COMMENT ON COLUMN leave_requests.leave_quota_year IS 'Tahun jatah cuti yang digunakan - jika berbeda dari tahun berjalan maka menggunakan saldo penangguhan';
COMMENT ON COLUMN leave_requests.application_form_date IS 'Tanggal formulir pengajuan cuti diisi/disubmit';

-- Step 3: Update existing records with default values
UPDATE leave_requests 
SET leave_quota_year = EXTRACT(YEAR FROM start_date)
WHERE leave_quota_year IS NULL;

UPDATE leave_requests 
SET application_form_date = COALESCE(submitted_date::date, start_date, CURRENT_DATE)
WHERE application_form_date IS NULL;

-- Step 4: Update the leave balance function
CREATE OR REPLACE FUNCTION update_leave_balance(
    p_employee_id UUID,
    p_leave_type_id UUID,
    p_year INTEGER,
    p_days INTEGER
)
RETURNS VOID AS $$
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    balance_record RECORD;
BEGIN
    -- Get or create the leave balance record for the specified year
    SELECT * INTO balance_record
    FROM leave_balances 
    WHERE employee_id = p_employee_id 
      AND leave_type_id = p_leave_type_id 
      AND year = p_year;
    
    -- If no balance record exists, create one with default values
    IF NOT FOUND THEN
        -- Get default days for this leave type
        DECLARE
            default_days INTEGER := 0;
        BEGIN
            SELECT COALESCE(lt.default_days, 0) INTO default_days
            FROM leave_types lt 
            WHERE lt.id = p_leave_type_id;
            
            INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days, deferred_days)
            VALUES (p_employee_id, p_leave_type_id, p_year, default_days, p_days, 0);
        END;
    ELSE
        -- Update existing balance record
        UPDATE leave_balances 
        SET used_days = COALESCE(used_days, 0) + p_days,
            updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = p_employee_id 
          AND leave_type_id = p_leave_type_id 
          AND year = p_year;
    END IF;
    
    -- Special handling for deferred leave usage
    -- If using quota from previous year and it's deferred leave (cuti penangguhan)
    IF p_year < current_year THEN
        -- This is using deferred leave from previous year
        -- Make sure we also update/create current year balance if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM leave_balances 
            WHERE employee_id = p_employee_id 
              AND leave_type_id = p_leave_type_id 
              AND year = current_year
        ) THEN
            -- Create current year balance record
            DECLARE
                default_days INTEGER := 0;
            BEGIN
                SELECT COALESCE(lt.default_days, 0) INTO default_days
                FROM leave_types lt 
                WHERE lt.id = p_leave_type_id;
                
                INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days, deferred_days)
                VALUES (p_employee_id, p_leave_type_id, current_year, default_days, 0, 0);
            END;
        END IF;
    END IF;
    
END;
$$ LANGUAGE plpgsql;

-- Step 5: Verify migration success
SELECT 'Migration completed successfully!' as status;

-- Step 6: Show new column structure
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'leave_requests'
  AND column_name IN ('leave_quota_year', 'application_form_date')
ORDER BY column_name;
