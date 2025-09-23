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

async function listUsers() {
  try {
    console.log('Fetching users...');
    
    // Get users from the users table
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, role, unit_kerja')
      .limit(10)
      .order('name');
      
    if (error) throw error;
    
    console.log('\n=== Users ===');
    if (users && users.length > 0) {
      console.table(users);
    } else {
      console.log('No users found in the database');
    }
    
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    process.exit(0);
  }
}

listUsers();
