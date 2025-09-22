/**
 * Simple Completion Manager - Enhanced to properly store in database
 * This approach prioritizes database storage with localStorage as fallback
 */

import { supabase } from './supabaseClient';
import { AuthManager } from './auth';

/**
 * Get a unique key for a proposal
 */
const getProposalKey = (unitName, proposalDate) => {
  return `${unitName}|${proposalDate}`;
};

/**
 * Check if a unit-date combination is marked as completed
 * Enhanced to properly query database first
 */
export const isSimpleProposalCompleted = async (unitName, proposalDate) => {
  try {
    const proposalKey = getProposalKey(unitName, proposalDate);
    
    // First, try to query the leave_proposals table for completed status
    console.log(`🔍 Checking completion status for: ${proposalKey}`);
    
    const { data: completedProposals, error: queryError } = await supabase
      .from('leave_proposals')
      .select('id, status, completed_at, completed_by, proposer_unit, proposal_date')
      .eq('proposer_unit', unitName)
      .eq('proposal_date', proposalDate)
      .eq('status', 'completed');

    // If query succeeds and finds completed proposals
    if (!queryError && completedProposals && completedProposals.length > 0) {
      console.log(`✅ Found completed proposal in database:`, completedProposals[0]);
      return {
        isCompleted: true,
        completedAt: completedProposals[0].completed_at,
        completedBy: completedProposals[0].completed_by,
        id: completedProposals[0].id,
        source: 'database'
      };
    }

    // If no completed proposals found in database, check if there are any proposals at all
    if (!queryError) {
      const { data: anyProposals, error: anyError } = await supabase
        .from('leave_proposals')
        .select('id, status')
        .eq('proposer_unit', unitName)
        .eq('proposal_date', proposalDate);

      if (!anyError && anyProposals && anyProposals.length > 0) {
        console.log(`📊 Found ${anyProposals.length} proposals for ${proposalKey}, but none are completed`);
        return false;
      }
    }

    // If database query fails or no proposals exist, check localStorage as fallback
    if (queryError) {
      console.warn('Database query failed, using localStorage fallback:', queryError.code);
    }

    // Fallback to localStorage check
    const localData = localStorage.getItem('completedBatchProposals');
    if (localData) {
      try {
        const completedProposals = JSON.parse(localData);
        const completion = completedProposals[proposalKey];
        if (completion) {
          console.log(`📱 Found completion in localStorage:`, completion);
          return {
            isCompleted: true,
            completedAt: completion.completedAt,
            completedBy: completion.completedBy,
            source: 'localStorage'
          };
        }
      } catch (parseError) {
        console.warn('Failed to parse localStorage completion data:', parseError);
      }
    }

    return false;

  } catch (error) {
    console.warn('Error checking simple proposal completion, falling back to localStorage:', error);
    
    // Final fallback to localStorage only
    try {
      const localData = localStorage.getItem('completedBatchProposals');
      if (localData) {
        const completedProposals = JSON.parse(localData);
        const proposalKey = getProposalKey(unitName, proposalDate);
        const completion = completedProposals[proposalKey];
        if (completion) {
          return {
            isCompleted: true,
            completedAt: completion.completedAt,
            completedBy: completion.completedBy,
            source: 'localStorage'
          };
        }
      }
    } catch (fallbackError) {
      console.warn('Final fallback to localStorage failed:', fallbackError);
    }

    return false;
  }
};

/**
 * Mark a proposal as completed - Enhanced database-first approach
 */
export const markSimpleProposalAsCompleted = async (unitName, proposalDate, requestsData = []) => {
  try {
    const currentUser = AuthManager.getUserSession();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const proposalKey = getProposalKey(unitName, proposalDate);
    const completionRecord = {
      proposalKey,
      unitName,
      proposalDate,
      totalEmployees: requestsData.length,
      totalRequests: requestsData.length,
      totalDays: requestsData.reduce((sum, req) => sum + (req.days_requested || 0), 0),
      completedAt: new Date().toISOString(),
      completedBy: currentUser.id,
      completedByName: currentUser.name || currentUser.email,
      requestIds: requestsData.map(req => req.id),
      source: 'database'
    };

    console.log(`🔄 Marking proposal as completed: ${proposalKey}`);

    // Step 1: Try to update existing leave_proposals records
    const updatePayload = {
      status: 'completed',
      completed_by: currentUser.id,
      completed_at: new Date().toISOString(),
    };

    const { data: updatedProposals, error: updateError } = await supabase
      .from('leave_proposals')
      .update(updatePayload)
      .eq('proposer_unit', unitName)
      .eq('proposal_date', proposalDate)
      .select();

    if (!updateError && updatedProposals && updatedProposals.length > 0) {
      console.log(`✅ Updated ${updatedProposals.length} existing proposals to completed status`);
      completionRecord.proposalId = updatedProposals[0].id;
      completionRecord.source = 'database';
    } else {
      // Step 2: If no existing proposals, create a new one to track completion
      console.log(`📝 No existing proposals found, creating new completion record`);
      
      const newProposalPayload = {
        proposal_title: `Usulan Cuti ${unitName} - ${proposalDate}`,
        proposed_by: currentUser.id,
        proposer_name: currentUser.name || currentUser.email,
        proposer_unit: unitName,
        proposal_date: proposalDate,
        total_employees: requestsData.length,
        status: 'completed',
        completed_by: currentUser.id,
        completed_at: new Date().toISOString(),
        notes: `Auto-created completion record for batch proposal from ${unitName}`
      };

      const { data: newProposal, error: createError } = await supabase
        .from('leave_proposals')
        .insert(newProposalPayload)
        .select()
        .single();

      if (!createError && newProposal) {
        console.log(`✅ Created new completion record in database:`, newProposal.id);
        completionRecord.proposalId = newProposal.id;
        completionRecord.source = 'database';
      } else {
        console.warn('⚠️ Failed to create completion record in database:', createError);
        completionRecord.source = 'localStorage';
      }
    }

    // Always store in localStorage as backup
    try {
      const existingCompleted = JSON.parse(localStorage.getItem('completedBatchProposals') || '{}');
      existingCompleted[proposalKey] = completionRecord;
      localStorage.setItem('completedBatchProposals', JSON.stringify(existingCompleted));
      console.log('💾 Completion status saved locally as backup');
    } catch (storageError) {
      console.error('❌ Failed to save completion status to localStorage:', storageError);
    }

    return completionRecord;

  } catch (error) {
    console.error('Error marking simple proposal as completed:', error);
    throw error;
  }
};

/**
 * Restore a completed proposal back to active status - Enhanced database-first approach
 */
export const restoreSimpleProposal = async (unitName, proposalDate) => {
  try {
    const currentUser = AuthManager.getUserSession();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const proposalKey = getProposalKey(unitName, proposalDate);
    console.log(`🔄 Restoring proposal: ${proposalKey}`);

    // Step 1: Update database records back to pending status
    const updatePayload = {
      status: 'pending',
      completed_by: null,
      completed_at: null,
    };

    const { data: updatedProposals, error: updateError } = await supabase
      .from('leave_proposals')
      .update(updatePayload)
      .eq('proposer_unit', unitName)
      .eq('proposal_date', proposalDate)
      .eq('status', 'completed')
      .select();

    if (!updateError && updatedProposals && updatedProposals.length > 0) {
      console.log(`✅ Restored ${updatedProposals.length} proposals to pending status in database`);
    } else if (updateError) {
      console.warn('⚠️ Database restore failed:', updateError);
    } else {
      console.log('ℹ️ No completed proposals found in database to restore');
    }

    // Step 2: Remove from localStorage backup
    try {
      const existingCompleted = JSON.parse(localStorage.getItem('completedBatchProposals') || '{}');
      delete existingCompleted[proposalKey];
      localStorage.setItem('completedBatchProposals', JSON.stringify(existingCompleted));
      console.log('💾 Removed local completion backup');
    } catch (storageError) {
      console.warn('⚠️ Failed to remove local completion backup:', storageError);
    }

    console.log('✅ Proposal restored to active status');
    return { success: true };

  } catch (error) {
    console.error('Error restoring simple proposal:', error);
    throw error;
  }
};

/**
 * Get all completion records from both database and localStorage
 */
export const getAllSimpleCompletions = async () => {
  const completions = new Map();

  try {
    // First, get all completed proposals from database
    const { data: dbCompletions, error: dbError } = await supabase
      .from('leave_proposals')
      .select('id, proposer_unit, proposal_date, completed_at, completed_by, status')
      .eq('status', 'completed');

    if (!dbError && dbCompletions) {
      dbCompletions.forEach(completion => {
        const key = getProposalKey(completion.proposer_unit, completion.proposal_date);
        completions.set(key, {
          proposalKey: key,
          unitName: completion.proposer_unit,
          proposalDate: completion.proposal_date,
          completedAt: completion.completed_at,
          completedBy: completion.completed_by,
          id: completion.id,
          source: 'database'
        });
      });
      console.log(`📊 Loaded ${dbCompletions.length} completions from database`);
    }
  } catch (error) {
    console.warn('Error loading completions from database:', error);
  }

  // Then, get localStorage completions (as backup/additional)
  try {
    const localData = localStorage.getItem('completedBatchProposals');
    if (localData) {
      const localCompletions = JSON.parse(localData);
      Object.entries(localCompletions).forEach(([key, completion]) => {
        // Only add if not already in database
        if (!completions.has(key)) {
          completions.set(key, {
            ...completion,
            source: 'localStorage'
          });
        }
      });
      console.log(`📱 Loaded additional completions from localStorage`);
    }
  } catch (error) {
    console.warn('Error loading completions from localStorage:', error);
  }

  // Convert Map to object for compatibility
  const result = {};
  completions.forEach((value, key) => {
    result[key] = value;
  });

  return result;
};

export default {
  isSimpleProposalCompleted,
  markSimpleProposalAsCompleted,
  restoreSimpleProposal,
  getAllSimpleCompletions
};