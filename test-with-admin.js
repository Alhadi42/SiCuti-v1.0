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

// Admin credentials from the database
const ADMIN_CREDENTIALS = [
  {
    email: 'adminbbpvpserang@gmail.com',
    password: 'testpassword123' // Note: You'll need to know the actual password
  },
  {
    email: 'adminbbpvpbekasi@gmail.com',
    password: 'testpassword123'
  },
  {
    email: 'adminbbpvpbandung@gmail.com',
    password: 'testpassword123'
  }
];

async function testWithAdmin() {
  try {
    console.log('🔐 Testing with admin account...');
    
    let supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    
    // Try each admin account until one works
    for (const admin of ADMIN_CREDENTIALS) {
      console.log(`\nTrying admin: ${admin.email}`);
      
      // Sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: admin.email,
        password: admin.password
      });
      
      if (signInError) {
        console.log(`❌ Login failed for ${admin.email}: ${signInError.message}`);
        continue;
      }
      
      console.log(`✅ Successfully signed in as ${admin.email}`);
      
      // Create a test proposal
      const testProposal = {
        unit_name: 'TEST_UNIT',
        proposal_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        created_by: signInData.user.id,
        updated_at: new Date().toISOString()
      };
      
      console.log('\nCreating test proposal...');
      const { data: proposal, error: proposalError } = await supabase
        .from('leave_proposals')
        .insert(testProposal)
        .select()
        .single();
        
      if (proposalError) {
        console.error('❌ Error creating proposal:', proposalError);
        continue;
      }
      
      console.log('✅ Created test proposal:', proposal.id);
      
      // Mark as completed
      console.log('\nMarking proposal as completed...');
      const { data: updatedProposal, error: updateError } = await supabase
        .from('leave_proposals')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: signInData.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', proposal.id)
        .select()
        .single();
        
      if (updateError) {
        console.error('❌ Error updating proposal:', updateError);
        continue;
      }
      
      console.log('✅ Successfully marked as completed:', {
        id: updatedProposal.id,
        status: updatedProposal.status,
        completed_at: updatedProposal.completed_at,
        completed_by: updatedProposal.completed_by
      });
      
      // Verify the update
      console.log('\nVerifying update...');
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
      
      return; // Stop after first successful test
    }
    
    console.log('\n❌ All admin login attempts failed. Please check the credentials.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    console.log('\n🏁 Test completed');
    process.exit(0);
  }
}

// Run the test
testWithAdmin();
