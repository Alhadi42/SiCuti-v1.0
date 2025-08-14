import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  List, 
  Users, 
  Calendar, 
  FileText,
  Plus,
  Eye,
  Building2,
  Filter,
  RefreshCw,
  CheckCircle,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { AuthManager } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { downloadLeaveProposalLetter } from "@/utils/leaveProposalLetterGenerator";

const BatchLeaveProposals = () => {
  const { toast } = useToast();
  const currentUser = AuthManager.getUserSession();
  
  const [unitProposals, setUnitProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedUnitDetail, setSelectedUnitDetail] = useState(null);
  const [unitLeaveRequests, setUnitLeaveRequests] = useState([]);

  // Check user permission
  if (!currentUser || currentUser.role !== 'master_admin') {
    return (
      <div className="p-6">
        <Card className="bg-red-900/20 border-red-700/50">
          <CardContent className="p-6">
            <div className="text-center">
              <FileText className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Akses Ditolak</h2>
              <p className="text-slate-300">
                Hanya Master Admin yang dapat mengakses halaman ini.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fetchBatchProposals = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log("🔍 Fetching leave requests grouped by unit...");
      console.log("🔍 Current user role:", currentUser?.role);
      console.log("🔍 Current user unit:", currentUser?.unitKerja);

      // Get leave requests with employee and leave type information
      const { data: leaveRequests, error: requestsError } = await supabase
        .from("leave_requests")
        .select(`
          *,
          employees (
            id,
            name,
            nip,
            department,
            position_name
          ),
          leave_types (
            id,
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (requestsError) {
        console.error("Error fetching leave requests:", requestsError);
        console.error("Error code:", requestsError.code);
        console.error("Error message:", requestsError.message);
        throw requestsError;
      }

      console.log("📊 Raw leave requests from database:", leaveRequests);
      console.log("📊 Total leave requests found:", leaveRequests?.length || 0);

      // Group requests by employee department (unit kerja) AND creation date
      const unitDateRequestsMap = {};

      if (leaveRequests && leaveRequests.length > 0) {
        leaveRequests.forEach(request => {
          const unitName = request.employees?.department;

          // Skip requests without department info
          if (!unitName) {
            console.warn("⚠️ Skipping request without department:", request.id);
            return;
          }

          // Get creation date (YYYY-MM-DD format)
          const createdDate = new Date(request.created_at).toISOString().split('T')[0];
          const groupKey = `${unitName}|${createdDate}`;

          if (!unitDateRequestsMap[groupKey]) {
            unitDateRequestsMap[groupKey] = {
              unitName,
              proposalDate: createdDate,
              requests: [],
              totalRequests: 0,
              totalEmployees: new Set(), // Use Set to count unique employees
              totalDays: 0,
              dateRange: { earliest: null, latest: null }
            };
          }

          unitDateRequestsMap[groupKey].requests.push(request);
          unitDateRequestsMap[groupKey].totalRequests += 1;
          unitDateRequestsMap[groupKey].totalEmployees.add(request.employee_id);
          unitDateRequestsMap[groupKey].totalDays += request.days_requested || 0;

          // Calculate date range for leave dates (not creation dates)
          const startDate = new Date(request.start_date);
          const endDate = new Date(request.end_date);

          if (!unitDateRequestsMap[groupKey].dateRange.earliest || startDate < unitDateRequestsMap[groupKey].dateRange.earliest) {
            unitDateRequestsMap[groupKey].dateRange.earliest = startDate;
          }
          if (!unitDateRequestsMap[groupKey].dateRange.latest || endDate > unitDateRequestsMap[groupKey].dateRange.latest) {
            unitDateRequestsMap[groupKey].dateRange.latest = endDate;
          }
        });
      }

      // Convert Set to count for totalEmployees and sort by proposal date (newest first)
      const groupedRequests = Object.values(unitDateRequestsMap)
        .map(unit => ({
          ...unit,
          totalEmployees: unit.totalEmployees.size
        }))
        .sort((a, b) => new Date(b.proposalDate) - new Date(a.proposalDate));

      console.log("📊 Unit-date requests map:", unitDateRequestsMap);
      console.log("📊 Final grouped requests:", groupedRequests);
      console.log("✅ Fetched", groupedRequests.length, "unit-date groups with leave requests");

      setUnitProposals(groupedRequests);


    } catch (error) {
      console.error("Error fetching batch proposals:", error);
      setUnitProposals([]);

      toast({
        title: "Error",
        description: "Gagal mengambil data usulan cuti: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleViewUnitDetail = async (unit) => {
    setSelectedUnitDetail(unit);
    setUnitLeaveRequests(unit.requests);
    setShowDetailDialog(true);
  };

  const handleAddToBatchLetter = async (unit) => {
    try {
      toast({
        title: "Info",
        description: "Sedang mempersiapkan surat batch...",
      });

      // Transform leave requests to format expected by letter generator
      const proposalItems = unit.requests.map(request => ({
        employee_id: request.employee_id,
        employee_name: request.employees?.name || "Nama tidak diketahui",
        employee_nip: request.employees?.nip || "-",
        employee_department: request.employees?.department || unit.unitName,
        employee_position: request.employees?.position_name || "-",
        leave_type_id: request.leave_type_id,
        leave_type_name: request.leave_types?.name || "Jenis cuti tidak diketahui",
        start_date: request.start_date,
        end_date: request.end_date,
        days_requested: request.days_requested || 0,
        leave_quota_year: request.leave_quota_year || new Date(request.start_date).getFullYear(),
        reason: request.reason || "",
        address_during_leave: request.address_during_leave || "",
      }));

      // Prepare proposal data for letter generation
      const proposalData = {
        proposal: {
          id: `batch-${unit.unitName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
          proposal_title: `Usulan Cuti Batch - ${unit.unitName}`,
          proposer_name: "Master Admin",
          proposer_unit: unit.unitName,
          proposal_date: format(new Date(), "yyyy-MM-dd"),
          total_employees: unit.totalEmployees,
          status: "approved",
          letter_number: `SRT/BATCH/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          letter_date: format(new Date(), "yyyy-MM-dd"),
          notes: `Surat batch untuk ${unit.totalRequests} pengajuan cuti dari ${unit.unitName}`,
        },
        proposalItems: proposalItems,
      };

      console.log("📄 Generating batch letter for unit:", {
        unitName: unit.unitName,
        totalRequests: unit.totalRequests,
        totalEmployees: unit.totalEmployees,
        proposalItemsCount: proposalItems.length
      });

      // Generate and download the letter
      const filename = `Usulan_Cuti_Batch_${unit.unitName.replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.docx`;
      await downloadLeaveProposalLetter(proposalData, filename);

      toast({
        title: "Berhasil",
        description: `Surat batch untuk ${unit.totalRequests} usulan cuti dari ${unit.unitName} berhasil dibuat dan diunduh`,
      });

    } catch (error) {
      console.error("Error generating batch letter:", error);
      toast({
        title: "Error",
        description: "Gagal membuat surat batch: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    }
  };

  // Filter units based on search and selection
  const filteredUnits = unitProposals.filter(unit => {
    const matchesSearch = searchTerm === "" || 
      unit.unitName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSelection = selectedUnit === "all" || unit.unitName === selectedUnit;
    
    return matchesSearch && matchesSelection;
  });

  // Get unique units for filter dropdown
  const uniqueUnits = [...new Set(unitProposals.map(unit => unit.unitName))];

  useEffect(() => {
    fetchBatchProposals();
  }, [fetchBatchProposals]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Pengajuan Cuti per Unit</h1>
          <p className="text-slate-400 mb-1">
            Kelola pengajuan cuti pegawai yang dikelompokkan berdasarkan unit kerja
          </p>
          <p className="text-blue-400 text-sm">
            💡 Data diambil dari pengajuan cuti yang dibuat melalui menu "Pengajuan Cuti"
          </p>
        </div>
        <Button
          onClick={fetchBatchProposals}
          variant="outline"
          className="border-slate-600 text-slate-300 hover:text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </motion.div>


      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filter Usulan per Tanggal
            </CardTitle>
            <p className="text-slate-400 text-sm mt-1">
              Usulan dikelompokkan berdasarkan unit kerja dan tanggal pengajuan
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Unit Kerja</Label>
                <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="all">Semua Unit</SelectItem>
                    {uniqueUnits.map(unit => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Cari Unit</Label>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nama unit..."
                  className="bg-slate-700/50 border-slate-600/50 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Units List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">
              Daftar Usulan per Unit ({filteredUnits.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-slate-400 mt-2">Memuat data...</p>
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Belum Ada Pengajuan Cuti</h3>
                <p className="text-slate-400 mb-2">
                  Saat ini belum ada pengajuan cuti dari pegawai di unit kerja manapun.
                </p>
                <p className="text-slate-400 text-sm">
                  Pengajuan cuti pegawai akan dikelompokkan berdasarkan unit kerja dan ditampilkan di sini.
                </p>
                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg max-w-md mx-auto">
                  <p className="text-blue-400 text-sm">
                    💡 <strong>Panduan:</strong> Admin unit dapat membuat pengajuan cuti di menu "Pengajuan Cuti"
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUnits.map((unit, index) => (
                  <div
                    key={index}
                    className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/50 hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Building2 className="w-5 h-5 text-blue-400" />
                          <div className="flex-1">
                            <h3 className="text-white font-medium">{unit.unitName}</h3>
                            <p className="text-slate-400 text-sm">
                              Tanggal Usulan: {format(new Date(unit.proposalDate), "dd MMMM yyyy", { locale: id })}
                            </p>
                          </div>
                          <Badge variant="secondary">{unit.totalRequests} usulan</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-400 mb-3">
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {unit.totalEmployees} pegawai
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {unit.totalDays} hari
                          </div>
                          <div className="flex items-center">
                            <FileText className="w-4 h-4 mr-1" />
                            {unit.totalRequests} pengajuan
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {unit.dateRange.earliest && unit.dateRange.latest && 
                              `${format(unit.dateRange.earliest, "dd/MM", { locale: id })} - ${format(unit.dateRange.latest, "dd/MM", { locale: id })}`
                            }
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewUnitDetail(unit)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Detail
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAddToBatchLetter(unit)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Buat Surat Batch
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-6xl bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Detail Usulan Cuti - {selectedUnitDetail?.unitName}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Pengajuan cuti yang dibuat pada {selectedUnitDetail?.proposalDate && format(new Date(selectedUnitDetail.proposalDate), "dd MMMM yyyy", { locale: id })}
            </DialogDescription>
          </DialogHeader>
          {selectedUnitDetail && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-700/30 rounded-lg">
                <div className="text-center">
                  <p className="text-slate-400 text-sm">Total Pegawai</p>
                  <p className="text-white font-bold text-xl">{selectedUnitDetail.totalEmployees}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-400 text-sm">Total Usulan</p>
                  <p className="text-white font-bold text-xl">{selectedUnitDetail.totalRequests}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-400 text-sm">Total Hari</p>
                  <p className="text-white font-bold text-xl">{selectedUnitDetail.totalDays}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-400 text-sm">Rentang Tanggal</p>
                  <p className="text-white font-bold text-sm">
                    {selectedUnitDetail.dateRange.earliest && selectedUnitDetail.dateRange.latest && 
                      `${format(selectedUnitDetail.dateRange.earliest, "dd/MM", { locale: id })} - ${format(selectedUnitDetail.dateRange.latest, "dd/MM", { locale: id })}`
                    }
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                {unitLeaveRequests.map((request, index) => (
                  <div key={request.id} className="p-3 bg-slate-700/50 rounded border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">{request.employees?.name}</h4>
                        <p className="text-slate-400 text-sm">{request.employees?.nip} - {request.employees?.position_name}</p>
                        <p className="text-slate-500 text-xs mt-1">Departemen: {request.employees?.department}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{request.leave_types?.name}</Badge>
                        <p className="text-slate-400 text-sm mt-1">{request.days_requested} hari</p>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-slate-300">
                      📅 {format(new Date(request.start_date), "dd MMM", { locale: id })} - {format(new Date(request.end_date), "dd MMM yyyy", { locale: id })}
                      {request.reason && (
                        <div className="mt-1 text-slate-400">
                          💬 {request.reason}
                        </div>
                      )}
                      <div className="mt-1 text-slate-500 text-xs">
                        Pengajuan: {format(new Date(request.created_at), "dd MMM yyyy HH:mm", { locale: id })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BatchLeaveProposals;
