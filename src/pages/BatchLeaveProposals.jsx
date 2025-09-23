/**
 * BatchLeaveProposals Component - Fixed Issues:
 * 1. Completion status now persists in database using leave_proposals table instead of localStorage
 * 2. Document generation now fetches complete data from database to ensure all variables are filled
 * 3. Enhanced data structure with additional employee fields (rank_group, asn_status, etc.)
 */
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
  Layers,
  Database
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
import { safeErrorMessage, getUserFriendlyErrorMessage } from "@/utils/errorDisplay";
import { markSimpleProposalAsCompleted, restoreSimpleProposal, isSimpleProposalCompleted } from "@/lib/simpleCompletionManager";
import DatabaseHealthChecker from "@/components/DatabaseHealthChecker";

// Convert number to Indonesian words
const numberToWords = (num) => {
  if (num === 0) return "nol";

  const ones = [
    "",
    "satu",
    "dua",
    "tiga",
    "empat",
    "lima",
    "enam",
    "tujuh",
    "delapan",
    "sembilan",
  ];
  const teens = [
    "sepuluh",
    "sebelas",
    "dua belas",
    "tiga belas",
    "empat belas",
    "lima belas",
    "enam belas",
    "tujuh belas",
    "delapan belas",
    "sembilan belas",
  ];
  const tens = [
    "",
    "",
    "dua puluh",
    "tiga puluh",
    "empat puluh",
    "lima puluh",
    "enam puluh",
    "tujuh puluh",
    "delapan puluh",
    "sembilan puluh",
  ];

  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return tens[ten] + (one > 0 ? " " + ones[one] : "");
  }

  return num.toString(); // For larger numbers, just return the number
};

const BatchLeaveProposals = () => {
  const { toast } = useToast();
  const currentUser = AuthManager.getUserSession();

  // Test Supabase connection
  const testSupabaseConnection = async () => {
    try {
      console.log("🧪 Testing Supabase connection...");
      const { data, error } = await supabase.from("leave_requests").select("id").limit(1);
      if (error) {
        console.error("❌ Supabase connection test failed:", JSON.stringify(error, null, 2));
        return false;
      }
      console.log("✅ Supabase connection test successful");
      return true;
    } catch (testError) {
      console.error("❌ Supabase connection test error:", JSON.stringify(testError, null, 2));
      return false;
    }
  };
  
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
  const [proposalRecords, setProposalRecords] = useState(new Map());
  const [isMigrating, setIsMigrating] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [selectedUnitForBatch, setSelectedUnitForBatch] = useState(null);
  const [leaveTypeClassification, setLeaveTypeClassification] = useState({});
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [currentlyGenerating, setCurrentlyGenerating] = useState(null);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [databaseHealthy, setDatabaseHealthy] = useState(null);

  // Pagination for unit proposals
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
        // Don't throw immediately, try to use cached data instead
        console.log("📱 Attempting to load cached data...");

        // Try to load cached data immediately when offline
        try {
          const cachedData = localStorage.getItem('cachedBatchProposals');
          if (cachedData) {
            const { data, timestamp, userRole } = JSON.parse(cachedData);
            const cacheAge = Date.now() - timestamp;
            const maxCacheAge = 1000 * 60 * 60; // 1 hour for offline mode

            if (cacheAge < maxCacheAge && userRole === currentUser?.role && data?.length > 0) {
              console.log("📱 Using cached data (offline mode)");
              setUnitProposals(data);
              setCompletedProposals(new Set());
              setProposalRecords(new Map());

              const ageMinutes = Math.round(cacheAge / 1000 / 60);
              toast({
                title: "Mode Offline",
                description: `Perangkat offline. Menampilkan data tersimpan (${ageMinutes} menit yang lalu).`,
                variant: "default",
              });

              return; // Exit early, don't attempt network requests
            }
          }

          // No usable cached data
          console.log("⚠️ No usable cached data available for offline mode");
          setUnitProposals([]);
          setCompletedProposals(new Set());
          setProposalRecords(new Map());

          toast({
            title: "Tidak Ada Internet",
            description: "Perangkat offline dan tidak ada data tersimpan. Hubungkan ke internet untuk memuat data.",
            variant: "destructive",
          });

          return; // Exit early, don't attempt network requests

        } catch (cacheError) {
          console.warn("⚠️ Failed to load cached data in offline mode:", cacheError);
          // Continue to network attempt even though we're offline (will fail gracefully)
        }
      }

      // Skip connectivity test on first attempt to avoid double network calls
      if (retryCount > 0 && navigator.onLine) {
        try {
          console.log("🔌 Testing basic connectivity...");
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for retry

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
          if (retryCount < 2 && navigator.onLine) {
            console.log(`🔄 Retrying... Attempt ${retryCount + 1}/3`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            return fetchBatchProposals(retryCount + 1);
          }
          // If offline or max retries reached, proceed to try cached data
          console.log("⚠️ Connectivity test failed, will try cached data");
          setConnectionError(true);
        }
      }

      // Test Supabase connection first
      const connectionOk = await testSupabaseConnection();
      if (!connectionOk) {
        throw new Error("Supabase connection test failed");
      }

      // Get leave requests with employee and leave type information
      console.log("📊 Executing main Supabase query...");
      console.log("🔍 Environment check:", {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? "✅ Set" : "❌ Missing",
        supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing",
        supabaseClientExists: !!supabase,
        currentUser: currentUser ? `${currentUser.role} - ${currentUser.name}` : "❌ No user"
      });

      const startTime = Date.now();

      // Use more reasonable timeouts based on network conditions
      const timeoutMs = retryCount === 0 ? 15000 : 8000; // 15s first try, 8s retries
      console.log(`⏱️ Setting query timeout to ${timeoutMs/1000} seconds`);

      // Fetch leave requests with complete data
      console.log("🔄 Starting Supabase query execution...");
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
              position_name,
              rank_group,
              asn_status
            ),
            leave_types (
              id,
              name,
              default_days,
              max_days
            )
          `)
          .order("created_at", { ascending: false }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs/1000} seconds`)), timeoutMs)
        )
      ]);

      console.log("✅ Supabase query completed", { hasData: !!leaveRequests, hasError: !!requestsError });

      const queryTime = Date.now() - startTime;
      console.log(`⏱️ Query completed in ${queryTime}ms`);

      if (requestsError) {
        console.error("❌ Error fetching leave requests:", requestsError);
        console.error("📊 Error details:", JSON.stringify({
          code: requestsError.code,
          message: requestsError.message,
          details: requestsError.details,
          hint: requestsError.hint,
          fullError: requestsError
        }, null, 2));

        // Analyze error type and decide on retry strategy
        const isNetworkError = requestsError.message?.includes("Failed to fetch") ||
                              requestsError.message?.includes("fetch") ||
                              requestsError.message?.includes("Network") ||
                              requestsError.message?.includes("network") ||
                              requestsError.message?.includes("TypeError: fetch") ||
                              requestsError.code === "NETWORK_ERROR" ||
                              !navigator.onLine;

        const isTimeoutError = requestsError.message?.includes("timeout") ||
                              requestsError.message?.includes("Query timeout");

        const isServerError = requestsError.code?.startsWith("5") ||
                             requestsError.message?.includes("Internal server error");

        const isAuthError = requestsError.code === "42501" ||
                           requestsError.message?.includes("row-level security") ||
                           requestsError.message?.includes("permission");

        const isTableError = requestsError.code === "42P01" ||
                            requestsError.message?.includes("relation") ||
                            requestsError.message?.includes("does not exist");

        console.log("🔍 Error classification:", {
          isNetworkError,
          isTimeoutError,
          isServerError,
          isAuthError,
          isTableError,
          errorCode: requestsError.code,
          errorMessage: requestsError.message
        });

        if ((isNetworkError || isTimeoutError || isServerError) && retryCount < 2 && navigator.onLine) {
          console.log(`🔄 Network/timeout/server error detected. Retrying... Attempt ${retryCount + 1}/3`);
          const backoffDelay = Math.min(2000 * Math.pow(2, retryCount), 6000); // Exponential backoff, max 6s
          console.log(`⏳ Waiting ${backoffDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          return fetchBatchProposals(retryCount + 1);
        } else if ((isNetworkError || isTimeoutError) && !navigator.onLine) {
          console.log("🚫 Device went offline during request, skipping retry");
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

      // Load completion status from database - ENHANCED to use database first
      const completedProposalsMap = new Map();
      const completedSet = new Set();

      // Only check completion status if we have valid grouped requests
      if (groupedRequests && groupedRequests.length > 0) {
        console.log("🔍 Checking completion status for", groupedRequests.length, "proposal groups...");

        // ENHANCED: First, get all completed proposals from database in one query
        try {
          const { data: dbCompletedProposals, error: dbError } = await supabase
            .from('leave_proposals')
            .select('id, proposer_unit, proposal_date, completed_at, completed_by, status')
            .eq('status', 'completed');

          if (!dbError && dbCompletedProposals) {
            console.log(`📊 Found ${dbCompletedProposals.length} completed proposals in database`);
            
            dbCompletedProposals.forEach(completion => {
              const proposalKey = `${completion.proposer_unit}|${completion.proposal_date}`;
              completedSet.add(proposalKey);
              completedProposalsMap.set(proposalKey, {
                proposalKey,
                unitName: completion.proposer_unit,
                proposalDate: completion.proposal_date,
                completedAt: completion.completed_at,
                completedBy: completion.completed_by,
                id: completion.id,
                source: 'database'
              });
            });
          } else if (dbError) {
            console.warn('Database query for completed proposals failed:', dbError);
          }
        } catch (dbQueryError) {
          console.warn('Error querying completed proposals from database:', dbQueryError);
        }

        // Then, check individual groups for any that weren't found in the bulk query
        for (const group of groupedRequests) {
          const proposalKey = `${group.unitName}|${group.proposalDate}`;
          
          // Skip if already found in database
          if (completedSet.has(proposalKey)) {
            continue;
          }

          try {
            const completionStatus = await isSimpleProposalCompleted(group.unitName, group.proposalDate);
            if (completionStatus && completionStatus.isCompleted) {
              completedSet.add(proposalKey);
              completedProposalsMap.set(proposalKey, {
                proposalKey,
                unitName: group.unitName,
                proposalDate: group.proposalDate,
                completedAt: completionStatus.completedAt,
                completedBy: completionStatus.completedBy,
                source: completionStatus.source
              });
            }
          } catch (statusError) {
            // Only log actual errors, not expected cases
            console.warn(`Could not check completion status for ${group.unitName}|${group.proposalDate}:`, statusError.message || statusError);
          }
        }
      } else {
        console.log("📊 No proposal groups to check for completion status");
      }

      console.log("📊 Loaded completion records:", completedSet.size, "completed proposals");
      console.log("📊 Completion sources:", Array.from(completedProposalsMap.values()).reduce((acc, record) => {
        acc[record.source] = (acc[record.source] || 0) + 1;
        return acc;
      }, {}));

      setUnitProposals(groupedRequests);
      setProposalRecords(completedProposalsMap);
      setCompletedProposals(completedSet);
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
      console.error("🔍 Detailed error analysis:", JSON.stringify({
        name: error.name,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack,
        toString: error.toString()
      }, null, 2));

      // Try to load cached data as fallback
      let usedCachedData = false;
      try {
        const cachedData = localStorage.getItem('cachedBatchProposals');
        if (cachedData) {
          const { data, timestamp, userRole } = JSON.parse(cachedData);
          const cacheAge = Date.now() - timestamp;
          const maxCacheAge = 1000 * 60 * 60; // 1 hour for offline mode

          if (cacheAge < maxCacheAge && userRole === currentUser?.role && data?.length > 0) {
            console.log("📱 Using cached data as fallback");
            setUnitProposals(data);

            // Also set empty completion state to avoid errors
            setCompletedProposals(new Set());
            setProposalRecords(new Map());

            usedCachedData = true;

            const ageMinutes = Math.round(cacheAge / 1000 / 60);
            toast({
              title: "Mode Offline",
              description: `Menampilkan data tersimpan (${ageMinutes} menit yang lalu). Status completion tidak tersedia dalam mode offline.`,
              variant: "default",
            });
          }
        }
      } catch (cacheError) {
        console.warn("⚠️ Failed to load cached data:", cacheError);
      }

      if (!usedCachedData) {
        setUnitProposals([]);
        setCompletedProposals(new Set());
        setProposalRecords(new Map());
      }

      let errorMessage = "Gagal mengambil data usulan cuti";
      let errorTitle = "Error";

      // Handle different types of errors with specific guidance
      if (error.message?.includes("Failed to fetch") || error.message?.includes("fetch") || error.message?.includes("Cannot connect")) {
        errorTitle = "Koneksi Bermasalah";
        errorMessage = usedCachedData
          ? "Koneksi bermasalah. Menampilkan data tersimpan."
          : "Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba refresh halaman.";
        setConnectionError(true);
      } else if (error.message?.includes("No internet connection") || !navigator.onLine) {
        errorTitle = "Tidak Ada Internet";
        errorMessage = usedCachedData
          ? "Tidak ada internet. Menampilkan data tersimpan."
          : "Periksa koneksi internet Anda dan coba lagi.";
        setConnectionError(true);
      } else if (error.message?.includes("timeout") || error.message?.includes("Query timeout")) {
        errorTitle = "Timeout";
        errorMessage = usedCachedData
          ? "Server lambat. Menampilkan data tersimpan."
          : "Server merespons terlalu lambat. Coba refresh halaman atau tunggu beberapa menit.";
        setConnectionError(true);
      } else if (error.code === "PGRST301") {
        errorTitle = "Masalah Database";
        errorMessage = "Tabel atau kolom tidak ditemukan. Hubungi administrator sistem.";
        setConnectionError(false);
      } else if (error.code === "42501") {
        errorTitle = "Akses Ditolak";
        errorMessage = "Anda tidak memiliki izin untuk mengakses data ini. Periksa login atau hubungi administrator.";
        setConnectionError(false);
      } else if (error.code === "42P01") {
        errorTitle = "Tabel Tidak Ditemukan";
        errorMessage = "Tabel database tidak ditemukan. Hubungi administrator untuk setup database.";
        setConnectionError(false);
      } else if (error.message?.includes("Supabase connection test failed")) {
        errorTitle = "Koneksi Database Gagal";
        errorMessage = usedCachedData
          ? "Tidak dapat terhubung ke database. Menampilkan data tersimpan."
          : "Tidak dapat terhubung ke database. Periksa konfigurasi atau hubungi administrator.";
        setConnectionError(true);
      } else {
        errorMessage = getUserFriendlyErrorMessage(error) || "Terjadi kesalahan yang tidak diketahui. Coba refresh halaman.";
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
        `Apakah Anda yakin ingin menandai usulan cuti dari ${unit.unitName} tanggal ${format(new Date(unit.proposalDate), "dd MMMM yyyy", { locale: id })} sebagai "Selesai di Ajukan"?\n\nUsulan ini akan disimpan di database dan disembunyikan dari daftar.`
      );

      if (!confirmed) return;

      // Mark as completed using simple manager
      console.log('🔄 Marking proposal as completed...');
      const completedProposal = await markSimpleProposalAsCompleted(
        unit.unitName,
        unit.proposalDate,
        unit.requests
      );

      // Create completion record for local state
      const completionRecord = {
        proposalKey,
        unitName: unit.unitName,
        proposalDate: unit.proposalDate,
        totalEmployees: unit.totalEmployees,
        totalRequests: unit.totalRequests,
        totalDays: unit.totalDays,
        completedAt: completedProposal.completedAt,
        completedBy: completedProposal.completedBy,
        completedByName: currentUser.name || currentUser.email,
        requestIds: unit.requests.map(req => req.id),
        proposalId: completedProposal.id
      };

      // Update local state
      setCompletedProposals(prev => new Set([...prev, proposalKey]));
      setProposalRecords(prev => new Map(prev.set(proposalKey, completionRecord)));

      toast({
        title: "Berhasil",
        description: `Usulan cuti dari ${unit.unitName} telah ditandai sebagai selesai diajukan`,
        duration: 3000,
      });

      console.log('✅ Proposal marked as completed:', completedProposal.proposalKey);

    } catch (error) {
      console.error("Error marking proposal as completed:", error);

      let errorMessage = "Gagal menandai usulan sebagai selesai";
      if (error.message?.includes('User not authenticated')) {
        errorMessage = "Anda harus login untuk menandai usulan sebagai selesai";
      } else if (error.code === '42501') {
        errorMessage = "Fitur ini akan menggunakan penyimpanan lokal karena ada pembatasan database";
      } else {
        errorMessage = `Gagal menandai usulan sebagai selesai: ${safeErrorMessage(error)}`;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleRestoreProposal = async (unit) => {
    try {
      const proposalKey = `${unit.unitName}|${unit.proposalDate}`;

      // Show confirmation dialog
      const confirmed = window.confirm(
        `Apakah Anda yakin ingin mengembalikan usulan cuti dari ${unit.unitName} tanggal ${format(new Date(unit.proposalDate), "dd MMMM yyyy", { locale: id })} ke status aktif?`
      );

      if (!confirmed) return;

      // Restore using simple manager
      console.log('🔄 Restoring proposal...');
      const restoredProposal = await restoreSimpleProposal(unit.unitName, unit.proposalDate);

      // Update local state
      setCompletedProposals(prev => {
        const newSet = new Set(prev);
        newSet.delete(proposalKey);
        return newSet;
      });

      setProposalRecords(prev => {
        const newMap = new Map(prev);
        newMap.delete(proposalKey);
        return newMap;
      });

      toast({
        title: "Berhasil",
        description: `Usulan cuti dari ${unit.unitName} telah dikembalikan ke daftar aktif`,
      });

      console.log('✅ Proposal restored:', restoredProposal.success);

    } catch (error) {
      console.error("Error restoring proposal:", error);

      let errorMessage = "Gagal mengembalikan usulan";
      if (error.message?.includes('User not authenticated')) {
        errorMessage = "Anda harus login untuk mengembalikan usulan";
      } else if (error.code === '42501') {
        errorMessage = "Fitur ini menggunakan penyimpanan lokal karena ada pembatasan database";
      } else {
        errorMessage = `Gagal mengembalikan usulan: ${safeErrorMessage(error)}`;
      }

      toast({
        title: "Error",
        description: errorMessage,
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
        description: "Gagal mempersiapkan surat batch: " + safeErrorMessage(error),
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
          description: "Tidak ada template DOCX yang tersedia. Periksa koneksi atau buat template terlebih dahulu.",
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

      // Validate template has content
      if (!template.content && !template.template_data) {
        toast({
          title: "Template Tidak Valid",
          description: "Template tidak memiliki konten. Coba upload ulang template.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Info",
        description: `Sedang mempersiapkan surat batch untuk ${leaveType}...`,
      });

      // Fetch all leave data to ensure completeness
      console.log("📊 Fetching complete leave data for document generation...");
      const { data: allLeaveData, error: fetchError } = await supabase
        .from("leave_requests")
        .select(`
          *,
          employees (
            id,
            name,
            nip,
            department,
            position_name,
            rank_group,
            asn_status,
            join_date
          ),
          leave_types (
            id,
            name,
            default_days,
            max_days,
            can_defer
          )
        `)
        .in('id', requests.map(req => req.id));

      if (fetchError) {
        console.error("Error fetching complete leave data:", fetchError);
        throw new Error("Gagal mengambil data lengkap cuti: " + fetchError.message);
      }

      console.log("📊 Complete leave data fetched:", allLeaveData?.length || 0, "records");

      // Use complete data for variables
      const completeRequests = allLeaveData || requests;

      // Prepare variables for template with complete data
      const variables = {
        // General information
        unit_kerja: selectedUnitForBatch.unitName,
        jenis_cuti: leaveType,
        tanggal_usulan: format(new Date(selectedUnitForBatch.proposalDate), "dd MMMM yyyy", { locale: id }),
        tanggal_surat: format(new Date(), "dd MMMM yyyy", { locale: id }),
        jumlah_pegawai: completeRequests.length,
        total_hari: completeRequests.reduce((sum, req) => sum + (req.days_requested || 0), 0),
        tahun: new Date().getFullYear(),
        bulan: format(new Date(), "MMMM", { locale: id }),
        kota: "Jayapura", // Default city, can be configurable

        // Letter numbering
        nomor_surat: `SRT/${leaveType.toUpperCase().replace(/\s+/g, '')}/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,

        // Missing variables that user reported as empty - FIXED
        tanggal_pelaksanaan_cuti: completeRequests.length > 0
          ? `${format(new Date(completeRequests[0].start_date), "dd MMMM yyyy", { locale: id })} s.d. ${format(new Date(completeRequests[completeRequests.length - 1].end_date), "dd MMMM yyyy", { locale: id })}`
          : "-",
        lamanya_cuti: `${completeRequests.reduce((sum, req) => sum + (req.days_requested || 0), 0)} hari`,
        cuti_tahun: completeRequests.length > 0 ? (completeRequests[0].leave_quota_year || new Date().getFullYear()) : new Date().getFullYear(),
        alamat_cuti: completeRequests.length > 0 ? (completeRequests[0].address_during_leave || "-") : "-",
        formulir_pengajuan_cuti: completeRequests.length > 0 && completeRequests[0].application_form_date
          ? format(new Date(completeRequests[0].application_form_date), "dd MMMM yyyy", { locale: id })
          : format(new Date(selectedUnitForBatch.proposalDate), "dd MMMM yyyy", { locale: id }),

        // USER REPORTED MISSING VARIABLES - ADDED:
        tanggal_formulir_pengajuan: completeRequests.length > 0 && completeRequests[0].application_form_date
          ? format(new Date(completeRequests[0].application_form_date), "dd MMMM yyyy", { locale: id })
          : format(new Date(selectedUnitForBatch.proposalDate), "dd MMMM yyyy", { locale: id }),
        tanggal_cuti: completeRequests.length > 0
          ? `${format(new Date(completeRequests[0].start_date), "dd MMMM yyyy", { locale: id })} s.d. ${format(new Date(completeRequests[completeRequests.length - 1].end_date), "dd MMMM yyyy", { locale: id })}`
          : "-",
        jatah_cuti_tahun: completeRequests.length > 0 ? (completeRequests[0].leave_quota_year || new Date().getFullYear()) : new Date().getFullYear(),

        // Additional common template variables
        departemen: selectedUnitForBatch.unitName,
        instansi: "Pemerintah Kota Jayapura", // Can be made configurable
        nama_kepala_instansi: "Kepala Dinas", // Can be made configurable
        jabatan_kepala_instansi: "Kepala Dinas", // Can be made configurable

        // Additional comprehensive variables for complete coverage
        total_pegawai_asn: completeRequests.filter(req => req.employees?.asn_status?.toLowerCase().includes('asn')).length,
        total_pegawai_non_asn: completeRequests.filter(req => !req.employees?.asn_status?.toLowerCase().includes('asn')).length,
        rata_rata_hari_cuti: completeRequests.length > 0 ? Math.round(completeRequests.reduce((sum, req) => sum + (req.days_requested || 0), 0) / completeRequests.length) : 0,

        // Employee list variables for table/loop processing
        pegawai_list: completeRequests.map((request, index) => ({
          no: index + 1,
          nama: request.employees?.name || "Nama tidak diketahui",
          nama_pegawai: request.employees?.name || "Nama tidak diketahui",
          nip: request.employees?.nip || "-",
          jabatan: request.employees?.position_name || "-",
          departemen: request.employees?.department || selectedUnitForBatch.unitName,
          unit_kerja: request.employees?.department || selectedUnitForBatch.unitName,
          pangkat_golongan: request.employees?.rank_group || "-",
          status_asn: request.employees?.asn_status || "-",
          jenis_cuti: request.leave_types?.name || leaveType,
          tanggal_mulai: format(new Date(request.start_date), "dd/MM/yyyy"),
          tanggal_selesai: format(new Date(request.end_date), "dd/MM/yyyy"),
          tanggal_mulai_lengkap: format(new Date(request.start_date), "dd MMMM yyyy", { locale: id }),
          tanggal_selesai_lengkap: format(new Date(request.end_date), "dd MMMM yyyy", { locale: id }),
          tanggal_pelaksanaan_cuti: `${format(new Date(request.start_date), "dd MMMM yyyy", { locale: id })} s.d. ${format(new Date(request.end_date), "dd MMMM yyyy", { locale: id })}`,
          periode_cuti: `${format(new Date(request.start_date), "dd/MM/yyyy")} - ${format(new Date(request.end_date), "dd/MM/yyyy")}`,
          jumlah_hari: request.days_requested || 0,
          lama_cuti: `${request.days_requested || 0} hari`,
          lamanya_cuti: `${request.days_requested || 0} hari`,
          alasan: request.reason || "-",
          alamat_cuti: request.address_during_leave || "-",
          alamat_selama_cuti: request.address_during_leave || "-",
          tempat_alamat_cuti: request.address_during_leave || "-",
          tahun_quota: request.leave_quota_year || new Date().getFullYear(),
          cuti_tahun: request.leave_quota_year || new Date().getFullYear(),
          tanggal_formulir: request.application_form_date ? format(new Date(request.application_form_date), "dd MMMM yyyy", { locale: id }) : "-",
          formulir_pengajuan_cuti: request.application_form_date ? format(new Date(request.application_form_date), "dd MMMM yyyy", { locale: id }) : "-",
          nomor_surat_cuti: request.leave_letter_number || "-",
          tanggal_surat_cuti: request.leave_letter_date ? format(new Date(request.leave_letter_date), "dd MMMM yyyy", { locale: id }) : "-",
          // Additional comprehensive variables
          durasi_hari_terbilang: numberToWords(request.days_requested || 0),
          nomor_surat_referensi: request.reference_number || "REF tidak tersedia"
        }))
      };

      // Create indexed variables for template loops with complete data
      completeRequests.forEach((request, index) => {
        const num = index + 1;
        variables[`nama_${num}`] = request.employees?.name || "Nama tidak diketahui";
        variables[`nip_${num}`] = request.employees?.nip || "-";
        variables[`jabatan_${num}`] = request.employees?.position_name || "-";
        variables[`pangkat_golongan_${num}`] = request.employees?.rank_group || "-";
        variables[`departemen_${num}`] = request.employees?.department || selectedUnitForBatch.unitName;
        variables[`unit_kerja_${num}`] = request.employees?.department || selectedUnitForBatch.unitName;
        variables[`jenis_cuti_${num}`] = request.leave_types?.name || leaveType;
        variables[`tanggal_mulai_${num}`] = format(new Date(request.start_date), "dd/MM/yyyy");
        variables[`tanggal_selesai_${num}`] = format(new Date(request.end_date), "dd/MM/yyyy");
        variables[`tanggal_mulai_lengkap_${num}`] = format(new Date(request.start_date), "dd MMMM yyyy", { locale: id });
        variables[`tanggal_selesai_lengkap_${num}`] = format(new Date(request.end_date), "dd MMMM yyyy", { locale: id });
        variables[`tanggal_pelaksanaan_cuti_${num}`] = `${format(new Date(request.start_date), "dd MMMM yyyy", { locale: id })} s.d. ${format(new Date(request.end_date), "dd MMMM yyyy", { locale: id })}`;
        variables[`jumlah_hari_${num}`] = request.days_requested || 0;
        variables[`lama_cuti_${num}`] = `${request.days_requested || 0} hari`;
        variables[`lamanya_cuti_${num}`] = `${request.days_requested || 0} hari`;
        variables[`alasan_${num}`] = request.reason || "-";
        variables[`alamat_cuti_${num}`] = request.address_during_leave || "-";
        variables[`alamat_selama_cuti_${num}`] = request.address_during_leave || "-";
        variables[`tahun_quota_${num}`] = request.leave_quota_year || new Date().getFullYear();
        variables[`cuti_tahun_${num}`] = request.leave_quota_year || new Date().getFullYear();
        variables[`tanggal_formulir_${num}`] = request.application_form_date ? format(new Date(request.application_form_date), "dd MMMM yyyy", { locale: id }) : "-";
        variables[`formulir_pengajuan_cuti_${num}`] = request.application_form_date ? format(new Date(request.application_form_date), "dd MMMM yyyy", { locale: id }) : "-";

        // USER REPORTED MISSING VARIABLES - ADDED FOR INDEXED:
        variables[`tanggal_formulir_pengajuan_${num}`] = request.application_form_date ? format(new Date(request.application_form_date), "dd MMMM yyyy", { locale: id }) : "-";
        variables[`tanggal_cuti_${num}`] = `${format(new Date(request.start_date), "dd MMMM yyyy", { locale: id })} s.d. ${format(new Date(request.end_date), "dd MMMM yyyy", { locale: id })}`;
        variables[`jatah_cuti_tahun_${num}`] = request.leave_quota_year || new Date().getFullYear();

        // Additional variations for common template patterns
        variables[`nama_pegawai_${num}`] = request.employees?.name || "Nama tidak diketahui";
        variables[`tempat_alamat_cuti_${num}`] = request.address_during_leave || "-";
        variables[`periode_cuti_${num}`] = `${format(new Date(request.start_date), "dd/MM/yyyy")} - ${format(new Date(request.end_date), "dd/MM/yyyy")}`;
        // Additional indexed variables for complete coverage
        variables[`durasi_hari_terbilang_${num}`] = numberToWords(request.days_requested || 0);
        variables[`nomor_surat_referensi_${num}`] = request.reference_number || "REF tidak tersedia";
        variables[`status_asn_${num}`] = request.employees?.asn_status || "Status ASN tidak tersedia";
      });

      console.log("📄 Generating batch letter with variables:", {
        leaveType,
        unitName: selectedUnitForBatch.unitName,
        totalRequests: completeRequests.length,
        templateId: template.id,
        templateName: template.name,
        variableCount: Object.keys(variables).length,
        contentType: typeof template.content,
        contentLength: template.content?.length || 0
      });

      // Log the specific variables the user mentioned as missing
      console.log("🔍 Checking specific variables mentioned by user:");
      console.log("- unit_kerja:", variables.unit_kerja);
      console.log("- tanggal_pelaksanaan_cuti:", variables.tanggal_pelaksanaan_cuti);
      console.log("- lamanya_cuti:", variables.lamanya_cuti);
      console.log("- cuti_tahun:", variables.cuti_tahun);
      console.log("- alamat_cuti:", variables.alamat_cuti);
      console.log("- formulir_pengajuan_cuti:", variables.formulir_pengajuan_cuti);

      // Log the NEWLY ADDED variables that were reported missing:
      console.log("🔧 NEWLY ADDED VARIABLES (user reported as missing):");
      console.log("- tanggal_formulir_pengajuan:", variables.tanggal_formulir_pengajuan);
      console.log("- tanggal_cuti:", variables.tanggal_cuti);
      console.log("- jatah_cuti_tahun:", variables.jatah_cuti_tahun);

      // Log all variable keys for debugging
      console.log("📋 All available variables:", Object.keys(variables).sort());

      // Validate and prepare template content
      // Templates are typically stored as { content: { data: "base64..." } }
      let templateContent = template.content?.data || template.content || template.template_data;

      console.log("📄 Template content structure:", {
        hasContent: !!template.content,
        hasContentData: !!template.content?.data,
        hasTemplateData: !!template.template_data,
        contentType: typeof templateContent,
        isString: typeof templateContent === 'string'
      });

      // Check if content is valid
      if (!templateContent) {
        throw new Error("Template content is empty or undefined. Template might not be properly uploaded.");
      }

      // If content is not a string, convert it
      if (typeof templateContent !== 'string') {
        console.log("⚠️ Template content is not string, attempting conversion...");

        // If it's a Buffer or ArrayBuffer, convert to base64
        if (templateContent instanceof ArrayBuffer || templateContent.buffer) {
          const uint8Array = new Uint8Array(templateContent);
          templateContent = btoa(String.fromCharCode.apply(null, uint8Array));
        }
        // If it's an array (Uint8Array)
        else if (Array.isArray(templateContent) || templateContent.constructor === Uint8Array) {
          templateContent = btoa(String.fromCharCode.apply(null, templateContent));
        }
        // Last resort: stringify and encode
        else {
          console.warn("Unknown template content type, attempting JSON stringify...");
          templateContent = btoa(JSON.stringify(templateContent));
        }
      }

      // Ensure it's base64 format
      if (!templateContent.includes(',') && !templateContent.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
        console.log("⚠️ Content doesn't appear to be base64, wrapping...");
        templateContent = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${templateContent}`;
      }

      console.log("✅ Template content prepared:", {
        type: typeof templateContent,
        length: templateContent.length,
        hasComma: templateContent.includes(','),
        isBase64: templateContent.match(/^[A-Za-z0-9+/]*={0,2}$/) !== null
      });

      // Final comprehensive variable logging before processing
      console.log("🎯 Final variable summary for template processing:");
      console.log("📊 Total variables:", Object.keys(variables).length);
      console.log("📝 Variable breakdown:");

      // Group variables by category
      const generalVars = Object.keys(variables).filter(key => !key.includes('_') || key.startsWith('unit_') || key.startsWith('jenis_') || key.startsWith('tanggal_') || key.startsWith('nomor_') || key.startsWith('total_') || key.startsWith('jumlah_') || key.startsWith('tahun') || key.startsWith('bulan') || key.startsWith('kota') || key.startsWith('lamanya_') || key.startsWith('cuti_') || key.startsWith('alamat_') || key.startsWith('formulir_') || key.startsWith('departemen') || key.startsWith('instansi'));
      const indexedVars = Object.keys(variables).filter(key => /.*_\d+$/.test(key));
      const listVars = Object.keys(variables).filter(key => key === 'pegawai_list');

      console.log(`- General variables (${generalVars.length}):`, generalVars);
      console.log(`- Indexed variables (${indexedVars.length}):`, indexedVars.slice(0, 10), indexedVars.length > 10 ? '... and more' : '');
      console.log(`- List variables (${listVars.length}):`, listVars);

      // Log sample of first employee's data if available
      if (variables.pegawai_list && variables.pegawai_list.length > 0) {
        console.log("👤 Sample employee data (first record):", variables.pegawai_list[0]);
      }

      // Process template using existing system
      const processedBuffer = await processDocxTemplate(
        templateContent,
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
        description: `Surat batch untuk ${completeRequests.length} usulan ${leaveType} dari ${selectedUnitForBatch.unitName} berhasil dibuat dan diunduh dengan data lengkap`,
      });

    } catch (error) {
      console.error("Error generating batch letter:", error);
      console.error("🔍 Document generation error details:", JSON.stringify({
        name: error.name,
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack,
        toString: error.toString()
      }, null, 2));

      let errorMessage = "Gagal membuat surat batch";

      // Provide more specific error messages
      if (error.message?.includes("includes is not a function")) {
        errorMessage = "Format template tidak valid. Template mungkin rusak atau format tidak didukung.";
      } else if (error.message?.includes("Template content is empty")) {
        errorMessage = "Template kosong atau tidak ditemukan. Pilih template yang valid.";
      } else if (error.message?.includes("base64")) {
        errorMessage = "Template tidak dalam format yang benar. Coba upload ulang template.";
      } else if (error.message?.includes("zip") || error.message?.includes("docx")) {
        errorMessage = "Template DOCX rusak atau tidak valid. Coba gunakan template lain.";
      } else {
        errorMessage = safeErrorMessage(error, "Terjadi kesalahan yang tidak diketahui");
      }

      toast({
        title: "Error",
        description: errorMessage,
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
      localStorage.removeItem('completedBatchProposals');
      localStorage.removeItem('completedProposals');

      // Reset local state
      setCompletedProposals(new Set());
      setProposalRecords(new Map());

      toast({
        title: "Cache Dibersihkan",
        description: "Data cache lokal telah dihapus. Refresh untuk mengambil data terbaru.",
      });
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  };

  // Migration feature removed since we're using simple completion manager

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

  // Reset page when filters or data change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedUnit, showCompleted, unitProposals, completedProposals]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredUnits.length / itemsPerPage));
  const paginatedUnits = filteredUnits.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Load available templates
  const loadTemplates = useCallback(async (retryCount = 0) => {
    try {
      setLoadingTemplates(true);
      console.log("📋 Loading templates...");

      const { data, error } = await Promise.race([
        supabase
          .from("templates")
          .select("*")
          .eq("type", "docx")
          .order("name"),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Template loading timeout")), 8000)
        )
      ]);

      if (error) {
        console.error("Error from Supabase:", JSON.stringify(error, null, 2));

        // Retry logic for templates
        if (error.message?.includes("Failed to fetch") && retryCount < 1) {
          console.log(`🔄 Retrying template load... Attempt ${retryCount + 1}/2`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return loadTemplates(retryCount + 1);
        }

        throw error;
      }

      setAvailableTemplates(data || []);
      console.log(`✅ Loaded ${data?.length || 0} templates`);
    } catch (error) {
      console.error("Error loading templates:", error);
      setAvailableTemplates([]); // Set empty array on error

      // Don't show error toast for template loading - it's not critical
      console.log("ℹ️ Templates unavailable - batch letters will be disabled");

      // If it's specifically a timeout, mention it in console but don't spam user
      if (error.message?.includes('timeout')) {
        console.log("⏰ Template loading timed out - this is usually due to slow network");
      }
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    // Check for localStorage data and offer migration
    const checkForMigration = () => {
      const localData = localStorage.getItem('completedBatchProposals');
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          const count = Object.keys(parsed).length;
          if (count > 0) {
            console.log(`📱 Found ${count} completed proposals in localStorage - migration available`);
          }
        } catch (error) {
          console.warn('Could not parse localStorage data:', error);
        }
      }
    };

    checkForMigration();

    // Stagger the requests to avoid overwhelming the network
    const timer = setTimeout(() => {
      fetchBatchProposals();
      // Load templates after a small delay
      setTimeout(loadTemplates, 500);
    }, 100);

    return () => clearTimeout(timer);
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
              <p className="text-gray-500 text-xs">
                🔧 Tip: Buka console browser (F12) untuk detail error
              </p>
            </div>
          ) : (
            <p className="text-blue-400 text-sm">
              💡 Data diambil dari pengajuan cuti yang dibuat melalui menu "Pengajuan Cuti"
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <ConnectionStatus onRetry={() => fetchBatchProposals(0)} />

          {/* Info about storage method */}
          <Button
            variant="ghost"
            className="text-slate-400 cursor-default"
            disabled
          >
            <Database className="w-4 h-4 mr-2" />
            Status tersimpan lokal
          </Button>

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


      {/* Database Health Check */}
      <DatabaseHealthChecker onHealthCheck={setDatabaseHealthy} />

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
                {paginatedUnits.map((unit, index) => (
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

                {filteredUnits.length > itemsPerPage && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-slate-400">
                      Menampilkan {filteredUnits.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage + 1)} - {Math.min(currentPage * itemsPerPage, filteredUnits.length)} dari {filteredUnits.length} hasil
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>Pertama</Button>
                      <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Sebelumnya</Button>
                      <div className="text-sm text-slate-300 px-3">Halaman {currentPage} / {totalPages}</div>
                      <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Berikutnya</Button>
                      <Button size="sm" variant="outline" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>Terakhir</Button>
                    </div>
                  </div>
                )}

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
                <Label className="text-slate-200 text-sm font-medium">Pilih Template DOCX</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate} disabled={loadingTemplates}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white mt-2 hover:bg-slate-700/70 focus:border-slate-500">
                    <SelectValue placeholder={loadingTemplates ? "Memuat template..." : "Pilih template untuk surat batch..."} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {availableTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id} className="text-white hover:bg-slate-600 focus:bg-slate-600">
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loadingTemplates ? (
                  <p className="text-blue-400 text-sm mt-2 flex items-center">
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Memuat template...
                  </p>
                ) : availableTemplates.length === 0 ? (
                  <p className="text-red-400 text-sm mt-2">
                    ⚠️ Tidak ada template tersedia. Buat template di menu Template Management.
                  </p>
                ) : (
                  <p className="text-green-400 text-sm mt-2">
                    ✅ {availableTemplates.length} template tersedia
                  </p>
                )}
              </div>

              {/* Summary Section */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                <div className="text-center">
                  <p className="text-slate-300 text-sm">Unit Kerja</p>
                  <p className="text-white font-bold">{selectedUnitForBatch.unitName}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-300 text-sm">Total Pengajuan</p>
                  <p className="text-white font-bold text-xl">{selectedUnitForBatch.totalRequests}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-300 text-sm">Jenis Cuti</p>
                  <p className="text-white font-bold text-xl">{Object.keys(leaveTypeClassification).length}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-300 text-sm">Tanggal Usulan</p>
                  <p className="text-white font-bold text-sm">
                    {format(new Date(selectedUnitForBatch.proposalDate), "dd MMM yyyy", { locale: id })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {Object.entries(leaveTypeClassification).map(([leaveType, requests]) => (
                  <div key={leaveType} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/50 hover:border-slate-500/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-white font-medium text-lg">{leaveType}</h3>
                        <p className="text-slate-300 text-sm">
                          {requests.length} pengajuan cuti • {requests.reduce((sum, req) => sum + (req.days_requested || 0), 0)} hari total
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          handleGenerateBatchLetter(leaveType, requests, selectedTemplate);
                          setShowBatchDialog(false);
                        }}
                        disabled={generatingLetter || !selectedTemplate || availableTemplates.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
                          <div key={request.id} className="p-2 bg-slate-800/50 rounded text-sm border border-slate-600/50 hover:border-slate-500/50 transition-colors">
                            <div className="text-white font-medium">{request.employees?.name}</div>
                            <div className="text-slate-300">
                              {request.employees?.nip} • {request.days_requested} hari
                            </div>
                            <div className="text-slate-400 text-xs">
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
                <div className="flex items-center justify-between p-4 bg-slate-700/20 rounded-lg border border-slate-600/30">
                  <div>
                    <h3 className="text-white font-medium">Buat Semua Surat Sekaligus</h3>
                    <p className="text-slate-300 text-sm">
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
                    className="border-green-600 text-green-400 hover:bg-green-900/20 hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
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