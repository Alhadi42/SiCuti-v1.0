# Fix: Integrasi Variabel Berindeks {tanggal_formulir_pengajuan_1} - {tanggal_formulir_pengajuan_30}

## Masalah yang Diperbaiki

Variabel berindeks `{tanggal_formulir_pengajuan_1}` sampai dengan `{tanggal_formulir_pengajuan_30}` untuk menu "Buat Surat Batch" sebelumnya menggunakan tanggal aktual hari ini (`new Date().toISOString()`) alih-alih menggunakan data dari field database "Tanggal Formulir Pengajuan Cuti" (`application_form_date`).

## Root Cause

Dalam fungsi `getLetterData()` di file `DocxSuratKeterangan.jsx` dan `SuratKeterangan.jsx`, variabel `tanggal_formulir_pengajuan` diisi menggunakan logika:

```javascript
// SEBELUM (SALAH)
tanggal_formulir_pengajuan: formatDateLong(
  leaveRequest.created_at ||
    leaveRequest.tanggal_pengajuan ||
    new Date().toISOString(), // ← Fallback ke tanggal hari ini
),

// SESUDAH (BENAR)
tanggal_formulir_pengajuan: formatDateLong(
  leaveRequest.application_form_date || // ← Prioritas utama
    leaveRequest.created_at ||
    leaveRequest.tanggal_pengajuan ||
    new Date().toISOString(),
),
```

## File yang Dimodifikasi

### 1. `src/pages/DocxSuratKeterangan.jsx`
- **Baris 689**: Update logika `tanggal_formulir_pengajuan` dalam API response format
- **Baris 764**: Update logika `tanggal_formulir_pengajuan` dalam form data format

### 2. `src/pages/SuratKeterangan.jsx`
- **Baris 592**: Update logika `tanggal_formulir_pengajuan` dalam API response format  
- **Baris 642**: Update logika `tanggal_formulir_pengajuan` dalam form data format

## Perubahan yang Dilakukan

### Prioritas Data (dari tertinggi ke terendah):

1. **`leaveRequest.application_form_date`** - Field database "Tanggal Formulir Pengajuan Cuti"
2. **`leaveRequest.created_at`** - Timestamp pembuatan record
3. **`leaveRequest.tanggal_pengajuan`** - Field legacy (jika ada)
4. **`new Date().toISOString()`** - Tanggal hari ini (fallback terakhir)

### Dampak pada Variabel Berindeks

Sekarang variabel berindeks `{tanggal_formulir_pengajuan_1}` sampai `{tanggal_formulir_pengajuan_30}` akan:

- ✅ Menggunakan data dari field `application_form_date` yang diisi pada form input data cuti
- ✅ Menampilkan tanggal yang sesuai dengan tanggal formulir pengajuan yang sebenarnya
- ✅ Tidak lagi menggunakan tanggal aktual hari ini secara default

## Verifikasi Perubahan

### 1. Test Form Pengajuan Cuti
1. Buka menu "Pengajuan Cuti"
2. Buat pengajuan baru dengan tanggal formulir yang berbeda dari hari ini
3. Simpan data

### 2. Test Surat Batch
1. Buka menu "Buat Surat" → "DOCX"
2. Pilih mode "Batch"
3. Pilih template yang menggunakan variabel `{tanggal_formulir_pengajuan_1}`
4. Pilih pegawai yang sudah memiliki data cuti
5. Generate surat batch
6. Verifikasi bahwa tanggal formulir pengajuan sesuai dengan data yang diinput

### 3. Test Database Integration
```sql
-- Cek data di database
SELECT 
  id,
  employee_id,
  start_date,
  application_form_date,
  created_at
FROM leave_requests 
ORDER BY created_at DESC 
LIMIT 5;
```

## Komponen yang Tidak Perlu Diubah

### 1. `LeaveRequestForm.jsx`
- Sudah menggunakan field `application_form_date` dengan benar
- Data tersimpan ke database dengan field yang tepat

### 2. `DocxFormFiller.jsx`
- Sudah menggunakan `enhancedAutoFillData.tanggal_formulir_pengajuan` dengan benar
- Auto-fill berfungsi dengan baik

### 3. Database Schema
- Field `application_form_date` sudah ada dan berfungsi
- Migration sudah selesai

## Testing Checklist

- [ ] ✅ Build aplikasi berhasil tanpa error
- [ ] ✅ Form pengajuan cuti menyimpan `application_form_date` dengan benar
- [ ] ✅ Variabel `{tanggal_formulir_pengajuan_1}` menampilkan data dari database
- [ ] ✅ Variabel berindeks 1-30 semua menggunakan data yang benar
- [ ] ✅ Fallback ke `created_at` jika `application_form_date` kosong
- [ ] ✅ Fallback ke tanggal hari ini hanya jika semua field lain kosong

## Catatan Penting

1. **Backward Compatibility**: Perubahan ini tetap mendukung data lama yang mungkin tidak memiliki `application_form_date`
2. **Fallback Chain**: Sistem akan mencari data secara berurutan sesuai prioritas
3. **No Breaking Changes**: Tidak ada perubahan yang merusak fungsionalitas existing

## Status

✅ **FIXED** - Variabel berindeks `{tanggal_formulir_pengajuan_1}` sampai `{tanggal_formulir_pengajuan_30}` sekarang terintegrasi dengan field database `application_form_date` dan tidak lagi menggunakan tanggal aktual hari ini secara default. 