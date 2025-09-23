import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase URL or Anon Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function testGetDepartments() {
  try {
    console.log('🔍 Testing get_all_departments function...');
    
    const { data, error } = await supabase.rpc('get_all_departments');
    
    if (error) {
      console.error('Error calling get_all_departments:', error);
      return;
    }
    
    console.log('✅ get_all_departments result:', data);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testGetDepartments();
