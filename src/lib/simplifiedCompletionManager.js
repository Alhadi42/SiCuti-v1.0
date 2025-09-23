import { supabaseAdmin } from './supabaseClient';
import { AuthManager } from './auth';

// Simple in-memory cache
const completionCache = new Map();

/**
 * Get a unique key for a proposal
 */
function getProposalKey(unitName, proposalDate) {
  return `${unitName}_${proposalDate}`;
}

/**
 * Simplified version of markSimpleProposalAsCompleted
 * Focuses on core functionality with minimal validation
 */
export const markProposalCompleted = async (unitName, proposalDate, requestsData = []) => {
  try {
    // Get current user (basic validation)
    const currentUser = AuthManager.getUserSession();
    if (!currentUser?.id) {
      throw new Error('User not authenticated');
    }

    const proposalKey = getProposalKey(unitName, proposalDate);
    const now = new Date().toISOString();
    
    // 1. Update local cache immediately for better UX
    const cacheData = {
      isCompleted: true,
      timestamp: Date.now(),
      unitName,
      proposalDate,
      completedAt: now,
      completedBy: currentUser.id
    };
    completionCache.set(proposalKey, cacheData);

    // 2. Prepare data for database, matching the correct schema
    const proposalData = {
      proposal_title: `Usulan Cuti ${unitName} - ${proposalDate}`,
      proposer_unit: unitName,
      proposal_date: proposalDate,
      status: 'completed', // Use 'completed' status as per the new schema
      proposed_by: currentUser.id,
      proposer_name: currentUser.name || currentUser.email,
      completed_at: now, // Use the correct 'completed_at' column
      completed_by: currentUser.id, // Use the correct 'completed_by' column
      created_at: now,
      updated_at: now,
      total_employees: requestsData.length || 0
    };

    console.log('Saving proposal data:', proposalData);

    // 3. Save to database (upsert - update if exists, insert if not)
    const { data, error } = await supabaseAdmin
      .from('leave_proposals')
      .upsert(proposalData, { 
        onConflict: 'proposer_unit,proposal_date',
        defaultToExcluded: true 
      })
      .select()
      .single();

    if (error) {
      console.error('Database save error:', error);
      throw error;
    }

    console.log('Proposal saved successfully:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('Error in markProposalCompleted:', error);
    return { 
      success: false, 
      error: error.message,
      // Still return success for the UI, but indicate it's only in local cache
      data: { source: 'cache' }
    };
  }
};

/**
 * Check if a proposal is completed
 */
export const isProposalCompleted = async (unitName, proposalDate) => {
  const proposalKey = getProposalKey(unitName, proposalDate);
  
  // 1. Check cache first
  const cached = completionCache.get(proposalKey);
  if (cached) {
    return { isCompleted: true, source: 'cache', ...cached };
  }

  // 2. Check database
  try {
    const { data, error } = await supabaseAdmin
      .from('leave_proposals')
      .select('*')
      .eq('proposer_unit', unitName)
      .eq('proposal_date', proposalDate)
      .eq('status', 'completed') // Check for 'completed' status
      .limit(1); // Fetch at most one record

    if (error) {
      // Don't log expected 'not found' errors, but log others
      if (!error.message.includes('JSON object requested')) {
          console.error('Error checking proposal status:', error);
      }
      return { isCompleted: false, error: error.message };
    }

    const completedProposal = data && data[0];

    if (completedProposal) {
      // Update cache
      completionCache.set(proposalKey, {
        isCompleted: true,
        timestamp: new Date(completedProposal.updated_at).getTime(),
        completedAt: completedProposal.completed_at, // Use correct 'completed_at' column
        completedBy: completedProposal.completed_by // Use correct 'completed_by' column
      });
      return { isCompleted: true, source: 'database', ...completedProposal };
    }
    
    return { isCompleted: false };
    
  } catch (error) {
    console.error('Error checking proposal status:', error);
    return { isCompleted: false, error: error.message };
  }
};

export default {
  markProposalCompleted,
  isProposalCompleted
};
