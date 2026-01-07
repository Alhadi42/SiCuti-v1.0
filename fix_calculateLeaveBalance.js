// Patch untuk calculateLeaveBalance function
// Masalah: Filter menggunakan leave_period bukan execution year

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

  // 🔧 FIX: Gunakan execution year (start_date) bukan leave_period untuk filter utama
  const requestsInExecutionYear = typeRequests.filter((lr) => {
    const executionYear = lr.start_date
      ? new Date(lr.start_date).getFullYear()
      : null;
    return executionYear === yearNum;
  });

  // Calculate usage split based on leave_quota_year
  const usedFromCurrentYear = requestsInExecutionYear
    .filter((lr) => {
      const quotaYear = normalizeYear(lr.leave_quota_year);
      return quotaYear === yearNum;
    })
    .reduce((sum, lr) => sum + (lr.days_requested || 0), 0);

  const usedFromDeferred = requestsInExecutionYear
    .filter((lr) => {
      const quotaYear = normalizeYear(lr.leave_quota_year);
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

  // Calculate total used
  const totalUsed = usedFromCurrentYear + usedFromDeferred;

  // Calculate remaining
  const remaining = Math.max(0, total + deferred - totalUsed);

  return {
    total,
    deferred,
    used: totalUsed,
    used_current: usedFromCurrentYear,
    used_deferred: usedFromDeferred,
    remaining,
    // Additional info
    isCurrentYear: yearNum === currentYearNum,
    isPastYear: yearNum < currentYearNum,
    isFutureYear: yearNum > currentYearNum,
  };
};
