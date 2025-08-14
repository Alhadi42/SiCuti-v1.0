import React, { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Plus, List, Clock, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { AuthManager } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import useLeaveProposals from "@/hooks/useLeaveProposals";
import LeaveProposalForm from "@/components/leave_proposals/LeaveProposalForm";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const LeaveProposals = () => {
  const { toast } = useToast();
  const currentUser = AuthManager.getUserSession();
  const { proposals, isLoading, fetchProposals } = useLeaveProposals();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tableExists, setTableExists] = useState(true);

  // Check user permission
  if (!currentUser || currentUser.role !== 'admin_unit') {
    return (
      <div className="p-6">
        <Card className="bg-red-900/20 border-red-700/50">
          <CardContent className="p-6">
            <div className="text-center">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Akses Ditolak</h2>
              <p className="text-slate-300">
                Hanya Admin Unit yang dapat mengakses halaman ini.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateProposal = async (proposalData) => {
    try {
      // Check if table exists first
      const { data: checkData, error: checkError } = await supabase
        .from("leave_proposals")
        .select("*")
        .limit(1);

      if (checkError && checkError.code === "42P01") {
        setTableExists(false);
        throw new Error("Tabel leave_proposals belum tersedia. Hubungi administrator untuk setup database.");
      }

      // Create proposal
      const { data: proposal, error: proposalError } = await supabase
        .from("leave_proposals")
        .insert({
          proposal_title: proposalData.title,
          proposed_by: currentUser.id,
          proposer_name: currentUser.name,
          proposer_unit: currentUser.unitKerja,
          notes: proposalData.notes,
          total_employees: proposalData.employees.length,
        })
        .select()
        .single();

      if (proposalError) throw proposalError;

      // Create proposal items
      const proposalItems = proposalData.employees.map(emp => ({
        proposal_id: proposal.id,
        employee_id: emp.employee_id,
        employee_name: emp.employee_name,
        employee_nip: emp.employee_nip,
        employee_department: emp.employee_department,
        employee_position: emp.employee_position,
        leave_type_id: emp.leave_type_id,
        leave_type_name: emp.leave_type_name,
        start_date: emp.start_date,
        end_date: emp.end_date,
        days_requested: emp.days_requested,
        leave_quota_year: emp.leave_quota_year,
        reason: emp.reason,
        address_during_leave: emp.address_during_leave,
      }));

      const { error: itemsError } = await supabase
        .from("leave_proposal_items")
        .insert(proposalItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Usulan cuti berhasil dibuat dan dikirim ke Master Admin",
      });

      setShowCreateForm(false);
      fetchProposals();
    } catch (error) {
      console.error("Error creating proposal:", error);
      throw error;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: "Menunggu", variant: "default", icon: Clock },
      approved: { label: "Disetujui", variant: "success", icon: CheckCircle },
      rejected: { label: "Ditolak", variant: "destructive", icon: XCircle },
      processed: { label: "Diproses", variant: "secondary", icon: FileText },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  if (showCreateForm) {
    return (
      <div className="p-6">
        <LeaveProposalForm
          onSubmit={handleCreateProposal}
          onCancel={() => setShowCreateForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Usulan Cuti</h1>
          <p className="text-slate-400">
            Kelola usulan cuti untuk unit {currentUser.unitKerja}
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Buat Usulan Baru
        </Button>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <List className="w-6 h-6 text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-slate-400 text-sm">Total Usulan</p>
                  <p className="text-2xl font-bold text-white">{proposals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-slate-400 text-sm">Menunggu</p>
                  <p className="text-2xl font-bold text-white">
                    {proposals.filter(p => p.status === 'pending').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-slate-400 text-sm">Disetujui</p>
                  <p className="text-2xl font-bold text-white">
                    {proposals.filter(p => p.status === 'approved').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-400" />
                </div>
                <div className="ml-4">
                  <p className="text-slate-400 text-sm">Ditolak</p>
                  <p className="text-2xl font-bold text-white">
                    {proposals.filter(p => p.status === 'rejected').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Proposals List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Daftar Usulan Cuti</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-slate-400 mt-2">Memuat data...</p>
              </div>
            ) : proposals.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Belum Ada Usulan</h3>
                <p className="text-slate-400 mb-4">
                  Mulai buat usulan cuti untuk pegawai di unit Anda
                </p>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Buat Usulan Pertama
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {proposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/50 hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-white font-medium">{proposal.proposal_title}</h3>
                          {getStatusBadge(proposal.status)}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-slate-400 mb-2">
                          <span>📅 {format(new Date(proposal.proposal_date), "dd MMM yyyy", { locale: id })}</span>
                          <span>👥 {proposal.total_employees} pegawai</span>
                          <span>🏢 {proposal.proposer_unit}</span>
                        </div>
                        {proposal.notes && (
                          <p className="text-slate-300 text-sm">{proposal.notes}</p>
                        )}
                        {proposal.status === 'rejected' && proposal.rejection_reason && (
                          <div className="mt-2 p-2 bg-red-900/20 border border-red-700/50 rounded">
                            <p className="text-red-400 text-sm">
                              <strong>Alasan ditolak:</strong> {proposal.rejection_reason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Employee List Preview */}
                    {proposal.leave_proposal_items && proposal.leave_proposal_items.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-600/50">
                        <p className="text-slate-400 text-sm mb-2">Daftar Pegawai:</p>
                        <div className="space-y-1">
                          {proposal.leave_proposal_items.slice(0, 3).map((item, index) => (
                            <div key={index} className="flex items-center text-sm text-slate-300">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                              <span className="flex-1">{item.employee_name} ({item.employee_nip})</span>
                              <span className="text-slate-400">
                                {item.leave_type_name} - {item.days_requested} hari
                              </span>
                            </div>
                          ))}
                          {proposal.leave_proposal_items.length > 3 && (
                            <div className="text-sm text-slate-400 ml-4">
                              +{proposal.leave_proposal_items.length - 3} pegawai lainnya
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default LeaveProposals;
