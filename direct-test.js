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

async function testDirect() {
  try {
    console.log('🔍 Testing direct database access...');
    
    // 1. Try to list users
    console.log('\n1. Listing users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
      
    if (usersError) {
      console.error('Error fetching users:', usersError);
    } else {
      console.log('Found users:', users);
    }
    
    // 2. Try to insert a test record
    console.log('\n2. Testing insert...');
    const testData = {
      name: 'Test User',
      email: 'test@example.com',
      role: 'test',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert(testData)
      .select();
      
    if (insertError) {
      console.error('Error inserting test data:', insertError);
    } else {
      console.log('Successfully inserted test data:', insertData);
    }
    
    // 3. Test leave_proposals table
    console.log('\n3. Testing leave_proposals...');
    const { data: proposals, error: proposalsError } = await supabase
      .from('leave_proposals')
      .select('*')
      .limit(2);
      
    if (proposalsError) {
      console.error('Error fetching leave proposals:', proposalsError);
    } else {
      console.log('Found leave proposals:', proposals);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    console.log('\n🏁 Test completed');
    process.exit(0);
  }
}

// Run the test
testDirect();
