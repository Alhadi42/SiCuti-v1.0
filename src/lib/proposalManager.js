/**
 * Proposal Manager - Handles batch leave proposal operations with database persistence
 */

import { supabase } from './supabaseClient';
import { AuthManager } from './auth';

/**
 * Create or find an existing proposal record for the given unit and date
 */
export const createOrFindProposal = async (unitName, proposalDate, leaveRequests) => {
  try {
    const currentUser = AuthManager.getUserSession();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // First, check if a proposal already exists for this unit and date
    const { data: existingProposal, error: searchError } = await supabase
      .from('leave_proposals')
      .select('*')
      .eq('proposer_unit', unitName)
      .eq('proposal_date', proposalDate)
      .single();

    if (searchError && searchError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw searchError;
    }

    if (existingProposal) {
      console.log('Found existing proposal:', existingProposal.id);
      return existingProposal;
    }

    // Create a new proposal
    const proposalData = {
      proposal_title: `Usulan Cuti ${unitName} - ${new Date(proposalDate).toLocaleDateString('id-ID')}`,
      proposed_by: currentUser.id,
      proposer_name: currentUser.name || currentUser.email,
      proposer_unit: unitName,
      proposal_date: proposalDate,
      total_employees: leaveRequests.length,
      status: 'pending',
      notes: `Usulan dibuat secara batch dari ${leaveRequests.length} pengajuan cuti individu`
    };

    const { data: newProposal, error: createError } = await supabase
      .from('leave_proposals')
      .insert(proposalData)
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    console.log('Created new proposal:', newProposal.id);

    // Create proposal items for each leave request
    const proposalItems = leaveRequests.map(request => ({
      proposal_id: newProposal.id,
      employee_id: request.employee_id,
      employee_name: request.employees?.name || 'Unknown',
      employee_nip: request.employees?.nip || '',
      employee_department: request.employees?.department || unitName,
      employee_position: request.employees?.position_name || '',
      leave_type_id: request.leave_type_id,
      leave_type_name: request.leave_types?.name || 'Unknown',
      start_date: request.start_date,
      end_date: request.end_date,
      days_requested: request.days_requested,
      leave_quota_year: request.leave_quota_year || new Date().getFullYear(),
      reason: request.reason || '',
      address_during_leave: request.address_during_leave || '',
      status: 'proposed'
    }));

    const { error: itemsError } = await supabase
      .from('leave_proposal_items')
      .insert(proposalItems);

    if (itemsError) {
      // If items creation fails, try to delete the proposal to maintain consistency
      await supabase.from('leave_proposals').delete().eq('id', newProposal.id);
      throw itemsError;
    }

    console.log(`Created ${proposalItems.length} proposal items for proposal ${newProposal.id}`);
    return newProposal;

  } catch (error) {
    console.error('Error creating/finding proposal:', error);
    throw error;
  }
};

/**
 * Mark a proposal as completed
 */
export const markProposalAsCompleted = async (unitName, proposalDate, leaveRequests = []) => {
  try {
    const currentUser = AuthManager.getUserSession();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Find or create the proposal
    let proposal = await createOrFindProposal(unitName, proposalDate, leaveRequests);

    // Update the proposal status to completed
    const { data: updatedProposal, error: updateError } = await supabase
      .from('leave_proposals')
      .update({
        status: 'completed',
        completed_by: currentUser.id,
        completed_at: new Date().toISOString(),
        notes: proposal.notes ? 
          `${proposal.notes}\n\nSelesai diajukan oleh ${currentUser.name || currentUser.email} pada ${new Date().toLocaleString('id-ID')}` :
          `Selesai diajukan oleh ${currentUser.name || currentUser.email} pada ${new Date().toLocaleString('id-ID')}`
      })
      .eq('id', proposal.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log('Proposal marked as completed:', updatedProposal.id);
    return updatedProposal;

  } catch (error) {
    console.error('Error marking proposal as completed:', error);
    throw error;
  }
};

/**
 * Restore a completed proposal back to pending status
 */
export const restoreProposal = async (unitName, proposalDate) => {
  try {
    const currentUser = AuthManager.getUserSession();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Find the proposal
    const { data: proposal, error: findError } = await supabase
      .from('leave_proposals')
      .select('*')
      .eq('proposer_unit', unitName)
      .eq('proposal_date', proposalDate)
      .single();

    if (findError) {
      if (findError.code === 'PGRST116') {
        throw new Error('Proposal not found');
      }
      throw findError;
    }

    // Update the proposal status back to pending
    const { data: updatedProposal, error: updateError } = await supabase
      .from('leave_proposals')
      .update({
        status: 'pending',
        completed_by: null,
        completed_at: null,
        notes: proposal.notes ? 
          `${proposal.notes}\n\nDikembalikan ke status aktif oleh ${currentUser.name || currentUser.email} pada ${new Date().toLocaleString('id-ID')}` :
          `Dikembalikan ke status aktif oleh ${currentUser.name || currentUser.email} pada ${new Date().toLocaleString('id-ID')}`
      })
      .eq('id', proposal.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log('Proposal restored to active status:', updatedProposal.id);
    return updatedProposal;

  } catch (error) {
    console.error('Error restoring proposal:', error);
    throw error;
  }
};

/**
 * Get all proposals with their completion status
 */
export const getProposalsWithStatus = async () => {
  try {
    const { data: proposals, error } = await supabase
      .from('leave_proposals')
      .select(`
        *,
        completed_by_user:completed_by(id, name, email),
        proposal_items:leave_proposal_items(*)
      `)
      .order('proposal_date', { ascending: false });

    if (error) {
      throw error;
    }

    return proposals || [];

  } catch (error) {
    console.error('Error fetching proposals with status:', error);
    throw error;
  }
};

/**
 * Check if a proposal exists and is completed for given unit and date
 */
export const isProposalCompleted = async (unitName, proposalDate) => {
  try {
    const { data: proposal, error } = await supabase
      .from('leave_proposals')
      .select('id, status, completed_at, completed_by')
      .eq('proposer_unit', unitName)
      .eq('proposal_date', proposalDate)
      .eq('status', 'completed')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return false; // No completed proposal found
      }
      throw error;
    }

    return {
      isCompleted: true,
      completedAt: proposal.completed_at,
      completedBy: proposal.completed_by
    };

  } catch (error) {
    console.error('Error checking proposal completion status:', error);
    return false;
  }
};

/**
 * Migrate existing localStorage data to database
 */
export const migrateLocalStorageToDatabase = async () => {
  try {
    console.log('Starting migration of localStorage completion data to database...');
    
    const currentUser = AuthManager.getUserSession();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Get localStorage data
    const localData = localStorage.getItem('completedBatchProposals');
    if (!localData) {
      console.log('No localStorage data to migrate');
      return { migrated: 0, errors: 0 };
    }

    const completedProposals = JSON.parse(localData);
    let migrated = 0;
    let errors = 0;

    for (const [proposalKey, completionRecord] of Object.entries(completedProposals)) {
      try {
        const [unitName, proposalDate] = proposalKey.split('|');
        
        // Check if proposal already exists in database
        const existingStatus = await isProposalCompleted(unitName, proposalDate);
        if (existingStatus.isCompleted) {
          console.log(`Proposal ${proposalKey} already completed in database, skipping`);
          continue;
        }

        // Create a minimal proposal record for migration
        const proposalData = {
          proposal_title: `Usulan Cuti ${unitName} - ${new Date(proposalDate).toLocaleDateString('id-ID')} (Migrated)`,
          proposed_by: currentUser.id,
          proposer_name: completionRecord.completedByName || currentUser.name || currentUser.email,
          proposer_unit: unitName,
          proposal_date: proposalDate,
          total_employees: completionRecord.totalEmployees || 0,
          status: 'completed',
          completed_by: currentUser.id,
          completed_at: completionRecord.completedAt || new Date().toISOString(),
          notes: `Migrated from localStorage. Original completion: ${completionRecord.completedAt || 'Unknown'} by ${completionRecord.completedByName || 'Unknown'}`
        };

        const { error: createError } = await supabase
          .from('leave_proposals')
          .insert(proposalData);

        if (createError) {
          console.error(`Error migrating ${proposalKey}:`, createError);
          errors++;
        } else {
          console.log(`Successfully migrated ${proposalKey}`);
          migrated++;
        }

      } catch (error) {
        console.error(`Error processing ${proposalKey}:`, error);
        errors++;
      }
    }

    console.log(`Migration completed: ${migrated} migrated, ${errors} errors`);
    return { migrated, errors };

  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
};

export default {
  createOrFindProposal,
  markProposalAsCompleted,
  restoreProposal,
  getProposalsWithStatus,
  isProposalCompleted,
  migrateLocalStorageToDatabase
};
