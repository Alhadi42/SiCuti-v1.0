import { useState, useEffect } from "react";
import { OptimizedQueries } from "@/lib/supabaseOptimized";

export const useDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDepartments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Use optimized query with caching
        const uniqueDepartments = await OptimizedQueries.getDepartments();

        // Format for autocomplete: add special options at the top
        const formattedOptions = [
          { value: "", label: "Semua Unit Kerja" },
          { value: "All Units", label: "All Units (Master Admin)" },
          ...uniqueDepartments.map((d) => ({ value: d, label: d })),
        ];

        console.log("Departments loaded:", formattedOptions);
        setDepartments(formattedOptions);
      } catch (err) {
        console.error("Error fetching departments:", err);
        setError(err.message);
        // Fallback data
        setDepartments([
          { value: "", label: "Semua Unit Kerja" },
          { value: "Teknologi Informasi", label: "Teknologi Informasi" },
          { value: "Human Resources", label: "Human Resources" },
          { value: "Keuangan", label: "Keuangan" },
          { value: "Operasional", label: "Operasional" },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  const refreshDepartments = () => {
    // Clear cache and refetch
    if (typeof OptimizedQueries.invalidateCache === "function") {
      OptimizedQueries.invalidateCache("departments");
    }
    fetchDepartments();
  };

  return {
    departments,
    isLoadingDepartments: isLoading,
    departmentsError: error,
    refreshDepartments,
  };
};
