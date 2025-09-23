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

// Initialize Supabase client with auth options
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

// Test user credentials
const TEST_EMAIL = 'testadmin@example.com';
const TEST_PASSWORD = 'testpassword123'; // This should match the one in create-test-user.sql

async function testWithAuth() {
  try {
    console.log('🔐 Testing with authentication...');
    
    // 1. Sign in with test user
    console.log('\n1. Signing in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (signInError) {
      console.error('   ❌ Sign in failed:', signInError.message);
      if (signInError.message.includes('Invalid login credentials')) {
        console.log('   ℹ️ Please run create-test-user.sql in your Supabase SQL Editor first');
      }
      return;
    }
    
    console.log('   ✅ Signed in as:', signInData.user.email);
    
    // 2. Get session
    const { data: { session } } = await supabase.auth.getSession();
    
    // 3. Create a test proposal
    console.log('\n2. Creating test proposal...');
    const testProposal = {
      proposal_title: `Test Proposal - ${new Date().toISOString()}`,
      proposed_by: session.user.id,
      proposer_name: 'Test Admin',
      proposer_unit: 'TEST_UNIT',
      proposal_date: new Date().toISOString().split('T')[0],
      status: 'pending'
    };
    
    const { data: newProposal, error: createError } = await supabase
      .from('leave_proposals')
      .insert(testProposal)
      .select()
      .single();
      
    if (createError) throw createError;
    console.log(`   ✅ Created test proposal with ID: ${newProposal.id}`);
    
    // 4. Mark as completed
    console.log('\n3. Marking as completed...');
    const updateData = {
      status: 'completed',
      completed_by: session.user.id,
      completed_at: new Date().toISOString()
    };
    
    const { data: updatedProposal, error: updateError } = await supabase
      .from('leave_proposals')
      .update(updateData)
      .eq('id', newProposal.id)
      .select()
      .single();
      
    if (updateError) throw updateError;
    
    console.log('   ✅ Successfully marked as completed:', {
      id: updatedProposal.id,
      status: updatedProposal.status,
      completed_at: updatedProposal.completed_at
    });
    
    // 5. Verify the update
    console.log('\n4. Verifying the update...');
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
    // Sign out
    await supabase.auth.signOut();
    console.log('\n🏁 Test completed');
    process.exit(0);
  }
}

// Run the test
testWithAuth();
