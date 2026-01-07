
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function recalculateBalances() {
    try {
        console.log("=== RECALCULATING LEAVE BALANCES ===");

        const { data: balances, error: balError } = await supabase.from('leave_balances').select('id, employee_id, leave_type_id, year, used_days');
        if (balError) throw balError;

        console.log(`Auditing ${balances.length} balance records...`);

        let updateCount = 0;

        for (const balance of balances) {
            // Calculate actual used days for this balance's year and type
            // Based on the updated leave_period logic
            const { data: requests, error: reqError } = await supabase
                .from('leave_requests')
                .select('days_requested')
                .eq('employee_id', balance.employee_id)
                .eq('leave_type_id', balance.leave_type_id)
                .eq('leave_period', balance.year)
                .eq('leave_quota_year', balance.year); // Normal usage from current quota

            if (reqError) {
                console.error(`Error fetching requests for balance ${balance.id}:`, reqError);
                continue;
            }

            const actualUsed = requests.reduce((sum, r) => sum + (r.days_requested || 0), 0);

            if (balance.used_days !== actualUsed) {
                console.log(`Updating Balance ${balance.id} (Year ${balance.year}): used_days ${balance.used_days} -> ${actualUsed}`);
                const { error: updateError } = await supabase
                    .from('leave_balances')
                    .update({ used_days: actualUsed, updated_at: new Date().toISOString() })
                    .eq('id', balance.id);

                if (updateError) console.error(`Error updating balance ${balance.id}:`, updateError);
                else updateCount++;
            }
        }

        console.log(`\nSuccessfully updated ${updateCount} balance records.`);

    } catch (e) { console.error(e); } finally { process.exit(0); }
}

recalculateBalances();
