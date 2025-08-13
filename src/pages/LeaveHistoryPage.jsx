import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  History,
  Download,
  Calendar,
  User,
  Clock,
  TrendingUp,
  FileText,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { AuthManager } from "@/lib/auth";
import { checkSupabaseConnection } from "@/utils/supabaseHealthChecker";

import { useLeaveTypes } from "@/hooks/useLeaveTypes";
import { useDepartments } from "@/hooks/useDepartments";
import LeaveHistoryEmployeeCard from "@/components/leave_history/LeaveHistoryEmployeeCard";
import LeaveHistoryDeferralInfo from "@/components/leave_history/LeaveHistoryDeferralInfo";
import AddDeferredLeaveDialog from "@/components/leave_history/AddDeferredLeaveDialog";
import EmployeeLeaveHistoryModal from "@/components/leave_history/EmployeeLeaveHistoryModal";

import LeaveHistoryFilters from "@/components/leave_history/LeaveHistoryFilters";
import { exportToExcelWithMultipleSheets } from "@/utils/excelUtils";

const STATIC_LEAVE_TYPES_CONFIG = {
  "Cuti Tahunan": {
    key: "annual",
    name: "Cuti Tahunan",
    color: "from-blue-500 to-cyan-500",
    default_days: 12,
    can_defer: true,
  },
  "Cuti Sakit": {
    key: "sick",
    name: "Cuti Sakit",
    color: "from-red-500 to-pink-500",
    default_days: 12,
    max_days: 365,
  },
  "Cuti Alasan Penting": {
    key: "important",
    name: "Cuti Alasan Penting",
    color: "from-yellow-500 to-orange-500",
    default_days: 30,
    max_days: 30,
  },
  "Cuti Besar": {
    key: "big",
    name: "Cuti Besar",
    color: "from-purple-500 to-indigo-500",
    default_days: 60,
    max_days: 90,
  },
  "Cuti Melahirkan": {
    key: "maternity",
    name: "Cuti Melahirkan",
    color: "from-green-500 to-emerald-500",
    default_days: 90,
    max_days: 90,
  },
};

const LEAVE_HISTORY_PER_PAGE = 10;

const LeaveHistoryPage = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedUnitPenempatan, setSelectedUnitPenempatan] = useState("");
  const [employeesWithBalances, setEmployeesWithBalances] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [totalEmployeesInFilter, setTotalEmployeesInFilter] = useState(0);
  const [overallTotalEmployees, setOverallTotalEmployees] = useState(0);
  const [isAddDeferredOpen, setIsAddDeferredOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEmployeeLeaveData, setSelectedEmployeeLeaveData] =
    useState(null);
  const [selectedDeferralLog, setSelectedDeferralLog] = useState(null);

  const { leaveTypes, isLoadingLeaveTypes } = useLeaveTypes();
  const { departments: unitPenempatanOptions, isLoadingDepartments } =
    useDepartments();

  const years = useMemo(() => {
    return ["2025", "2026", "2027", "2028"];
  }, []);

  const getLeaveTypeConfig = useCallback(
    (leaveTypeName) => {
      const dbType = leaveTypes.find((lt) => lt.name === leaveTypeName);
      const staticConfig = Object.values(STATIC_LEAVE_TYPES_CONFIG).find(
        (ltc) => ltc.name === leaveTypeName,
      );

      if (dbType) {
        return {
          key: dbType.name
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/-/g, "_"),
          name: dbType.name,
          color: staticConfig?.color || "from-gray-500 to-gray-600",
          default_days: dbType.default_days,
          can_defer: dbType.can_defer,
          max_days: staticConfig?.max_days,
        };
      }
      return (
        staticConfig || {
          key: "unknown",
          name: leaveTypeName,
          color: "from-gray-500 to-gray-600",
          default_days: 0,
          can_defer: false,
        }
      );
    },
    [leaveTypes],
  );

  const fetchLeaveData = useCallback(
    async (isInitialLoad = false) => {
      if (leaveTypes.length === 0 && !isLoadingLeaveTypes) {
        toast({
          variant: "destructive",
          title: "Data Jenis Cuti Kosong",
          description:
            "Tidak dapat mengambil data saldo karena jenis cuti belum termuat.",
        });
        return;
      }
      if (isLoadingLeaveTypes) return;

      setIsLoadingData(true);
      try {
        // Test Supabase connection first if debugging
        if (import.meta.env.DEV) {
          const connectionTest = await checkSupabaseConnection();
          if (!connectionTest.success) {
            throw new Error(`Supabase connection failed: ${connectionTest.error}`);
          }
        }

        // Apply unit-based filtering for admin_unit users
        const currentUser = AuthManager.getUserSession();

        // DEBUG: Log user session for leave history
        console.log("🔍 DEBUG LeaveHistory - User session:", {
          role: currentUser?.role,
          unit_kerja: currentUser?.unit_kerja,
          unitKerja: currentUser?.unitKerja,
          hasUser: !!currentUser
        });

        // Safety check for user session
        if (!currentUser) {
          console.error("❌ No user session found in LeaveHistory");
          toast({
            variant: "destructive",
            title: "Session Error",
            description: "User session not found. Please login again.",
          });
          return;
        }

        // Build the base query for employees
        console.log("🔍 DEBUG LeaveHistory - Building query...");
        let query = supabase
          .from("employees")
          .select("id, name, nip, department, position_name, rank_group", {
            count: "exact",
          });

        // Apply unit-based filtering for admin_unit users
        const userUnit = currentUser?.unit_kerja || currentUser?.unitKerja;
        console.log("🔍 DEBUG LeaveHistory - User unit:", userUnit);

        if (currentUser.role === 'admin_unit' && userUnit) {
          console.log("🔍 DEBUG LeaveHistory - Applying unit filter:", userUnit);
          // Validate unit name before using it
          if (userUnit.length > 0 && userUnit.length < 500) { // Reasonable length check
            query = query.eq("department", userUnit);
          } else {
            console.error("❌ Invalid unit name:", userUnit);
            throw new Error("Invalid unit name in user session");
          }
        } else if (currentUser.role === 'admin_unit') {
          console.warn("⚠️ Admin unit user has no unit assigned");
          // For admin_unit without unit, show no results instead of all results
          query = query.eq("id", "00000000-0000-0000-0000-000000000000"); // Non-existent ID
        }

        // Add search filter if search term exists
        if (debouncedSearchTerm) {
          query = query.or(
            `name.ilike.%${debouncedSearchTerm}%,nip.ilike.%${debouncedSearchTerm}%`,
          );
        }

        // Add department filter if selected
        if (selectedUnitPenempatan && selectedUnitPenempatan.trim() !== "") {
          // Ensure we're using the correct column name for department
          query = query.ilike(
            "department",
            `%${selectedUnitPenempatan.trim()}%`,
          );
          console.log("Filtering by department:", selectedUnitPenempatan);
        }

        // Add pagination
        query = query.range(0, LEAVE_HISTORY_PER_PAGE - 1);

        // Execute the query
        console.log("🔍 DEBUG LeaveHistory - Executing employees query with filters:", {
          search: debouncedSearchTerm,
          department: selectedUnitPenempatan,
          userRole: currentUser.role,
          userUnit: userUnit,
        });

        let employeesData, employeesError, count;

        try {
          const result = await query;
          employeesData = result.data;
          employeesError = result.error;
          count = result.count;

          console.log("🔍 DEBUG LeaveHistory - Query result:", {
            dataLength: employeesData?.length,
            count: count,
            hasError: !!employeesError
          });
        } catch (fetchError) {
          console.error("❌ Fetch error in LeaveHistory:", fetchError);
          console.error("❌ Error details:", {
            message: fetchError.message,
            stack: fetchError.stack,
            name: fetchError.name
          });

          // Show user-friendly error
          toast({
            variant: "destructive",
            title: "Network Error",
            description: "Failed to fetch data. Please check your connection and try again.",
          });
          return;
        }

        if (employeesError) {
          console.error("❌ Supabase error fetching employees:", employeesError);
          console.error("❌ Error details:", {
            message: employeesError.message,
            details: employeesError.details,
            hint: employeesError.hint,
            code: employeesError.code
          });
          throw employeesError;
        }

        console.log("Fetched employees:", employeesData?.length || 0);

        // Update the total count
        setTotalEmployeesInFilter(count || 0);

        // Get total employees count on initial load
        if (isInitialLoad || overallTotalEmployees === 0) {
          console.log("🔍 DEBUG LeaveHistory - Fetching total count...");

          try {
            let totalCountQuery = supabase
              .from("employees")
              .select("*", { count: "exact", head: true });

            // Apply unit filtering to total count for admin_unit users
            if (currentUser.role === 'admin_unit' && userUnit) {
              console.log("🔍 DEBUG LeaveHistory - Applying unit filter to total count:", userUnit);
              totalCountQuery = totalCountQuery.eq("department", userUnit);
            } else if (currentUser.role === 'admin_unit') {
              // Admin unit without unit assigned - show 0 count
              totalCountQuery = totalCountQuery.eq("id", "00000000-0000-0000-0000-000000000000");
            }

            const { count: totalCount, error: countError } = await totalCountQuery;

            if (countError) {
              console.error("❌ Error fetching total count:", countError);
              throw countError;
            }

            console.log("🔍 DEBUG LeaveHistory - Total count:", totalCount);
            setOverallTotalEmployees(totalCount || 0);
          } catch (countFetchError) {
            console.error("❌ Failed to fetch total count:", countFetchError);
            // Don't throw here, just log and continue with 0 count
            setOverallTotalEmployees(0);
          }
        }

        // Return early if no employees found
        if (!employeesData || employeesData.length === 0) {
          setEmployeesWithBalances([]);
          setIsLoadingData(false);
          return;
        }

        // Get employee IDs for fetching related data
        const employeeIds = employeesData.map((emp) => emp.id);
        const year = parseInt(selectedYear);

        // Fetch leave balances for the current year
        const { data: leaveBalancesData, error: balancesError } = await supabase
          .from("leave_balances")
          .select(
            "employee_id, year, total_days, used_days, deferred_days, leave_type_id",
          )
          .eq("year", year)
          .in("employee_id", employeeIds);

        if (balancesError) throw balancesError;

        // Fetch leave requests to calculate separate usage for current year vs deferred
        // Now with full leave_quota_year support after migration
        const { data: leaveRequestsData, error: requestsError } = await supabase
          .from("leave_requests")
          .select(
            "employee_id, leave_type_id, days_requested, leave_quota_year, start_date",
          )
          .in("employee_id", employeeIds)
          .gte("start_date", `${year - 1}-01-01`) // Get requests from previous year onwards
          .lte("start_date", `${year}-12-31`);

        if (requestsError) throw requestsError;

        console.log(
          `📊 Leave Requests Data for ${employeeIds.length} employees:`,
          {
            totalRequests: leaveRequestsData?.length || 0,
            year: year,
            employeeIds: employeeIds.slice(0, 3), // Show first 3 IDs for debugging
          },
        );

        // Fetch deferral info from the previous year
        const previousYear = year - 1;
        const { data: deferralsLogData, error: deferralsLogError } =
          await supabase
            .from("leave_deferrals")
            .select("id, employee_id, days_deferred")
            .eq("year", previousYear)
            .in("employee_id", employeeIds);

        if (deferralsLogError) throw deferralsLogError;

        // Create a map of employee ID to deferral log object
        const deferralLogMap = new Map();
        (deferralsLogData || []).forEach((d) => {
          deferralLogMap.set(d.employee_id, {
            id: d.id,
            days_deferred: d.days_deferred,
          });
        });

        // Process employee data with their leave balances
        const processedData = employeesData.map((emp) => {
          // Filter balances for current employee
          const empBalances =
            leaveBalancesData?.filter((lb) => lb.employee_id === emp.id) || [];
          const empLeaveRequests =
            leaveRequestsData?.filter((lr) => lr.employee_id === emp.id) || [];
          const balances = {};

          // Debug logging for specific employee
          if (
            emp.name &&
            emp.name.toLowerCase().includes("nurul ratna handayani")
          ) {
            console.log("🔍 DEBUG - Nurul Ratna Handayani Data:");
            console.log("Employee:", emp);
            console.log("DB Balances:", empBalances);
            console.log("Leave Requests:", empLeaveRequests);
            console.log("Selected Year:", year);
            console.log("Leave Types:", leaveTypes);
          }

          // Initialize balances for each leave type
          leaveTypes.forEach((leaveType) => {
            const ltConfig = getLeaveTypeConfig(leaveType.name);
            const dbBalance = empBalances.find(
              (b) => b.leave_type_id === leaveType.id,
            );

            // Calculate separate usage for current year and deferred
            const empTypeRequests = empLeaveRequests.filter(
              (lr) => lr.leave_type_id === leaveType.id,
            );

            // Calculate usage from current year vs deferred (accurate with leave_quota_year)
            const usedFromCurrentYear = empTypeRequests
              .filter((lr) => {
                const quotaYear =
                  lr.leave_quota_year || new Date(lr.start_date).getFullYear();
                return quotaYear === year;
              })
              .reduce((sum, lr) => sum + (lr.days_requested || 0), 0);

            const usedFromDeferred = empTypeRequests
              .filter((lr) => {
                const quotaYear =
                  lr.leave_quota_year || new Date(lr.start_date).getFullYear();
                return quotaYear < year; // Previous year quota (deferred)
              })
              .reduce((sum, lr) => sum + (lr.days_requested || 0), 0);

            // Calculate balance values - FIXED IMPLEMENTATION
            const deferred = dbBalance?.deferred_days || 0;
            let total = ltConfig?.default_days || 0;

            // Use database total_days if available and not 0, otherwise use default_days
            if (dbBalance?.total_days != null && dbBalance.total_days > 0) {
              total = dbBalance.total_days;
            } else {
              // If no balance record exists or total_days is 0, use default_days from config
              total = ltConfig?.default_days || 0;
            }

            // CRITICAL FIX: Calculate total used from actual leave requests with splitting logic
            let totalUsed = usedFromCurrentYear + usedFromDeferred;

            // Log detailed calculation for debugging
            if (
              emp.name &&
              emp.name.toLowerCase().includes("aris") &&
              leaveType.name === "Cuti Tahunan"
            ) {
              console.log(`🔍 ARIS HERMANTO - ${leaveType.name} Calculation:`);
              console.log("Employee:", emp.name);
              console.log("Total Days:", total);
              console.log("Deferred Days:", deferred);
              console.log("Used Current Year:", usedFromCurrentYear);
              console.log("Used Deferred:", usedFromDeferred);
              console.log("Total Used:", totalUsed);
              console.log("Employee Type Requests:", empTypeRequests);
              console.log("DB Balance:", dbBalance);
            }

            // Log warning if database shows usage but no requests found
            if (empTypeRequests.length === 0 && dbBalance?.used_days > 0) {
              console.warn(
                `⚠️ BALANCE MISMATCH for ${emp.name} - ${leaveType.name}:`,
                {
                  dbUsedDays: dbBalance.used_days,
                  actualRequests: empTypeRequests.length,
                  employee: emp.name,
                  leaveType: leaveType.name,
                },
              );
            }

            const remaining = Math.max(0, total + deferred - totalUsed);

            // Debug logging for specific employee and leave type
            if (
              emp.name &&
              (emp.name.toLowerCase().includes("hany") ||
                emp.name.toLowerCase().includes("perwitasari")) &&
              (leaveType.name === "Cuti Sakit" ||
                leaveType.name === "Cuti Alasan Penting" ||
                leaveType.name === "Cuti Besar" ||
                leaveType.name === "Cuti Melahirkan")
            ) {
              console.log(`🔍 DEBUG - Hany ${leaveType.name} Calculation:`);
              console.log("Employee Name:", emp.name);
              console.log("Employee ID:", emp.id);
              console.log("Leave Type Config:", ltConfig);
              console.log("DB Balance Record:", dbBalance);
              console.log("DB Balance total_days:", dbBalance?.total_days);
              console.log("Config default_days:", ltConfig?.default_days);
              console.log("Employee Type Requests:", empTypeRequests);
              console.log("Calculated Values:", {
                total,
                totalUsed,
                usedFromCurrentYear,
                usedFromDeferred,
                deferred,
                remaining,
                dbUsedDays: dbBalance?.used_days,
                requestsCount: empTypeRequests.length,
              });
              console.log("Balance Key:", ltConfig?.key);
              console.log("Final total value:", total);
            }

            // Set the balance for this leave type
            if (ltConfig) {
              balances[ltConfig.key] = {
                total,
                used: (usedFromCurrentYear || 0) + (usedFromDeferred || 0),
                used_current: usedFromCurrentYear,
                used_deferred: usedFromDeferred,
                remaining,
                deferred,
              };
            }
          });

          // Return the processed employee data
          return {
            id: emp.id,
            employeeName: emp.name,
            nip: emp.nip,
            department: emp.department,
            positionName: emp.position_name,
            rankGroup: emp.rank_group,
            year,
            balances,
            deferralLog: deferralLogMap.get(emp.id) || null,
          };
        });

        // Update the state with processed data
        setEmployeesWithBalances(processedData);
      } catch (error) {
        console.error("❌ Error in fetchLeaveData:", error);
        console.error("❌ Error type:", typeof error);
        console.error("❌ Error details:", {
          message: error?.message,
          name: error?.name,
          stack: error?.stack,
          code: error?.code,
          details: error?.details,
          hint: error?.hint
        });

        // Determine appropriate error message based on error type
        let errorMessage = "Terjadi kesalahan saat mengambil data cuti. Silakan coba lagi.";
        let errorTitle = "Gagal mengambil data cuti";

        if (error?.message?.includes("fetch") || error?.name === "TypeError") {
          errorMessage = "Gagal terhubung ke server. Periksa koneksi internet Anda.";
          errorTitle = "Connection Error";
        } else if (error?.message?.includes("permission") || error?.message?.includes("policy")) {
          errorMessage = "Anda tidak memiliki izin untuk mengakses data ini.";
          errorTitle = "Permission Error";
        } else if (error?.code) {
          errorMessage = `Database error (${error.code}): ${error.message}`;
          errorTitle = "Database Error";
        } else if (error?.message) {
          errorMessage = error.message;
        }

        toast({
          variant: "destructive",
          title: errorTitle,
          description: errorMessage,
        });

        // Reset data on error
        setEmployeesWithBalances([]);
        setTotalEmployeesInFilter(0);
      } finally {
        setIsLoadingData(false);
      }
    },
    [
      toast,
      selectedYear,
      debouncedSearchTerm,
      selectedUnitPenempatan,
      leaveTypes,
      getLeaveTypeConfig,
      overallTotalEmployees,
      isLoadingLeaveTypes,
      LEAVE_HISTORY_PER_PAGE,
    ],
  );

  const handleOpenAddDeferred = (employee, deferralLog) => {
    setSelectedEmployee(employee);
    setSelectedDeferralLog(deferralLog);
    setIsAddDeferredOpen(true);
  };

  const handleViewHistory = async (employee) => {
    if (!employee?.id) {
      console.error("No employee ID provided");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Data pegawai tidak valid",
      });
      return;
    }

    setSelectedEmployee(employee);

    try {
      console.log("Fetching leave history for employee:", employee.id);

      // First, fetch the employee's leave requests without joining
      const { data: leaveHistory, error: leaveError } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("employee_id", employee.id)
        .order("start_date", { ascending: false })
        .limit(1); // Only get the most recent leave request

      if (leaveError) {
        console.error("Supabase leave_requests query error:", leaveError);
        throw new Error(`Gagal mengambil data cuti: ${leaveError.message}`);
      }

      console.log("Leave history data received:", leaveHistory);

      if (leaveHistory && leaveHistory.length > 0) {
        const latestLeave = leaveHistory[0];

        // Format the leave data for the download using employee prop directly
        const leaveData = {
          employee_name:
            employee.name || employee.employeeName || "Nama Pegawai",
          nip: employee.nip || "NIP tidak tersedia",
          position:
            employee.position_name ||
            employee.positionName ||
            "Jabatan tidak tersedia",
          rank:
            employee.rank_group ||
            employee.rankGroup ||
            "Pangkat tidak tersedia",
          department: employee.department || "Unit Kerja tidak tersedia",
          leave_dates: [
            latestLeave.start_date || new Date().toISOString().split("T")[0],
            latestLeave.end_date || new Date().toISOString().split("T")[0],
          ],
          duration: latestLeave.days_requested || 1,
          duration_in_words:
            latestLeave.days_requested === 1
              ? "satu"
              : latestLeave.days_requested === 2
                ? "dua"
                : (latestLeave.days_requested || 1).toString(),
          address_during_leave:
            latestLeave.address_during_leave || "Alamat tidak tersedia",
          nomor_naskah: "800/", // Default value, should be replaced with actual data
          ttd_pengirim: "KEPALA BADAN PUSAT STATISTIK", // Default value
          nip_pengirim: "19670412 199203 1 001", // Default value
          pangkat_pengirim: "Pembina Utama Muda", // Default value
          nama_pengirim: "Ir. AMALIA ADININGGAR, M.Si.", // Default value
          created_at: new Date().toISOString().split("T")[0], // Current date in YYYY-MM-DD format
        };

        console.log("Prepared leave data for download:", leaveData);
        setSelectedEmployeeLeaveData(leaveData);
      } else {
        console.log("No leave history found for employee:", employee.id);
        setSelectedEmployeeLeaveData(null);
        toast({
          variant: "info",
          title: "Tidak ada riwayat cuti",
          description:
            "Tidak ada riwayat cuti yang ditemukan untuk pegawai ini.",
        });
      }

      setIsHistoryOpen(true);
    } catch (error) {
      console.error("Error in handleViewHistory:", error);
      toast({
        variant: "destructive",
        title: "Gagal mengambil data cuti",
        description:
          error.message ||
          "Terjadi kesalahan saat mengambil data riwayat cuti. Silakan coba lagi.",
      });
    }
  };

  const handleDataChange = () => {
    console.log("Data changed - refreshing leave data...");
    // Force refresh dengan delay kecil untuk memastikan database sudah ter-update
    setTimeout(() => {
      fetchLeaveData(true); // Force full refresh including total counts
    }, 500);
  };

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  useEffect(() => {
    if (!isLoadingLeaveTypes && leaveTypes.length > 0) {
      fetchLeaveData(true);
    }
  }, [selectedYear, leaveTypes, isLoadingLeaveTypes, fetchLeaveData]);

  useEffect(() => {
    if (!isLoadingLeaveTypes && leaveTypes.length > 0) {
      fetchLeaveData(false);
    }
  }, [
    debouncedSearchTerm,
    selectedUnitPenempatan,
    fetchLeaveData,
    leaveTypes,
    isLoadingLeaveTypes,
  ]);

  useEffect(() => {
    const fetchTotalEmployees = async () => {
      let query = supabase
        .from("employees")
        .select("*", { count: "exact", head: true });

      if (selectedUnitPenempatan) {
        query = query.ilike("department", `%${selectedUnitPenempatan}%`);
      }

      const { count } = await query;
      setOverallTotalEmployees(count || 0);
    };

    fetchTotalEmployees();
  }, [selectedYear, selectedUnitPenempatan]);

  const handleRefresh = () => {
    setSearchTerm("");
    setSelectedUnitPenempatan("");
    setSelectedYear("2025");
  };

  const handleFeatureClick = (feature) => {
    toast({
      title: `🚀 ${feature}`,
      description:
        "�� Fitur ini belum diimplementasikan—tapi jangan khawatir! Anda bisa memintanya di prompt berikutnya! 🚀",
    });
  };

  const handleExportDataCuti = async () => {
    try {
      toast({
        title: "📊 Export Data Cuti",
        description: "Sedang mempersiapkan data untuk export...",
      });

      console.log("🔍 Fetching leave requests data...");

      // Fetch leave requests data
      const { data: leaveRequests, error: leaveRequestsError } = await supabase
        .from("leave_requests")
        .select(
          `
          *,
          employees (name, nip, department),
          leave_types (name)
        `,
        )
        .order("created_at", { ascending: false });

      if (leaveRequestsError) throw leaveRequestsError;

      console.log("📋 Leave requests data:", leaveRequests);
      console.log("📊 Total leave requests:", leaveRequests?.length || 0);

      console.log("🔍 Fetching deferrals data...");

      // Fetch deferrals data
      const { data: deferrals, error: deferralsError } = await supabase
        .from("leave_deferrals")
        .select(
          `
          *,
          employees (name, nip, department)
        `,
        )
        .order("created_at", { ascending: false });

      if (deferralsError) throw deferralsError;

      console.log("📋 Deferrals data:", deferrals);
      console.log("📊 Total deferrals:", deferrals?.length || 0);

      // Get unique employee IDs who have leave requests
      const employeeIdsWithRequests = [
        ...new Set(
          leaveRequests?.map((req) => req.employee_id).filter(Boolean) || [],
        ),
      ];
      console.log("👥 Employee IDs with requests:", employeeIdsWithRequests);

      console.log("🔍 Fetching leave balances for employees with requests...");

      // Fetch leave balances only for employees who have leave requests
      const { data: leaveBalances, error: leaveBalancesError } = await supabase
        .from("leave_balances")
        .select(
          `
          *,
          employees (name, nip, department),
          leave_types (name)
        `,
        )
        .in("employee_id", employeeIdsWithRequests)
        .eq("year", parseInt(selectedYear))
        .order("employees(name)", { ascending: true });

      if (leaveBalancesError) throw leaveBalancesError;

      console.log("📋 Leave balances data:", leaveBalances);
      console.log("📊 Total leave balances:", leaveBalances?.length || 0);

      // Filter leaveBalances hanya untuk Cuti Tahunan
      const cutiTahunanBalances =
        leaveBalances?.filter((b) => b.leave_types?.name === "Cuti Tahunan") ||
        [];

      // Ambil leave_requests hanya untuk Cuti Tahunan
      const cutiTahunanRequests =
        leaveRequests?.filter((r) => r.leave_types?.name === "Cuti Tahunan") ||
        [];

      // Buat mapping saldo cuti tahunan per pegawai
      const saldoCutiTahunan = cutiTahunanBalances.map((balance) => {
        const employee_id = balance.employee_id;
        const employee_name = balance.employees?.name || "";
        const employee_nip = balance.employees?.nip || "";
        const employee_department = balance.employees?.department || "";
        const year = balance.year;
        const jatah_tahun_berjalan = balance.total_days || 0;
        const jatah_penangguhan = balance.deferred_days || 0;

        // Digunakan tahun berjalan: leave_requests dengan leave_quota_year == year
        const digunakan_tahun_berjalan = cutiTahunanRequests
          .filter(
            (r) => r.employee_id === employee_id && r.leave_quota_year === year,
          )
          .reduce((sum, r) => sum + (r.days_requested || r.days || 0), 0);

        // Digunakan penangguhan: leave_requests dengan leave_quota_year == year - 1
        const digunakan_penangguhan = cutiTahunanRequests
          .filter(
            (r) =>
              r.employee_id === employee_id && r.leave_quota_year === year - 1,
          )
          .reduce((sum, r) => sum + (r.days_requested || r.days || 0), 0);

        const sisa_tahun_berjalan =
          jatah_tahun_berjalan - digunakan_tahun_berjalan;
        const sisa_penangguhan = jatah_penangguhan - digunakan_penangguhan;

        return {
          employee_id,
          employee_name,
          employee_nip,
          employee_department,
          year,
          jatah_tahun_berjalan,
          digunakan_tahun_berjalan,
          sisa_tahun_berjalan,
          jatah_penangguhan,
          digunakan_penangguhan,
          sisa_penangguhan,
        };
      });

      // Hanya tampilkan pegawai yang punya pengajuan cuti tahunan
      const saldoCutiTahunanFiltered = saldoCutiTahunan.filter((row) => {
        return (
          row.digunakan_tahun_berjalan > 0 || row.digunakan_penangguhan > 0
        );
      });

      // Format data untuk export
      const formattedLeaveRequests =
        leaveRequests?.map((request) => ({
          employee_id: request.employee_id,
          employee_name: request.employees?.name || "",
          employee_nip: request.employees?.nip || "",
          employee_department: request.employees?.department || "",
          leave_type: request.leave_types?.name || "",
          start_date: request.start_date,
          end_date: request.end_date,
          days: request.days_requested || request.days,
          leave_quota_year: request.leave_quota_year,
          status: request.status,
          reason: request.reason,
          created_at: request.created_at,
          notes: request.notes || "",
        })) || [];

      const formattedDeferrals =
        deferrals?.map((deferral) => ({
          employee_id: deferral.employee_id,
          employee_name: deferral.employees?.name || "",
          employee_nip: deferral.employees?.nip || "",
          employee_department: deferral.employees?.department || "",
          year: deferral.year,
          days_deferred: deferral.days_deferred,
          google_drive_link: deferral.google_drive_link || "",
          notes: deferral.notes || "",
          created_at: deferral.created_at,
          status: "Aktif",
        })) || [];

      // Untuk sheet Saldo Cuti, gunakan saldoCutiTahunanFiltered
      const exportData = {
        leaveRequests: formattedLeaveRequests,
        deferrals: formattedDeferrals,
        leaveBalances: saldoCutiTahunanFiltered,
      };

      console.log("📦 Final export data:", exportData);

      const fileName = `Data_Cuti_${new Date().toISOString().split("T")[0]}.xlsx`;

      await exportToExcelWithMultipleSheets(exportData, fileName);

      toast({
        title: "✅ Export Berhasil",
        description: `Data cuti berhasil diekspor ke file ${fileName}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "❌ Export Gagal",
        description: error.message || "Gagal mengekspor data cuti",
      });
    }
  };

  const dynamicLeaveTypesConfig = useMemo(() => {
    if (leaveTypes.length === 0) return STATIC_LEAVE_TYPES_CONFIG;
    const config = {};
    leaveTypes.forEach((lt) => {
      const staticConfig = Object.values(STATIC_LEAVE_TYPES_CONFIG).find(
        (slt) => slt.name === lt.name,
      );
      config[lt.name] = {
        key: lt.name.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_"),
        name: lt.name,
        color: staticConfig?.color || "from-gray-500 to-gray-600",
        default_days: lt.default_days,
        can_defer: lt.can_defer,
        max_days: staticConfig?.max_days,
      };
    });
    return config;
  }, [leaveTypes]);

  return (
    <>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Riwayat & Saldo Cuti
            </h1>
            <p className="text-slate-300">
              Lihat riwayat cuti dan kelola saldo cuti tahunan
            </p>
          </div>
          <div className="flex space-x-2 mt-4 sm:mt-0">
            <Button
              onClick={() => fetchLeaveData(true)}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:text-white"
              disabled={isLoadingData}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isLoadingData ? "animate-spin" : ""}`}
              />
              {isLoadingData ? "Memuat..." : "Refresh"}
            </Button>
            <Button
              onClick={handleExportDataCuti}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Data Cuti
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <LeaveHistoryFilters
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            selectedYear={selectedYear}
            onSelectedYearChange={setSelectedYear}
            years={years}
            selectedDepartment={selectedUnitPenempatan}
            onSelectedDepartmentChange={setSelectedUnitPenempatan}
            departments={unitPenempatanOptions}
            onRefresh={handleRefresh}
            isLoading={
              isLoadingData || isLoadingLeaveTypes || isLoadingDepartments
            }
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">
                Saldo Cuti Pegawai - Tahun {selectedYear}
              </CardTitle>
              <p className="text-sm text-slate-400">
                Menampilkan {employeesWithBalances.length} dari{" "}
                {totalEmployeesInFilter} pegawai sesuai filter. Total pegawai di
                sistem: {overallTotalEmployees}.
              </p>
              <div className="mt-2 p-2 bg-green-900/20 border border-green-600/30 rounded text-xs text-green-300">
                ✅ <strong>Fitur Aktif:</strong> Pemisahan saldo tahun berjalan
                vs penangguhan berdasarkan pilihan "Jatah Cuti Tahun" pada form
                pengajuan cuti. Migration database berhasil!
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingLeaveTypes ? (
                <div className="text-center py-8 text-slate-300">
                  Memuat konfigurasi jenis cuti...
                </div>
              ) : isLoadingData ? (
                <div className="text-center py-8 text-slate-300">
                  Memuat data saldo cuti...
                </div>
              ) : employeesWithBalances.length > 0 ? (
                <div className="space-y-6">
                  {employeesWithBalances.map((employee, index) => (
                    <LeaveHistoryEmployeeCard
                      key={employee.id}
                      employee={employee}
                      index={index}
                      leaveTypesConfig={dynamicLeaveTypesConfig}
                      leaveData={
                        employee.id === selectedEmployee?.id
                          ? selectedEmployeeLeaveData
                          : null
                      }
                      onAddDeferredLeave={handleOpenAddDeferred}
                      onViewHistory={handleViewHistory}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">
                    Tidak ada data saldo cuti yang ditemukan untuk filter ini.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <LeaveHistoryDeferralInfo />
      </div>
      <AddDeferredLeaveDialog
        isOpen={isAddDeferredOpen}
        onOpenChange={setIsAddDeferredOpen}
        employee={selectedEmployee}
        year={parseInt(selectedYear)}
        onSuccess={handleDataChange}
        leaveTypes={leaveTypes}
        deferralLog={selectedDeferralLog}
      />
      <EmployeeLeaveHistoryModal
        isOpen={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        employee={selectedEmployee}
        onDataChange={handleDataChange}
      />
    </>
  );
};

export default LeaveHistoryPage;
