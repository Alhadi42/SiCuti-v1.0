import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jaWVkeWNmZ2txdmNxd2R4cHJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5OTE0OSwiZXhwIjoyMDY1Mjc1MTQ5fQ.j4AzaxD2layIcpVzjJEM1U3l4_tqtnEYwH9bPI1B0Mo';

if (!supabaseUrl) {
  console.error('Error: Missing Supabase URL');
  process.exit(1);
}

// Initialize with service role
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

async function resetTestUser() {
  try {
    console.log('🔄 Resetting test user...');
    
    // Delete existing test user if exists
    console.log('\n1. Removing existing test user...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      '11111111-1111-1111-1111-111111111111'
    );
    
    if (deleteError && !deleteError.message.includes('User not found')) {
      console.log('   ℹ️ No existing test user to remove');
    } else {
      console.log('   ✅ Removed existing test user');
    }
    
    // Create new test user
    console.log('\n2. Creating new test user...');
    const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
      email: 'testadmin@example.com',
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: {
        name: 'Test Admin',
        role: 'admin_unit',
        unit_kerja: 'TEST_UNIT'
      }
    });
    
    if (createError) throw createError;
    
    console.log('   ✅ Created test user:', {
      id: user.id,
      email: user.email,
      confirmed: user.email_confirmed_at ? 'Yes' : 'No'
    });
    
    // Update public.users
    console.log('\n3. Updating public.users...');
    const { error: updateError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        username: 'testadmin',
        name: 'Test Admin',
        role: 'admin_unit',
        unit_kerja: 'TEST_UNIT',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (updateError) throw updateError;
    console.log('   ✅ Updated public.users');
    
    console.log('\n🎉 Test user reset successful!');
    console.log('   Email: testadmin@example.com');
    console.log('   Password: testpassword123');
    
  } catch (error) {
    console.error('\n❌ Error resetting test user:', error);
  } finally {
    process.exit(0);
  }
}

// Run the reset
resetTestUser();
