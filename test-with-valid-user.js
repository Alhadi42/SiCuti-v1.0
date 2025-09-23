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

// First, get a valid admin user
async function getAdminUser() {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
  
  // Get the first admin user
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'admin_unit')
    .limit(1);
    
  if (error || !users || users.length === 0) {
    console.error('Error getting admin user:', error?.message || 'No admin users found');
    return null;
  }
  
  return users[0];
}

async function testWithValidUser() {
  try {
    console.log('🔐 Testing with valid admin user...');
    
    // Get a valid admin user
    const adminUser = await getAdminUser();
    if (!adminUser) {
      console.error('No admin user found. Please create an admin user first.');
      return;
    }
    
    console.log(`\nUsing admin user: ${adminUser.name} (${adminUser.email})`);
    
    // Create a client with the admin user's JWT
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          'Authorization': `Bearer ${adminUser.id}` // Using user ID as a simple token for this example
        }
      },
      auth: { persistSession: false }
    });
    
    // 1. Create a test proposal
    console.log('\n1. Creating test proposal...');
    const testProposal = {
      proposal_title: 'Test Proposal from Admin',
      proposed_by: adminUser.id,
      proposer_name: adminUser.name,
      proposer_unit: adminUser.unit_kerja,
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
      completed_by: adminUser.id
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
testWithValidUser();
