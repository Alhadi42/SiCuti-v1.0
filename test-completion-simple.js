import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
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

async function testCompletion() {
  try {
    console.log('🔍 Starting completion test...');
    
    // 1. Create a test proposal
    console.log('\n1. Creating test proposal...');
    const testProposal = {
      proposal_title: 'Test Proposal - ' + new Date().toISOString(),
      proposed_by: '00000000-0000-0000-0000-000000000000', // Using a dummy UUID
      proposer_name: 'Test User',
      proposer_unit: 'TEST_UNIT',
      proposal_date: new Date().toISOString().split('T')[0], // Today's date
      status: 'pending'
    };
    
    const { data: newProposal, error: createError } = await supabase
      .from('leave_proposals')
      .insert(testProposal)
      .select()
      .single();
      
    if (createError) throw createError;
    console.log(`   ✅ Created test proposal with ID: ${newProposal.id}`);
    
    // 2. Mark as completed
    console.log('\n2. Marking as completed...');
    const updateData = {
      status: 'completed',
      completed_by: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      completed_at: new Date().toISOString()
    };
    
    const { data: updatedProposal, error: updateError } = await supabase
      .from('leave_proposals')
      .update(updateData)
      .eq('id', newProposal.id)
      .select()
      .single();
      
    if (updateError) {
      console.error('   ❌ Error marking as completed:', updateError);
      throw updateError;
    }
    
    console.log('   ✅ Successfully marked as completed:', {
      id: updatedProposal.id,
      status: updatedProposal.status,
      completed_at: updatedProposal.completed_at
    });
    
    // 3. Verify the update
    console.log('\n3. Verifying the update...');
    const { data: verified, error: verifyError } = await supabase
      .from('leave_proposals')
      .select('*')
      .eq('id', newProposal.id)
      .single();
      
    if (verifyError) throw verifyError;
    
    if (verified.status === 'completed') {
      console.log('   ✅ Verification successful!');
    } else {
      console.error('   ❌ Verification failed - status not updated');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    console.log('\n🏁 Test completed');
    process.exit(0);
  }
}

// Run the test
testCompletion();
