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

async function listTables() {
  try {
    console.log('🔍 Listing all tables...');
    
    // Try to get a list of tables using a raw SQL query
    const { data, error } = await supabase.rpc('get_all_tables');
    
    if (error) {
      console.error('Error getting tables:', error);
      
      // If the RPC function doesn't exist, try to get tables using information_schema
      console.log('\nTrying alternative method...');
      const { data: tables, error: tablesError } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');
        
      if (tablesError) {
        console.error('Error getting tables from pg_tables:', tablesError);
        return;
      }
      
      if (tables && tables.length > 0) {
        console.log('\n📋 Tables in public schema:');
        for (const table of tables) {
          console.log(`- ${table.tablename}`);
        }
      } else {
        console.log('No tables found in public schema');
      }
    } else {
      console.log('\n📋 Tables:', data);
    }
    
    // Try to get the structure of the first table
    console.log('\n🔍 Checking first table structure...');
    try {
      const firstTable = data && data.length > 0 ? data[0] : 'users';
      console.log(`Getting structure of table: ${firstTable}`);
      
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', firstTable);
        
      if (columnsError) throw columnsError;
      
      if (columns && columns.length > 0) {
        console.log(`\n📋 Columns in ${firstTable}:`);
        console.table(columns);
      } else {
        console.log(`No columns found for ${firstTable}`);
      }
    } catch (e) {
      console.log('Could not get table structure:', e.message);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

listTables();
