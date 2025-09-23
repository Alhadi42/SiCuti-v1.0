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

async function listAllTables() {
  try {
    console.log('🔍 Listing all tables...');
    
    // Try to get all tables using a raw SQL query
    const { data, error } = await supabase.rpc('get_all_tables');
    
    if (error) {
      console.error('Error getting tables:', error);
      
      // If the RPC function doesn't exist, try to get tables using information_schema
      console.log('\nTrying alternative method...');
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
        
      if (tablesError) {
        console.error('Error getting tables from information_schema:', tablesError);
        return;
      }
      
      if (tables && tables.length > 0) {
        console.log('\n📋 Tables in public schema:');
        for (const table of tables) {
          console.log(`- ${table.table_name}`);
        }
      } else {
        console.log('No tables found in public schema');
      }
    } else {
      console.log('\n📋 Tables:', data);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

listAllTables();
