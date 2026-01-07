
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Mock the normalizeYear function from leaveBalanceCalculator.js
const normalizeYear = (value) => {
    if (value == null) return null;
    const parsed = typeof value === 'string' ? parseInt(value, 10) : value;
    return Number.isFinite(parsed) ? parsed : null;
};

// Simplified version of the updated calculateLeaveBalance
function calculateLeaveBalanceSimplified({ dbBalance, leaveRequests, yearNum, leaveTypeId }) {
    // Filter requests that belong to this period (yearNum)
    const requestsInPeriod = leaveRequests.filter((lr) => {
        const periodYear = normalizeYear(lr.leave_period) ||
            (lr.start_date ? new Date(lr.start_date).getFullYear() : null);
        return periodYear === yearNum && lr.leave_type_id === leaveTypeId;
    });

    const usedFromCurrentYear = requestsInPeriod
        .filter((lr) => {
            const quotaYear = normalizeYear(lr.leave_quota_year) ||
                normalizeYear(lr.leave_period) ||
                (lr.start_date ? new Date(lr.start_date).getFullYear() : null);
            return quotaYear === yearNum;
        })
        .reduce((sum, lr) => sum + (lr.days_requested || 0), 0);

    const usedFromDeferred = requestsInPeriod
        .filter((lr) => {
            const quotaYear = normalizeYear(lr.leave_quota_year) ||
                normalizeYear(lr.leave_period) ||
                (lr.start_date ? new Date(lr.start_date).getFullYear() : null);
            return quotaYear < yearNum;
        })
        .reduce((sum, lr) => sum + (lr.days_requested || 0), 0);

    const deferred = dbBalance?.deferred_days || 0;
    const total = dbBalance?.total_days || 12;

    let actualUsedDeferred = usedFromDeferred;
    let actualUsedCurrent = usedFromCurrentYear;

    if (usedFromDeferred > deferred) {
        actualUsedDeferred = deferred;
        actualUsedCurrent = usedFromCurrentYear + (usedFromDeferred - deferred);
    }

    const totalUsed = actualUsedCurrent + actualUsedDeferred;
    const remaining = Math.max(0, total + deferred - totalUsed);

    return { total, deferred, used: totalUsed, used_current: actualUsedCurrent, used_deferred: actualUsedDeferred, remaining };
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    const empId = '4b2859a1-1662-450c-8f9d-72e0c7b904cc';
    const annualLeaveTypeId = 'f9865cd7-7261-4e1e-a6a4-024eca7bbbcf';

    const { data: balances } = await supabase.from('leave_balances').select('*').eq('employee_id', empId).eq('leave_type_id', annualLeaveTypeId);
    const { data: requests } = await supabase.from('leave_requests').select('*').eq('employee_id', empId).eq('leave_type_id', annualLeaveTypeId);

    console.log("--- ESSA PRATIWI VERIFICATION (SIMULATED) ---");

    [2024, 2025, 2026].forEach(year => {
        const dbBalance = balances.find(b => b.year === year);
        const calc = calculateLeaveBalanceSimplified({ dbBalance, leaveRequests: requests, yearNum: year, leaveTypeId: annualLeaveTypeId });
        console.log(`\nYear ${year}:`);
        console.log(`  DB Total: ${calc.total}, DB Penangguhan: ${calc.deferred}`);
        console.log(`  Calculated Used: ${calc.used} (Current: ${calc.used_current}, Deferred: ${calc.used_deferred})`);
        console.log(`  Calculated Remaining: ${calc.remaining}`);
    });

    process.exit(0);
}

verify();
