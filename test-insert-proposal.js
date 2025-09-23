import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

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

async function testInsert() {
  try {
    console.log('🧪 Testing minimal proposal insertion...');
    
    // Try with minimal fields
    const minimalProposal = {
      unit_kerja: 'TEST_UNIT',
      proposal_date: new Date().toISOString().split('T')[0],
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('\n1. Inserting minimal proposal...');
    console.log(JSON.stringify(minimalProposal, null, 2));
    
    const { data, error } = await supabase
      .from('leave_proposals')
      .insert(minimalProposal)
      .select();
      
    if (error) {
      console.error('❌ Insert failed:', error);
      
      // If it fails, try with just the bare minimum
      console.log('\n2. Trying with only required fields...');
      const requiredFields = {
        unit_kerja: 'TEST_UNIT',
        proposal_date: new Date().toISOString().split('T')[0],
        status: 'draft'
      };
      
      console.log(JSON.stringify(requiredFields, null, 2));
      
      const { data: data2, error: error2 } = await supabase
        .from('leave_proposals')
        .insert(requiredFields)
        .select();
        
      if (error2) {
        console.error('❌ Still failing. Please check the table structure.');
        console.error('Error details:', error2);
      } else {
        console.log('✅ Successfully inserted with required fields:', data2);
      }
    } else {
      console.log('✅ Successfully inserted with minimal fields:', data);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testInsert();
