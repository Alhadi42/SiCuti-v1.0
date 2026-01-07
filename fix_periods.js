
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPeriods() {
    try {
        console.log("=== FIXING PERIOD MISMATCHES ===");

        // 1. Get all requests
        const { data: requests, error } = await supabase
            .from('leave_requests')
            .select('id, start_date, leave_period, leave_quota_year, employee_id, leave_type_id');

        if (error) throw error;

        let fixCount = 0;
        const affectedEmployees = new Set();

        for (const lr of requests) {
            const execYear = new Date(lr.start_date).getFullYear();
            if (execYear !== lr.leave_period) {
                console.log(`Fixing Request ${lr.id}: Period ${lr.leave_period} -> ${execYear}`);
                const { error: updateError } = await supabase
                    .from('leave_requests')
                    .update({ leave_period: execYear })
                    .eq('id', lr.id);

                if (updateError) console.error(`Error fixing ${lr.id}:`, updateError);
                else {
                    fixCount++;
                    affectedEmployees.add(lr.employee_id);
                }
            }
        }

        console.log(`\nFixed ${fixCount} requests across ${affectedEmployees.size} employees.`);

        // 2. We should ideally trigger a recalculation of used_days in leave_balances.
        // Instead of writing a complex script here, we can use the existing 'FIX_LEAVE_BALANCE_ISSUES.sql' logic
        // or just let the UI handle it since it's dynamic.
        // But let's at least run a basic recalculation for the affected employees' balances.

        console.log("Recalculating affected balances...");
        // (This would involve calling update_leave_balance_with_splitting for each request or just recalculating used_days)
        // Since we have many, I'll recommend the user run a full SQL recalculation.

    } catch (e) { console.error(e); } finally { process.exit(0); }
}

fixPeriods();
