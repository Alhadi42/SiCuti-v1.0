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

async function checkColumnNullable() {
  try {
    console.log('🔍 Checking if completed_by allows NULL values...');
    
    // Get column information
    const { data: columnInfo, error } = await supabase.rpc('get_columns', {
      table_name: 'leave_proposals',
      column_name: 'completed_by'
    }).catch(() => ({}));
    
    if (error || !columnInfo) {
      console.log('Could not get column info via RPC, trying direct SQL...');
      
      // Fallback to raw SQL if RPC is not available
      const { data, error: sqlError } = await supabase.rpc('exec_sql', {
        query: `
          SELECT column_name, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'leave_proposals' 
          AND column_name = 'completed_by';
        `
      }).catch(() => ({}));
      
      if (sqlError || !data) {
        console.error('❌ Error getting column info:', sqlError || 'Unknown error');
        console.log('\nPlease run the following SQL in your database to check the column:');
        console.log(`
          SELECT column_name, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'leave_proposals' 
          AND column_name = 'completed_by';
        `);
        return;
      }
      
      console.log('Column info:', data);
      return;
    }
    
    console.log('Column info:', columnInfo);
    
  } catch (error) {
    console.error('❌ Error checking column:', error);
  }
}

checkColumnNullable();
