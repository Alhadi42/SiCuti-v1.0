import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { markSimpleProposalAsCompleted } from './src/lib/simpleCompletionManager';

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

// Mock the supabase client in simpleCompletionManager
const originalSupabase = require('./src/lib/supabaseClient').supabase;
require.cache[require.resolve('./src/lib/supabaseClient')].exports.supabase = supabase;

async function testMarkAsCompleted() {
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
    
    console.log('✅ Created test proposal:', {
      id: proposal.id,
      title: proposal.proposal_title,
      status: proposal.status
    });
    
    // 2. Mark as completed
    console.log('\n2. Marking as completed...');
    const unitData = {
      unitName: proposal.proposer_unit,
      proposalDate: proposal.proposal_date,
      requests: [],
      totalEmployees: 1,
      totalRequests: 1,
      totalDays: 5
    };
    
    const completedProposal = await markSimpleProposalAsCompleted(
      unitData.unitName,
      unitData.proposalDate,
      unitData.requests
    );
    
    console.log('✅ Marked as completed:', {
      id: completedProposal.id,
      status: 'completed',
      completed_at: completedProposal.completedAt,
      completed_by: completedProposal.completedBy
    });
    
    // 3. Verify in database
    console.log('\n3. Verifying in database...');
    const { data: updatedProposal, error: fetchError } = await supabase
      .from('leave_proposals')
      .select('*')
      .eq('id', proposal.id)
      .single();
      
    if (fetchError) throw fetchError;
    
    console.log('✅ Database record updated:', {
      id: updatedProposal.id,
      status: updatedProposal.status,
      completed_at: updatedProposal.completed_at,
      completed_by: updatedProposal.completed_by,
      updated_at: updatedProposal.updated_at
    });
    
    // 4. Clean up
    console.log('\n4. Cleaning up...');
    const { error: deleteError } = await supabase
      .from('leave_proposals')
      .delete()
      .eq('id', proposal.id);
      
    if (deleteError) {
      console.warn('⚠️ Could not clean up test data:', deleteError);
    } else {
      console.log('✅ Test data cleaned up');
    }
    
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
    // Restore original supabase client
    require.cache[require.resolve('./src/lib/supabaseClient')].exports.supabase = originalSupabase;
  }
}

testMarkAsCompleted();
