import { useMemo, useCallback } from 'react';

/**
 * Custom hook for managing leave balance year-related calculations
 * Provides consistent year handling across the application
 */
export const useLeaveBalanceYear = () => {
  // Current system year
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Generate array of valid years for selection
  // 3 years back, current year, 2 years forward
  const availableYears = useMemo(() => {
    const yearsArray = [];
    for (let y = currentYear - 3; y <= currentYear + 2; y++) {
      yearsArray.push(y.toString());
    }
    return yearsArray;
  }, [currentYear]);

  // Generate years for quota selection (current year and previous year for deferred)
  const quotaYears = useMemo(() => {
    return [
      { value: currentYear.toString(), label: `${currentYear} (Tahun Berjalan)` },
      { value: (currentYear - 1).toString(), label: `${currentYear - 1} (Penangguhan)` },
    ];
  }, [currentYear]);

  // Check if a given year is the current year
  const isCurrentYear = useCallback((year) => {
    const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;
    return yearNum === currentYear;
  }, [currentYear]);

  // Check if a given year is a deferred year (previous year)
  const isDeferredYear = useCallback((year) => {
    const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;
    return yearNum < currentYear;
  }, [currentYear]);

  // Get the previous year for deferred leave calculations
  const previousYear = useMemo(() => currentYear - 1, [currentYear]);

  // Calculate remaining days for a balance
  const calculateRemainingDays = useCallback((balance) => {
    if (!balance) return 0;
    const total = balance.total_days || balance.total || 0;
    const deferred = balance.deferred_days || balance.deferred || 0;
    const used = balance.used_days || balance.used || 0;
    return Math.max(0, total + deferred - used);
  }, []);

  // Calculate usage split between current year and deferred
  const calculateUsageSplit = useCallback((requests, year) => {
    const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;
    
    const usedFromCurrentYear = (requests || [])
      .filter((lr) => {
        const quotaYear = lr.leave_quota_year || new Date(lr.start_date).getFullYear();
        return quotaYear === yearNum;
      })
      .reduce((sum, lr) => sum + (lr.days_requested || 0), 0);

    const usedFromDeferred = (requests || [])
      .filter((lr) => {
        const quotaYear = lr.leave_quota_year || new Date(lr.start_date).getFullYear();
        return quotaYear < yearNum;
      })
      .reduce((sum, lr) => sum + (lr.days_requested || 0), 0);

    return {
      usedFromCurrentYear,
      usedFromDeferred,
      totalUsed: usedFromCurrentYear + usedFromDeferred,
    };
  }, []);

  // Format year for display
  const formatYearLabel = useCallback((year) => {
    const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;
    if (yearNum === currentYear) {
      return `${year} (Tahun Berjalan)`;
    } else if (yearNum === currentYear - 1) {
      return `${year} (Penangguhan)`;
    }
    return year.toString();
  }, [currentYear]);

  return {
    currentYear,
    previousYear,
    availableYears,
    quotaYears,
    isCurrentYear,
    isDeferredYear,
    calculateRemainingDays,
    calculateUsageSplit,
    formatYearLabel,
  };
};

export default useLeaveBalanceYear;
