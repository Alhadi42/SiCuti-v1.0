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

async function testProposalFlow() {
  try {
    console.log('🚀 Testing Proposal Flow with Fixed Foreign Key');
    console.log('--------------------------------------------');
    
    // 1. Get a valid user from the database
    console.log('\n1. Fetching a valid user...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
      
    if (userError || !users || users.length === 0) {
      console.error('❌ Error fetching users:', userError?.message || 'No users found');
      return;
    }
    
    const user = users[0];
    console.log(`✅ Using user: ${user.name} (${user.email})`);
    
    // 2. Create a test proposal
    console.log('\n2. Creating test proposal...');
    const testProposal = {
      proposal_title: 'Test Proposal - After FK Fix',
      proposed_by: user.id,
      proposer_name: user.name,
      proposer_unit: user.unit_kerja || 'TEST_UNIT',
      proposal_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: proposal, error: createError } = await supabase
      .from('leave_proposals')
      .insert(testProposal)
      .select()
      .single();
      
    if (createError) {
      console.error('❌ Error creating proposal:', createError);
      return;
    }
    
    console.log('✅ Created test proposal:', {
      id: proposal.id,
      title: proposal.proposal_title,
      status: proposal.status,
      unit: proposal.proposer_unit
    });
    
    // 3. Mark as completed
    console.log('\n3. Marking proposal as completed...');
    const updateData = {
      status: 'processed',
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      completed_by: user.id
    };
    
    const { data: updatedProposal, error: updateError } = await supabase
      .from('leave_proposals')
      .update(updateData)
      .eq('id', proposal.id)
      .select()
      .single();
      
    if (updateError) {
      console.error('❌ Error updating proposal:', updateError);
      return;
    }
    
    console.log('✅ Successfully marked as completed:', {
      id: updatedProposal.id,
      status: updatedProposal.status,
      completed_at: updatedProposal.completed_at,
      updated_at: updatedProposal.updated_at
    });
    
    // 4. Verify the update
    console.log('\n4. Verifying update...');
    const { data: verifiedProposal, error: verifyError } = await supabase
      .from('leave_proposals')
      .select('*')
      .eq('id', proposal.id)
      .single();
      
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
    } else {
      console.log('✅ Verification successful:', {
        id: verifiedProposal.id,
        status: verifiedProposal.status,
        completed_at: verifiedProposal.completed_at,
        updated_at: verifiedProposal.updated_at,
        is_completed: verifiedProposal.status === 'processed' && verifiedProposal.completed_at !== null
      });
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testProposalFlow();
