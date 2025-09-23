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

async function directSqlInsert() {
  try {
    console.log('🚀 Attempting direct SQL insert...');
    
    // First, get a valid user ID
    const { data: users } = await supabase
      .from('users')
      .select('id, name, unit_kerja')
      .limit(1);
    
    if (!users || users.length === 0) {
      console.error('❌ No users found in the database');
      return;
    }
    
    const user = users[0];
    console.log(`✅ Using user: ${user.name} (${user.id})`);
    
    // Create the SQL query
    const query = `
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
        '${user.id}',
        '${user.name.replace(/'/g, "''")}',
        '${user.unit_kerja || 'TEST_UNIT'}',
        '${new Date().toISOString().split('T')[0]}',
        'pending',
        NOW(),
        NOW()
      )
      RETURNING *;
    `;
    
    console.log('\nExecuting SQL query:', query);
    
    // Execute the raw SQL query
    const { data, error } = await supabase.rpc('sql', { query });
    
    if (error) {
      console.error('❌ SQL error:', error);
      
      // Try with a different approach using the REST API
      console.log('\nTrying with REST API...');
      const { data: insertData, error: insertError } = await supabase
        .from('leave_proposals')
        .insert({
          proposal_title: 'Test Proposal - REST API',
          proposed_by: user.id,
          proposer_name: user.name,
          proposer_unit: user.unit_kerja || 'TEST_UNIT',
          proposal_date: new Date().toISOString().split('T')[0],
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (insertError) {
        console.error('❌ REST API error:', insertError);
      } else {
        console.log('✅ REST API insert successful:', insertData);
      }
      
    } else {
      console.log('✅ Direct SQL insert successful:', data);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

directSqlInsert();
