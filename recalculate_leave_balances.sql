-- Recalculate leave balances based on correct default days
-- Run this script in Supabase SQL Editor

-- Function to recalculate leave balances
CREATE OR REPLACE FUNCTION recalculate_leave_balances()
RETURNS TABLE (
    employee_name TEXT,
    leave_type_name TEXT,
    year INTEGER,
    old_total_days INTEGER,
    new_total_days INTEGER,
    status TEXT
) AS $$
DECLARE
    balance_record RECORD;
    leave_type_record RECORD;
    employee_record RECORD;
BEGIN
    -- Loop through all leave balances
    FOR balance_record IN 
        SELECT lb.*, lt.name as leave_type_name, lt.default_days
        FROM leave_balances lb
        JOIN leave_types lt ON lb.leave_type_id = lt.id
    LOOP
        -- Get employee name
        SELECT name INTO employee_record.name
        FROM employees 
        WHERE id = balance_record.employee_id;
        
        -- Update total_days if it doesn't match default_days
        IF balance_record.total_days != balance_record.default_days THEN
            UPDATE leave_balances 
            SET total_days = balance_record.default_days
            WHERE id = balance_record.id;
            
            -- Return the change record
            RETURN QUERY SELECT 
                employee_record.name::TEXT,
                balance_record.leave_type_name::TEXT,
                balance_record.year,
                balance_record.total_days,
                balance_record.default_days,
                'Updated'::TEXT;
        ELSE
            -- Return unchanged record
            RETURN QUERY SELECT 
                employee_record.name::TEXT,
                balance_record.leave_type_name::TEXT,
                balance_record.year,
                balance_record.total_days,
                balance_record.total_days,
                'No Change'::TEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the recalculation
SELECT * FROM recalculate_leave_balances();

-- Create missing balance records for employees who don't have them
INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days, deferred_days)
SELECT 
    e.id as employee_id,
    lt.id as leave_type_id,
    EXTRACT(YEAR FROM CURRENT_DATE) as year,
    lt.default_days as total_days,
    0 as used_days,
    0 as deferred_days
FROM employees e
CROSS JOIN leave_types lt
WHERE NOT EXISTS (
    SELECT 1 FROM leave_balances lb 
    WHERE lb.employee_id = e.id 
    AND lb.leave_type_id = lt.id 
    AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
);

-- Show summary of current balances
SELECT 
    e.name as employee_name,
    lt.name as leave_type,
    lb.year,
    lb.total_days,
    lb.used_days,
    lb.deferred_days,
    (lb.total_days + lb.deferred_days - lb.used_days) as remaining_days
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY e.name, lt.name; 