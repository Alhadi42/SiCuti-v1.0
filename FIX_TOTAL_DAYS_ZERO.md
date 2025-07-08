# Perbaikan Total Days = 0 untuk Hany Perwitasari

## Masalah:
- Total days saldo cuti sakit Hany Perwitasari masih 0
- Meskipun sudah ada record di database, total_days tidak terisi dengan benar

## Solusi:

### Langkah 1: Jalankan Script SQL di Supabase

**Buka Supabase SQL Editor dan jalankan script ini:**

```sql
-- Fix all leave types total_days for Hany Perwitasari
-- Update all Hany's leave balances with correct total_days
UPDATE leave_balances 
SET total_days = CASE 
    WHEN lt.name = 'Cuti Tahunan' THEN 12
    WHEN lt.name = 'Cuti Sakit' THEN 12
    WHEN lt.name = 'Cuti Alasan Penting' THEN 30
    WHEN lt.name = 'Cuti Besar' THEN 60
    WHEN lt.name = 'Cuti Melahirkan' THEN 90
    ELSE lb.total_days
END
FROM employees e, leave_types lt
WHERE lb.employee_id = e.id 
  AND lb.leave_type_id = lt.id
  AND (e.name ILIKE '%hany%perwitasari%' 
       OR e.name ILIKE '%perwitasari%hany%'
       OR e.name ILIKE '%Hany%Perwitasari%'
       OR e.name ILIKE '%HANY%PERWITASARI%')
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND lb.total_days = 0;
```

### Langkah 2: Verifikasi di Database

Jalankan query ini untuk memastikan total_days sudah benar:

```sql
SELECT 
    e.name as employee_name,
    lt.name as leave_type,
    lb.total_days,
    lb.used_days,
    lb.deferred_days,
    (lb.total_days + lb.deferred_days - lb.used_days) as remaining_days
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE (e.name ILIKE '%hany%perwitasari%' 
   OR e.name ILIKE '%perwitasari%hany%'
   OR e.name ILIKE '%Hany%Perwitasari%')
   AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY lt.name;
```

### Langkah 3: Refresh Aplikasi

1. Buka browser
2. Refresh halaman `http://localhost:5173/`
3. Buka menu "Riwayat & Saldo Cuti"
4. Cari "Hany Perwitasari"

### Langkah 4: Debug di Browser

Jika masih tidak tampil:
1. Buka Developer Tools (F12)
2. Lihat Console
3. Cari log yang dimulai dengan "🔍 DEBUG - Hany"
4. Periksa nilai "DB Balance total_days" dan "Final total value"

## Hasil yang Diharapkan:

Setelah menjalankan script, Hany Perwitasari seharusnya memiliki:
- **Cuti Tahunan**: 12 hari (total_days = 12)
- **Cuti Sakit**: 12 hari (total_days = 12) ✅
- **Cuti Alasan Penting**: 30 hari (total_days = 30)
- **Cuti Besar**: 60 hari (total_days = 60)
- **Cuti Melahirkan**: 90 hari (total_days = 90)

## Troubleshooting:

### Jika total_days masih 0 di database:
1. Periksa apakah script UPDATE berhasil dijalankan
2. Coba jalankan script INSERT untuk membuat record baru
3. Periksa apakah ada constraint yang mencegah update

### Jika total_days sudah benar di database tapi tidak tampil di aplikasi:
1. Periksa console browser untuk error
2. Pastikan aplikasi mengambil data terbaru
3. Coba refresh halaman beberapa kali

### Jika ada error di console:
1. Periksa apakah leave_types memiliki default_days yang benar
2. Pastikan semua jenis cuti ada di database
3. Periksa apakah ada masalah dengan key mapping 