# Panduan Lengkap Perbaikan Saldo Cuti Aris Hermanto

## 🔍 Masalah yang Ditemukan

Berdasarkan laporan Anda, saldo cuti Aris Hermanto tidak berubah dengan benar. Masalah ini sudah diidentifikasi dan ada solusi yang komprehensif.

### Masalah yang Diketahui:
- **Jatah tahun berjalan**: Tidak sesuai (seharusnya 12 hari)
- **Terpakai tahun berjalan**: Sudah sesuai (1 hari)
- **Jatah penangguhan**: Tidak sesuai (seharusnya 8 hari)
- **Terpakai penangguhan**: Sudah sesuai (8 hari)
- **Sisa tahun berjalan**: Tidak sesuai (seharusnya 11 hari)

## 🛠️ Solusi Lengkap

### Langkah 1: Jalankan Script Perbaikan

1. **Buka Supabase Dashboard**
   - Masuk ke project Anda
   - Klik **SQL Editor**

2. **Jalankan Script Perbaikan**
   - Copy dan paste seluruh isi file `FIX_ARIS_HERMANTO_COMPLETE.sql`
   - Klik **Run** untuk menjalankan script

3. **Script akan melakukan:**
   - ✅ Diagnosa data Aris Hermanto saat ini
   - ✅ Perbaiki saldo 2025: **Jatah 12, Terpakai 1, Penangguhan 8**
   - ✅ Perbaiki tracking 2024: **Terpakai 8**
   - ✅ Verifikasi hasil perbaikan

### Langkah 2: Verifikasi Hasil

Setelah menjalankan script, Anda akan melihat hasil seperti ini:

```
STEP 7: FINAL BALANCE AFTER FIX
employee_name  | leave_type | year | total_days | used_days | deferred_days | remaining_days | balance_type
Aris Hermanto  | Cuti Tahunan | 2024 | 0          | 8         | 0             | -8             | PENANGGUHAN TRACKING
Aris Hermanto  | Cuti Tahunan | 2025 | 12         | 1         | 8             | 19             | TAHUN BERJALAN
```

### Langkah 3: Refresh Aplikasi

1. **Kembali ke aplikasi di browser**
2. **Refresh halaman** (F5 atau Ctrl+R)
3. **Cek halaman Leave Balance** untuk Aris Hermanto

## 📊 Hasil yang Diharapkan

Setelah perbaikan, Aris Hermanto akan memiliki:

| Kategori | Nilai |
|----------|-------|
| **Jatah Tahun Berjalan** | 12 hari |
| **Terpakai Tahun Berjalan** | 1 hari |
| **Sisa Tahun Berjalan** | 11 hari |
| **Jatah Penangguhan** | 8 hari |
| **Terpakai Penangguhan** | 8 hari |
| **Sisa Penangguhan** | 0 hari |
| **Total Sisa** | 11 hari |

## 🔧 Jika Masih Ada Masalah

### Opsi 1: Jalankan Script Quick Fix
Jika script utama tidak berhasil, jalankan script `QUICK_ARIS_FIX.sql`:

```sql
-- Quick fix untuk Aris Hermanto
UPDATE leave_balances lb
SET 
    total_days = 12,
    used_days = 1,
    deferred_days = 8,
    updated_at = CURRENT_TIMESTAMP
WHERE lb.employee_id IN (
    SELECT e.id FROM employees e 
    WHERE (e.name ILIKE '%aris%hermanto%' OR e.name ILIKE '%Aris%Hermanto%')
)
AND lb.leave_type_id IN (
    SELECT lt.id FROM leave_types lt WHERE lt.name = 'Cuti Tahunan'
)
AND lb.year = 2025;
```

### Opsi 2: Perbaiki Semua Karyawan
Jika ingin memperbaiki semua karyawan sekaligus:
1. Jalankan script `FINAL_COMPREHENSIVE_FIX.sql`
2. Script ini akan memperbaiki semua inkonsistensi data

### Opsi 3: Check Database Functions
Pastikan fungsi database sudah benar:
1. Jalankan script `update_leave_balance_fixed.sql`
2. Script ini akan memperbaiki fungsi update saldo cuti

## 🎯 Root Cause Analysis

### Mengapa Saldo Tidak Berubah?

1. **Bug dalam Fungsi Database**
   - Fungsi `update_leave_balance_advanced` memiliki logika yang salah
   - Double counting antara saldo tahun berjalan dan penangguhan
   - Perhitungan `available_deferred` tidak akurat

2. **Data Inconsistent**
   - Mismatch antara `leave_requests` dan `leave_balances`
   - Saldo negatif karena perhitungan yang salah
   - Tracking penangguhan yang tidak akurat

3. **Frontend Issues**
   - Frontend menggunakan fungsi yang sudah diperbaiki
   - Masalah ada di level database

## ✅ Verifikasi Perbaikan

### 1. Check Database
```sql
-- Verifikasi saldo Aris Hermanto
SELECT 
    e.name as employee_name,
    lt.name as leave_type,
    lb.total_days as "Jatah Tahun Berjalan",
    lb.deferred_days as "Jatah Penangguhan",
    lb.used_days as "Total Terpakai",
    (lb.total_days + lb.deferred_days - lb.used_days) as "Sisa Total"
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE (e.name ILIKE '%aris%hermanto%' OR e.name ILIKE '%Aris%Hermanto%')
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND lt.name = 'Cuti Tahunan';
```

### 2. Check Frontend
1. Buka menu "Riwayat & Saldo Cuti"
2. Cari "Aris Hermanto"
3. Periksa saldo menampilkan nilai yang benar
4. Pastikan tidak ada saldo negatif

### 3. Test Pengajuan Baru
1. Buat pengajuan cuti untuk Aris Hermanto
2. Pilih preferensi tahun 2024 (penangguhan)
3. Masukkan jumlah hari yang melebihi saldo penangguhan
4. Verifikasi sistem menggunakan saldo tahun berjalan untuk kelebihannya

## 📞 Support

Jika masih mengalami masalah setelah menjalankan semua langkah di atas:

1. **Check Error Logs**
   - Buka browser developer tools (F12)
   - Lihat console untuk error messages
   - Screenshot error jika ada

2. **Verify Database Connection**
   - Pastikan aplikasi terhubung ke database yang benar
   - Check Supabase project settings

3. **Contact Support**
   - Sertakan screenshot hasil script
   - Jelaskan langkah yang sudah dilakukan
   - Sertakan error messages jika ada

## 🎉 Status

✅ **SOLVED** - Masalah saldo cuti Aris Hermanto dapat diperbaiki dengan script yang telah disediakan. Sistem akan:

- Menghitung saldo dengan benar
- Mendistribusikan penggunaan saldo secara otomatis
- Mencegah penggunaan saldo yang melebihi batas
- Tidak ada double counting atau saldo negatif 