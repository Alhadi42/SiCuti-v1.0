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

async function testBalanceSystem() {
    console.log('🧪 Testing sistem perhitungan saldo cuti...');
    
    const currentYear = 2025;
    
    try {
        // Get random sample of employees with leave requests
        const { data: employees, error: employeesError } = await supabase
            .from('employees')
            .select('id, name, nip')
            .limit(5); // Test with 5 employees
        
        if (employeesError) {
            console.error('❌ Error fetching employees:', employeesError);
            return;
        }
        
        // Get all leave types
        const { data: leaveTypes, error: leaveTypesError } = await supabase
            .from('leave_types')
            .select('*');
        
        if (leaveTypesError) {
            console.error('❌ Error fetching leave types:', leaveTypesError);
            return;
        }
        
        console.log(`📋 Testing ${employees.length} pegawai dengan ${leaveTypes.length} jenis cuti...`);
        
        let allTestsPassed = true;
        
        for (const employee of employees) {
            console.log(`\n👤 Testing: ${employee.name}`);
            
            // Get all leave requests for this employee
            const { data: leaveRequests, error: requestsError } = await supabase
                .from('leave_requests')
                .select('*')
                .eq('employee_id', employee.id);
            
            if (requestsError) {
                console.error(`❌ Error fetching requests:`, requestsError);
                allTestsPassed = false;
                continue;
            }
            
            for (const leaveType of leaveTypes) {
                // Get database balance
                const { data: dbBalance, error: balanceError } = await supabase
                    .from('leave_balances')
                    .select('*')
                    .eq('employee_id', employee.id)
                    .eq('leave_type_id', leaveType.id)
                    .eq('year', currentYear)
                    .single();
                
                // Calculate using frontend function
                const calculated = calculateLeaveBalance({
                    dbBalance: dbBalance || { total_days: 0, used_days: 0, deferred_days: 0 },
                    leaveRequests: leaveRequests || [],
                    leaveType,
                    year: currentYear,
                    currentYear,
                });
                
                // Validation checks
                const validations = [];
                
                // Check 1: used_deferred should not exceed deferred
                if (calculated.used_deferred > calculated.deferred) {
                    validations.push(`❌ Used deferred (${calculated.used_deferred}) > Deferred (${calculated.deferred})`);
                } else {
                    validations.push(`✅ Used deferred (${calculated.used_deferred}) <= Deferred (${calculated.deferred})`);
                }
                
                // Check 2: used_current should not exceed total
                if (calculated.used_current > calculated.total) {
                    validations.push(`❌ Used current (${calculated.used_current}) > Total (${calculated.total})`);
                } else {
                    validations.push(`✅ Used current (${calculated.used_current}) <= Total (${calculated.total})`);
                }
                
                // Check 3: remaining should not be negative
                if (calculated.remaining < 0) {
                    validations.push(`❌ Remaining is negative (${calculated.remaining})`);
                } else {
                    validations.push(`✅ Remaining is non-negative (${calculated.remaining})`);
                }
                
                // Check 4: total used should equal used_current + used_deferred
                const expectedTotal = calculated.used_current + calculated.used_deferred;
                if (calculated.used !== expectedTotal) {
                    validations.push(`❌ Used total mismatch: ${calculated.used} != ${expectedTotal}`);
                } else {
                    validations.push(`✅ Used total matches: ${calculated.used} = ${expectedTotal}`);
                }
                
                // Display results for this leave type
                if (leaveRequests.some(lr => lr.leave_type_id === leaveType.id)) {
                    console.log(`   📄 ${leaveType.name}:`);
                    validations.forEach(v => console.log(`      ${v}`));
                    console.log(`      📊 Total: ${calculated.total}, Used: ${calculated.used}, Remaining: ${calculated.remaining}`);
                    console.log(`      📊 Used Current: ${calculated.used_current}, Used Deferred: ${calculated.used_deferred}, Deferred: ${calculated.deferred}`);
                    
                    // Check if any validation failed
                    if (validations.some(v => v.includes('❌'))) {
                        allTestsPassed = false;
                    }
                }
            }
        }
        
        console.log('\n🎯 HASIL FINAL:');
        if (allTestsPassed) {
            console.log('✅ Semua tes berhasil! Sistem perhitungan saldo cuti berjalan dengan benar.');
        } else {
            console.log('❌ Ada tes yang gagal! Perlu diperbaiki.');
        }
        
        // Test edge cases
        console.log('\n🧪 Testing edge cases...');
        await testEdgeCases();
        
    } catch (error) {
        console.error('❌ Error in system test:', error);
    }
}

async function testEdgeCases() {
    // Test case 1: Employee with no leave requests
    console.log('📋 Edge Case 1: Employee tanpa cuti');
    const noLeaveResult = calculateLeaveBalance({
        dbBalance: { total_days: 12, used_days: 0, deferred_days: 0 },
        leaveRequests: [],
        leaveType: { id: 'test', default_days: 12 },
        year: 2025,
        currentYear: 2025,
    });
    console.log(`   Total: ${noLeaveResult.total}, Used: ${noLeaveResult.used}, Remaining: ${noLeaveResult.remaining}`);
    
    // Test case 2: Employee with excessive deferred usage
    console.log('\n📋 Edge Case 2: Penggunaan deferred berlebih');
    const excessiveDeferredResult = calculateLeaveBalance({
        dbBalance: { total_days: 12, used_days: 0, deferred_days: 5 },
        leaveRequests: [
            { leave_type_id: 'test', days_requested: 10, start_date: '2025-01-01', leave_quota_year: 2024 }
        ],
        leaveType: { id: 'test', default_days: 12 },
        year: 2025,
        currentYear: 2025,
    });
    console.log(`   Used Deferred: ${excessiveDeferredResult.used_deferred}, Used Current: ${excessiveDeferredResult.used_current}`);
    console.log(`   Expected: Deferred=5, Current=5 (10-5)`);
    
    // Test case 3: Employee with mixed quota years
    console.log('\n📋 Edge Case 3: Campur quota years');
    const mixedResult = calculateLeaveBalance({
        dbBalance: { total_days: 12, used_days: 0, deferred_days: 6 },
        leaveRequests: [
            { leave_type_id: 'test', days_requested: 5, start_date: '2025-01-01', leave_quota_year: 2025 },
            { leave_type_id: 'test', days_requested: 8, start_date: '2025-06-01', leave_quota_year: 2024 }
        ],
        leaveType: { id: 'test', default_days: 12 },
        year: 2025,
        currentYear: 2025,
    });
    console.log(`   Used Current: ${mixedResult.used_current}, Used Deferred: ${mixedResult.used_deferred}`);
    console.log(`   Expected: Current=5, Deferred=6 (capped at 6)`);
}

// Run test
testBalanceSystem();
