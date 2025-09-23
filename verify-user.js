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

async function verifyUser() {
  try {
    console.log('🔍 Verifying test user...');
    
    // 1. Check auth.users
    console.log('\n1. Checking auth.users...');
    const { data: authUser, error: authError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'testadmin@example.com')
      .single();
      
    if (authError) throw authError;
    
    if (authUser) {
      console.log('✅ Found in auth.users:', {
        id: authUser.id,
        email: authUser.email,
        email_confirmed_at: authUser.email_confirmed_at,
        last_sign_in_at: authUser.last_sign_in_at,
        raw_user_meta_data: authUser.raw_user_meta_data
      });
    } else {
      console.log('❌ User not found in auth.users');
    }
    
    // 2. Check public.users
    console.log('\n2. Checking public.users...');
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'testadmin@example.com')
      .single();
      
    if (publicError) throw publicError;
    
    if (publicUser) {
      console.log('✅ Found in public.users:', {
        id: publicUser.id,
        email: publicUser.email,
        username: publicUser.username,
        role: publicUser.role,
        unit_kerja: publicUser.unit_kerja,
        status: publicUser.status,
        created_at: publicUser.created_at
      });
    } else {
      console.log('❌ User not found in public.users');
    }
    
    // 3. Try to sign in
    console.log('\n3. Testing sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'testadmin@example.com',
      password: 'testpassword123'
    });
    
    if (signInError) {
      console.log('❌ Sign in failed:', signInError.message);
    } else {
      console.log('✅ Sign in successful!', {
        user: signInData.user.email,
        session: signInData.session ? 'Session created' : 'No session'
      });
    }
    
  } catch (error) {
    console.error('\n❌ Error during verification:', error);
  } finally {
    process.exit(0);
  }
}

verifyUser();
