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

async function checkAuthUsers() {
  try {
    console.log('🔍 Checking auth.users table...');
    
    // Try to query the auth.users table directly
    const { data: authUsers, error } = await supabase
      .from('auth.users')
      .select('*')
      .limit(5);
      
    if (error) {
      console.error('Error querying auth.users:', error);
      
      // If we can't query auth.users directly, try with RPC
      console.log('\nTrying with RPC...');
      const { data: rpcResult, error: rpcError } = await supabase.rpc('list_auth_users');
      
      if (rpcError) {
        console.error('RPC error:', rpcError);
        
        // If RPC fails, try to create a test user in auth.users
        console.log('\nAttempting to create a test user in auth.users...');
        await createTestAuthUser();
      } else {
        console.log('Auth users (via RPC):', rpcResult);
      }
    } else {
      console.log('Auth users:', authUsers);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

async function createTestAuthUser() {
  try {
    console.log('🔧 Creating test user in auth.users...');
    
    // This is a simplified version - in a real app, you'd use the Supabase Auth API
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'testuser@example.com',
      password: 'securepassword123',
      email_confirm: true,
      user_metadata: { name: 'Test User' }
    });
    
    if (error) {
      console.error('Error creating auth user:', error);
      
      // If user already exists, try to sign in
      if (error.message.includes('already registered')) {
        console.log('User already exists, trying to sign in...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: 'testuser@example.com',
          password: 'securepassword123'
        });
        
        if (signInError) {
          console.error('Sign in error:', signInError);
        } else {
          console.log('Successfully signed in:', signInData);
        }
      }
    } else {
      console.log('Created auth user:', data);
    }
    
  } catch (error) {
    console.error('Error in createTestAuthUser:', error);
  }
}

checkAuthUsers();
