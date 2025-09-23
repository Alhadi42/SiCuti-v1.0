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

async function checkConstraints() {
  try {
    console.log('🔍 Checking table constraints...');
    
    // 1. Get a sample user to check the ID format
    console.log('\n1. Checking users table...');
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .limit(1);
      
    if (users && users.length > 0) {
      const user = users[0];
      console.log('Sample user:', {
        id: user.id,
        id_type: typeof user.id,
        name: user.name,
        email: user.email
      });
    } else {
      console.log('No users found in the database');
      return;
    }
    
    // 2. Try to get the table structure using a raw query
    console.log('\n2. Checking leave_proposals table structure...');
    
    // Try to get a single record to see the structure
    const { data: proposals, error: proposalsError } = await supabase
      .from('leave_proposals')
      .select('*')
      .limit(1);
      
    if (proposalsError) {
      console.error('Error getting proposals:', proposalsError);
    } else if (proposals && proposals.length > 0) {
      console.log('Sample proposal:', proposals[0]);
    } else {
      console.log('No proposals found in the database');
    }
    
    // 3. Check the foreign key constraint
    console.log('\n3. Checking foreign key constraint...');
    
    // Get the user ID to test with
    const userId = users[0].id;
    
    // Try to find the user by ID directly
    const { data: userCheck, error: userCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (userCheckError) {
      console.error('Error finding user by ID:', userCheckError);
    } else {
      console.log('✅ User found by ID:', userCheck);
      
      // Try to insert a test proposal
      console.log('\n4. Attempting to insert a test proposal...');
      
      const testProposal = {
        proposal_title: 'Test Proposal - Final Attempt',
        proposed_by: userId,
        proposer_name: userCheck.name,
        proposer_unit: userCheck.unit_kerja || 'TEST_UNIT',
        proposal_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('Test proposal data:', testProposal);
      
      const { data: insertedProposal, error: insertError } = await supabase
        .from('leave_proposals')
        .insert(testProposal)
        .select()
        .single();
        
      if (insertError) {
        console.error('❌ Error inserting proposal:', insertError);
        
        // If there's a foreign key constraint violation, try to find the issue
        if (insertError.code === '23503') {
          console.log('\n🔍 Foreign key constraint violation detected');
          console.log('This usually means the user ID in the proposed_by field does not exist in the users table');
          console.log('Or there might be a data type mismatch between the ID fields');
          
          // Check the data type of the ID in the users table
          console.log('\nChecking data types...');
          console.log('User ID type:', typeof userId);
          console.log('User ID value:', userId);
          
          // Try to find any differences in the ID format
          const { data: allUsers } = await supabase
            .from('users')
            .select('id')
            .limit(5);
            
          if (allUsers) {
            console.log('\nSample user IDs from database:');
            allUsers.forEach((user, index) => {
              console.log(`User ${index + 1}:`, {
                id: user.id,
                type: typeof user.id,
                length: user.id ? user.id.length : 0
              });
            });
          }
        }
      } else {
        console.log('✅ Successfully inserted test proposal:', insertedProposal);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkConstraints();
