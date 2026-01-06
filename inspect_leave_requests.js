
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

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRequests() {
    console.log("Fetching one leave request...");
    const { data, error } = await supabase
        .from('leave_requests')
        .select('id, employee_id, start_date, end_date')
        .limit(1);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Data:", JSON.stringify(data, null, 2));
        if (data.length > 0) {
            console.log("Start Date Type:", typeof data[0].start_date);
            console.log("Start Date Value:", data[0].start_date);
        }
    }
}

checkRequests();
