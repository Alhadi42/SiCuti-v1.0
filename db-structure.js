import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jaWVkeWNmZ2txdmNxd2R4cHJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5OTE0OSwiZXhwIjoyMDY1Mjc1MTQ5fQ.j4AzaxD2layIcpVzjJEM1U3l4_tqtnEYwH9bPI1B0Mo';

if (!supabaseUrl) {
  console.error('Error: Missing Supabase URL');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

async function checkDbStructure() {
  try {
    console.log('🔍 Checking database structure...');
    
    // 1. List all tables in the public schema
    console.log('\n📋 Listing all tables in public schema:');
    const { data: tables, error: tablesError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
      
    if (tablesError) throw tablesError;
    
    if (tables && tables.length > 0) {
      console.log('\nFound tables:');
      for (const table of tables) {
        console.log(`\n📊 Table: ${table.tablename}`);
        
        // Get column info for this table
        const { data: columns, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable, column_default')
          .eq('table_schema', 'public')
          .eq('table_name', table.tablename);
          
        if (columnsError) {
          console.error(`Error getting columns for ${table.tablename}:`, columnsError);
          continue;
        }
        
        if (columns && columns.length > 0) {
          console.log('Columns:');
          console.table(columns);
        } else {
          console.log('No columns found or access denied');
        }
      }
    } else {
      console.log('No tables found in public schema');
    }
    
    // 2. Check auth schema (if accessible)
    console.log('\n🔐 Checking auth schema access...');
    try {
      const { data: authUsers, error: authError } = await supabase
        .from('auth.users')
        .select('*')
        .limit(1);
        
      if (authError) throw authError;
      
      if (authUsers && authUsers.length > 0) {
        console.log('\n👤 Sample auth user:', {
          id: authUsers[0].id,
          email: authUsers[0].email,
          email_confirmed_at: authUsers[0].email_confirmed_at,
          created_at: authUsers[0].created_at
        });
      } else {
        console.log('No users found in auth.users');
      }
    } catch (authErr) {
      console.log('Cannot access auth.users directly:', authErr.message);
    }
    
  } catch (error) {
    console.error('\n❌ Error checking database structure:', error);
  } finally {
    process.exit(0);
  }
}

// Run the check
checkDbStructure();
