# ✅ Checklist Verifikasi Implementasi Migration

## 🎯 **Langkah-langkah Testing**

### **1. Test Form Pengajuan Cuti**

**Navigasi:** Menu "Pengajuan Cuti" → Klik "+ Buat Pengajuan Baru"

**Yang Harus Ada:**

- [ ] ✅ Field "Jatah Cuti Tahun" dengan dropdown
- [ ] ✅ Opsi: "2025 (Tahun Berjalan)" dan "2024 (Penangguhan)"
- [ ] ✅ Field "Tanggal Formulir Pengajuan Cuti"
- [ ] ✅ Visual indicator hijau/kuning berdasarkan pilihan tahun
- [ ] ✅ Validasi: tidak bisa pilih tahun > 2025 atau < 2024

**Test Case:**

1. Pilih pegawai dan jenis cuti
2. Coba ubah "Jatah Cuti Tahun" ke 2024 → Muncul peringatan kuning
3. Coba ubah "Jatah Cuti Tahun" ke 2025 → Muncul konfirmasi hijau
4. Submit form → Berhasil tanpa error

### **2. Test Dashboard Saldo Cuti**

**Navigasi:** Menu "Riwayat & Saldo Cuti"

**Yang Harus Ada:**

- [ ] ✅ Message hijau: "Migration database berhasil!"
- [ ] ✅ Setiap kartu pegawai menampilkan pemisahan saldo:
  - [ ] "Saldo 2025" (tahun berjalan)
  - [ ] "Saldo Penangguhan" (jika ada)
  - [ ] "Total Sisa" (gabungan)
- [ ] ✅ Progress bar dan angka yang akurat

### **3. Test Database Integration**

**Buka browser console (F12) dan jalankan:**

```javascript
// Test 1: Cek kolom database
await supabase
  .from("leave_requests")
  .select("leave_quota_year, application_form_date")
  .limit(1);

// Test 2: Cek data tersimpan
await supabase
  .from("leave_requests")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(5);
```

**Yang Harus Ada:**

- [ ] ✅ Query berhasil tanpa error "column does not exist"
- [ ] ✅ Data baru memiliki nilai `leave_quota_year` dan `application_form_date`

### **4. Test Logic Saldo Cuti**

**Scenario Testing:**

1. **Buat cuti dengan jatah 2025:**
   - [ ] Saldo 2025 berkurang
   - [ ] Saldo penangguhan tidak berubah

2. **Buat cuti dengan jatah 2024:**
   - [ ] Saldo penangguhan berkurang
   - [ ] Saldo 2025 tidak berubah

### **5. Test UI/UX**

**Responsivitas:**

- [ ] ✅ Form mobile-friendly
- [ ] ✅ Field baru tidak break layout
- [ ] ✅ Dropdown berfungsi di semua device

**User Experience:**

- [ ] ✅ Tooltip/helper text jelas
- [ ] ✅ Error message informatif
- [ ] ✅ Loading states berfungsi
- [ ] ✅ Success notifications muncul

## 🚨 **Jika Ada Error**

### **Error "column does not exist"**

- Migration belum jalan atau gagal
- Cek di Supabase SQL Editor: `SELECT * FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name IN ('leave_quota_year', 'application_form_date')`

### **Field tidak muncul di form**

- Cek browser console untuk error
- Refresh halaman
- Cek network tab untuk failed requests

### **Saldo tidak update dengan benar**

- Cek function `update_leave_balance` di Supabase
- Cek logs di browser console

## 🎉 **Jika Semua ✅**

**Fitur yang Harus Berfungsi:**

1. ✅ Form dengan field baru
2. ✅ Pemisahan saldo akurat
3. ✅ Database menyimpan data baru
4. ✅ Logic tahun jatah cuti bekerja
5. ✅ UI responsive dan user-friendly

## 📊 **Test Data Suggestion**

**Buat pengajuan cuti dengan scenario:**

- Pegawai A: 3 hari cuti tahunan dengan jatah 2025
- Pegawai B: 2 hari cuti tahunan dengan jatah 2024
- Pegawai C: 1 hari cuti sakit dengan jatah 2025

**Lalu cek di dashboard apakah saldo terpotong dengan benar sesuai jatah yang dipilih.**

## 🔧 **Debug Tools**

Run test script di browser console:

```javascript
// Copy-paste isi file test_migration_features.js
```

Ini akan otomatis test semua fitur dan beri laporan lengkap.
