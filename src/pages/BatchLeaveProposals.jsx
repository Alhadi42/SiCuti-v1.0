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
import { processDocxTemplate } from "@/utils/docxTemplates";
import { saveAs } from "file-saver";
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
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

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

      // Skip connectivity test on first attempt to avoid double network calls
      if (retryCount > 0) {
        try {
          console.log("🔌 Testing basic connectivity...");
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

          const connectivityTest = await fetch(import.meta.env.VITE_SUPABASE_URL + '/rest/v1/', {
            method: 'HEAD',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!connectivityTest.ok) {
            throw new Error(`Connectivity test failed: ${connectivityTest.status}`);
          }
          console.log("✅ Basic connectivity OK");
        } catch (connectError) {
          console.error("❌ Connectivity test failed:", connectError);
          if (retryCount < 2) {
            console.log(`🔄 Retrying... Attempt ${retryCount + 1}/3`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            return fetchBatchProposals(retryCount + 1);
          }
          // Don't throw here, let the main query handle the error
          console.log("⚠️ Connectivity test failed, proceeding with main query anyway");
        }
      }

      // Get leave requests with employee and leave type information
      console.log("📊 Executing main Supabase query...");
      const startTime = Date.now();

      const { data: leaveRequests, error: requestsError } = await Promise.race([
        supabase
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
          .order("created_at", { ascending: false }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Query timeout after 15 seconds")), 15000)
        )
      ]);

      const queryTime = Date.now() - startTime;
      console.log(`⏱️ Query completed in ${queryTime}ms`);

      if (requestsError) {
        console.error("❌ Error fetching leave requests:", requestsError);
        console.error("📊 Error details:", {
          code: requestsError.code,
          message: requestsError.message,
          details: requestsError.details,
          hint: requestsError.hint
        });

        // Analyze error type and decide on retry strategy
        const isNetworkError = requestsError.message?.includes("Failed to fetch") ||
                              requestsError.message?.includes("fetch") ||
                              requestsError.message?.includes("Network") ||
                              requestsError.code === "NETWORK_ERROR";

        const isTimeoutError = requestsError.message?.includes("timeout") ||
                              requestsError.message?.includes("Query timeout");

        const isServerError = requestsError.code?.startsWith("5") ||
                             requestsError.message?.includes("Internal server error");

        if ((isNetworkError || isTimeoutError || isServerError) && retryCount < 3) {
          console.log(`🔄 Network/timeout/server error detected. Retrying... Attempt ${retryCount + 1}/4`);
          const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 8000); // Exponential backoff, max 8s
          console.log(`⏳ Waiting ${backoffDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          return fetchBatchProposals(retryCount + 1);
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

      // Cache successful data for offline use
      try {
        localStorage.setItem('cachedBatchProposals', JSON.stringify({
          data: groupedRequests,
          timestamp: Date.now(),
          userRole: currentUser?.role
        }));
        console.log("💾 Data cached successfully");
      } catch (cacheError) {
        console.warn("⚠️ Failed to cache data:", cacheError);
      }


    } catch (error) {
      console.error("❌ Error fetching batch proposals:", error);

      // Try to load cached data as fallback
      let usedCachedData = false;
      try {
        const cachedData = localStorage.getItem('cachedBatchProposals');
        if (cachedData) {
          const { data, timestamp, userRole } = JSON.parse(cachedData);
          const cacheAge = Date.now() - timestamp;
          const maxCacheAge = 1000 * 60 * 30; // 30 minutes

          if (cacheAge < maxCacheAge && userRole === currentUser?.role && data?.length > 0) {
            console.log("📱 Using cached data as fallback");
            setUnitProposals(data);
            usedCachedData = true;

            toast({
              title: "Mode Offline",
              description: `Menampilkan data tersimpan (${Math.round(cacheAge / 1000 / 60)} menit yang lalu)`,
              variant: "default",
            });
          }
        }
      } catch (cacheError) {
        console.warn("⚠️ Failed to load cached data:", cacheError);
      }

      if (!usedCachedData) {
        setUnitProposals([]);
      }

      let errorMessage = "Gagal mengambil data usulan cuti";
      let errorTitle = "Error";

      // Handle different types of errors
      if (error.message?.includes("Failed to fetch") || error.message?.includes("fetch") || error.message?.includes("Cannot connect")) {
        errorTitle = "Koneksi Bermasalah";
        errorMessage = usedCachedData
          ? "Koneksi bermasalah. Menampilkan data tersimpan."
          : "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
        setConnectionError(true);
      } else if (error.message?.includes("No internet connection")) {
        errorTitle = "Tidak Ada Internet";
        errorMessage = usedCachedData
          ? "Tidak ada internet. Menampilkan data tersimpan."
          : "Periksa koneksi internet Anda dan coba lagi.";
        setConnectionError(true);
      } else if (error.message?.includes("timeout")) {
        errorTitle = "Timeout";
        errorMessage = usedCachedData
          ? "Server lambat. Menampilkan data tersimpan."
          : "Server merespons terlalu lambat. Coba lagi nanti.";
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

      if (!usedCachedData) {
        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive",
        });
      }
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

  const handleGenerateBatchLetter = async (leaveType, requests, templateId = null) => {
    try {
      setGeneratingLetter(true);
      setCurrentlyGenerating(leaveType);

      // Check if we have a template
      if (!templateId && availableTemplates.length === 0) {
        toast({
          title: "Template Tidak Tersedia",
          description: "Tidak ada template DOCX yang tersedia. Silakan buat template terlebih dahulu.",
          variant: "destructive",
        });
        return;
      }

      // Use the first template if no specific template is selected
      const template = templateId
        ? availableTemplates.find(t => t.id === templateId)
        : availableTemplates[0];

      if (!template) {
        toast({
          title: "Template Tidak Ditemukan",
          description: "Template yang dipilih tidak ditemukan.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Info",
        description: `Sedang mempersiapkan surat batch untuk ${leaveType}...`,
      });

      // Prepare variables for template
      const variables = {
        // General information
        unit_kerja: selectedUnitForBatch.unitName,
        jenis_cuti: leaveType,
        tanggal_usulan: format(new Date(selectedUnitForBatch.proposalDate), "dd MMMM yyyy", { locale: id }),
        tanggal_surat: format(new Date(), "dd MMMM yyyy", { locale: id }),
        jumlah_pegawai: requests.length,
        total_hari: requests.reduce((sum, req) => sum + (req.days_requested || 0), 0),

        // Letter numbering
        nomor_surat: `SRT/${leaveType.toUpperCase().replace(/\s+/g, '')}/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,

        // Employee list variables for table/loop processing
        pegawai_list: requests.map((request, index) => ({
          no: index + 1,
          nama: request.employees?.name || "Nama tidak diketahui",
          nip: request.employees?.nip || "-",
          jabatan: request.employees?.position_name || "-",
          departemen: request.employees?.department || selectedUnitForBatch.unitName,
          jenis_cuti: request.leave_types?.name || leaveType,
          tanggal_mulai: format(new Date(request.start_date), "dd/MM/yyyy"),
          tanggal_selesai: format(new Date(request.end_date), "dd/MM/yyyy"),
          jumlah_hari: request.days_requested || 0,
          alasan: request.reason || "-",
          alamat_cuti: request.address_during_leave || "-",
        }))
      };

      // Create indexed variables for template loops
      requests.forEach((request, index) => {
        const num = index + 1;
        variables[`nama_${num}`] = request.employees?.name || "Nama tidak diketahui";
        variables[`nip_${num}`] = request.employees?.nip || "-";
        variables[`jabatan_${num}`] = request.employees?.position_name || "-";
        variables[`jenis_cuti_${num}`] = request.leave_types?.name || leaveType;
        variables[`tanggal_mulai_${num}`] = format(new Date(request.start_date), "dd/MM/yyyy");
        variables[`tanggal_selesai_${num}`] = format(new Date(request.end_date), "dd/MM/yyyy");
        variables[`jumlah_hari_${num}`] = request.days_requested || 0;
        variables[`alasan_${num}`] = request.reason || "-";
      });

      console.log("📄 Generating batch letter with variables:", {
        leaveType,
        unitName: selectedUnitForBatch.unitName,
        totalRequests: requests.length,
        templateId: template.id,
        templateName: template.name,
        variableCount: Object.keys(variables).length
      });

      // Process template using existing system
      const processedBuffer = await processDocxTemplate(
        template.content,
        variables,
        { preserveFormatting: true }
      );

      // Generate filename
      const safeLeaveType = leaveType.replace(/[^a-zA-Z0-9]/g, '_');
      const safeUnitName = selectedUnitForBatch.unitName.replace(/\s+/g, '_');
      const filename = `Usulan_${safeLeaveType}_${safeUnitName}_${format(new Date(), "yyyy-MM-dd")}.docx`;

      // Download the file
      saveAs(processedBuffer, filename);

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

  const clearCache = () => {
    try {
      localStorage.removeItem('cachedBatchProposals');
      toast({
        title: "Cache Dibersihkan",
        description: "Data cache lokal telah dihapus. Refresh untuk mengambil data terbaru.",
      });
    } catch (error) {
      console.error("Error clearing cache:", error);
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

  // Load available templates
  const loadTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("type", "docx")
        .order("name");

      if (error) throw error;

      setAvailableTemplates(data || []);
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  }, []);

  useEffect(() => {
    // Load completed proposals from localStorage
    const savedCompleted = JSON.parse(localStorage.getItem('completedProposals') || '[]');
    setCompletedProposals(new Set(savedCompleted));

    fetchBatchProposals();
    loadTemplates();
  }, [fetchBatchProposals, loadTemplates]);

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
            <div className="space-y-1">
              <p className="text-red-400 text-sm">
                ⚠️ Masalah koneksi - Data mungkin tidak terbaru
              </p>
              {unitProposals.length > 0 && (
                <p className="text-yellow-400 text-xs">
                  📱 Menampilkan data tersimpan dari cache lokal
                </p>
              )}
            </div>
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
              Pilih template dan jenis cuti untuk membuat surat batch yang sesuai.
            </DialogDescription>
          </DialogHeader>

          {selectedUnitForBatch && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Template Selection */}
              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                <Label className="text-slate-300 text-sm font-medium">Pilih Template DOCX</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white mt-2">
                    <SelectValue placeholder="Pilih template untuk surat batch..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {availableTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableTemplates.length === 0 && (
                  <p className="text-red-400 text-sm mt-2">
                    ⚠️ Tidak ada template tersedia. Buat template di menu Template Management.
                  </p>
                )}
              </div>

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
                          handleGenerateBatchLetter(leaveType, requests, selectedTemplate);
                          setShowBatchDialog(false);
                        }}
                        disabled={generatingLetter || !selectedTemplate || availableTemplates.length === 0}
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
                        await handleGenerateBatchLetter(leaveType, requests, selectedTemplate);
                        // Add small delay between downloads
                        await new Promise(resolve => setTimeout(resolve, 500));
                      }
                      setShowBatchDialog(false);
                    }}
                    disabled={!selectedTemplate || availableTemplates.length === 0}
                    variant="outline"
                    className="border-green-600 text-green-400 hover:bg-green-900/20 disabled:opacity-50"
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
