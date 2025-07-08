import { supabase } from '../lib/supabaseClient.node.js';

export function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function formatYMD(date) {
  return date.toISOString().split('T')[0];
}

export async function fetchNationalHolidaysFromDB(year) {
  const { data, error } = await supabase
    .from('national_holidays')
    .select('date')
    .eq('year', year);
  if (error) throw error;
  return new Set((data || []).map(item => item.date));
}

export function countWorkingDays(start, end, holidays = new Set()) {
  let count = 0;
  let current = new Date(start);
  const endDate = new Date(end);
  while (current <= endDate) {
    const ymd = formatYMD(current);
    if (!isWeekend(current) && !holidays.has(ymd)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
} 