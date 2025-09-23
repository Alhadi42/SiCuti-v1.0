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

async function createTestUser() {
  try {
    console.log('🔧 Creating test user...');
    
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'testuser@example.com',
      password: 'Test@1234',
      email_confirm: true,
      user_metadata: { 
        name: 'Test User',
        role: 'admin_unit',
        unit_kerja: 'TEST_UNIT'
      }
    });
    
    if (authError) throw authError;
    
    const userId = authData.user.id;
    console.log('✅ Auth user created:', userId);
    
    // 2. Create public user record
    const { error: publicError } = await supabase
      .from('users')
      .insert({
        id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
        name: 'Test User',
        role: 'admin_unit',
        unit_kerja: 'TEST_UNIT',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (publicError) throw publicError;
    
    console.log('✅ Public user record created');
    
    return {
      id: userId,
      email: 'testuser@example.com',
      password: 'Test@1234',
      name: 'Test User',
      unit_kerja: 'TEST_UNIT'
    };
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    return null;
  }
}

// Run the function
createTestUser().then(user => {
  if (user) {
    console.log('\nTest user created successfully!');
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('Password:', user.password);
  }
  process.exit(0);
});
