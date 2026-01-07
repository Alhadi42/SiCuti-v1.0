import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

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

async function checkAkhirudinLeave() {
    const employeeId = '4f174c84-de01-4949-876f-1fc45166434b';
    
    console.log('🔍 Mencari riwayat cuti Akhirudin...');
    
    // Get leave requests
    const { data: leaveRequests, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('❌ Error:', error);
        return;
    }
    
    console.log('📋 Riwayat cuti ditemukan:');
    console.log(JSON.stringify(leaveRequests, null, 2));
    
    console.log('\n📊 Ringkasan:');
    console.log('Total pengajuan:', leaveRequests.length);
    
    // Group by year
    const byYear = {};
    leaveRequests.forEach(req => {
        const year = new Date(req.start_date).getFullYear();
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(req);
    });
    
    Object.keys(byYear).forEach(year => {
        const totalDays = byYear[year].reduce((sum, req) => sum + (req.days_requested || 0), 0);
        console.log(`Tahun ${year}: ${byYear[year].length} pengajuan, ${totalDays} hari`);
    });
    
    // Check leave balance for 2025
    console.log('\n💰 Memeriksa saldo cuti 2025...');
    const { data: leaveBalance, error: balanceError } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('year', 2025);
    
    if (balanceError) {
        console.error('❌ Error saldo:', balanceError);
    } else {
        console.log('📊 Saldo cuti 2025:');
        console.log(JSON.stringify(leaveBalance, null, 2));
    }
}

checkAkhirudinLeave();
