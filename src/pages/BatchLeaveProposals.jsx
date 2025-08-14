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
  Clock,
  Download,
  Layers
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
import ConnectionStatus from "@/components/ConnectionStatus";

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
  const [connectionError, setConnectionError] = useState(false);
  const [completedProposals, setCompletedProposals] = useState(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [selectedUnitForBatch, setSelectedUnitForBatch] = useState(null);
  const [leaveTypeClassification, setLeaveTypeClassification] = useState({});
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [currentlyGenerating, setCurrentlyGenerating] = useState(null);

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

  const fetchBatchProposals = useCallback(async (retryCount = 0) => {
    setIsLoading(true);
    try {
      console.log("🔍 Fetching leave requests grouped by unit...");
      console.log("🔍 Current user role:", currentUser?.role);
      console.log("🔍 Current user unit:", currentUser?.unitKerja);
      console.log("🔍 Retry attempt:", retryCount);

      // Check if we have a valid connection first
      if (!navigator.onLine) {
        console.log("🚫 Device is offline");
        setConnectionError(true);
        throw new Error("No internet connection");
      }

      // Test basic connectivity before main query
      try {
        console.log("🔌 Testing basic connectivity...");
        const connectivityTest = await fetch(import.meta.env.VITE_SUPABASE_URL + '/rest/v1/', {
          method: 'HEAD',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        if (!connectivityTest.ok) {
          throw new Error(`Connectivity test failed: ${connectivityTest.status}`);
        }
        console.log("✅ Basic connectivity OK");
      } catch (connectError) {
        console.error("❌ Connectivity test failed:", connectError);
        if (retryCount < 2) {
          console.log(`🔄 Retrying connectivity test... Attempt ${retryCount + 1}/3`);
          await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
          return fetchBatchProposals(retryCount + 1);
        }
        throw new Error("Cannot connect to server");
      }

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

        // Check if it's a network error and retry
        if (requestsError.message?.includes("Failed to fetch") || requestsError.message?.includes("fetch")) {
          if (retryCount < 2) {
            console.log(`🔄 Retrying fetch... Attempt ${retryCount + 1}/3`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
            return fetchBatchProposals(retryCount + 1);
          }
        }

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
      setConnectionError(false); // Reset error state on successful fetch


    } catch (error) {
      console.error("Error fetching batch proposals:", error);
      setUnitProposals([]);

      let errorMessage = "Gagal mengambil data usulan cuti";
      let errorTitle = "Error";

      // Handle different types of errors
      if (error.message?.includes("Failed to fetch") || error.message?.includes("fetch")) {
        errorTitle = "Koneksi Bermasalah";
        errorMessage = "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
        setConnectionError(true);
      } else if (error.message?.includes("No internet connection")) {
        errorTitle = "Tidak Ada Internet";
        errorMessage = "Periksa koneksi internet Anda dan coba lagi.";
        setConnectionError(true);
      } else if (error.code === "PGRST301") {
        errorTitle = "Masalah Database";
        errorMessage = "Tabel atau kolom tidak ditemukan. Sistem perlu update database.";
        setConnectionError(false);
      } else if (error.code === "42501") {
        errorTitle = "Akses Ditolak";
        errorMessage = "Anda tidak memiliki izin untuk mengakses data ini.";
        setConnectionError(false);
      } else {
        errorMessage = error.message || "Terjadi kesalahan yang tidak diketahui";
        setConnectionError(false);
      }

      toast({
        title: errorTitle,
        description: errorMessage,
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

  const handleMarkAsCompleted = async (unit) => {
    try {
      const proposalKey = `${unit.unitName}|${unit.proposalDate}`;

      // Show confirmation dialog
      const confirmed = window.confirm(
        `Apakah Anda yakin ingin menandai usulan cuti dari ${unit.unitName} tanggal ${format(new Date(unit.proposalDate), "dd MMMM yyyy", { locale: id })} sebagai "Selesai di Ajukan"?\n\nUsulan ini akan disembunyikan dari daftar.`
      );

      if (!confirmed) return;

      // Add to completed proposals set
      setCompletedProposals(prev => new Set([...prev, proposalKey]));

      // Store in localStorage for persistence
      const completedList = JSON.parse(localStorage.getItem('completedProposals') || '[]');
      completedList.push(proposalKey);
      localStorage.setItem('completedProposals', JSON.stringify(completedList));

      toast({
        title: "Berhasil",
        description: `Usulan cuti dari ${unit.unitName} telah ditandai sebagai selesai diajukan`,
      });

    } catch (error) {
      console.error("Error marking proposal as completed:", error);
      toast({
        title: "Error",
        description: "Gagal menandai usulan sebagai selesai: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    }
  };

  const handleRestoreProposal = async (unit) => {
    try {
      const proposalKey = `${unit.unitName}|${unit.proposalDate}`;

      // Remove from completed proposals set
      setCompletedProposals(prev => {
        const newSet = new Set(prev);
        newSet.delete(proposalKey);
        return newSet;
      });

      // Update localStorage
      const completedList = JSON.parse(localStorage.getItem('completedProposals') || '[]');
      const updatedList = completedList.filter(key => key !== proposalKey);
      localStorage.setItem('completedProposals', JSON.stringify(updatedList));

      toast({
        title: "Berhasil",
        description: `Usulan cuti dari ${unit.unitName} telah dikembalikan ke daftar aktif`,
      });

    } catch (error) {
      console.error("Error restoring proposal:", error);
      toast({
        title: "Error",
        description: "Gagal mengembalikan usulan: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    }
  };

  const handleAddToBatchLetter = async (unit) => {
    try {
      // First, analyze and group leave requests by type
      const leaveTypeGroups = {};
      unit.requests.forEach(request => {
        const leaveType = request.leave_types?.name || "Jenis cuti tidak diketahui";
        if (!leaveTypeGroups[leaveType]) {
          leaveTypeGroups[leaveType] = [];
        }
        leaveTypeGroups[leaveType].push(request);
      });

      // Set data for batch dialog
      setSelectedUnitForBatch(unit);
      setLeaveTypeClassification(leaveTypeGroups);
      setShowBatchDialog(true);

    } catch (error) {
      console.error("Error preparing batch letter:", error);
      toast({
        title: "Error",
        description: "Gagal mempersiapkan surat batch: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    }
  };

  const handleGenerateBatchLetter = async (leaveType, requests) => {
    try {
      setGeneratingLetter(true);
      setCurrentlyGenerating(leaveType);

      toast({
        title: "Info",
        description: `Sedang mempersiapkan surat batch untuk ${leaveType}...`,
      });

      // Transform leave requests to format expected by letter generator
      const proposalItems = requests.map(request => ({
        employee_id: request.employee_id,
        employee_name: request.employees?.name || "Nama tidak diketahui",
        employee_nip: request.employees?.nip || "-",
        employee_department: request.employees?.department || selectedUnitForBatch.unitName,
        employee_position: request.employees?.position_name || "-",
        leave_type_id: request.leave_type_id,
        leave_type_name: request.leave_types?.name || leaveType,
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
          id: `batch-${selectedUnitForBatch.unitName.replace(/\s+/g, '-').toLowerCase()}-${leaveType.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
          proposal_title: `Usulan ${leaveType} - ${selectedUnitForBatch.unitName}`,
          proposer_name: "Master Admin",
          proposer_unit: selectedUnitForBatch.unitName,
          proposal_date: format(new Date(), "yyyy-MM-dd"),
          total_employees: requests.length,
          status: "approved",
          letter_number: `SRT/${leaveType.toUpperCase().replace(/\s+/g, '')}/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          letter_date: format(new Date(), "yyyy-MM-dd"),
          notes: `Surat batch untuk ${requests.length} pengajuan ${leaveType} dari ${selectedUnitForBatch.unitName}`,
          leave_type: leaveType, // Add leave type for template customization
        },
        proposalItems: proposalItems,
      };

      console.log("📄 Generating batch letter for leave type:", {
        leaveType,
        unitName: selectedUnitForBatch.unitName,
        totalRequests: requests.length,
        proposalItemsCount: proposalItems.length
      });

      // Generate and download the letter with leave type in filename
      const safeLeaveType = leaveType.replace(/[^a-zA-Z0-9]/g, '_');
      const safeUnitName = selectedUnitForBatch.unitName.replace(/\s+/g, '_');
      const filename = `Usulan_${safeLeaveType}_${safeUnitName}_${format(new Date(), "yyyy-MM-dd")}.docx`;

      await downloadLeaveProposalLetter(proposalData, filename);

      toast({
        title: "Berhasil",
        description: `Surat batch untuk ${requests.length} usulan ${leaveType} dari ${selectedUnitForBatch.unitName} berhasil dibuat dan diunduh`,
      });

    } catch (error) {
      console.error("Error generating batch letter:", error);
      toast({
        title: "Error",
        description: "Gagal membuat surat batch: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    } finally {
      setGeneratingLetter(false);
      setCurrentlyGenerating(null);
    }
  };

  // Filter units based on search, selection, and completion status
  const filteredUnits = unitProposals.filter(unit => {
    const matchesSearch = searchTerm === "" ||
      unit.unitName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSelection = selectedUnit === "all" || unit.unitName === selectedUnit;

    // Check if this proposal is marked as completed
    const proposalKey = `${unit.unitName}|${unit.proposalDate}`;
    const isCompleted = completedProposals.has(proposalKey);

    // Show based on completion toggle
    const showBasedOnCompletion = showCompleted ? isCompleted : !isCompleted;

    return matchesSearch && matchesSelection && showBasedOnCompletion;
  });

  // Get unique units for filter dropdown
  const uniqueUnits = [...new Set(unitProposals.map(unit => unit.unitName))];

  useEffect(() => {
    // Load completed proposals from localStorage
    const savedCompleted = JSON.parse(localStorage.getItem('completedProposals') || '[]');
    setCompletedProposals(new Set(savedCompleted));

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
          {connectionError ? (
            <p className="text-red-400 text-sm">
              ⚠️ Masalah koneksi - Data mungkin tidak terbaru
            </p>
          ) : (
            <p className="text-blue-400 text-sm">
              💡 Data diambil dari pengajuan cuti yang dibuat melalui menu "Pengajuan Cuti"
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <ConnectionStatus onRetry={() => fetchBatchProposals(0)} />
          <Button
            onClick={() => fetchBatchProposals(0)}
            variant="outline"
            className={`border-slate-600 text-slate-300 hover:text-white ${connectionError ? 'border-red-500 text-red-400' : ''}`}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {connectionError ? 'Coba Lagi' : 'Refresh'}
          </Button>
        </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div>
                <Label className="text-slate-300">Status Usulan</Label>
                <div className="flex items-center space-x-3 mt-2">
                  <button
                    onClick={() => setShowCompleted(false)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      !showCompleted
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Aktif ({unitProposals.filter(unit => !completedProposals.has(`${unit.unitName}|${unit.proposalDate}`)).length})
                  </button>
                  <button
                    onClick={() => setShowCompleted(true)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      showCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Selesai ({completedProposals.size})
                  </button>
                </div>
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
              {showCompleted ? 'Usulan yang Selesai Diajukan' : 'Daftar Usulan per Unit & Tanggal'} ({filteredUnits.length})
            </CardTitle>
            <p className="text-slate-400 text-sm">
              {showCompleted
                ? 'Usulan cuti yang sudah ditandai sebagai selesai diajukan'
                : 'Setiap card menampilkan usulan cuti yang dibuat pada tanggal yang sama'
              }
            </p>
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
                      <div className="flex flex-col space-y-2 ml-4">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewUnitDetail(unit)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Detail
                          </Button>
                          {!showCompleted && (
                            <Button
                              size="sm"
                              onClick={() => handleAddToBatchLetter(unit)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Buat Surat Batch
                            </Button>
                          )}
                        </div>
                        {showCompleted ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreProposal(unit)}
                            className="bg-yellow-900/20 border-yellow-700/50 text-yellow-400 hover:bg-yellow-900/30 hover:text-yellow-300 w-full"
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Kembalikan ke Aktif
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsCompleted(unit)}
                            className="bg-green-900/20 border-green-700/50 text-green-400 hover:bg-green-900/30 hover:text-green-300 w-full"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Selesai di Ajukan
                          </Button>
                        )}
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

      {/* Batch Letter Classification Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="max-w-4xl bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Klasifikasi Jenis Cuti - {selectedUnitForBatch?.unitName}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Pilih jenis cuti untuk membuat surat batch yang sesuai. Setiap jenis cuti akan menggunakan template surat yang berbeda.
            </DialogDescription>
          </DialogHeader>

          {selectedUnitForBatch && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Summary Section */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-700/30 rounded-lg">
                <div className="text-center">
                  <p className="text-slate-400 text-sm">Unit Kerja</p>
                  <p className="text-white font-bold">{selectedUnitForBatch.unitName}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-400 text-sm">Total Pengajuan</p>
                  <p className="text-white font-bold text-xl">{selectedUnitForBatch.totalRequests}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-400 text-sm">Jenis Cuti</p>
                  <p className="text-white font-bold text-xl">{Object.keys(leaveTypeClassification).length}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-400 text-sm">Tanggal Usulan</p>
                  <p className="text-white font-bold text-sm">
                    {format(new Date(selectedUnitForBatch.proposalDate), "dd MMM yyyy", { locale: id })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {Object.entries(leaveTypeClassification).map(([leaveType, requests]) => (
                  <div key={leaveType} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-white font-medium text-lg">{leaveType}</h3>
                        <p className="text-slate-400 text-sm">
                          {requests.length} pengajuan cuti • {requests.reduce((sum, req) => sum + (req.days_requested || 0), 0)} hari total
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          handleGenerateBatchLetter(leaveType, requests);
                          setShowBatchDialog(false);
                        }}
                        disabled={generatingLetter}
                        className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                      >
                        {currentlyGenerating === leaveType ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        {currentlyGenerating === leaveType ? "Membuat..." : "Buat Surat"}
                      </Button>
                    </div>

                    {/* Show employee list for this leave type */}
                    <div className="space-y-2">
                      <h4 className="text-slate-300 text-sm font-medium">Daftar Pegawai:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {requests.map((request, index) => (
                          <div key={request.id} className="p-2 bg-slate-800/50 rounded text-sm">
                            <div className="text-white font-medium">{request.employees?.name}</div>
                            <div className="text-slate-400">
                              {request.employees?.nip} • {request.days_requested} hari
                            </div>
                            <div className="text-slate-500 text-xs">
                              {format(new Date(request.start_date), "dd MMM", { locale: id })} -
                              {format(new Date(request.end_date), "dd MMM yyyy", { locale: id })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Generate All Types Button */}
              <div className="pt-4 border-t border-slate-600">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">Buat Semua Surat Sekaligus</h3>
                    <p className="text-slate-400 text-sm">
                      Generate surat terpisah untuk setiap jenis cuti ({Object.keys(leaveTypeClassification).length} jenis)
                    </p>
                  </div>
                  <Button
                    onClick={async () => {
                      for (const [leaveType, requests] of Object.entries(leaveTypeClassification)) {
                        await handleGenerateBatchLetter(leaveType, requests);
                        // Add small delay between downloads
                        await new Promise(resolve => setTimeout(resolve, 500));
                      }
                      setShowBatchDialog(false);
                    }}
                    variant="outline"
                    className="border-green-600 text-green-400 hover:bg-green-900/20"
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    Buat Semua Surat
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BatchLeaveProposals;
