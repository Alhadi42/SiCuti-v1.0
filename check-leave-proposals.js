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

async function checkLeaveProposals() {
  try {
    console.log('🔍 Checking leave_proposals table...');
    
    // Get all records
    const { data: proposals, error } = await supabase
      .from('leave_proposals')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    if (proposals.length === 0) {
      console.log('ℹ️ No records found in leave_proposals table');
      return false;
    }
    
    console.log(`\n📋 Found ${proposals.length} records in leave_proposals table:`);
    console.table(proposals.map(p => ({
      id: p.id,
      proposal_title: p.proposal_title,
      status: p.status,
      proposer_unit: p.proposer_unit,
      proposal_date: p.proposal_date,
      created_at: p.created_at,
      updated_at: p.updated_at,
      completed_by: p.completed_by
    })));
    
    return true;
    
  } catch (error) {
    console.error('❌ Error checking leave_proposals:', error);
    return false;
  }
}

// Test inserting a record
async function testInsert() {
  try {
    console.log('\n🧪 Testing record insertion...');
    
    const testProposal = {
      proposal_title: 'Test Proposal - ' + new Date().toISOString(),
      proposed_by: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      proposer_name: 'Test User',
      proposer_unit: 'TEST_UNIT',
      proposal_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Inserting test record:', testProposal);
    
    const { data, error } = await supabase
      .from('leave_proposals')
      .insert(testProposal)
      .select()
      .single();
      
    if (error) {
      console.error('❌ Insert failed:', error);
      
      // Check if the error is due to RLS
      if (error.code === '42501') {
        console.log('\n⚠️ Permission denied. This might be due to Row Level Security (RLS) policies.');
        console.log('Please check your RLS policies on the leave_proposals table.');
      }
      
      // Check if the error is due to missing required fields
      if (error.code === '23502') {
        console.log('\n⚠️ Missing required field:', error.details);
      }
      
      // Check if the error is due to foreign key violation
      if (error.code === '23503') {
        console.log('\n⚠️ Foreign key violation. The referenced record does not exist.');
        console.log('Error details:', error.details);
      }
      
      return null;
    }
    
    console.log('✅ Insert successful:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Error during insert test:', error);
    return null;
  }
}

// Main function
async function main() {
  console.log('🚀 Starting leave_proposals table check...');
  
  // First, check existing records
  const hasRecords = await checkLeaveProposals();
  
  // If no records, try inserting a test record
  if (!hasRecords) {
    console.log('\nNo records found. Attempting to insert a test record...');
    await testInsert();
  }
  
  console.log('\n✅ Check completed');
}

main();
