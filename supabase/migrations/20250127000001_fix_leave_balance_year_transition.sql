-- Fix leave balance year transition logic
-- This migration improves the leave balance functions to properly handle year transitions
-- and deferred leave calculations

DROP FUNCTION IF EXISTS public.initialize_leave_balance_for_new_year(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.get_employee_leave_balance_summary(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.carry_over_deferred_leave(UUID, INTEGER);

-- Function to initialize leave balance for a new year
-- This should be called when a new year starts to create balance records
CREATE OR REPLACE FUNCTION public.initialize_leave_balance_for_new_year(
    p_employee_id UUID,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS VOID AS $$
DECLARE
    leave_type_record RECORD;
    existing_balance RECORD;
    previous_year INTEGER := p_year - 1;
    previous_remaining INTEGER;
    deferred_from_previous INTEGER;
BEGIN
    FOR leave_type_record IN SELECT * FROM leave_types LOOP
        SELECT * INTO existing_balance
        FROM leave_balances
        WHERE employee_id = p_employee_id
          AND leave_type_id = leave_type_record.id
          AND year = p_year;
          
        IF NOT FOUND THEN
            deferred_from_previous := 0;
            
            IF leave_type_record.can_defer THEN
                SELECT GREATEST(0, COALESCE(total_days, 0) + COALESCE(deferred_days, 0) - COALESCE(used_days, 0))
                INTO previous_remaining
                FROM leave_balances
                WHERE employee_id = p_employee_id
                  AND leave_type_id = leave_type_record.id
                  AND year = previous_year;
                  
                IF FOUND AND previous_remaining > 0 THEN
                    deferred_from_previous := previous_remaining;
                END IF;
            END IF;
            
            INSERT INTO leave_balances (
                employee_id, 
                leave_type_id, 
                year, 
                total_days, 
                used_days, 
                deferred_days
            )
            VALUES (
                p_employee_id,
                leave_type_record.id,
                p_year,
                COALESCE(leave_type_record.default_days, 0),
                0,
                deferred_from_previous
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get complete leave balance summary for an employee
CREATE OR REPLACE FUNCTION public.get_employee_leave_balance_summary(
    p_employee_id UUID,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE (
    leave_type_id UUID,
    leave_type_name TEXT,
    total_days INTEGER,
    deferred_days INTEGER,
    used_days INTEGER,
    used_from_current INTEGER,
    used_from_deferred INTEGER,
    remaining_current INTEGER,
    remaining_deferred INTEGER,
    total_remaining INTEGER,
    can_defer BOOLEAN
) AS $$
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
BEGIN
    RETURN QUERY
    SELECT 
        lt.id as leave_type_id,
        lt.name as leave_type_name,
        COALESCE(lb.total_days, lt.default_days, 0) as total_days,
        COALESCE(lb.deferred_days, 0) as deferred_days,
        COALESCE(lb.used_days, 0) as used_days,
        COALESCE((
            SELECT SUM(lr.days_requested)
            FROM leave_requests lr
            WHERE lr.employee_id = p_employee_id
              AND lr.leave_type_id = lt.id
              AND COALESCE(lr.leave_quota_year, EXTRACT(YEAR FROM lr.start_date)::INTEGER) = p_year
        ), 0)::INTEGER as used_from_current,
        COALESCE((
            SELECT SUM(lr.days_requested)
            FROM leave_requests lr
            WHERE lr.employee_id = p_employee_id
              AND lr.leave_type_id = lt.id
              AND COALESCE(lr.leave_quota_year, EXTRACT(YEAR FROM lr.start_date)::INTEGER) < p_year
              AND EXTRACT(YEAR FROM lr.start_date)::INTEGER = p_year
        ), 0)::INTEGER as used_from_deferred,
        GREATEST(0, COALESCE(lb.total_days, lt.default_days, 0) - 
            COALESCE((
                SELECT SUM(lr.days_requested)
                FROM leave_requests lr
                WHERE lr.employee_id = p_employee_id
                  AND lr.leave_type_id = lt.id
                  AND COALESCE(lr.leave_quota_year, EXTRACT(YEAR FROM lr.start_date)::INTEGER) = p_year
            ), 0)::INTEGER
        ) as remaining_current,
        GREATEST(0, COALESCE(lb.deferred_days, 0) - 
            COALESCE((
                SELECT SUM(lr.days_requested)
                FROM leave_requests lr
                WHERE lr.employee_id = p_employee_id
                  AND lr.leave_type_id = lt.id
                  AND COALESCE(lr.leave_quota_year, EXTRACT(YEAR FROM lr.start_date)::INTEGER) < p_year
                  AND EXTRACT(YEAR FROM lr.start_date)::INTEGER = p_year
            ), 0)::INTEGER
        ) as remaining_deferred,
        GREATEST(0, 
            COALESCE(lb.total_days, lt.default_days, 0) + 
            COALESCE(lb.deferred_days, 0) - 
            COALESCE(lb.used_days, 0)
        ) as total_remaining,
        COALESCE(lt.can_defer, false) as can_defer
    FROM leave_types lt
    LEFT JOIN leave_balances lb ON lb.leave_type_id = lt.id 
        AND lb.employee_id = p_employee_id 
        AND lb.year = p_year;
END;
$$ LANGUAGE plpgsql;

-- Function to manually carry over deferred leave for an employee
CREATE OR REPLACE FUNCTION public.carry_over_deferred_leave(
    p_employee_id UUID,
    p_from_year INTEGER
)
RETURNS TABLE (
    leave_type_name TEXT,
    days_carried_over INTEGER,
    target_year INTEGER
) AS $$
DECLARE
    leave_type_record RECORD;
    remaining_days INTEGER;
    target_year INTEGER := p_from_year + 1;
    existing_balance RECORD;
BEGIN
    FOR leave_type_record IN 
        SELECT lt.*, lb.total_days, lb.used_days, lb.deferred_days
        FROM leave_types lt
        LEFT JOIN leave_balances lb ON lb.leave_type_id = lt.id 
            AND lb.employee_id = p_employee_id 
            AND lb.year = p_from_year
        WHERE lt.can_defer = true
    LOOP
        remaining_days := GREATEST(0, 
            COALESCE(leave_type_record.total_days, leave_type_record.default_days, 0) + 
            COALESCE(leave_type_record.deferred_days, 0) - 
            COALESCE(leave_type_record.used_days, 0)
        );
        
        IF remaining_days > 0 THEN
            SELECT * INTO existing_balance
            FROM leave_balances
            WHERE employee_id = p_employee_id
              AND leave_type_id = leave_type_record.id
              AND year = target_year;
              
            IF FOUND THEN
                UPDATE leave_balances
                SET deferred_days = remaining_days,
                    updated_at = CURRENT_TIMESTAMP
                WHERE employee_id = p_employee_id
                  AND leave_type_id = leave_type_record.id
                  AND year = target_year;
            ELSE
                INSERT INTO leave_balances (
                    employee_id,
                    leave_type_id,
                    year,
                    total_days,
                    used_days,
                    deferred_days
                )
                VALUES (
                    p_employee_id,
                    leave_type_record.id,
                    target_year,
                    COALESCE(leave_type_record.default_days, 0),
                    0,
                    remaining_days
                );
            END IF;
            
            leave_type_name := leave_type_record.name;
            days_carried_over := remaining_days;
            target_year := target_year;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update the main update_leave_balance_with_splitting function
DROP FUNCTION IF EXISTS public.update_leave_balance_with_splitting(UUID, UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.update_leave_balance_with_splitting(
    p_employee_id UUID,
    p_leave_type_id UUID,
    p_requested_year INTEGER,
    p_days INTEGER
)
RETURNS VOID AS $$
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
    requested_balance RECORD;
    current_balance RECORD;
    default_days INTEGER := 0;
    remaining_days INTEGER;
    days_from_requested INTEGER;
    days_from_current INTEGER;
    available_deferred INTEGER;
    available_current INTEGER;
BEGIN
    SELECT COALESCE(lt.default_days, 0) INTO default_days
    FROM leave_types lt 
    WHERE lt.id = p_leave_type_id;
    
    IF p_days < 0 THEN
        PERFORM update_leave_balance(p_employee_id, p_leave_type_id, p_requested_year, p_days);
        RETURN;
    END IF;
    
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
    
    remaining_days := p_days;
    
    IF p_requested_year < current_year THEN
        available_deferred := GREATEST(0, COALESCE(current_balance.deferred_days, 0) - COALESCE(current_balance.used_days, 0));
        
        days_from_requested := LEAST(remaining_days, available_deferred);
        remaining_days := remaining_days - days_from_requested;
        
        IF days_from_requested > 0 THEN
            UPDATE leave_balances 
            SET used_days = COALESCE(used_days, 0) + days_from_requested,
                updated_at = CURRENT_TIMESTAMP
            WHERE employee_id = p_employee_id 
              AND leave_type_id = p_leave_type_id 
              AND year = current_year;
        END IF;
        
        IF remaining_days > 0 AND current_balance IS NOT NULL THEN
            available_current := GREATEST(0, COALESCE(current_balance.total_days, 0) - COALESCE(current_balance.used_days, 0) - days_from_requested);
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
        END IF;
    ELSE
        available_current := GREATEST(0, COALESCE(requested_balance.total_days, 0) - COALESCE(requested_balance.used_days, 0));
        days_from_requested := LEAST(remaining_days, available_current);
        
        IF days_from_requested > 0 THEN
            UPDATE leave_balances 
            SET used_days = COALESCE(used_days, 0) + days_from_requested,
                updated_at = CURRENT_TIMESTAMP
            WHERE employee_id = p_employee_id 
              AND leave_type_id = p_leave_type_id 
              AND year = p_requested_year;
        END IF;
        
        remaining_days := remaining_days - days_from_requested;
    END IF;
    
    IF remaining_days > 0 THEN
        RAISE WARNING 'Insufficient leave balance. Remaining days not allocated: %', remaining_days;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.initialize_leave_balance_for_new_year(UUID, INTEGER) IS 
'Initializes leave balance records for an employee for a new year, including carrying over deferred leave.';

COMMENT ON FUNCTION public.get_employee_leave_balance_summary(UUID, INTEGER) IS 
'Returns a comprehensive leave balance summary for an employee for a specific year.';

COMMENT ON FUNCTION public.carry_over_deferred_leave(UUID, INTEGER) IS 
'Manually carries over remaining leave days from one year to the next as deferred leave.';

GRANT EXECUTE ON FUNCTION public.initialize_leave_balance_for_new_year(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_leave_balance_summary(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.carry_over_deferred_leave(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_leave_balance_with_splitting(UUID, UUID, INTEGER, INTEGER) TO authenticated;
