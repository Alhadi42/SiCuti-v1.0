# Panduan Migrasi Database - Fitur Jatah Cuti Tahun

## ⚠️ Error yang Anda Alami

Error: `column leave_requests.leave_quota_year does not exist`

Ini berarti fitur baru belum diaktifkan di database. Ikuti langkah berikut untuk mengaktifkannya.

## 🔧 Cara Mengatasi (untuk Administrator)

### Langkah 1: Cek Status Database

1. Buka **Supabase Dashboard**
2. Masuk ke **SQL Editor**
3. Jalankan script ini untuk cek status:

```sql
-- Cek apakah kolom baru sudah ada
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'leave_requests'
  AND column_name IN ('leave_quota_year', 'application_form_date');
```

### Langkah 2: Jalankan Migration (jika diperlukan)

Jika query di atas tidak mengembalikan hasil, jalankan script berikut:

```sql
-- Tambah kolom baru ke tabel leave_requests
ALTER TABLE leave_requests
ADD COLUMN IF NOT EXISTS leave_quota_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);

ALTER TABLE leave_requests
ADD COLUMN IF NOT EXISTS application_form_date DATE DEFAULT CURRENT_DATE;

-- Tambah komentar untuk dokumentasi
COMMENT ON COLUMN leave_requests.leave_quota_year IS 'Tahun jatah cuti yang digunakan';
COMMENT ON COLUMN leave_requests.application_form_date IS 'Tanggal formulir pengajuan cuti';

-- Update data yang sudah ada
UPDATE leave_requests
SET leave_quota_year = EXTRACT(YEAR FROM start_date)
WHERE leave_quota_year IS NULL;

UPDATE leave_requests
SET application_form_date = COALESCE(submitted_date::date, start_date, CURRENT_DATE)
WHERE application_form_date IS NULL;
```

### Langkah 3: Verifikasi

Setelah menjalankan migration, cek lagi:

```sql
-- Verifikasi kolom sudah ada
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'leave_requests'
  AND column_name IN ('leave_quota_year', 'application_form_date');
```

## 🚀 Setelah Migration

1. **Refresh halaman aplikasi** - field baru akan muncul otomatis
2. **Fitur yang tersedia**:
   - Pilihan tahun jatah cuti (tahun berjalan vs penangguhan)
   - Input tanggal formulir pengajuan
   - Pemisahan saldo cuti di dashboard

## 🔄 Backward Compatibility

Aplikasi tetap berfungsi bahkan sebelum migration:

- ✅ Form cuti tetap bisa disubmit
- ✅ Data existing tetap aman
- ✅ Notifikasi muncul jika fitur belum aktif

## 📁 File yang Tersedia

- `add_leave_request_fields.sql` - Script migration lengkap
- `check_database_migration.sql` - Script untuk cek status
- `update_leave_balance_function.sql` - Update stored procedure

## 💡 Tips

- Backup database sebelum menjalankan migration
- Test di environment development dulu jika memungkinkan
- Migration ini aman dan tidak mengubah data existing
