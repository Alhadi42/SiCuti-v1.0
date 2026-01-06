
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

async function testTrigger() {
    console.log("=== TESTING FOR DB TRIGGERS ===");

    // 1. Find a user with remaining balance in 2025
    const { data: bal2025, error: err1 } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('year', 2025)
        .gt('total_days', 0) // Has some balance
        .eq('used_days', 0)  // Fully remaining (simplest case)
        .limit(1)
        .single();

    if (err1 || !bal2025) {
        console.log("Could not find a suitable 2025 balance to test with. Aborting.");
        return;
    }

    const userId = bal2025.employee_id;
    const leaveTypeId = bal2025.leave_type_id;
    console.log(`Found Test Candidate: ${userId} (LeaveType: ${leaveTypeId})`);
    console.log(`2025 Balance: Total=${bal2025.total_days}, Used=${bal2025.used_days}`);

    // 2. Cleanup any existing 2026 record for this user/type
    await supabase
        .from('leave_balances')
        .delete()
        .eq('employee_id', userId)
        .eq('leave_type_id', leaveTypeId)
        .eq('year', 2026);

    // 3. Insert specific 2026 record with 0 deferred
    console.log("Inserting 2026 record with deferred_days = 0...");
    const { data: newRec, error: insErr } = await supabase
        .from('leave_balances')
        .insert({
            employee_id: userId,
            leave_type_id: leaveTypeId,
            year: 2026,
            total_days: 12,
            used_days: 0,
            deferred_days: 0 // Explicitly 0
        })
        .select()
        .single();

    if (insErr) {
        console.error("Insert failed:", insErr);
        return;
    }

    console.log("Inserted Record:", newRec);

    // 4. Wait a moment (in case trigger is async/after insert)
    // Standard triggers are synchronous within the transaction usually, but good to check.

    // 5. Read it back
    const { data: checkRec } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('id', newRec.id)
        .single();

    console.log("Re-read Record:", checkRec);

    if (checkRec.deferred_days > 0) {
        console.error(`🚨 TRIGGER DETECTED! Deferred days changed from 0 to ${checkRec.deferred_days} automatically!`);
    } else {
        console.log("✅ No auto-calculation detected. Deferred days remained 0.");
    }
}

testTrigger();
