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

    // Try to create a database record if possible (best effort)
    try {
      const { error: insertError } = await supabase
        .from('leave_proposals')
        .insert({
          proposal_title: `Usulan Cuti ${unitName} - ${new Date(proposalDate).toLocaleDateString('id-ID')}`,
          proposed_by: currentUser.id,
          proposer_name: currentUser.name || currentUser.email,
          proposer_unit: unitName,
          proposal_date: proposalDate,
          total_employees: requestsData.length,
          status: 'completed',
          completed_by: currentUser.id,
          completed_at: new Date().toISOString(),
          notes: `Selesai diajukan oleh ${currentUser.name || currentUser.email} pada ${new Date().toLocaleString('id-ID')}`
        });

      if (!insertError) {
        console.log('✅ Successfully created database record for completion');
        completionRecord.source = 'database';
      } else {
        console.warn('⚠️ Could not create database record, using localStorage:', insertError.code);
      }
    } catch (dbError) {
      console.warn('⚠️ Database insert failed, using localStorage:', dbError);
    }

    // Always store in localStorage as backup/primary storage
    const existingCompleted = JSON.parse(localStorage.getItem('completedBatchProposals') || '{}');
    existingCompleted[proposalKey] = completionRecord;
    localStorage.setItem('completedBatchProposals', JSON.stringify(existingCompleted));

    console.log('✅ Completion status saved:', completionRecord);
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

    // Try to update database record if it exists
    try {
      const { error: updateError } = await supabase
        .from('leave_proposals')
        .update({
          status: 'pending',
          completed_by: null,
          completed_at: null,
          notes: `Dikembalikan ke status aktif oleh ${currentUser.name || currentUser.email} pada ${new Date().toLocaleString('id-ID')}`
        })
        .eq('proposer_unit', unitName)
        .eq('proposal_date', proposalDate);

      if (!updateError) {
        console.log('✅ Successfully updated database record');
      } else {
        console.warn('⚠️ Could not update database record:', updateError.code);
      }
    } catch (dbError) {
      console.warn('⚠️ Database update failed:', dbError);
    }

    // Remove from localStorage
    const existingCompleted = JSON.parse(localStorage.getItem('completedBatchProposals') || '{}');
    delete existingCompleted[proposalKey];
    localStorage.setItem('completedBatchProposals', JSON.stringify(existingCompleted));

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
