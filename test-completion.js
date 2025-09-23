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

// Test data
const testData = {
  unitName: 'IT',  // Ganti dengan unit kerja yang valid
  proposalDate: '2025-09-23',  // Ganti dengan tanggal yang valid
  testUser: {
    id: 'user-id-here',  // Ganti dengan ID user yang valid
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin_unit',
    unit_kerja: 'IT'  // Harus sama dengan unitName di atas
  }
};

async function testCompletion() {
  try {
    console.log('🔍 Memulai pengujian...');
    
    // 1. Cek status awal
    console.log('\n1. Memeriksa status awal...');
    const { data: initialProposals, error: initialError } = await supabase
      .from('leave_proposals')
      .select('*')
      .eq('proposer_unit', testData.unitName)
      .eq('proposal_date', testData.proposalDate);
      
    if (initialError) throw initialError;
    console.log(`   Ditemukan ${initialProposals?.length || 0} usulan yang sesuai`);
    
    // 2. Buat usulan baru jika belum ada
    let proposalId;
    if (!initialProposals || initialProposals.length === 0) {
      console.log('\n2. Membuat usulan baru...');
      const { data: newProposal, error: createError } = await supabase
        .from('leave_proposals')
        .insert({
          proposal_title: `Usulan Cuti ${testData.unitName} - ${testData.proposalDate}`,
          proposed_by: testData.testUser.id,
          proposer_name: testData.testUser.name,
          proposer_unit: testData.unitName,
          proposal_date: testData.proposalDate,
          status: 'pending'
        })
        .select()
        .single();
        
      if (createError) throw createError;
      proposalId = newProposal.id;
      console.log(`   ✅ Usulan berhasil dibuat dengan ID: ${proposalId}`);
    } else {
      proposalId = initialProposals[0].id;
      console.log(`   ℹ️ Menggunakan usulan yang sudah ada dengan ID: ${proposalId}`);
    }
    
    // 3. Tandai sebagai selesai
    console.log('\n3. Menandai usulan sebagai selesai...');
    const { data: updatedProposal, error: updateError } = await supabase
      .from('leave_proposals')
      .update({
        status: 'completed',
        completed_by: testData.testUser.id,
        completed_at: new Date().toISOString()
      })
      .eq('id', proposalId)
      .select()
      .single();
      
    if (updateError) {
      console.error('   ❌ Gagal menandai usulan sebagai selesai:', updateError);
      throw updateError;
    }
    
    console.log('   ✅ Berhasil menandai usulan sebagai selesai:', {
      id: updatedProposal.id,
      status: updatedProposal.status,
      completed_by: updatedProposal.completed_by,
      completed_at: updatedProposal.completed_at
    });
    
    // 4. Verifikasi perubahan
    console.log('\n4. Memverifikasi perubahan...');
    const { data: verifiedProposal, error: verifyError } = await supabase
      .from('leave_proposals')
      .select('*')
      .eq('id', proposalId)
      .single();
      
    if (verifyError) throw verifyError;
    
    if (verifiedProposal.status === 'completed' && 
        verifiedProposal.completed_by === testData.testUser.id) {
      console.log('   ✅ Verifikasi berhasil: Usulan berstatus SELESAI');
    } else {
      console.error('   ❌ Verifikasi gagal: Status tidak sesuai harapan');
      console.log('      Data usulan:', verifiedProposal);
    }
    
  } catch (error) {
    console.error('\n❌ Error saat pengujian:', error);
  } finally {
    console.log('\n🏁 Pengujian selesai');
  }
}

// Jalankan pengujian
testCompletion();
