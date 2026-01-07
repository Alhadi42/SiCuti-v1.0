
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fullFixPeriods() {
    try {
        console.log("=== FULL SYSTEM PERIOD FIX (PAGINATED) ===");

        let offset = 0;
        const limit = 1000;
        let totalFixed = 0;
        const affectedEmployees = new Set();

        while (true) {
            console.log(`Fetching requests from offset ${offset}...`);
            const { data: requests, error } = await supabase
                .from('leave_requests')
                .select('id, start_date, leave_period, leave_quota_year, employee_id')
                .range(offset, offset + limit - 1);

            if (error) throw error;
            if (!requests || requests.length === 0) break;

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
                        totalFixed++;
                        affectedEmployees.add(lr.employee_id);
                    }
                }
            }

            if (requests.length < limit) break;
            offset += limit;
        }

        console.log(`\nCOMPLETED: Fixed ${totalFixed} requests across ${affectedEmployees.size} employees.`);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

fullFixPeriods();
