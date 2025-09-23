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

async function testProposalCompletion() {
  try {
    console.log('🚀 Testing Proposal Completion Flow');
    console.log('--------------------------------');
    
    // 1. Create a test proposal
    console.log('\n1. Creating test proposal...');
    const testProposal = {
      proposal_title: 'Test Proposal',
      proposed_by: '00000000-0000-0000-0000-000000000000', // Test user ID
      proposer_name: 'Test Admin',
      proposer_unit: 'TEST_UNIT',
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
    
    // 2. Mark as completed
    console.log('\n2. Marking proposal as completed...');
    const updateData = {
      status: 'processed',
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      completed_by: '00000000-0000-0000-0000-000000000000'
    };
    
    const { data: updatedProposal, error: updateError } = await supabase
      .from('leave_proposals')
      .update(updateData)
      .eq('id', proposal.id)
      .select()
      .single();
      
    if (updateError) {
      console.error('❌ Error updating proposal:', updateError);
      
      // Check for RLS issues
      if (updateError.code === '42501') {
        console.log('\n🔒 RLS Policy Issue Detected');
        console.log('The database has Row Level Security (RLS) enabled.');
        console.log('Please run this SQL in your Supabase SQL Editor to temporarily disable RLS for testing:');
        console.log('\nALTER TABLE leave_proposals DISABLE ROW LEVEL SECURITY;');
        console.log('\nAfter testing, re-enable it with:');
        console.log('ALTER TABLE leave_proposals ENABLE ROW LEVEL SECURITY;');
      }
      
      return;
    }
    
    console.log('✅ Successfully marked as completed:', {
      id: updatedProposal.id,
      status: updatedProposal.status,
      completed_at: updatedProposal.completed_at,
      updated_at: updatedProposal.updated_at
    });
    
    // 3. Verify the update
    console.log('\n3. Verifying update...');
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
        updated_at: verifiedProposal.updated_at
      });
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    console.log('\n🏁 Test completed');
    process.exit(0);
  }
}

// Run the test
testProposalCompletion();
