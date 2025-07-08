import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import { countWorkingDays, fetchNationalHolidaysFromDB } from './src/utils/workingDays.node.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

async function main() {
  const { data: leaves, error } = await supabase.from('leave_requests').select('*');
  if (error) throw error;
  let updated = 0;

  for (const leave of leaves) {
    if (!leave.start_date || !leave.end_date) continue;
    const year = new Date(leave.start_date).getFullYear();
    let holidays;
    try {
      holidays = await fetchNationalHolidaysFromDB(year);
    } catch (e) {
      console.warn(`Gagal fetch hari libur nasional untuk tahun ${year}:`, e.message);
      holidays = new Set();
    }
    // Perhitungan hari kerja exclude Sabtu, Minggu, dan hari libur nasional
    const correctDays = countWorkingDays(leave.start_date, leave.end_date, holidays);
    if (leave.days_requested !== correctDays) {
      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({ days_requested: correctDays })
        .eq('id', leave.id);
      if (!updateError) {
        updated++;
        console.log(`Updated leave id ${leave.id}: ${leave.days_requested} -> ${correctDays}`);
      } else {
        console.error(`Gagal update leave id ${leave.id}:`, updateError.message);
      }
    }
  }
  console.log(`Selesai. Total data cuti yang diperbaiki: ${updated}`);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
}); 