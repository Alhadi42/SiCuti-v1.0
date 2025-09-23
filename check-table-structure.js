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

async function checkTableStructure() {
  try {
    console.log('🔍 Checking database structure...');
    
    // First, try to get the table structure using information_schema
    console.log('\n1. Getting table structure...');
    const { data: tables, error: tablesError } = await supabase
      .from('pg_tables')
      .select('*')
      .eq('schemaname', 'public');
      
    if (tablesError) {
      console.log('Error getting tables, trying alternative method...');
    } else {
      console.log('\n📋 Tables in public schema:');
      console.table(tables);
    }
    
    // Try to get a list of all tables using a raw query
    console.log('\n2. Trying to list tables using raw query...');
    const { data: rawTables, error: rawError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
      
    if (rawError) {
      console.log('Error with raw query, trying another approach...');
    } else if (rawTables && rawTables.length > 0) {
      console.log('\n📋 Tables found:');
      console.table(rawTables);
    }
    
    // Try to get the structure of leave_proposals
    console.log('\n3. Checking leave_proposals structure...');
    try {
      // This will fail if the table doesn't exist, which is fine
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'leave_proposals');
        
      if (columnsError) throw columnsError;
      
      if (columns && columns.length > 0) {
        console.log('\n📋 leave_proposals columns:');
        console.table(columns);
      } else {
        console.log('No columns found for leave_proposals');
      }
    } catch (e) {
      console.log('Could not get column information:', e.message);
    }
    
    // Try to get a sample record
    console.log('\n4. Trying to fetch a sample record...');
    try {
      const { data: sample, error: sampleError } = await supabase
        .from('leave_proposals')
        .select('*')
        .limit(1);
        
      if (sampleError) throw sampleError;
      
      if (sample && sample.length > 0) {
        console.log('\n📝 Sample record:');
        console.log(JSON.stringify(sample[0], null, 2));
      } else {
        console.log('No records found in leave_proposals');
      }
    } catch (e) {
      console.log('Error fetching sample:', e.message);
    }
    
  } catch (error) {
    console.error('\n❌ Error checking database structure:', error);
  } finally {
    process.exit(0);
  }
}

// Run the check
checkTableStructure();
