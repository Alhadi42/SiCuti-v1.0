
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Try to load .env
try {
    const envConfig = dotenv.parse(fs.readFileSync('.env'))
    for (const k in envConfig) {
        process.env[k] = envConfig[k]
    }
} catch (e) {
    console.log("No .env file found or error reading it");
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log("=== INSPECTING DATABASE ===\n");

    // 1. Check for Triggers (via rpc if possible, or information_schema hack if we have permissions)
    // Since we are likely anon/authenticated, we might not have access to information_schema.
    // But we can try calling a raw query if a function like 'exec_sql' exists (unlikely in prod).
    // Instead, let's check if the FUNCTION 'initialize_leave_balance_for_new_year' exists by trying to call it? 
    // No, that's risky if it does stuff.

    // Let's assume we can't see triggers easily without admin rights.
    // But we CAN check if 'leave_deferrals' has data for 2025 for random employees.

    /*
    console.log("--- Checking for random 2025 Deferrals ---");
    const { data: deferrals, error: defError } = await supabase
      .from('leave_deferrals')
      .select('*')
      .eq('year', 2025)
      .limit(5);
    
    if (defError) console.error("Error fetching deferrals:", defError);
    else console.log("Sample 2025 Deferrals:", deferrals);
    */

    // 2. Check if we can execute a benign SQL query via RPC (often setup for admin tools)
    // Searching through code, I didn't see an arbitrary SQL executor.

    // 3. Let's try to verify if the 'initialize_leave_balance_for_new_year' function is accessible
    // We can try to call it with a dummy UUID, expecting an error or success.
    // BUT we don't want to actually initialize data if it works.

    // Let's look for evidence of the SQL migration having been run.
    // We can check if `leave_balances` has any recent entries with `created_at` matching a specific pattern?

    // Just dump the last 5 created leave_balances
    console.log("--- Recent Leave Balances ---");
    const { data: balances, error: balError } = await supabase
        .from('leave_balances')
        .select('created_at, year, total_days, deferred_days, employee_id')
        .order('created_at', { ascending: false })
        .limit(5);

    if (balError) console.error("Error fetching balances:", balError);
    else console.log("Recent Balances:", balances);

    // Check if leave_deferrals exist for these employees
    if (balances && balances.length > 0) {
        for (const b of balances) {
            if (b.deferred_days > 0) {
                console.log(`Checking deferral log for emp ${b.employee_id} year ${b.year - 1}`);
                const { data: log } = await supabase
                    .from('leave_deferrals')
                    .select('*')
                    .eq('employee_id', b.employee_id)
                    .eq('year', b.year - 1)
                    .single();
                console.log(`Log for ${b.employee_id}:`, log);

                if (!log) {
                    console.warn("⚠️ ALARM: Deferred days existed in balance BUT NO DEFERRAL LOG WAS FOUND!");
                    console.warn("   This implies auto-calculation or direct SQL insertion without log.");
                }
            }
        }
    }

}

inspect();
