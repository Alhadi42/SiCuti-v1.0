
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const normalizeYear = (value) => {
    if (value == null) return null;
    const parsed = typeof value === 'string' ? parseInt(value, 10) : value;
    return Number.isFinite(parsed) ? parsed : null;
};

async function audit() {
    try {
        console.log("=== LEAVE BALANCE AUDIT ===");

        // Get all leave types
        const { data: leaveTypes } = await supabase.from('leave_types').select('id, name');
        const annualLeaveType = leaveTypes.find(lt => lt.name === 'Cuti Tahunan');

        // Search for Akhirudin
        const { data: akhirudin } = await supabase.from('employees').select('id, name').ilike('name', '%Akhirudin%');
        const employeesToAudit = akhirudin && akhirudin.length > 0 ? akhirudin : [];

        console.log(`Found Akhirudin: ${employeesToAudit.length > 0 ? employeesToAudit[0].name : 'NOT FOUND'}`);

        // If not found, let's just get the first 10 for a sample audit
        if (employeesToAudit.length === 0) {
            const { data: sample } = await supabase.from('employees').select('id, name').limit(10);
            employeesToAudit.push(...(sample || []));
        }

        for (const emp of employeesToAudit) {
            console.log(`\nAuditing Employee: ${emp.name} (${emp.id})`);

            const { data: balances } = await supabase.from('leave_balances').select('*').eq('employee_id', emp.id).eq('leave_type_id', annualLeaveType.id);
            const { data: requests } = await supabase.from('leave_requests').select('*').eq('employee_id', emp.id).eq('leave_type_id', annualLeaveType.id);

            [2024, 2025, 2026].forEach(year => {
                const dbBalance = balances?.find(b => b.year === year);
                if (!dbBalance && year < 2026) return; // Skip historical years without balance

                const typeRequests = requests || [];

                // Logic matching the new unified period logic
                const requestsInPeriod = typeRequests.filter((lr) => {
                    const periodYear = normalizeYear(lr.leave_period) ||
                        (lr.start_date ? new Date(lr.start_date).getFullYear() : null);
                    return periodYear === year;
                });

                const usedFromCurrent = requestsInPeriod
                    .filter((lr) => {
                        const quotaYear = normalizeYear(lr.leave_quota_year) ||
                            normalizeYear(lr.leave_period) ||
                            (lr.start_date ? new Date(lr.start_date).getFullYear() : null);
                        return quotaYear === year;
                    })
                    .reduce((sum, lr) => sum + (lr.days_requested || 0), 0);

                const usedFromDeferred = requestsInPeriod
                    .filter((lr) => {
                        const quotaYear = normalizeYear(lr.leave_quota_year) ||
                            normalizeYear(lr.leave_period) ||
                            (lr.start_date ? new Date(lr.start_date).getFullYear() : null);
                        return quotaYear < year;
                    })
                    .reduce((sum, lr) => sum + (lr.days_requested || 0), 0);

                const totalExpected = usedFromCurrent;
                // Note: in leave_balances table, 'used_days' typically stores USED FROM CURRENT QUOTA 
                // and 'deferred_days' (in some contexts) stores AVAILABLE DEFERRED.
                // Wait, let's check schema details again.

                console.log(`  Year ${year}:`);
                console.log(`    DB Balance Record: ${JSON.stringify(dbBalance)}`);
                console.log(`    Expected Used Current: ${usedFromCurrent}`);
                console.log(`    Expected Used Deferred: ${usedFromDeferred}`);

                const dbUsed = dbBalance?.used_days || 0;
                if (dbUsed !== usedFromCurrent) {
                    console.log(`    ⚠️ MISMATCH in used_days: DB has ${dbUsed}, Expected ${usedFromCurrent}`);
                }
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

audit();
