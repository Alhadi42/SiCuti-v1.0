
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function globalAudit() {
    try {
        console.log("=== SYSTEM-WIDE PERIOD MISMATCH AUDIT ===");

        // Find requests where start_date year != leave_period
        const { data: mismatches, error } = await supabase
            .from('leave_requests')
            .select('id, employee_id, start_date, leave_period, leave_quota_year, employees(name)')
            .order('start_date', { ascending: true });

        if (error) throw error;

        const actualMismatches = mismatches.filter(lr => {
            const execYear = new Date(lr.start_date).getFullYear();
            return execYear !== lr.leave_period;
        });

        console.log(`Found ${actualMismatches.length} requests where execution year != leave_period`);

        const groupedByEmp = {};
        actualMismatches.forEach(m => {
            const name = m.employees?.name || 'Unknown';
            if (!groupedByEmp[name]) groupedByEmp[name] = [];
            groupedByEmp[name].push(m);
        });

        for (const [name, ms] of Object.entries(groupedByEmp)) {
            console.log(`\nEmployee: ${name}`);
            ms.forEach(m => {
                console.log(`  - ID: ${m.id}, Date: ${m.start_date}, Period: ${m.leave_period}, Quota: ${m.leave_quota_year}`);
            });
        }

    } catch (e) { console.error(e); } finally { process.exit(0); }
}

globalAudit();
