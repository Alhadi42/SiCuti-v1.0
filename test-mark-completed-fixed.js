import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure environment variables
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

// Mock the AuthManager
const AuthManager = {
  getUserSession: () => ({
    id: '937121b6-662b-45dd-b524-e5d9feded0ea', // Admin user ID
    name: 'Admin BBPVP Serang',
    email: 'adminbbpvpserang@gmail.com',
    role: 'admin'
  })
};

async function testMarkAsCompleted() {
  let testProposalId = null;
  
  try {
    console.log('🚀 Testing "Selesai Diajukan" functionality...');
    
    // 1. Create a test proposal
    console.log('\n1. Creating test proposal...');
    const testProposal = {
      proposal_title: 'Test Proposal for Completion - ' + new Date().toLocaleString('id-ID'),
      proposed_by: '937121b6-662b-45dd-b524-e5d9feded0ea',
      proposer_name: 'Admin',
      proposer_unit: 'TEST_UNIT',
      proposal_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: proposal, error: createError } = await supabase
      .from('leave_proposals')
      .insert(testProposal)
      .select()
      .single();
      
    if (createError) throw createError;
    
    testProposalId = proposal.id;
    console.log('✅ Created test proposal:', {
      id: proposal.id,
      title: proposal.proposal_title,
      status: proposal.status
    });
    
    // 2. Mark as completed directly in the database
    console.log('\n2. Marking as completed in database...');
    const updateData = {
      status: 'completed',
      completed_by: '937121b6-662b-45dd-b524-e5d9feded0ea',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: updatedProposal, error: updateError } = await supabase
      .from('leave_proposals')
      .update(updateData)
      .eq('id', proposal.id)
      .select()
      .single();
      
    if (updateError) throw updateError;
    
    console.log('✅ Successfully marked as completed:', {
      id: updatedProposal.id,
      status: updatedProposal.status,
      completed_at: updatedProposal.completed_at,
      completed_by: updatedProposal.completed_by
    });
    
    // 3. Verify in database
    console.log('\n3. Verifying in database...');
    const { data: dbProposal, error: fetchError } = await supabase
      .from('leave_proposals')
      .select('*')
      .eq('id', proposal.id)
      .single();
      
    if (fetchError) throw fetchError;
    
    console.log('✅ Database verification successful:', {
      id: dbProposal.id,
      status: dbProposal.status,
      completed_at: dbProposal.completed_at,
      completed_by: dbProposal.completed_by,
      updated_at: dbProposal.updated_at
    });
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    
    if (error.code === '42501') {
      console.log('\n⚠️ Error: Izin ditolak. Periksa kebijakan RLS (Row Level Security) pada tabel leave_proposals.');
    } else if (error.code === '23503') {
      console.log('\n⚠️ Error: Foreign key violation. Pastikan ID user valid dan ada di tabel users.');
    } else if (error.code === '23502') {
      console.log('\n⚠️ Error: Kolom yang diwajibkan tidak boleh kosong:', error.details);
    }
    
  } finally {
    // Clean up test data if it was created
    if (testProposalId) {
      console.log('\n🧹 Cleaning up test data...');
      const { error: deleteError } = await supabase
        .from('leave_proposals')
        .delete()
        .eq('id', testProposalId);
        
      if (deleteError) {
        console.warn('⚠️ Could not clean up test data:', deleteError);
      } else {
        console.log('✅ Test data cleaned up');
      }
    }
  }
}

testMarkAsCompleted();
