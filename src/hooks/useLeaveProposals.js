import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { AuthManager } from "@/lib/auth";

export const useLeaveProposals = () => {
  const { toast } = useToast();
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProposals = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const currentUser = AuthManager.getUserSession();
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      // For now, just set empty proposals since tables don't exist
      console.log("⚠️ Leave proposals feature disabled - tables not available");
      setProposals([]);
      return;

    } catch (err) {
      console.error("Error fetching proposals:", err);
      setError(err.message);
      setProposals([]);

      toast({
        title: "Error",
        description: "Gagal mengambil data usulan cuti: " + err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createProposal = useCallback(async (proposalData) => {
    try {
      const currentUser = AuthManager.getUserSession();
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      if (currentUser.role !== 'admin_unit') {
        throw new Error("Only admin unit can create proposals");
      }

      const { data, error } = await supabase
        .from("leave_proposals")
        .insert({
          proposal_title: proposalData.title,
          proposed_by: currentUser.id,
          proposer_name: currentUser.name,
          proposer_unit: currentUser.unitKerja,
          notes: proposalData.notes,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Usulan cuti berhasil dibuat",
      });

      return data;
    } catch (err) {
      console.error("Error creating proposal:", err);
      toast({
        title: "Error", 
        description: "Gagal membuat usulan cuti: " + err.message,
        variant: "destructive",
      });
      throw err;
    }
  }, [toast]);

  const updateProposalStatus = useCallback(async (proposalId, status, data = {}) => {
    try {
      const currentUser = AuthManager.getUserSession();
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      if (currentUser.role !== 'master_admin') {
        throw new Error("Only master admin can update proposal status");
      }

      const updateData = {
        status,
        ...data,
      };

      if (status === 'approved') {
        updateData.approved_by = currentUser.id;
        updateData.approved_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from("leave_proposals")
        .update(updateData)
        .eq("id", proposalId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Usulan berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`,
      });

      // Refresh data
      await fetchProposals();
    } catch (err) {
      console.error("Error updating proposal status:", err);
      toast({
        title: "Error",
        description: "Gagal memperbarui status usulan: " + err.message,
        variant: "destructive",
      });
      throw err;
    }
  }, [toast, fetchProposals]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  return {
    proposals,
    isLoading,
    error,
    fetchProposals,
    createProposal,
    updateProposalStatus,
  };
};

export default useLeaveProposals;
