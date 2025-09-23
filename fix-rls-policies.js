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

async function fixRLSPolicies() {
  try {
    console.log('🔧 Fixing RLS policies for leave_proposals table...');
    
    // Enable RLS if not already enabled
    console.log('\n1. Enabling RLS if not already enabled...');
    const { data: rlsEnabled, error: rlsError } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE public.leave_proposals ENABLE ROW LEVEL SECURITY;
      `
    });
    
    if (rlsError && !rlsError.message.includes('already enabled')) {
      console.error('❌ Error enabling RLS:', rlsError);
      return;
    }
    
    console.log('✅ RLS is enabled');
    
    // Create or replace policies
    console.log('\n2. Creating/updating RLS policies...');
    
    // Policy to allow admins to do anything
    const adminPolicy = `
      CREATE OR REPLACE POLICY "Admins can do anything" 
      ON public.leave_proposals
      FOR ALL
      TO authenticated
      USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'master_admin')
      WITH CHECK (true);
    `;
    
    // Policy to allow users to see their own proposals
    const userPolicy = `
      CREATE OR REPLACE POLICY "Users can see their own proposals" 
      ON public.leave_proposals
      FOR SELECT
      TO authenticated
      USING (proposed_by = auth.uid() OR completed_by = auth.uid());
    `;
    
    // Policy to allow service role to do anything (for server-side operations)
    const serviceRolePolicy = `
      CREATE OR REPLACE POLICY "Service role can do anything" 
      ON public.leave_proposals
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
    `;
    
    // Apply the policies
    const { data: policies, error: policyError } = await supabase.rpc('exec_sql', {
      query: `${adminPolicy} ${userPolicy} ${serviceRolePolicy}`
    });
    
    if (policyError) {
      console.error('❌ Error creating policies:', policyError);
      return;
    }
    
    console.log('✅ RLS policies updated successfully');
    
    // Verify the policies
    console.log('\n3. Verifying RLS policies...');
    const { data: policiesList, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'leave_proposals');
      
    if (policiesError) {
      console.error('❌ Error fetching policies:', policiesError);
      return;
    }
    
    console.log('📋 Current RLS policies for leave_proposals:');
    console.table(policiesList.map(p => ({
      name: p.policyname,
      command: p.cmd,
      roles: p.roles,
      using: p.qual,
      with_check: p.with_check
    })));
    
    console.log('\n🎉 RLS policies have been updated successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing RLS policies:', error);
  }
}

fixRLSPolicies();
