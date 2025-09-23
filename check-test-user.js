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

async function checkUser() {
  try {
    console.log('🔍 Checking test user...');
    
    // Check in auth.users
    console.log('\n1. Checking auth.users...');
    const { data: authUser, error: authError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'testadmin@example.com')
      .single();
      
    if (authError) {
      console.error('   ❌ Error checking auth.users:', authError);
    } else if (authUser) {
      console.log('   ✅ Found user in auth.users:', {
        id: authUser.id,
        email: authUser.email,
        confirmed_at: authUser.confirmed_at,
        last_sign_in_at: authUser.last_sign_in_at
      });
    } else {
      console.log('   ❌ User not found in auth.users');
    }
    
    // Check in public.users
    console.log('\n2. Checking public.users...');
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'testadmin@example.com')
      .single();
      
    if (publicError) {
      console.error('   ❌ Error checking public.users:', publicError);
    } else if (publicUser) {
      console.log('   ✅ Found user in public.users:', {
        id: publicUser.id,
        email: publicUser.email,
        username: publicUser.username,
        role: publicUser.role,
        unit_kerja: publicUser.unit_kerja,
        status: publicUser.status
      });
    } else {
      console.log('   ❌ User not found in public.users');
    }
    
  } catch (error) {
    console.error('\n❌ Error checking user:', error);
  } finally {
    console.log('\n🏁 Check completed');
    process.exit(0);
  }
}

// Run the check
checkUser();
