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

async function comprehensiveBalanceCheck() {
    console.log('🔍 Melakukan pemeriksaan komprehensif saldo cuti semua pegawai...');
    
    const currentYear = 2025;
    let issues = [];
    let successCount = 0;
    let errorCount = 0;
    
    try {
        // Get all employees
        const { data: employees, error: employeesError } = await supabase
            .from('employees')
            .select('id, name, nip');
        
        if (employeesError) {
            console.error('❌ Error fetching employees:', employeesError);
            return;
        }
        
        console.log(`📋 Memeriksa ${employees.length} pegawai...`);
        
        // Get all leave types
        const { data: leaveTypes, error: leaveTypesError } = await supabase
            .from('leave_types')
            .select('*');
        
        if (leaveTypesError) {
            console.error('❌ Error fetching leave types:', leaveTypesError);
            return;
        }
        
        // Check each employee
        for (const employee of employees) {
            try {
                // Get all leave requests for this employee
                const { data: leaveRequests, error: requestsError } = await supabase
                    .from('leave_requests')
                    .select('*')
                    .eq('employee_id', employee.id);
                
                if (requestsError) {
                    console.error(`❌ Error fetching requests for ${employee.name}:`, requestsError);
                    errorCount++;
                    continue;
                }
                
                // Check each leave type
                for (const leaveType of leaveTypes) {
                    // Get database balance
                    const { data: dbBalance, error: balanceError } = await supabase
                        .from('leave_balances')
                        .select('*')
                        .eq('employee_id', employee.id)
                        .eq('leave_type_id', leaveType.id)
                        .eq('year', currentYear)
                        .single();
                    
                    if (balanceError && balanceError.code !== 'PGRST116') {
                        console.error(`❌ Error fetching balance for ${employee.name} - ${leaveType.name}:`, balanceError);
                        continue;
                    }
                    
                    // Calculate using frontend function
                    const calculated = calculateLeaveBalance({
                        dbBalance: dbBalance || { total_days: 0, used_days: 0, deferred_days: 0 },
                        leaveRequests: leaveRequests || [],
                        leaveType,
                        year: currentYear,
                        currentYear,
                    });
                    
                    // Check for issues
                    const employeeIssues = [];
                    
                    // Check if calculated used differs from database used
                    if (dbBalance && calculated.used !== dbBalance.used_days) {
                        employeeIssues.push({
                            type: 'USED_MISMATCH',
                            db_used: dbBalance.used_days,
                            calculated_used: calculated.used,
                            difference: calculated.used - dbBalance.used_days
                        });
                    }
                    
                    // Check if used_deferred exceeds available deferred
                    if (calculated.used_deferred > calculated.deferred) {
                        employeeIssues.push({
                            type: 'DEFERRED_EXCEEDED',
                            used_deferred: calculated.used_deferred,
                            available_deferred: calculated.deferred,
                            excess: calculated.used_deferred - calculated.deferred
                        });
                    }
                    
                    // Check if remaining is negative
                    if (calculated.remaining < 0) {
                        employeeIssues.push({
                            type: 'NEGATIVE_REMAINING',
                            remaining: calculated.remaining
                        });
                    }
                    
                    // Check if used_current exceeds total
                    if (calculated.used_current > calculated.total) {
                        employeeIssues.push({
                            type: 'CURRENT_EXCEEDED',
                            used_current: calculated.used_current,
                            total: calculated.total,
                            excess: calculated.used_current - calculated.total
                        });
                    }
                    
                    if (employeeIssues.length > 0) {
                        issues.push({
                            employee: employee.name,
                            employee_id: employee.id,
                            leave_type: leaveType.name,
                            leave_type_id: leaveType.id,
                            issues: employeeIssues,
                            calculated,
                            db_balance: dbBalance
                        });
                    } else {
                        successCount++;
                    }
                }
                
            } catch (error) {
                console.error(`❌ Error processing ${employee.name}:`, error.message);
                errorCount++;
            }
        }
        
    } catch (error) {
        console.error('❌ Error in comprehensive check:', error);
    }
    
    // Display results
    console.log('\n📊 HASIL PEMERIKSAAN KOMPREHENSIF:');
    console.log(`✅ Berhasil: ${successCount} data`);
    console.log(`❌ Bermasalah: ${issues.length} data`);
    console.log(`🚫 Error: ${errorCount} data`);
    
    if (issues.length > 0) {
        console.log('\n🚨 DETAIL MASALAH:');
        issues.forEach((issue, index) => {
            console.log(`\n${index + 1}. ${issue.employee} - ${issue.leave_type}`);
            issue.issues.forEach(issueDetail => {
                switch (issueDetail.type) {
                    case 'USED_MISMATCH':
                        console.log(`   ⚠️ Used tidak cocok: DB=${issueDetail.db_used}, Calc=${issueDetail.calculated_used} (diff: ${issueDetail.difference})`);
                        break;
                    case 'DEFERRED_EXCEEDED':
                        console.log(`   ⚠️ Used deferred melebihi: ${issueDetail.used_deferred} > ${issueDetail.available_deferred} (excess: ${issueDetail.excess})`);
                        break;
                    case 'NEGATIVE_REMAINING':
                        console.log(`   ⚠️ Sisa negatif: ${issueDetail.remaining}`);
                        break;
                    case 'CURRENT_EXCEEDED':
                        console.log(`   ⚠️ Used current melebihi total: ${issueDetail.used_current} > ${issueDetail.total} (excess: ${issueDetail.excess})`);
                        break;
                }
            });
        });
    }
    
    // Summary by issue type
    const issueTypes = {};
    issues.forEach(issue => {
        issue.issues.forEach(issueDetail => {
            issueTypes[issueDetail.type] = (issueTypes[issueDetail.type] || 0) + 1;
        });
    });
    
    if (Object.keys(issueTypes).length > 0) {
        console.log('\n📈 RINGKASAN MASALAH PER TIPE:');
        Object.entries(issueTypes).forEach(([type, count]) => {
            console.log(`   ${type}: ${count} kasus`);
        });
    }
    
    console.log('\n✅ Pemeriksaan selesai!');
    
    return {
        success: successCount,
        issues: issues.length,
        errors: errorCount,
        details: issues
    };
}

// Run the check
comprehensiveBalanceCheck();
