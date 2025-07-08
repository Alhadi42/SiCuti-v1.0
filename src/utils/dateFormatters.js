/**
 * Format a date range in Indonesian format
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {string} Formatted date range in Indonesian
 */
export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // If it's the same day
  if (start.toDateString() === end.toDateString()) {
    return formatDate(start);
  }
  
  // If same month and year
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} s.d. ${formatDate(end)}`;
  }
  
  // If different months but same year
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} ${getMonthName(start)} s.d. ${formatDate(end)}`;
  }
  
  // Completely different dates
  return `${formatDate(start)} s.d. ${formatDate(end)}`;
};

/**
 * Format a single date in Indonesian format
 * @param {Date} date - Date to format
 * @returns {string} Formatted date in Indonesian
 */
const formatDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  return `${d.getDate()} ${getMonthName(d)} ${d.getFullYear()}`;
};

/**
 * Get Indonesian month name
 * @param {Date} date - Date object
 * @returns {string} Month name in Indonesian
 */
const getMonthName = (date) => {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[date.getMonth()];
};
