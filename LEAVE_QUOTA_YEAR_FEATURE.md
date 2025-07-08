# Fitur Jatah Cuti Tahun dan Saldo Cuti Terpisah

## Ringkasan Perubahan

Telah ditambahkan fitur baru untuk mengelola jatah cuti berdasarkan tahun dan memisahkan saldo cuti tahun berjalan dengan saldo cuti penangguhan.

## Fitur Baru

### 1. Field Baru pada Form Pengajuan Cuti

- **Jatah Cuti Tahun**: Dropdown untuk memilih tahun jatah cuti yang digunakan
  - Tahun Berjalan (2025): Menggunakan saldo cuti normal
  - Tahun Sebelumnya (2024): Menggunakan saldo cuti penangguhan
- **Tanggal Formulir Pengajuan Cuti**: Field tanggal untuk mencatat kapan formulir diajukan

### 2. Logika Saldo Cuti

- **Saldo Tahun Berjalan**: Jatah cuti normal untuk tahun yang sedang berjalan
- **Saldo Penangguhan**: Jatah cuti yang ditangguhkan dari tahun sebelumnya
- **Pemisahan Penggunaan**: Sistem melacak penggunaan terpisah untuk setiap jenis saldo

### 3. Tampilan Saldo Cuti

Tampilan saldo cuti di halaman "Riwayat & Saldo Cuti" kini menampilkan:

- Total terpakai dan tersedia
- Saldo tahun berjalan (terpisah)
- Saldo penangguhan (jika ada)
- Total sisa keseluruhan

## Perubahan Database

### Tabel `leave_requests`

Ditambahkan kolom baru:

```sql
ALTER TABLE leave_requests
ADD COLUMN leave_quota_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);

ALTER TABLE leave_requests
ADD COLUMN application_form_date DATE DEFAULT CURRENT_DATE;
```

### Stored Procedure

Updated `update_leave_balance()` function untuk menangani:

- Logika tahun jatah cuti
- Pemisahan saldo tahun berjalan vs penangguhan
- Auto-create balance records jika tidak ada

## File yang Dimodifikasi

1. **src/components/leave_requests/LeaveRequestForm.jsx**
   - Tambah field UI untuk jatah cuti tahun dan tanggal formulir
   - Update logika submit untuk menggunakan tahun jatah cuti
   - Visual indicator untuk jenis saldo yang digunakan

2. **src/components/leave_history/LeaveHistoryEmployeeCard.jsx**
   - Update tampilan saldo untuk memisahkan tahun berjalan dan penangguhan
   - Tampilan detail penggunaan per jenis saldo

3. **src/pages/LeaveHistoryPage.jsx**
   - Update fetch data untuk menghitung penggunaan terpisah
   - Logika pemisahan berdasarkan `leave_quota_year`

## File SQL yang Perlu Dijalankan

1. **add_leave_request_fields.sql**: Menambah kolom baru ke tabel
2. **update_leave_balance_function.sql**: Update stored procedure

## Cara Penggunaan

### Untuk Admin/HR:

1. **Buat Pengajuan Cuti Baru**:
   - Pilih pegawai dan jenis cuti
   - Pilih "Jatah Cuti Tahun":
     - 2025 → menggunakan saldo tahun berjalan
     - 2024 → menggunakan saldo penangguhan
   - Isi tanggal formulir pengajuan

2. **Lihat Saldo Cuti**:
   - Buka menu "Riwayat & Saldo Cuti"
   - Lihat detail saldo yang terpisah per jenis

### Untuk Sistem:

- Saldo akan otomatis terpotong dari jenis yang sesuai
- Jika menggunakan tahun sebelumnya, sistem menggunakan saldo penangguhan
- Tracking penggunaan dipisah berdasarkan tahun jatah cuti

## Validasi dan Error Handling

- Form akan menampilkan peringatan jika menggunakan saldo penangguhan
- Sistem tetap berfungsi dengan data existing (backward compatible)
- Default values untuk data yang tidak lengkap

## Catatan Penting

1. **Migrasi Data**: Data existing akan otomatis mendapat nilai default
2. **Backup**: Pastikan backup database sebelum menjalankan script SQL
3. **Testing**: Test dengan data sample sebelum production

## Benefit

- **Transparansi**: Pegawai dan admin dapat melihat penggunaan saldo yang jelas
- **Akurasi**: Tracking yang lebih detail untuk jenis saldo yang digunakan
- **Compliance**: Sesuai dengan aturan cuti yang membolehkan penangguhan
- **Reporting**: Data lebih lengkap untuk keperluan laporan
