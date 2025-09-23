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
    
    // 1. Get or create a test user
    console.log('\n1. Getting or creating a test user...');
    let testUser = await getOrCreateTestUser();
    
    if (!testUser) {
      console.error('❌ Failed to get or create test user');
      return;
    }
    
    console.log(`✅ Using user: ${testUser.name} (${testUser.email})`);
    
    // 2. Create a test proposal
    console.log('\n2. Creating a test proposal...');
    const testProposal = {
      proposal_title: 'Test Proposal - Frontend Integration',
      proposed_by: testUser.id,
      proposer_name: testUser.name,
      proposer_unit: testUser.unit_kerja || 'TEST_UNIT',
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
    
    // 3. Mark as completed
    console.log('\n3. Marking proposal as completed...');
    const updateData = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Only set completed_by if the user exists in the users table
    const { data: userExists } = await supabase
      .from('users')
      .select('id')
      .eq('id', testUser.id)
      .single();
    
    if (userExists) {
      updateData.completed_by = testUser.id;
      console.log('✅ User exists in users table, setting completed_by');
    } else {
      console.log('ℹ️ User not found in users table, leaving completed_by as NULL');
    }
    
    const { data: updatedProposal, error: updateError } = await supabase
      .from('leave_proposals')
      .update(updateData)
      .eq('id', proposal.id)
      .select()
      .single();
      
    if (updateError) {
      console.error('❌ Error updating proposal:', updateError);
      
      // Check if the error is due to foreign key constraint
      if (updateError.code === '23503' && updateError.details.includes('completed_by_fkey')) {
        console.log('\n⚠️ Foreign key constraint violation on completed_by');
        console.log('The user ID does not exist in the users table.');
        console.log('\nTo fix this, you need to either:');
        console.log('1. Add the user to the users table, or');
        console.log('2. Modify the completed_by column to allow NULL values');
      }
      
      return;
    }
    
    console.log('✅ Successfully marked as completed:', {
      id: updatedProposal.id,
      status: updatedProposal.status,
      completed_at: updatedProposal.completed_at,
      completed_by: updatedProposal.completed_by
    });
    
    // 4. Verify in database
    console.log('\n4. Verifying in database...');
    const { data: dbProposal, error: fetchError } = await supabase
      .from('leave_proposals')
      .select('*')
      .eq('id', proposal.id)
      .single();
      
    if (fetchError) {
      console.error('❌ Error fetching updated proposal:', fetchError);
      return;
    }
    
    console.log('✅ Database record:', {
      id: dbProposal.id,
      status: dbProposal.status,
      completed_at: dbProposal.completed_at,
      completed_by: dbProposal.completed_by,
      updated_at: dbProposal.updated_at
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
  }
}

async function getOrCreateTestUser() {
  // Try to get an existing test user
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .ilike('email', '%test%')
    .limit(1)
    .single();
    
  if (existingUser) {
    return existingUser;
  }
  
  // If no test user exists, create one
  const testUser = {
    email: 'test.user@example.com',
    name: 'Test User',
    unit_kerja: 'TEST_UNIT',
    role: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  const { data: newUser, error } = await supabase
    .from('users')
    .insert(testUser)
    .select()
    .single();
    
  if (error) {
    console.error('Error creating test user:', error);
    return null;
  }
  
  return newUser;
}

testCompleteFlow();
