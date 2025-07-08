# Panduan Cepat Perbaikan Saldo Cuti

## Masalah yang Diperbaiki:
1. ✅ Progress bar sudah dikembalikan ke versi sederhana (bukan animasi tabung)
2. 🔧 Jatah cuti sakit, alasan penting, besar, dan melahirkan belum tampil
3. 🔧 Perlu membuat record saldo cuti untuk semua pegawai

## Langkah Perbaikan:

### 1. Jalankan Script SQL di Supabase (PENTING!)

**Buka Supabase SQL Editor dan jalankan script ini secara berurutan:**

#### Script 1: `fix_leave_types_default_days.sql`
```sql
-- Update default days untuk semua jenis cuti
UPDATE leave_types SET default_days = 12 WHERE name = 'Cuti Sakit';
UPDATE leave_types SET default_days = 30 WHERE name = 'Cuti Alasan Penting';
UPDATE leave_types SET default_days = 60 WHERE name = 'Cuti Besar';
UPDATE leave_types SET default_days = 90 WHERE name = 'Cuti Melahirkan';
```

#### Script 2: `create_missing_leave_balances.sql`
```sql
-- Buat record saldo cuti untuk semua pegawai
INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days, deferred_days)
SELECT 
    e.id as employee_id,
    lt.id as leave_type_id,
    EXTRACT(YEAR FROM CURRENT_DATE) as year,
    lt.default_days as total_days,
    0 as used_days,
    0 as deferred_days
FROM employees e
CROSS JOIN leave_types lt
WHERE NOT EXISTS (
    SELECT 1 FROM leave_balances lb 
    WHERE lb.employee_id = e.id 
    AND lb.leave_type_id = lt.id 
    AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
);
```

### 2. Refresh Aplikasi
1. Buka browser
2. Refresh halaman `http://localhost:5173/`
3. Buka menu "Riwayat & Saldo Cuti"

### 3. Verifikasi Hasil
Untuk **Hany Perwitasari, S.T., M.Sc.** seharusnya sekarang menampilkan:
- **Cuti Sakit**: 12 hari jatah
- **Cuti Alasan Penting**: 30 hari jatah  
- **Cuti Besar**: 60 hari jatah
- **Cuti Melahirkan**: 90 hari jatah
- **Progress bar**: Berwarna biru dengan animasi sederhana

## Troubleshooting:

### Jika masih tidak tampil:
1. Buka Developer Tools (F12)
2. Lihat Console untuk debug log
3. Pastikan script SQL berhasil dijalankan
4. Coba refresh halaman beberapa kali

### Jika ada error:
1. Periksa apakah semua jenis cuti ada di database
2. Pastikan tahun yang dipilih adalah 2025
3. Coba cari pegawai lain untuk memastikan masalahnya spesifik

## File yang Sudah Diperbaiki:
- ✅ `src/pages/LeaveHistoryPage.jsx` - Update default days dan logika perhitungan
- ✅ `src/components/leave_history/LeaveHistoryEmployeeCard.jsx` - Kembalikan progress bar sederhana
- ✅ Script SQL untuk update database 