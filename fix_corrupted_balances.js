
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

try {
    const envConfig = dotenv.parse(fs.readFileSync('.env'))
    for (const k in envConfig) {
        process.env[k] = envConfig[k]
    }
} catch (e) {
    console.log("No .env file found");
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCorruptedBalances() {
    console.log("=== FIXING CORRUPTED 2026 BALANCES ===");

    // 1. Get all balances for 2026 with deferred_days > 0
    const { data: balances, error } = await supabase
        .from('leave_balances')
        .select('id, employee_id, deferred_days, year')
        .eq('year', 2026)
        .gt('deferred_days', 0);

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Scanning ${balances.length} potential records...`);

    let fixedCount = 0;

    for (const b of balances) {
        // 2. Check if a corresponding deferral log exists for 2025
        const { data: log, error: logErr } = await supabase
            .from('leave_deferrals')
            .select('id')
            .eq('employee_id', b.employee_id)
            .eq('year', 2025)
            .single();

        // If no log found, it's corrupted -> FIX IT
        if (!log) {
            console.log(`🔧 FIXING: Employee ${b.employee_id} (Has ${b.deferred_days} deferred, but no log). Resetting to 0.`);

            const { error: updateErr } = await supabase
                .from('leave_balances')
                .update({ deferred_days: 0 })
                .eq('id', b.id);

            if (updateErr) console.error(`Failed to fix ${b.id}:`, updateErr);
            else fixedCount++;
        }
    }

    console.log(`✅ COMPLETE. Fixed ${fixedCount} corrupted records.`);
}

fixCorruptedBalances();
