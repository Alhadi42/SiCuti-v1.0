import { supabase } from "@/lib/supabaseClient";

/**
 * Mendapatkan daftar hari libur nasional dari API Kalender Indonesia
 * @returns {Promise<Set<string>>} Set tanggal libur dalam format 'YYYY-MM-DD'
 */
export async function fetchNationalHolidays(year) {
  const url = `https://api-harilibur.vercel.app/api?year=${year}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Gagal mengambil data hari libur nasional');
  const data = await res.json();
  // Data: [{ holiday_date: '2025-03-29', ... }, ...]
  return new Set(data.map(item => item.holiday_date));
}

export function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // Minggu (0) atau Sabtu (6)
}

export function formatYMD(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Mengambil hari libur nasional dari tabel Supabase (national_holidays)
 * @param {number} year - Tahun yang diambil
 * @returns {Promise<Set<string>>} Set tanggal libur nasional (YYYY-MM-DD)
 */
export async function fetchNationalHolidaysFromDB(year) {
  const { data, error } = await supabase
    .from("national_holidays")
    .select("date")
    .eq("year", year);
  if (error) throw error;
  return new Set((data || []).map(item => item.date));
}

/**
 * Menghitung jumlah hari kerja antara dua tanggal (inklusif),
 * mengecualikan Sabtu, Minggu, dan hari libur nasional.
 * @param {string|Date} start
 * @param {string|Date} end
 * @param {Set<string>} holidays - Set tanggal libur nasional (YYYY-MM-DD)
 * @returns {number}
 */
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