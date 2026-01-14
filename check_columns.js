import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkColumns() {
    const { data, error } = await supabase.from('leave_requests').select('*').limit(1);
    if (error) console.error(error);
    else if (data && data.length > 0) console.log(Object.keys(data[0]));
    else console.log('No data found, cannot infer columns, but connection working.');
}

checkColumns();
