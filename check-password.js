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

async function checkPassword() {
  try {
    console.log('🔐 Checking password...');
    
    // Get the hashed password from auth.users
    const { data: authUser, error } = await supabase
      .from('users')
      .select('encrypted_password')
      .eq('email', 'testadmin@example.com')
      .single();
      
    if (error) throw error;
    
    console.log('\n=== Password Hash ===');
    console.log(authUser.encrypted_password);
    
    // Try to verify the password
    const { data: verify, error: verifyError } = await supabase.rpc('verify_user_password', {
      user_id: '11111111-1111-1111-1111-111111111111',
      password: 'testpassword123'
    });
    
    if (verifyError) {
      console.log('\n❌ Password verification failed:', verifyError);
    } else {
      console.log('\n✅ Password verified successfully!');
    }
    
  } catch (error) {
    console.error('\n❌ Error checking password:', error);
  } finally {
    console.log('\n🏁 Check completed');
    process.exit(0);
  }
}

// Run the check
checkPassword();
