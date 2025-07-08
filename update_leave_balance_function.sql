-- Update the existing update_leave_balance function to handle leave quota year logic
-- This script should be run in Supabase SQL Editor

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

-- Add function comment
COMMENT ON FUNCTION update_leave_balance(UUID, UUID, INTEGER, INTEGER) IS 
'Updates leave balance for specified employee, leave type, and quota year. Handles both current year and deferred leave usage.';
