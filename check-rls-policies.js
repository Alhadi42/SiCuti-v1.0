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

async function checkRLSPolicies() {
  try {
    console.log('🔍 Checking RLS policies for leave_proposals table...');
    
    // Try to get RLS policies using the Supabase API
    const { data: policies, error } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'leave_proposals');
      
    if (error) {
      console.error('Error fetching RLS policies:', error);
      
      // Fallback to direct SQL if the view is not accessible
      console.log('\nTrying direct SQL query...');
      const { data: sqlResult, error: sqlError } = await supabase.rpc('exec_sql', {
        query: `
          SELECT 
            policyname as name,
            permissive,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE tablename = 'leave_proposals';
        `
      }).catch(() => ({}));
      
      if (sqlError || !sqlResult) {
        console.error('❌ Error executing direct SQL query:', sqlError || 'Unknown error');
        console.log('\nPlease run the following SQL in your database to check RLS policies:');
        console.log(`
          SELECT 
            policyname as name,
            permissive,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE tablename = 'leave_proposals';
        `);
        return;
      }
      
      console.log('\nRLS Policies:');
      console.table(sqlResult);
      return;
    }
    
    if (!policies || policies.length === 0) {
      console.log('ℹ️ No RLS policies found for leave_proposals table');
      return;
    }
    
    console.log('\nRLS Policies:');
    console.table(policies);
    
  } catch (error) {
    console.error('❌ Error checking RLS policies:', error);
  }
}

// Check if RLS is enabled on the table
async function checkRLSEnabled() {
  try {
    console.log('\n🔍 Checking if RLS is enabled on leave_proposals table...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT relname, relrowsecurity, relforcerowsecurity 
        FROM pg_class 
        JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace 
        WHERE pg_namespace.nspname = 'public' 
        AND pg_class.relname = 'leave_proposals';
      `
    }).catch(() => ({}));
    
    if (error || !data) {
      console.error('❌ Error checking RLS status:', error || 'Unknown error');
      console.log('\nPlease run the following SQL in your database to check RLS status:');
      console.log(`
        SELECT relname, relrowsecurity, relforcerowsecurity 
        FROM pg_class 
        JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace 
        WHERE pg_namespace.nspname = 'public' 
        AND pg_class.relname = 'leave_proposals';
      `);
      return;
    }
    
    console.log('\nRLS Status:');
    console.table(data);
    
  } catch (error) {
    console.error('❌ Error checking RLS status:', error);
  }
}

// Check foreign key constraints
async function checkForeignKeyConstraints() {
  try {
    console.log('\n🔍 Checking foreign key constraints on leave_proposals table...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT
          tc.constraint_name, 
          tc.table_name, 
          kcu.column_name, 
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
    }).catch(() => ({}));
    
    if (error || !data) {
      console.error('❌ Error checking foreign key constraints:', error || 'Unknown error');
      console.log('\nPlease run the following SQL in your database to check foreign key constraints:');
      console.log(`
        SELECT
          tc.constraint_name, 
          tc.table_name, 
          kcu.column_name, 
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
      `);
      return;
    }
    
    if (data.length === 0) {
      console.log('ℹ️ No foreign key constraints found on leave_proposals table');
      return;
    }
    
    console.log('\nForeign Key Constraints:');
    console.table(data);
    
  } catch (error) {
    console.error('❌ Error checking foreign key constraints:', error);
  }
}

// Run all checks
async function runAllChecks() {
  await checkRLSPolicies();
  await checkRLSEnabled();
  await checkForeignKeyConstraints();
  
  // Check if we can update a record
  await testUpdateOperation();
}

// Test update operation
async function testUpdateOperation() {
  try {
    console.log('\n🧪 Testing update operation...');
    
    // Get a test proposal
    const { data: proposal, error: fetchError } = await supabase
      .from('leave_proposals')
      .select('*')
      .limit(1)
      .single();
      
    if (fetchError || !proposal) {
      console.error('❌ No proposals found to test with');
      return;
    }
    
    console.log(`ℹ️ Testing update on proposal: ${proposal.id}`);
    
    // Try to update the status
    const { data: updatedProposal, error: updateError } = await supabase
      .from('leave_proposals')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', proposal.id)
      .select()
      .single();
      
    if (updateError) {
      console.error('❌ Update failed:', updateError);
      
      if (updateError.code === '42501') {
        console.log('\n⚠️ Permission denied. This might be due to RLS policies.');
      } else if (updateError.code === '23503') {
        console.log('\n⚠️ Foreign key constraint violation. The referenced record does not exist.');
      }
      
      return;
    }
    
    console.log('✅ Update successful:', updatedProposal);
    
  } catch (error) {
    console.error('❌ Error during update test:', error);
  }
}

runAllChecks();
