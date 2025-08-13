import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { getSafeErrorMessage } from "@/utils/errorUtils";
import { AuthManager } from "@/lib/auth";

const EMPLOYEES_PER_PAGE = 50; // Increased from 15 to 50 for better visibility

export const useEmployeeData = (
  debouncedSearchTerm,
  selectedUnitPenempatan,
  selectedPositionType = "",
  selectedAsnStatus = "",
  selectedRankGroup = "",
  page = 1,
) => {
  const { toast } = useToast();
  const [displayedEmployees, setDisplayedEmployees] = useState([]);
  const [totalFilteredEmployeeCount, setTotalFilteredEmployeeCount] =
    useState(0);
  const [overallTotalEmployeeCount, setOverallTotalEmployeeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  const [unitPenempatanOptions, setUnitPenempatanOptions] = useState([]);
  const [positionTypes, setPositionTypes] = useState([]);
  const [asnStatuses, setAsnStatuses] = useState([]);
  const [rankGroups, setRankGroups] = useState([]);

  const fetchDropdownOptions = useCallback(async () => {
    setIsLoading(true);
    try {
      // Panggil RPC untuk mendapatkan semua departemen unik
      const { data: departmentsData, error: deptError } = await supabase.rpc(
        "get_distinct_departments",
      );

      if (deptError) throw deptError;

      // console.log('Data from RPC get_distinct_departments:', departmentsData); // Hapus console.log

      // Apply unit-based filtering for departments
      const currentUser = AuthManager.getUserSession();

      // DEBUG: Log user session data
      console.log("🔍 DEBUG - User session data:", {
        user: currentUser,
        role: currentUser?.role,
        unit_kerja: currentUser?.unit_kerja,
        unitKerja: currentUser?.unitKerja,
        name: currentUser?.name
      });

      let filteredDepartments = departmentsData;

      // Fix: Use unit_kerja instead of unitKerja (database field name)
      const userUnit = currentUser?.unit_kerja || currentUser?.unitKerja;
      if (currentUser && currentUser.role === 'admin_unit' && userUnit) {
        console.log("🔍 DEBUG - Applying unit filter for admin_unit:", userUnit);
        console.log("🔍 DEBUG - Available departments:", departmentsData.map(d => d.department_name));

        // Admin unit can only see their own unit
        filteredDepartments = departmentsData.filter(dept =>
          dept.department_name === userUnit
        );

        console.log("🔍 DEBUG - Filtered departments:", filteredDepartments.map(d => d.department_name));
      }

      // Map hasil ke format yang benar
      const uniqueDepartments = filteredDepartments.map((dept, index) => ({
        id: index,
        name: dept.department_name,
      }));

      setUnitPenempatanOptions(uniqueDepartments);

      // Get other filter data from employees table with unit filtering
      let employeeQuery = supabase
        .from("employees")
        .select("position_type, asn_status, rank_group");

      // Fix: Use unit_kerja instead of unitKerja
      if (currentUser && currentUser.role === 'admin_unit' && userUnit) {
        console.log("🔍 DEBUG - Applying unit filter to employee query:", userUnit);
        employeeQuery = employeeQuery.eq("department", userUnit);
      }

      const { data, error } = await employeeQuery;
      if (error) throw error;

      const uniqueValues = (key) =>
        [
          ...new Set(
            data
              .map((e) => e[key])
              .filter(Boolean)
              .map((val) => val.trim()),
          ),
        ]
          .map((val) => ({ value: val, label: val }))
          .sort((a, b) => a.label.localeCompare(b.label));

      setPositionTypes(uniqueValues("position_type"));
      setAsnStatuses(uniqueValues("asn_status"));
      setRankGroups(uniqueValues("rank_group"));
    } catch (error) {
      console.error("Error fetching dropdown options:", error);
      toast({
        variant: "destructive",
        title: "Gagal memuat opsi filter",
        description: getSafeErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchData = useCallback(
    async (isInitialLoad = false) => {
      setIsLoading(true);
      try {
        let query = supabase
          .from("employees")
          .select(
            "id, nip, name, position_name, department, asn_status, rank_group, position_type",
            { count: "exact" },
          );

        // Apply unit-based filtering for admin_unit users
        const currentUser = AuthManager.getUserSession();

        // Fix: Use unit_kerja instead of unitKerja (database field name)
        const userUnit = currentUser?.unit_kerja || currentUser?.unitKerja;
        if (currentUser && currentUser.role === 'admin_unit' && userUnit) {
          console.log("🔍 DEBUG - Applying unit filter to main query:", userUnit);
          // Admin unit can only see employees from their unit
          query = query.eq("department", userUnit);
        }

        // Apply all filters
        if (debouncedSearchTerm) {
          query = query.or(
            `name.ilike.%${debouncedSearchTerm}%,` +
              `nip.ilike.%${debouncedSearchTerm}%,` +
              `department.ilike.%${debouncedSearchTerm}%,` +
              `position_name.ilike.%${debouncedSearchTerm}%,` +
              `position_type.ilike.%${debouncedSearchTerm}%,` +
              `asn_status.ilike.%${debouncedSearchTerm}%,` +
              `rank_group.ilike.%${debouncedSearchTerm}%`,
          );
        }

        if (selectedUnitPenempatan && selectedUnitPenempatan !== "ALL") {
          query = query.ilike("department", `%${selectedUnitPenempatan}%`);
        }

        if (selectedPositionType && selectedPositionType !== "ALL") {
          query = query.eq("position_type", selectedPositionType);
        }

        if (selectedAsnStatus && selectedAsnStatus !== "ALL") {
          query = query.eq("asn_status", selectedAsnStatus);
        }

        if (selectedRankGroup && selectedRankGroup !== "ALL") {
          query = query.eq("rank_group", selectedRankGroup);
        }

        // Calculate pagination
        const from = (page - 1) * EMPLOYEES_PER_PAGE;
        const to = from + EMPLOYEES_PER_PAGE - 1;

        const { data, error, count } = await query
          .order("name", { ascending: true })
          .range(from, to);

        if (error) throw error;

        setDisplayedEmployees(data || []);
        setTotalFilteredEmployeeCount(count || 0);
        setTotalPages(Math.ceil((count || 0) / EMPLOYEES_PER_PAGE));

        if (isInitialLoad || overallTotalEmployeeCount === 0) {
          const { count: totalCountFromDb, error: totalCountError } =
            await supabase
              .from("employees")
              .select("id", { count: "exact", head: true });

          if (totalCountError) throw totalCountError;
          setOverallTotalEmployeeCount(totalCountFromDb || 0);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
        toast({
          variant: "destructive",
          title: "Gagal mengambil data pegawai",
          description: getSafeErrorMessage(error),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      toast,
      debouncedSearchTerm,
      selectedUnitPenempatan,
      selectedPositionType,
      selectedAsnStatus,
      selectedRankGroup,
      page,
      overallTotalEmployeeCount,
    ],
  );

  useEffect(() => {
    fetchDropdownOptions();
  }, [fetchDropdownOptions]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const refreshData = useCallback(() => {
    fetchData(true);
    fetchDropdownOptions();
  }, [fetchData, fetchDropdownOptions]);

  return {
    displayedEmployees,
    totalEmployeeCount: totalFilteredEmployeeCount,
    overallTotalEmployeeCount,
    totalPages,
    isLoading,
    departments: unitPenempatanOptions,
    positionTypes,
    asnStatuses,
    rankGroups,
    fetchData,
    refreshData,
  };
};
