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

async function getAdminUser() {
  try {
    console.log('🔍 Mencari user admin...');
    
    // Cari user dengan role admin atau email yang mengandung 'admin'
    const { data: adminUsers, error } = await supabase
      .from('users')
      .select('*')
      .or('role.eq.admin,email.ilike.%admin%')
      .limit(1);
      
    if (error) throw error;
    
    if (!adminUsers || adminUsers.length === 0) {
      console.error('❌ Tidak ditemukan user admin');
      return null;
    }
    
    const adminUser = adminUsers[0];
    console.log(`✅ Ditemukan admin: ${adminUser.name} (${adminUser.email})`);
    return adminUser;
    
  } catch (error) {
    console.error('❌ Gagal mencari user admin:', error);
    return null;
  }
}

async function testInsertProposal(adminId) {
  try {
    console.log('\n🧪 Mencoba insert proposal...');
    
    const testProposal = {
      proposal_title: 'Test Proposal - ' + new Date().toLocaleString('id-ID'),
      proposed_by: adminId,
      proposer_name: 'Admin',
      proposer_unit: 'ADMIN_UNIT',
      proposal_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Data yang akan diinsert:', testProposal);
    
    const { data, error } = await supabase
      .from('leave_proposals')
      .insert(testProposal)
      .select()
      .single();
      
    if (error) throw error;
    
    console.log('✅ Berhasil insert proposal:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Gagal insert proposal:', {
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
    
    return null;
  }
}

async function main() {
  console.log('🚀 Memulai tes insert proposal...');
  
  // Dapatkan ID admin
  const admin = await getAdminUser();
  if (!admin) {
    console.log('Tidak dapat melanjutkan tanpa user admin');
    return;
  }
  
  // Coba insert proposal
  await testInsertProposal(admin.id);
  
  // Tampilkan data terbaru
  console.log('\n📋 Data terbaru di leave_proposals:');
  const { data: latestProposals } = await supabase
    .from('leave_proposals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.table(latestProposals?.map(p => ({
    id: p.id,
    proposal_title: p.proposal_title,
    status: p.status,
    proposer_unit: p.proposer_unit,
    proposed_by: p.proposed_by,
    created_at: p.created_at
  })) || []);
  
  console.log('\n✅ Selesai');
}

main();
