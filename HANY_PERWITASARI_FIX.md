# Perbaikan Khusus Saldo Cuti Hany Perwitasari, S.T., M.Sc.

## Masalah:
- Saldo cuti sakit Hany Perwitasari tidak tampil
- Pegawai lain sudah memiliki saldo cuti sakit yang normal
- Hanya Hany Perwitasari yang bermasalah

## Solusi:

### Langkah 1: Jalankan Script SQL di Supabase

**Buka Supabase SQL Editor dan jalankan script ini:**

```sql
-- Fix all leave types for Hany Perwitasari specifically
WITH hany_employee AS (
    SELECT id FROM employees 
    WHERE name ILIKE '%hany%perwitasari%' 
       OR name ILIKE '%perwitasari%hany%'
       OR name ILIKE '%Hany%Perwitasari%'
       OR name ILIKE '%HANY%PERWITASARI%'
    LIMIT 1
)
INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days, deferred_days)
SELECT 
    h.id as employee_id,
    lt.id as leave_type_id,
    EXTRACT(YEAR FROM CURRENT_DATE) as year,
    lt.default_days as total_days,
    0 as used_days,
    0 as deferred_days
FROM hany_employee h
CROSS JOIN leave_types lt
WHERE NOT EXISTS (
    SELECT 1 FROM leave_balances lb 
    WHERE lb.employee_id = h.id 
    AND lb.leave_type_id = lt.id 
    AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
);
```

### Langkah 2: Verifikasi di Database

Jalankan query ini untuk memastikan data sudah dibuat:

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
4. Periksa apakah ada error

## Hasil yang Diharapkan:

Setelah menjalankan script, Hany Perwitasari seharusnya memiliki:
- **Cuti Tahunan**: 12 hari
- **Cuti Sakit**: 12 hari ✅
- **Cuti Alasan Penting**: 30 hari
- **Cuti Besar**: 60 hari
- **Cuti Melahirkan**: 90 hari

## Troubleshooting:

### Jika script tidak menemukan Hany:
1. Periksa nama yang tepat di database
2. Coba query: `SELECT * FROM employees WHERE name ILIKE '%hany%' OR name ILIKE '%perwitasari%';`

### Jika masih tidak tampil di aplikasi:
1. Pastikan tahun yang dipilih adalah 2025
2. Coba refresh halaman beberapa kali
3. Periksa console browser untuk error

### Jika ada error di console:
1. Periksa apakah leave_types memiliki default_days yang benar
2. Pastikan semua jenis cuti ada di database 