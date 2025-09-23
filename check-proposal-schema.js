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

async function checkProposalSchema() {
  try {
    console.log('🔍 Checking leave_proposals table structure...');
    
    // Get column information
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'leave_proposals');
      
    if (columnsError) throw columnsError;
    
    if (columns && columns.length > 0) {
      console.log('\n📋 leave_proposals columns:');
      console.table(columns);
      
      // Get a sample record
      console.log('\n📝 Sample record:');
      const { data: sample, error: sampleError } = await supabase
        .from('leave_proposals')
        .select('*')
        .limit(1);
        
      if (sampleError) throw sampleError;
      
      if (sample && sample.length > 0) {
        console.log(JSON.stringify(sample[0], null, 2));
      } else {
        console.log('No records found in leave_proposals');
      }
    } else {
      console.log('No columns found for leave_proposals table');
    }
    
  } catch (error) {
    console.error('\n❌ Error checking schema:', error);
  } finally {
    process.exit(0);
  }
}

checkProposalSchema();
