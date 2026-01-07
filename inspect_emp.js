
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    try {
        const empId = '4f174c84-de01-4949-876f-1fc45166434b';
        const { data: requests } = await supabase.from('leave_requests').select('*, leave_types(name)').eq('employee_id', empId).order('start_date', { ascending: true });
        console.log("REQUESTS:", JSON.stringify(requests, null, 2));
    } catch (e) { console.error(e); } finally { process.exit(0); }
}
inspect();
