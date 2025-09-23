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

async function checkLeaveItems() {
  try {
    console.log('\n=== Checking leave_proposal_items table ===');
    
    // Check the first few items to see the structure
    const { data: items, error } = await supabase
      .from('leave_proposal_items')
      .select('*')
      .limit(5);
      
    if (error) throw error;
    
    if (items && items.length > 0) {
      console.log('\nSample leave proposal items:');
      items.forEach((item, index) => {
        console.log(`\nItem ${index + 1}:`);
        console.log(`- ID: ${item.id}`);
        console.log(`- Proposal ID: ${item.proposal_id}`);
        console.log(`- Status: ${item.status || 'N/A'}`);
        console.log(`- Employee: ${item.employee_name || 'N/A'}`);
        console.log(`- Leave Type: ${item.leave_type || 'N/A'}`);
        console.log(`- Start Date: ${item.start_date || 'N/A'}`);
        console.log(`- End Date: ${item.end_date || 'N/A'}`);
        console.log(`- Days: ${item.days || 'N/A'}`);
      });
      
      // Check for completed items
      const { data: completedItems, error: completedError } = await supabase
        .from('leave_proposal_items')
        .select('*')
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });
        
      if (completedError) throw completedError;
      
      console.log('\n=== Completed Leave Items ===');
      if (completedItems.length === 0) {
        console.log('No completed leave items found.');
      } else {
        console.log(`Found ${completedItems.length} completed leave items.`);
      }
    } else {
      console.log('No leave proposal items found in the database.');
    }
    
  } catch (error) {
    console.error('Error checking leave proposal items:', error);
  } finally {
    process.exit(0);
  }
}

checkLeaveItems();
