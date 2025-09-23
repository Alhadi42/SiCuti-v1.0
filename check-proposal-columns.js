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

async function checkProposalColumns() {
  try {
    console.log('🔍 Checking leave_proposals columns...');
    
    // Try to get one record to see the structure
    const { data: sample, error: sampleError } = await supabase
      .from('leave_proposals')
      .select('*')
      .limit(1);
      
    if (sampleError) {
      console.error('Error fetching sample:', sampleError);
      return;
    }
    
    if (sample && sample.length > 0) {
      console.log('\n📋 leave_proposals columns:');
      console.log(Object.keys(sample[0]));
      console.log('\nSample record:');
      console.log(JSON.stringify(sample[0], null, 2));
    } else {
      console.log('No records found in leave_proposals');
      
      // If no records, try to get column info from information_schema
      const { data: columns, error: columnsError } = await supabase.rpc('get_columns', { 
        table_name: 'leave_proposals' 
      });
      
      if (columnsError) {
        console.error('Error getting columns:', columnsError);
      } else if (columns && columns.length > 0) {
        console.log('\n📋 leave_proposals columns:');
        console.log(columns);
      } else {
        console.log('Could not determine columns for leave_proposals');
      }
    }
    
    // Try to get a count of records
    const { count, error: countError } = await supabase
      .from('leave_proposals')
      .select('*', { count: 'exact', head: true });
      
    if (!countError) {
      console.log(`\nTotal records in leave_proposals: ${count}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error checking columns:', error);
  } finally {
    process.exit(0);
  }
}

checkProposalColumns();
