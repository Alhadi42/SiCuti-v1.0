import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY; // Need service role key for this operation

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase URL or Service Role Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function toggleRLS(enable = false) {
  try {
    const action = enable ? 'ENABLE' : 'DISABLE';
    console.log(`🔧 ${action} ROW LEVEL SECURITY for leave_proposals...`);
    
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `ALTER TABLE public.leave_proposals ${action} ROW LEVEL SECURITY;`
    });
    
    if (error) throw error;
    
    console.log(`✅ Successfully ${action.toLowerCase()}d RLS for leave_proposals`);
    
  } catch (error) {
    console.error(`❌ Error toggling RLS:`, error);
  } finally {
    process.exit(0);
  }
}

// Get the command line argument
const enableRLS = process.argv[2] === '--enable';
toggleRLS(enableRLS);
