/**
 * Utility functions for calculating leave balances dynamically
 * Handles year transitions and deferred leave calculations correctly
 * 
 * IMPORTANT: Deferred days (penangguhan) are ONLY set through manual input
 * via "Input Data Penangguhan" dialog. They are NOT automatically calculated
 * from previous year balance. If no deferral log exists, deferred_days = 0.
 */

/**
 * Calculate remaining days from previous year that can be deferred
 * This is used for VALIDATION only (to check max deferrable days when user inputs)
 * NOT for automatic transfer - deferred days must be manually input
 * @param {Object} previousYearBalance - Balance record from previous year
 * @returns {number} - Days that can be deferred (for validation purposes only)
 */
export const calculateDeferrableDays = (previousYearBalance) => {
  if (!previousYearBalance) return 0;

  const total = previousYearBalance.total_days || 0;
  const deferred = previousYearBalance.deferred_days || 0;
  const used = previousYearBalance.used_days || 0;

  // Remaining = (total + existing deferred) - used
  const remaining = Math.max(0, (total + deferred) - used);

  return remaining;
};

/**
 * Calculate leave balance for a specific year
 * Handles both current year and historical years correctly
 * @param {Object} params
 * @param {Object} params.dbBalance - Balance record from database
 * @param {Array} params.leaveRequests - All leave requests for the employee
 * @param {Object} params.leaveType - Leave type configuration
 * @param {number} params.year - Year to calculate for
 * @param {number} params.currentYear - Current system year
 * @returns {Object} - Calculated balance
 */
export const calculateLeaveBalance = ({
  dbBalance,
  leaveRequests,
  leaveType,
  year,
  currentYear,
}) => {
  const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;
  const currentYearNum = typeof currentYear === 'string' ? parseInt(currentYear, 10) : currentYear;

  const normalizeYear = (value) => {
    if (value == null) return null;
    const parsed = typeof value === 'string' ? parseInt(value, 10) : value;
    return Number.isFinite(parsed) ? parsed : null;
  };

  // Filter requests for this leave type
  const typeRequests = (leaveRequests || []).filter(
    (lr) => lr.leave_type_id === leaveType.id
  );

  // 🔧 FIX: Use execution year (start_date) for primary filtering, not leave_period
  // This ensures we count leave requests that are actually taken in the target year
  const requestsInExecutionYear = typeRequests.filter((lr) => {
    const executionYear = lr.start_date
      ? new Date(lr.start_date).getFullYear()
      : null;
    return executionYear === yearNum;
  });

  // Calculate usage split based on leave_quota_year
  const usedFromCurrentYear = requestsInExecutionYear
    .filter((lr) => {
      const quotaYear =
        normalizeYear(lr.leave_quota_year) ||
        normalizeYear(lr.leave_period) ||
        (lr.start_date ? new Date(lr.start_date).getFullYear() : null);
      return quotaYear === yearNum;
    })
    .reduce((sum, lr) => sum + (lr.days_requested || 0), 0);

  const usedFromDeferred = requestsInExecutionYear
    .filter((lr) => {
      const quotaYear =
        normalizeYear(lr.leave_quota_year) ||
        normalizeYear(lr.leave_period) ||
        (lr.start_date ? new Date(lr.start_date).getFullYear() : null);
      // Deferred usage: quota year is less than execution year
      return quotaYear < yearNum;
    })
    .reduce((sum, lr) => sum + (lr.days_requested || 0), 0);

  // Get base values
  const deferred = dbBalance?.deferred_days || 0;
  let total = leaveType.default_days || 0;

  // Use database total_days if available and valid
  if (dbBalance?.total_days != null && dbBalance.total_days > 0) {
    total = dbBalance.total_days;
  }

  // 🔧 FIX: Cap used_deferred at available deferred days
  // If used_deferred exceeds available deferred, move excess to used_current
  let actualUsedDeferred = usedFromDeferred;
  let actualUsedCurrent = usedFromCurrentYear;

  if (usedFromDeferred > deferred) {
    actualUsedDeferred = deferred;
    actualUsedCurrent = usedFromCurrentYear + (usedFromDeferred - deferred);
  }

  // Calculate total used with adjusted values
  const totalUsed = actualUsedCurrent + actualUsedDeferred;

  // Calculate remaining
  const remaining = Math.max(0, total + deferred - totalUsed);

  return {
    total,
    deferred,
    used: totalUsed,
    used_current: actualUsedCurrent,
    used_deferred: actualUsedDeferred,
    remaining,
    // Additional info
    isCurrentYear: yearNum === currentYearNum,
    isPastYear: yearNum < currentYearNum,
    isFutureYear: yearNum > currentYearNum,
  };
};

/**
 * Ensure leave balance exists for a year, creating it if needed
 * Automatically transfers deferred days from previous year if applicable
 * @param {Object} supabase - Supabase client
 * @param {string} employeeId - Employee ID
 * @param {string} leaveTypeId - Leave type ID
 * @param {number} year - Year to ensure balance for
 * @param {Object} leaveType - Leave type configuration
 * @returns {Promise<Object>} - Balance record
 */
export const ensureLeaveBalance = async (supabase, employeeId, leaveTypeId, year, leaveType) => {
  const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;
  const previousYear = yearNum - 1;

  // Check if balance exists
  const { data: existingBalance, error: fetchError } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('leave_type_id', leaveTypeId)
    .eq('year', yearNum)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // Error other than "not found"
    throw fetchError;
  }

  if (existingBalance) {
    // Keep deferred_days in sync with manual deferral log
    if (leaveType?.can_defer && previousYear >= 2020) {
      const { data: deferralLog, error: deferralError } = await supabase
        .from('leave_deferrals')
        .select('days_deferred')
        .eq('employee_id', employeeId)
        .eq('year', previousYear)
        .single();

      if (!deferralError && deferralLog && deferralLog.days_deferred != null) {
        const desiredDeferred = deferralLog.days_deferred;
        const currentDeferred = existingBalance.deferred_days || 0;

        if (currentDeferred !== desiredDeferred) {
          const { data: updatedBalance, error: updateError } = await supabase
            .from('leave_balances')
            .update({ deferred_days: desiredDeferred })
            .eq('id', existingBalance.id)
            .select()
            .single();

          if (!updateError && updatedBalance) {
            return updatedBalance;
          }
        }
      }
    }

    return existingBalance;
  }

  // Balance doesn't exist, create it
  // IMPORTANT: Deferred days only come from manual input via "Input Data Penangguhan"
  // Do NOT automatically calculate from previous year balance
  let deferredDays = 0;

  // Deferred days should ONLY come from deferral log (manual input)
  if (leaveType.can_defer && previousYear >= 2020) {
    const { data: deferralLog } = await supabase
      .from('leave_deferrals')
      .select('days_deferred')
      .eq('employee_id', employeeId)
      .eq('year', previousYear)
      .single();

    // Only use deferral log if it exists (manual input)
    // If no deferral log exists, deferred_days = 0
    if (deferralLog && deferralLog.days_deferred != null) {
      deferredDays = deferralLog.days_deferred;
    }
  }

  // Create new balance record
  const { data: newBalance, error: insertError } = await supabase
    .from('leave_balances')
    .insert({
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      year: yearNum,
      total_days: leaveType.default_days || 0,
      used_days: 0,
      deferred_days: deferredDays,
    })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  return newBalance;
};

/**
 * Initialize leave balances for all employees for a new year
 * Should be called when a new year starts
 * @param {Object} supabase - Supabase client
 * @param {number} year - Year to initialize (defaults to current year)
 * @returns {Promise<Object>} - Result with counts
 */
export const initializeYearBalances = async (supabase, year = null) => {
  const targetYear = year || new Date().getFullYear();
  const previousYear = targetYear - 1;

  // Get all employees
  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id');

  if (employeesError) {
    throw employeesError;
  }

  // Get all leave types
  const { data: leaveTypes, error: leaveTypesError } = await supabase
    .from('leave_types')
    .select('*');

  if (leaveTypesError) {
    throw leaveTypesError;
  }

  let initialized = 0;
  let errors = [];

  // Initialize balance for each employee and leave type
  for (const employee of employees || []) {
    for (const leaveType of leaveTypes || []) {
      try {
        // Check if balance already exists
        const { data: existing } = await supabase
          .from('leave_balances')
          .select('id')
          .eq('employee_id', employee.id)
          .eq('leave_type_id', leaveType.id)
          .eq('year', targetYear)
          .single();

        if (existing) {
          continue; // Already exists
        }

        // IMPORTANT: Deferred days only come from manual input via "Input Data Penangguhan"
        // Do NOT automatically calculate from previous year balance
        let deferredDays = 0;

        // Only check deferral log (manual input)
        // If no deferral log exists, deferred_days = 0
        if (leaveType.can_defer && previousYear >= 2020) {
          const { data: deferralLog } = await supabase
            .from('leave_deferrals')
            .select('days_deferred')
            .eq('employee_id', employee.id)
            .eq('year', previousYear)
            .single();

          // Only use deferral log if it exists (manual input)
          if (deferralLog && deferralLog.days_deferred != null) {
            deferredDays = deferralLog.days_deferred;
          }
        }

        // Create balance record
        const { error: insertError } = await supabase
          .from('leave_balances')
          .insert({
            employee_id: employee.id,
            leave_type_id: leaveType.id,
            year: targetYear,
            total_days: leaveType.default_days || 0,
            used_days: 0,
            deferred_days: deferredDays,
          });

        if (insertError) {
          errors.push({
            employee_id: employee.id,
            leave_type_id: leaveType.id,
            error: insertError.message,
          });
        } else {
          initialized++;
        }
      } catch (error) {
        errors.push({
          employee_id: employee.id,
          leave_type_id: leaveType.id,
          error: error.message,
        });
      }
    }
  }

  return {
    initialized,
    total: (employees?.length || 0) * (leaveTypes?.length || 0),
    errors,
  };
};

/**
 * Recalculate leave balance for an employee and year
 * Useful when data needs to be refreshed
 * @param {Object} supabase - Supabase client
 * @param {string} employeeId - Employee ID
 * @param {string} leaveTypeId - Leave type ID
 * @param {number} year - Year to recalculate
 * @returns {Promise<Object>} - Updated balance
 */
export const recalculateLeaveBalance = async (supabase, employeeId, leaveTypeId, year) => {
  const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;

  const normalizeYear = (value) => {
    if (value == null) return null;
    const parsed = typeof value === 'string' ? parseInt(value, 10) : value;
    return Number.isFinite(parsed) ? parsed : null;
  };

  // Get all leave requests for this employee and leave type
  const { data: requests, error: requestsError } = await supabase
    .from('leave_requests')
    .select('days_requested, leave_quota_year, leave_period, start_date')
    .eq('employee_id', employeeId)
    .eq('leave_type_id', leaveTypeId);

  if (requestsError) {
    throw requestsError;
  }

  // Calculate used days from current year quota
  const usedFromCurrent = (requests || [])
    .filter((lr) => {
      const executionYear = lr.start_date
        ? new Date(lr.start_date).getFullYear()
        : null;
      const requestPeriod =
        normalizeYear(lr.leave_period) ||
        executionYear;
      if (requestPeriod !== yearNum) return false;
      const quotaYear =
        normalizeYear(lr.leave_quota_year) ||
        requestPeriod ||
        executionYear;
      return quotaYear === yearNum;
    })
    .reduce((sum, lr) => sum + (lr.days_requested || 0), 0);

  // Calculate used days from deferred (previous year quota used in this year)
  const usedFromDeferred = (requests || [])
    .filter((lr) => {
      const executionYear = lr.start_date
        ? new Date(lr.start_date).getFullYear()
        : null;
      const requestPeriod =
        normalizeYear(lr.leave_period) ||
        executionYear;
      if (requestPeriod !== yearNum) return false;
      const quotaYear =
        normalizeYear(lr.leave_quota_year) ||
        requestPeriod ||
        executionYear;
      return quotaYear < yearNum;
    })
    .reduce((sum, lr) => sum + (lr.days_requested || 0), 0);

  const totalUsed = usedFromCurrent + usedFromDeferred;

  // Get current balance
  const { data: balance, error: balanceError } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('leave_type_id', leaveTypeId)
    .eq('year', yearNum)
    .single();

  if (balanceError && balanceError.code !== 'PGRST116') {
    throw balanceError;
  }

  // Update used_days
  if (balance) {
    const { data: updated, error: updateError } = await supabase
      .from('leave_balances')
      .update({ used_days: totalUsed })
      .eq('id', balance.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return updated;
  }

  return null;
};
