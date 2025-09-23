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

async function getValidUser() {
  try {
    console.log('🔍 Fetching a valid user...');
    
    // Get the first user from the database
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
      
    if (error) throw error;
    
    if (!users || users.length === 0) {
      console.log('No users found in the database.');
      return null;
    }
    
    const user = users[0];
    console.log('✅ Found user:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });
    
    return user;
    
  } catch (error) {
    console.error('❌ Error fetching user:', error);
    return null;
  }
}

getValidUser().then(() => process.exit(0));
