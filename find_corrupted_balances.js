
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

async function findCorruptedUsage() {
    console.log("=== CHECKING FOR CORRUPTED LEAVE BALANCES (2026) ===");

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

    console.log(`Found ${balances.length} records in 2026 with deferred_days > 0.`);

    let corruptedCount = 0;

    for (const b of balances) {
        // 2. Check if a corresponding deferral log exists for 2025
        const { data: log, error: logErr } = await supabase
            .from('leave_deferrals')
            .select('id')
            .eq('employee_id', b.employee_id)
            .eq('year', 2025)
            .single();

        // If no log found (or error implying not found), then it's corrupted
        if (!log) {
            console.log(`❌ CORRUPTED: Employee ${b.employee_id} has ${b.deferred_days} deferred days BUT NO LOG!`);
            corruptedCount++;
        } else {
            // console.log(`✅ Valid: Employee ${b.employee_id} has log ${log.id}`);
        }
    }

    console.log(`Total Corrupted Records: ${corruptedCount}`);
}

findCorruptedUsage();
