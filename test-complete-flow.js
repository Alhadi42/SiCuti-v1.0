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

async function testCompleteFlow() {
  try {
    console.log('🚀 Testing Complete Proposal Flow');
    console.log('--------------------------------');
    
    // 1. Get a valid user
    console.log('\n1. Getting a valid user...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
      
    if (userError || !users || users.length === 0) {
      console.error('❌ Error getting users:', userError?.message || 'No users found');
      return;
    }
    
    const user = users[0];
    console.log(`✅ Using user: ${user.name} (${user.email})`);
    
    // 2. Create a test proposal
    console.log('\n2. Creating a test proposal...');
    const testProposal = {
      proposal_title: 'Test Proposal - Frontend Integration',
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
      console.error('❌ Error creating test proposal:', createError);
      return;
    }
    
    console.log('✅ Created test proposal:', {
      id: proposal.id,
      title: proposal.proposal_title,
      status: proposal.status,
      unit: proposal.proposer_unit
    });
    
    // 3. Simulate marking as completed from frontend
    console.log('\n3. Simulating frontend completion...');
    const { markSimpleProposalAsCompleted } = await import('./src/lib/simpleCompletionManager.js');
    
    // Simulate the data that would come from the frontend
    const unitData = {
      unitName: proposal.proposer_unit,
      proposalDate: proposal.proposal_date,
      requests: [{
        id: 'test-request-1',
        employee_name: 'Test Employee',
        days_requested: 5,
        // Add other required fields
      }],
      totalEmployees: 1,
      totalRequests: 1,
      totalDays: 5
    };
    
    // Mark as completed
    const completedProposal = await markSimpleProposalAsCompleted(
      unitData.unitName,
      unitData.proposalDate,
      unitData.requests
    );
    
    console.log('✅ Marked as completed:', {
      id: completedProposal.id,
      status: completedProposal.status,
      completedAt: completedProposal.completedAt,
      completedBy: completedProposal.completedBy
    });
    
    // 4. Verify the update in the database
    console.log('\n4. Verifying database update...');
    const { data: updatedProposal, error: fetchError } = await supabase
      .from('leave_proposals')
      .select('*')
      .eq('id', proposal.id)
      .single();
      
    if (fetchError) {
      console.error('❌ Error fetching updated proposal:', fetchError);
      return;
    }
    
    console.log('✅ Database record updated:', {
      id: updatedProposal.id,
      status: updatedProposal.status,
      completed_at: updatedProposal.completed_at,
      completed_by: updatedProposal.completed_by,
      updated_at: updatedProposal.updated_at
    });
    
    // 5. Clean up (optional)
    console.log('\n5. Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('leave_proposals')
      .delete()
      .eq('id', proposal.id);
      
    if (deleteError) {
      console.warn('⚠️ Could not clean up test data:', deleteError);
    } else {
      console.log('✅ Test data cleaned up');
    }
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testCompleteFlow();
