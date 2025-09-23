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
    console.log('🔍 Listing all tables using direct query...');
    
    // Get all tables in the public schema
    const { data: tables, error } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
      
    if (error) {
      console.error('Error getting tables:', error);
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
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

listTables();
