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

async function runSQL(query) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    // If exec_sql doesn't exist, try direct SQL execution
    if (error.message.includes('function public.exec_sql')) {
      const { data, error: sqlError } = await supabase.rpc('pg_temp.execute_sql', { query });
      if (sqlError) throw sqlError;
      return { data, error: null };
    }
    throw error;
  }
}

async function fixRLSPolicies() {
  try {
    console.log('🔧 Fixing RLS policies for leave_proposals table...');
    
    // 1. Enable RLS if not already enabled
    console.log('\n1. Enabling RLS if not already enabled...');
    try {
      await runSQL('ALTER TABLE public.leave_proposals ENABLE ROW LEVEL SECURITY;');
      console.log('✅ RLS is enabled');
    } catch (error) {
      if (error.message.includes('already enabled')) {
        console.log('ℹ️ RLS was already enabled');
      } else {
        throw error;
      }
    }
    
    // 2. Drop existing policies to avoid conflicts
    console.log('\n2. Removing existing policies...');
    try {
      await runSQL(`
        DROP POLICY IF EXISTS "Admins can do anything" ON public.leave_proposals;
        DROP POLICY IF EXISTS "Users can see their own proposals" ON public.leave_proposals;
        DROP POLICY IF EXISTS "Service role can do anything" ON public.leave_proposals;
      `);
      console.log('✅ Removed existing policies');
    } catch (error) {
      console.warn('⚠️ Could not remove existing policies (may not exist):', error.message);
    }
    
    // 3. Create new policies
    console.log('\n3. Creating new RLS policies...');
    
    // Policy to allow admins to do anything
    await runSQL(`
      CREATE POLICY "Admins can do anything" 
      ON public.leave_proposals
      FOR ALL
      TO authenticated
      USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'master_admin')
      WITH CHECK (true);
    `);
    
    // Policy to allow users to see their own proposals
    await runSQL(`
      CREATE POLICY "Users can see their own proposals" 
      ON public.leave_proposals
      FOR SELECT
      TO authenticated
      USING (proposed_by = (auth.jwt() ->> 'sub')::uuid);
    `);
    
    // Policy to allow service role to do anything
    await runSQL(`
      CREATE POLICY "Service role can do anything" 
      ON public.leave_proposals
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
    `);
    
    console.log('✅ Created new RLS policies');
    
    // 4. Verify the policies
    console.log('\n4. Verifying RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'leave_proposals');
      
    if (policiesError) {
      console.error('❌ Error fetching policies:', policiesError);
      return;
    }
    
    if (policies.length === 0) {
      console.warn('⚠️ No RLS policies found for leave_proposals table');
    } else {
      console.log('📋 Current RLS policies for leave_proposals:');
      console.table(policies.map(p => ({
        name: p.policyname,
        command: p.cmd,
        roles: p.roles,
        using: p.qual,
        with_check: p.with_check
      })));
    }
    
    console.log('\n🎉 RLS policies have been updated successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing RLS policies:', error);
  }
}

fixRLSPolicies();
