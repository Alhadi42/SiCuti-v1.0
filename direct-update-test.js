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

async function testDirectUpdate() {
  try {
    console.log('🔍 Testing direct update to leave_proposals table...');
    
    // 1. Get a test proposal
    console.log('\n1. Getting a test proposal...');
    const { data: proposals, error: fetchError } = await supabase
      .from('leave_proposals')
      .select('*')
      .limit(1);
      
    if (fetchError) {
      console.error('❌ Error fetching proposals:', fetchError);
      return;
    }
    
    if (!proposals || proposals.length === 0) {
      console.log('ℹ️ No proposals found. Creating a test proposal...');
      const { data: newProposal, error: createError } = await supabase
        .from('leave_proposals')
        .insert([{
          proposal_title: 'Test Proposal',
          proposed_by: '00000000-0000-0000-0000-000000000000', // Dummy UUID
          proposer_name: 'Test User',
          proposer_unit: 'TEST_UNIT',
          proposal_date: new Date().toISOString().split('T')[0],
          status: 'pending'
        }])
        .select()
        .single();
        
      if (createError) {
        console.error('❌ Error creating test proposal:', createError);
        return;
      }
      
      console.log('✅ Created test proposal:', newProposal.id);
      await testUpdateOperation(newProposal.id);
    } else {
      console.log('ℹ️ Found existing proposal:', proposals[0].id);
      await testUpdateOperation(proposals[0].id);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function testUpdateOperation(proposalId) {
  try {
    console.log(`\n2. Testing update operation on proposal ${proposalId}...`);
    
    const updateData = {
      status: 'completed',
      completed_by: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('🔄 Attempting to update with data:', updateData);
    
    const { data, error } = await supabase
      .from('leave_proposals')
      .update(updateData)
      .eq('id', proposalId)
      .select()
      .single();
      
    if (error) {
      console.error('❌ Update failed:', error);
      
      // Check if columns exist
      console.log('\n🔍 Checking if columns exist...');
      const { data: columns, error: columnError } = await supabase
        .rpc('get_columns', { table_name: 'leave_proposals' })
        .catch(() => ({}));
        
      console.log('Columns:', columns || 'Could not fetch columns');
      
      // Check RLS policies
      console.log('\n🔍 Checking RLS policies...');
      const { data: policies, error: policyError } = await supabase
        .rpc('get_policies', { table_name: 'leave_proposals' })
        .catch(() => ({}));
        
      console.log('Policies:', policies || 'Could not fetch policies');
      
    } else {
      console.log('✅ Update successful:', data);
    }
    
  } catch (error) {
    console.error('❌ Error during update test:', error);
  }
}

testDirectUpdate();
