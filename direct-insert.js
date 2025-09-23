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

async function insertTestProposal() {
  try {
    console.log('🚀 Inserting test proposal...');
    
    // Get a valid user ID first
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, name, unit_kerja')
      .limit(1);
      
    if (userError || !users || users.length === 0) {
      console.error('❌ Error getting user:', userError?.message || 'No users found');
      return;
    }
    
    const user = users[0];
    console.log(`✅ Using user: ${user.name} (${user.id})`);
    
    // Insert test proposal
    const { data, error } = await supabase
      .from('leave_proposals')
      .insert({
        proposal_title: 'Test Proposal - Direct Insert',
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
      
    if (error) throw error;
    
    console.log('✅ Test proposal created successfully!');
    console.log('Proposal ID:', data.id);
    console.log('Status:', data.status);
    
    return data;
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

insertTestProposal();
