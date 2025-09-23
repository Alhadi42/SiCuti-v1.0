import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase URL or Service Role Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function checkTable() {
  try {
    console.log('🔍 Checking leave_proposals table...');
    
    // Try to get a single record to see the structure
    const { data, error } = await supabase
      .from('leave_proposals')
      .select('*')
      .limit(1);
      
    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log('\n📋 Sample record:', JSON.stringify(data[0], null, 2));
      console.log('\n🔑 Column names:', Object.keys(data[0]));
    } else {
      console.log('No records found in leave_proposals table');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkTable();
