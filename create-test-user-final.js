import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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

async function createTestUser() {
  try {
    console.log('👤 Creating test user...');
    
    const userId = uuidv4();
    const testData = {
      id: userId,
      name: 'Test Admin',
      username: 'testadmin',
      password: '$2b$10$D.hJ9nCjTCfMfCV2O5MbM.9vTyRbmooAvWuv8c9Dh.WlnkOooV/da', // hashed 'testpassword123'
      email: 'testadmin@example.com',
      role: 'admin_unit',
      unit_kerja: 'TEST_UNIT',
      status: 'active',
      last_login: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      permissions: ['dashboard', 'employees_unit', 'leave_requests_unit', 'leave_history_unit']
    };

    // First, delete if exists
    console.log('\n1. Removing existing test user if any...');
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .or(`username.eq.testadmin,email.eq.${testData.email}`);
    
    if (deleteError && !deleteError.message.includes('No rows deleted')) {
      console.log('   ℹ️ No existing test user to remove');
    } else {
      console.log('   ✅ Removed existing test user');
    }
    
    // Insert new test user
    console.log('\n2. Creating test user...');
    const { data, error } = await supabase
      .from('users')
      .insert(testData)
      .select();
      
    if (error) throw error;
    
    console.log('✅ Test user created successfully:', {
      id: data[0].id,
      username: data[0].username,
      email: data[0].email,
      role: data[0].role
    });
    
    // Test login
    console.log('\n3. Testing login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testData.email,
      password: 'testpassword123'
    });
    
    if (loginError) {
      console.error('❌ Login failed:', loginError.message);
    } else {
      console.log('✅ Login successful!', {
        user: loginData.user.email,
        session: loginData.session ? 'Session created' : 'No session'
      });
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

createTestUser();
