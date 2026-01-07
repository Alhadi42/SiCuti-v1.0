import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { calculateLeaveBalance } from './src/utils/leaveBalanceCalculator.js';

// Load env
try {
    const envConfig = dotenv.parse(fs.readFileSync('.env'))
    for (const k in envConfig) {
        process.env[k] = envConfig[k]
    }
} catch (e) {
    console.log("No .env file found");
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAkhirudinBalance() {
    const employeeId = '4f174c84-de01-4949-876f-1fc45166434b';
    const leaveTypeId = 'f9865cd7-7261-4e1e-a6a4-024eca7bbbcf'; // Cuti Tahunan
    const year = 2025;
    const currentYear = 2025;
    
    console.log('🧪 Testing saldo cuti Akhirudin dengan fungsi frontend...');
    
    // Get leave type info
    const { data: leaveType, error: leaveTypeError } = await supabase
        .from('leave_types')
        .select('*')
        .eq('id', leaveTypeId)
        .single();
    
    if (leaveTypeError) {
        console.error('❌ Error get leave type:', leaveTypeError);
        return;
    }
    
    console.log('📋 Leave Type:', leaveType.name);
    
    // Get database balance
    const { data: dbBalance, error: balanceError } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('leave_type_id', leaveTypeId)
        .eq('year', year)
        .single();
    
    if (balanceError) {
        console.error('❌ Error get balance:', balanceError);
        return;
    }
    
    console.log('💾 Database Balance:', {
        total: dbBalance.total_days,
        used: dbBalance.used_days,
        deferred: dbBalance.deferred_days
    });
    
    // Get leave requests
    const { data: leaveRequests, error: requestsError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('leave_type_id', leaveTypeId);
    
    if (requestsError) {
        console.error('❌ Error get requests:', requestsError);
        return;
    }
    
    console.log('📄 Leave Requests:', leaveRequests.length);
    leaveRequests.forEach(req => {
        console.log(`  - ${req.start_date} to ${req.end_date}: ${req.days_requested} days (quota: ${req.leave_quota_year}, period: ${req.leave_period})`);
    });
    
    // Calculate using frontend function
    const calculated = calculateLeaveBalance({
        dbBalance,
        leaveRequests,
        leaveType,
        year,
        currentYear,
    });
    
    console.log('\n🧮 Hasil Kalkulasi Frontend:');
    console.log('Total:', calculated.total);
    console.log('Used:', calculated.used);
    console.log('Used Current:', calculated.used_current);
    console.log('Used Deferred:', calculated.used_deferred);
    console.log('Deferred:', calculated.deferred);
    console.log('Remaining:', calculated.remaining);
    
    // Calculate remaining_current like frontend does
    const remaining_current = Math.max(0, (calculated.total || 0) - (calculated.used_current || 0));
    const remaining_deferred = Math.max(0, (calculated.deferred || 0) - (calculated.used_deferred || 0));
    
    console.log('\n💰 Perhitungan Saldo seperti di Frontend:');
    console.log('Remaining Current (saldo jatah 2025):', remaining_current);
    console.log('Remaining Deferred (saldo penangguhan):', remaining_deferred);
    
    // Check if there's a mismatch
    if (remaining_current < 0) {
        console.log('\n🚨 MASALAH: Saldo current negatif!');
        console.log('Ini menunjukkan penggunaan cuti melebihi jatah yang tersedia.');
    }
    
    if (calculated.used_current > calculated.total) {
        console.log('\n🚨 MASALAH: Used current melebihi total!');
        console.log('Used:', calculated.used_current, 'Total:', calculated.total);
    }
}

testAkhirudinBalance();
