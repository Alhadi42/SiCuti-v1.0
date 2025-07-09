-- Update the existing update_leave_balance function to handle leave quota year logic
-- This script should be run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION update_leave_balance(
    p_employee_id UUID,
    p_leave_type_id UUID,
    p_year INTEGER,
    p_days INTEGER
)
RETURNS VOID AS $
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
$ LANGUAGE plpgsql;

-- Add function comment
COMMENT ON FUNCTION update_leave_balance(UUID, UUID, INTEGER, INTEGER) IS 
'Updates leave balance for specified employee, leave type, and quota year. Handles both current year and deferred leave usage.';

-- Create new function for smart splitting of leave balance
CREATE OR REPLACE FUNCTION update_leave_balance_with_splitting(
    p_employee_id UUID,
    p_leave_type_id UUID,
    p_requested_year INTEGER,
    p_days INTEGER
)
RETURNS VOID AS $
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    requested_balance RECORD;
    current_balance RECORD;
    default_days INTEGER := 0;
    remaining_days INTEGER;
    days_from_requested INTEGER;
    days_from_current INTEGER;
BEGIN
    -- Get default days for this leave type
    SELECT COALESCE(lt.default_days, 0) INTO default_days
    FROM leave_types lt 
    WHERE lt.id = p_leave_type_id;
    
    -- If p_days is negative (reverting), use the original function
    IF p_days < 0 THEN
        PERFORM update_leave_balance(p_employee_id, p_leave_type_id, p_requested_year, p_days);
        RETURN;
    END IF;
    
    -- Get or create balance record for requested year
    SELECT * INTO requested_balance
    FROM leave_balances 
    WHERE employee_id = p_employee_id 
      AND leave_type_id = p_leave_type_id 
      AND year = p_requested_year;
    
    IF NOT FOUND THEN
        INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days, deferred_days)
        VALUES (p_employee_id, p_leave_type_id, p_requested_year, default_days, 0, 0);
        
        SELECT * INTO requested_balance
        FROM leave_balances 
        WHERE employee_id = p_employee_id 
          AND leave_type_id = p_leave_type_id 
          AND year = p_requested_year;
    END IF;
    
    -- Get or create balance record for current year (if different from requested year)
    IF p_requested_year != current_year THEN
        SELECT * INTO current_balance
        FROM leave_balances 
        WHERE employee_id = p_employee_id 
          AND leave_type_id = p_leave_type_id 
          AND year = current_year;
        
        IF NOT FOUND THEN
            INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days, deferred_days)
            VALUES (p_employee_id, p_leave_type_id, current_year, default_days, 0, 0);
            
            SELECT * INTO current_balance
            FROM leave_balances 
            WHERE employee_id = p_employee_id 
              AND leave_type_id = p_leave_type_id 
              AND year = current_year;
        END IF;
    END IF;
    
    -- Calculate available balance for requested year
    -- For deferred year: use deferred_days - used_days
    -- For current year: use total_days - used_days
    remaining_days := p_days;
    
    IF p_requested_year < current_year THEN
        -- Using deferred leave from previous year
        DECLARE
            available_deferred INTEGER;
        BEGIN
            available_deferred := GREATEST(0, COALESCE(requested_balance.deferred_days, 0) - COALESCE(requested_balance.used_days, 0));
            
            -- Use as much as possible from deferred balance
            days_from_requested := LEAST(remaining_days, available_deferred);
            remaining_days := remaining_days - days_from_requested;
            
            -- Update requested year balance
            IF days_from_requested > 0 THEN
                UPDATE leave_balances 
                SET used_days = COALESCE(used_days, 0) + days_from_requested,
                    updated_at = CURRENT_TIMESTAMP
                WHERE employee_id = p_employee_id 
                  AND leave_type_id = p_leave_type_id 
                  AND year = p_requested_year;
            END IF;
            
            -- If there are remaining days, use current year balance
            IF remaining_days > 0 AND current_balance IS NOT NULL THEN
                DECLARE
                    available_current INTEGER;
                BEGIN
                    available_current := GREATEST(0, COALESCE(current_balance.total_days, 0) - COALESCE(current_balance.used_days, 0));
                    days_from_current := LEAST(remaining_days, available_current);
                    
                    IF days_from_current > 0 THEN
                        UPDATE leave_balances 
                        SET used_days = COALESCE(used_days, 0) + days_from_current,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE employee_id = p_employee_id 
                          AND leave_type_id = p_leave_type_id 
                          AND year = current_year;
                    END IF;
                    
                    remaining_days := remaining_days - days_from_current;
                END;
            END IF;
        END;
    ELSE
        -- Using current year balance
        DECLARE
            available_current INTEGER;
        BEGIN
            available_current := GREATEST(0, COALESCE(requested_balance.total_days, 0) - COALESCE(requested_balance.used_days, 0));
            days_from_requested := LEAST(remaining_days, available_current);
            
            -- Update current year balance
            IF days_from_requested > 0 THEN
                UPDATE leave_balances 
                SET used_days = COALESCE(used_days, 0) + days_from_requested,
                    updated_at = CURRENT_TIMESTAMP
                WHERE employee_id = p_employee_id 
                  AND leave_type_id = p_leave_type_id 
                  AND year = p_requested_year;
            END IF;
            
            remaining_days := remaining_days - days_from_requested;
        END;
    END IF;
    
    -- Log warning if there are still remaining days (insufficient balance)
    IF remaining_days > 0 THEN
        RAISE WARNING 'Insufficient leave balance. Remaining days not allocated: %', remaining_days;
    END IF;
    
END;
$ LANGUAGE plpgsql;

-- Add function comment
COMMENT ON FUNCTION update_leave_balance_with_splitting(UUID, UUID, INTEGER, INTEGER) IS 
'Updates leave balance with smart splitting. Automatically uses deferred balance first, then current year balance if needed.';
