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

async function checkDbStructure() {
  try {
    console.log('🔍 Checking database structure...');
    
    // 1. Try to get all tables using a raw SQL query
    console.log('\n1. Getting all tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('sqlite_master')
      .select('name, type')
      .eq('type', 'table');
      
    if (tablesError) {
      console.error('Error getting tables:', tablesError);
    } else if (tables && tables.length > 0) {
      console.log('\n📋 Tables:');
      console.table(tables);
      
      // 2. Check structure of each table
      for (const table of tables) {
        console.log(`\n🔍 Structure of ${table.name}:`);
        try {
          // Get one record to see the structure
          const { data: sample, error: sampleError } = await supabase
            .from(table.name)
            .select('*')
            .limit(1);
            
          if (sampleError) throw sampleError;
          
          if (sample && sample.length > 0) {
            console.log('Columns:', Object.keys(sample[0]));
            console.log('Sample:', JSON.stringify(sample[0], null, 2));
          } else {
            console.log('No data in table');
          }
        } catch (e) {
          console.error(`Error checking table ${table.name}:`, e.message);
        }
      }
    } else {
      console.log('No tables found');
    }
    
  } catch (error) {
    console.error('\n❌ Error checking database structure:', error);
  } finally {
    process.exit(0);
  }
}

// Run the check
checkDbStructure();
