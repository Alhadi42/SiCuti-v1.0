import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase URL or Anon Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  try {
    // Check the table structure by querying the table directly
    const { data: sample, error: sampleError } = await supabase
      .from('leave_proposals')
      .select('*')
      .limit(1);
      
    if (sampleError) throw sampleError;
    
    console.log('\n=== Table Structure ===');
    if (sample && sample.length > 0) {
      const firstRow = sample[0];
      console.log('Columns in leave_proposals:');
      
      // Check for our target columns
      const targetColumns = ['completed_at', 'completed_by', 'status'];
      targetColumns.forEach(col => {
        const exists = col in firstRow;
        const type = exists ? typeof firstRow[col] : 'NOT FOUND';
        console.log(`- ${col.padEnd(15)} (${type})`);
      });
    } else {
      console.log('No data in leave_proposals table');
    }

    // Check the current completion status
    console.log('\n=== Checking for completed proposals ===');
    const { data: completedProposals, error: dataError } = await supabase
      .from('leave_proposals')
      .select('id, status, completed_at, completed_by')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    if (dataError) throw dataError;

    console.log('\n=== Completed Proposals ===');
    if (completedProposals.length === 0) {
      console.log('No completed proposals found.');
    } else {
      completedProposals.forEach(proposal => {
        console.log(`- ID: ${proposal.id}`);
        console.log(`  Status: ${proposal.status}`);
        console.log(`  Completed At: ${proposal.completed_at || 'N/A'}`);
        console.log(`  Completed By: ${proposal.completed_by || 'N/A'}\n`);
      });
    }

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    process.exit(0);
  }
}

checkDatabase();
