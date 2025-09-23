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

async function checkProposalSchema() {
  try {
    console.log('🔍 Checking leave_proposals table structure...');
    
    // Try to get the table structure by inserting a test record
    console.log('\n1. Getting table structure...');
    
    // Get a valid user ID
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .limit(1);
      
    if (!users || users.length === 0) {
      console.error('❌ No users found in the database');
      return;
    }
    
    const userId = users[0].id;
    
    // Try to get the table structure by querying a non-existent record
    const { data: structure, error: structureError } = await supabase
      .from('leave_proposals')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single();
      
    if (structureError && structureError.code !== 'PGRST116') { // PGRST116 is expected for no rows
      console.error('Error getting table structure:', structureError);
    }
    
    // Check if completed_by column exists and its type
    console.log('\n2. Checking for completed_by column...');
    try {
      const { data: columnInfo, error: columnError } = await supabase
        .rpc('get_column_info', { 
          table_name: 'leave_proposals',
          column_name: 'completed_by' 
        });
        
      if (columnError) throw columnError;
      console.log('completed_by column info:', columnInfo);
      
    } catch (e) {
      console.log('Could not get column info, trying alternative method...');
      
      // Try to get the table structure using a raw query
      const { data: rawStructure, error: rawError } = await supabase
        .rpc('query', { 
          q: 'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1',
          params: ['leave_proposals']
        });
        
      if (rawError) {
        console.error('Error getting column info:', rawError);
      } else {
        console.log('Table columns:', rawStructure);
      }
    }
    
    // 3. Check the foreign key constraints
    console.log('\n3. Checking foreign key constraints...');
    try {
      const { data: constraints, error: constraintsError } = await supabase
        .rpc('get_foreign_keys', { 
          table_name: 'leave_proposals' 
        });
        
      if (constraintsError) throw constraintsError;
      console.log('Foreign keys:', constraints);
      
    } catch (e) {
      console.log('Could not get foreign key info, trying alternative method...');
      
      // Try to get the foreign keys using a raw query
      const { data: fkData, error: fkError } = await supabase
        .rpc('query', {
          q: `
            SELECT
              tc.table_schema, 
              tc.constraint_name, 
              tc.table_name, 
              kcu.column_name, 
              ccu.table_schema AS foreign_table_schema,
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name 
            FROM 
              information_schema.table_constraints AS tc 
              JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
              JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'leave_proposals';
          `
        });
        
      if (fkError) {
        console.error('Error getting foreign keys:', fkError);
      } else {
        console.log('Foreign keys:', fkData);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error checking proposal schema:', error);
  } finally {
    process.exit(0);
  }
}

checkProposalSchema();
