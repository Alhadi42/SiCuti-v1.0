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

async function checkCompletedProposals() {
  try {
    console.log('🔍 Checking for completed proposals...');
    
    // Get all completed proposals
    const { data: proposals, error } = await supabase
      .from('leave_proposals')
      .select('*')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching completed proposals:', error);
      return;
    }
    
    if (proposals.length === 0) {
      console.log('No completed proposals found in the database.');
      return;
    }
    
    console.log(`\nFound ${proposals.length} completed proposals:`);
    console.log('----------------------------------------');
    
    proposals.forEach((proposal, index) => {
      console.log(`\n#${index + 1} - ${proposal.proposal_title}`);
      console.log('----------------------------------------');
      console.log('ID:', proposal.id);
      console.log('Unit:', proposal.proposer_unit);
      console.log('Proposal Date:', proposal.proposal_date);
      console.log('Status:', proposal.status);
      console.log('Completed At:', proposal.completed_at);
      console.log('Completed By:', proposal.completed_by);
      console.log('Created At:', proposal.created_at);
      console.log('Updated At:', proposal.updated_at);
      
      if (proposal.notes) {
        console.log('\nNotes:');
        console.log(proposal.notes);
      }
      
      console.log('----------------------------------------');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkCompletedProposals();
