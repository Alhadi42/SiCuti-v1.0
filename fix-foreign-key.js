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

async function fixForeignKey() {
  try {
    console.log('🔧 Attempting to fix foreign key constraint...');
    
    // 1. First, let's check the current foreign key constraint
    console.log('\n1. Checking current foreign key constraints...');
    
    const { data: fkData, error: fkError } = await supabase.rpc('get_foreign_keys', { 
      table_name: 'leave_proposals' 
    });
    
    if (fkError) {
      console.error('Error getting foreign keys:', fkError);
      console.log('\nTrying alternative method...');
      
      // If we can't get the foreign keys, try to drop and recreate the constraint
      await dropAndRecreateConstraint();
      return;
    }
    
    console.log('Current foreign keys:', fkData);
    
    // 2. If we get here, we need to drop and recreate the constraint
    await dropAndRecreateConstraint();
    
  } catch (error) {
    console.error('\n❌ Error in fixForeignKey:', error);
    
    // Try the direct approach if everything else fails
    console.log('\nTrying direct SQL approach...');
    await dropAndRecreateConstraint();
  }
}

async function dropAndRecreateConstraint() {
  try {
    console.log('\n2. Dropping and recreating foreign key constraint...');
    
    // This is a multi-step process that requires raw SQL
    const steps = [
      // Step 1: Drop the existing constraint
      {
        name: 'Drop existing constraint',
        sql: `ALTER TABLE public.leave_proposals 
              DROP CONSTRAINT IF EXISTS leave_proposals_proposed_by_fkey;`
      },
      
      // Step 2: Recreate the constraint to point to the correct table
      {
        name: 'Recreate constraint',
        sql: `ALTER TABLE public.leave_proposals 
              ADD CONSTRAINT leave_proposals_proposed_by_fkey 
              FOREIGN KEY (proposed_by) REFERENCES public.users(id) 
              ON DELETE CASCADE;`
      },
      
      // Step 3: Verify the constraint
      {
        name: 'Verify constraint',
        sql: `SELECT conname, conrelid::regclass, confrelid::regclass, conkey, confkey 
              FROM pg_constraint 
              WHERE conname = 'leave_proposals_proposed_by_fkey';`
      }
    ];
    
    // Execute each step
    for (const step of steps) {
      console.log(`\nExecuting: ${step.name}`);
      console.log('SQL:', step.sql);
      
      const { data, error } = await supabase.rpc('exec_sql', { query: step.sql });
      
      if (error) {
        console.error(`Error in step "${step.name}":`, error);
        
        // If the error is about the exec_sql function not existing, try with raw SQL
        if (error.message.includes('function public.exec_sql')) {
          console.log('exec_sql function not found, trying with raw SQL...');
          await runRawSql(step.sql);
        }
      } else {
        console.log('Result:', data);
      }
    }
    
    // 3. Test the constraint by inserting a test proposal
    await testProposalInsert();
    
  } catch (error) {
    console.error('\n❌ Error in dropAndRecreateConstraint:', error);
  }
}

async function runRawSql(query) {
  try {
    // This is a fallback method that might work if RPC is not available
    const { data, error } = await supabase.rpc('sql', { query });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Raw SQL error:', error);
    throw error;
  }
}

async function testProposalInsert() {
  try {
    console.log('\n3. Testing proposal insertion...');
    
    // Get a valid user ID
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, name, unit_kerja')
      .limit(1);
      
    if (userError || !users || users.length === 0) {
      console.error('Error getting user:', userError?.message || 'No users found');
      return;
    }
    
    const user = users[0];
    console.log('Using user:', user);
    
    // Try to insert a test proposal
    const testProposal = {
      proposal_title: 'Test Proposal After FK Fix',
      proposed_by: user.id,
      proposer_name: user.name,
      proposer_unit: user.unit_kerja || 'TEST_UNIT',
      proposal_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Inserting test proposal:', testProposal);
    
    const { data: proposal, error: insertError } = await supabase
      .from('leave_proposals')
      .insert(testProposal)
      .select()
      .single();
      
    if (insertError) {
      console.error('❌ Error inserting test proposal:', insertError);
    } else {
      console.log('✅ Successfully inserted test proposal:', proposal);
      
      // Now try to mark it as completed
      console.log('\n4. Testing completion...');
      
      const updateData = {
        status: 'processed',
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        completed_by: user.id
      };
      
      const { data: updatedProposal, error: updateError } = await supabase
        .from('leave_proposals')
        .update(updateData)
        .eq('id', proposal.id)
        .select()
        .single();
        
      if (updateError) {
        console.error('❌ Error updating proposal:', updateError);
      } else {
        console.log('✅ Successfully marked as completed:', updatedProposal);
      }
    }
    
  } catch (error) {
    console.error('Error in testProposalInsert:', error);
  }
}

// Run the fix
fixForeignKey();
