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

async function checkConstraints() {
  try {
    console.log('🔍 Checking table constraints...');
    
    // 1. Get a sample user to check the ID format
    console.log('\n1. Checking users table...');
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .limit(1);
      
    if (users && users.length > 0) {
      const user = users[0];
      console.log('Sample user:', {
        id: user.id,
        id_type: typeof user.id,
        name: user.name,
        email: user.email
      });
    } else {
      console.log('No users found in the database');
      return;
    }
    
    // 2. Try to get the table structure using a raw query
    console.log('\n2. Checking leave_proposals table structure...');
    try {
      const { data, error } = await supabase.rpc('get_table_columns', { 
        table_name: 'leave_proposals' 
      });
      
      if (error) throw error;
      console.log('Table columns:', data);
      
    } catch (e) {
      console.log('Could not get column info, trying alternative method...');
      
      // Try a direct insert with RLS bypass
      console.log('\n3. Attempting direct insert with RLS bypass...');
      const { data: insertData, error: insertError } = await supabase
        .rpc('exec_sql', {
          query: `
            INSERT INTO leave_proposals (
              proposal_title, 
              proposed_by, 
              proposer_name, 
              proposer_unit, 
              proposal_date, 
              status, 
              created_at, 
              updated_at
            ) VALUES (
              'Test Proposal - Direct SQL', 
              '${users[0].id}', 
              'Test User', 
              'TEST_UNIT', 
              '${new Date().toISOString().split('T')[0]}', 
              'pending', 
              NOW(), 
              NOW()
            )
            RETURNING *;
          `
        });
        
      if (insertError) {
        console.error('❌ Direct insert error:', insertError);
      } else {
        console.log('✅ Direct insert successful:', insertData);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error checking constraints:', error);
  } finally {
    process.exit(0);
  }
}

checkConstraints();
