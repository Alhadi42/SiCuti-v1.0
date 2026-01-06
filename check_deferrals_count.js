
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

async function checkDeferrals() {
    const { count, error } = await supabase
        .from('leave_deferrals')
        .select('*', { count: 'exact', head: true })
        .eq('year', 2025);

    if (error) console.error(error);
    else console.log(`Number of deferral logs for 2025: ${count}`);
}

checkDeferrals();
