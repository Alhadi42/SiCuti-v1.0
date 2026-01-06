
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

async function checkColumn() {
    // Try to select the column
    const { data, error } = await supabase
        .from('leave_deferrals')
        .select('google_drive_link')
        .limit(1);

    if (error) {
        console.log("Column 'google_drive_link' likely NOT found or other error:", error.message);
    } else {
        console.log("✅ Column 'google_drive_link' EXISTS.");
    }
}

checkColumn();
