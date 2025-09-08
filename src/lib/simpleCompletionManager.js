/**
 * Simple Completion Manager - Works with existing data without complex RLS
 * This approach avoids RLS issues by using a simpler storage mechanism
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
 * Uses a simple approach that doesn't require complex RLS
 */
export const isSimpleProposalCompleted = async (unitName, proposalDate) => {
  try {
    const proposalKey = getProposalKey(unitName, proposalDate);
    
    // Try to check if there's any completion record in the database
    // We'll use a simple table approach if available, otherwise fall back to localStorage
    
    // First, try to query existing leave_proposals table (read-only, should work with RLS)
    const { data: existingProposals, error: queryError } = await supabase
      .from('leave_proposals')
      .select('id, status, updated_at')
      .eq('proposer_unit', unitName)
      .eq('proposal_date', proposalDate)
      .eq('status', 'completed');

    // If query succeeds and finds completed proposals
    if (!queryError && existingProposals && existingProposals.length > 0) {
      return {
        isCompleted: true,
        completedAt: existingProposals[0].updated_at,
        completedBy: null,
        source: 'database'
      };
    }

    // If query fails due to RLS or other issues, fall back to localStorage
    if (queryError && queryError.code !== 'PGRST116') {
      console.warn('Database query failed, using localStorage fallback:', queryError.code);
    }

    // Fallback to localStorage check
    const localData = localStorage.getItem('completedBatchProposals');
    if (localData) {
      try {
        const completedProposals = JSON.parse(localData);
        const completion = completedProposals[proposalKey];
        if (completion) {
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
 * Mark a proposal as completed using simple storage
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
      source: 'simple'
    };

    // Try to persist to database first (update matching leave_proposals records)
    try {
      console.log('🔁 Attempting to persist completion status to database...');
      const updatePayload = {
        status: 'completed',
        completed_by: currentUser.id,
        completed_at: new Date().toISOString(),
      };

      const { data: updated, error: updateError } = await supabase
        .from('leave_proposals')
        .update(updatePayload)
        .eq('proposer_unit', unitName)
        .eq('proposal_date', proposalDate);

      if (!updateError) {
        if (updated && updated.length > 0) {
          console.log('✅ Completion status persisted to DB for existing proposals:', updated.length);
          completionRecord.source = 'database';
          completionRecord.completedAt = updatePayload.completed_at;
          completionRecord.completedBy = currentUser.id;
        } else {
          console.log('⚠️ No existing leave_proposals rows matched for update. Will store locally as backup.');
          completionRecord.source = 'localStorage';
        }
      } else {
        console.warn('⚠️ Database update failed, falling back to localStorage:', updateError);
        completionRecord.source = 'localStorage';
      }
    } catch (dbError) {
      console.warn('⚠️ Error while persisting to DB, falling back to localStorage:', dbError);
      completionRecord.source = 'localStorage';
    }

    // Always store in localStorage as backup
    try {
      const existingCompleted = JSON.parse(localStorage.getItem('completedBatchProposals') || '{}');
      existingCompleted[proposalKey] = completionRecord;
      localStorage.setItem('completedBatchProposals', JSON.stringify(existingCompleted));
      console.log('💾 Completion status saved locally as backup:', proposalKey);
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
 * Restore a completed proposal back to active status
 */
export const restoreSimpleProposal = async (unitName, proposalDate) => {
  try {
    const currentUser = AuthManager.getUserSession();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const proposalKey = getProposalKey(unitName, proposalDate);

    // Try to restore in database first (set status back to 'pending' and clear completion metadata)
    try {
      console.log('🔁 Attempting to restore completion status in database...');
      const updatePayload = {
        status: 'pending',
        completed_by: null,
        completed_at: null,
      };

      const { data: updated, error: updateError } = await supabase
        .from('leave_proposals')
        .update(updatePayload)
        .eq('proposer_unit', unitName)
        .eq('proposal_date', proposalDate);

      if (!updateError) {
        if (updated && updated.length > 0) {
          console.log('✅ Restoration persisted to DB for existing proposals:', updated.length);
        } else {
          console.log('⚠️ No DB rows matched during restore. Will remove local backup if present.');
        }
      } else {
        console.warn('⚠️ Database restore failed, will still remove local backup:', updateError);
      }
    } catch (dbError) {
      console.warn('⚠️ Error while restoring in DB, will still remove local backup:', dbError);
    }

    // Remove from localStorage (backup/primary)
    try {
      const existingCompleted = JSON.parse(localStorage.getItem('completedBatchProposals') || '{}');
      delete existingCompleted[proposalKey];
      localStorage.setItem('completedBatchProposals', JSON.stringify(existingCompleted));
      console.log('💾 Removed local completion backup for', proposalKey);
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
 * Get all completion records
 */
export const getAllSimpleCompletions = () => {
  try {
    const localData = localStorage.getItem('completedBatchProposals');
    if (localData) {
      return JSON.parse(localData);
    }
    return {};
  } catch (error) {
    console.warn('Error getting simple completions:', error);
    return {};
  }
};

export default {
  isSimpleProposalCompleted,
  markSimpleProposalAsCompleted,
  restoreSimpleProposal,
  getAllSimpleCompletions
};
