
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fullRecalculate() {
    try {
        console.log("=== FULL SYSTEM RECALCULATION (PAGINATED) ===");

        let offset = 0;
        const limit = 500; // Smaller limit because we do subqueries
        let totalAudited = 0;
        let totalUpdated = 0;

        while (true) {
            console.log(`Fetching balances from offset ${offset}...`);
            const { data: balances, error: balError } = await supabase
                .from('leave_balances')
                .select('id, employee_id, leave_type_id, year, used_days')
                .range(offset, offset + limit - 1);

            if (balError) throw balError;
            if (!balances || balances.length === 0) break;

            for (const balance of balances) {
                totalAudited++;

                // Calculate actual used days for this balance's year and type
                const { data: requests, error: reqError } = await supabase
                    .from('leave_requests')
                    .select('days_requested')
                    .eq('employee_id', balance.employee_id)
                    .eq('leave_type_id', balance.leave_type_id)
                    .eq('leave_period', balance.year)
                    .eq('leave_quota_year', balance.year);

                if (reqError) {
                    console.error(`Error fetching requests for balance ${balance.id}:`, reqError);
                    continue;
                }

                const actualUsed = requests.reduce((sum, r) => sum + (r.days_requested || 0), 0);

                if (balance.used_days !== actualUsed) {
                    console.log(`Updating Balance ${balance.id} (Emp: ${balance.employee_id}, Year ${balance.year}): used_days ${balance.used_days} -> ${actualUsed}`);
                    const { error: updateError } = await supabase
                        .from('leave_balances')
                        .update({ used_days: actualUsed, updated_at: new Date().toISOString() })
                        .eq('id', balance.id);

                    if (updateError) console.error(`Error updating balance ${balance.id}:`, updateError);
                    else totalUpdated++;
                }
            }

            if (balances.length < limit) break;
            offset += limit;
        }

        console.log(`\nCOMPLETED: Audited ${totalAudited} balances, updated ${totalUpdated} records.`);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

fullRecalculate();
