# Perbaikan Logika Saldo Cuti dan Penangguhan - Implementasi Dinamis

## 🔍 Analisis Masalah

### Masalah yang Ditemukan Saat Pergantian Tahun (2025 → 2026):

1. **Saldo Tahun Baru Tidak Terinisialisasi Otomatis**
   - Saat tahun berganti, saldo cuti untuk tahun baru tidak dibuat otomatis
   - User harus manual membuat saldo untuk setiap pegawai

2. **Transfer Penangguhan Tidak Otomatis**
   - Sisa cuti tahun sebelumnya tidak otomatis ditransfer sebagai penangguhan
   - Harus input manual melalui dialog "Input Data Penangguhan"

3. **Perhitungan Saldo Tidak Akurat**
   - Logika perhitungan `usedFromDeferred` tidak tepat
   - Tidak mempertimbangkan `leave_quota_year` dengan benar
   - Perhitungan `remaining` bisa salah saat melihat tahun sebelumnya

4. **Logika Penangguhan Manual Tidak Validasi**
   - Bisa input penangguhan melebihi sisa cuti tahun sebelumnya
   - Tidak ada validasi maksimal hari yang bisa ditangguhkan

## ✅ Solusi yang Diterapkan

### 1. Utility Function untuk Perhitungan Saldo (`src/utils/leaveBalanceCalculator.js`)

**Fungsi Utama:**

#### `calculateLeaveBalance()`
- Menghitung saldo cuti dengan benar untuk tahun manapun
- Mempertimbangkan `leave_quota_year` dengan tepat
- Memisahkan penggunaan dari tahun berjalan vs penangguhan
- Menangani tahun sekarang, masa lalu, dan masa depan

#### `ensureLeaveBalance()`
- Memastikan saldo cuti ada untuk tahun tertentu
- Otomatis membuat saldo jika belum ada
- Otomatis transfer penangguhan dari tahun sebelumnya jika applicable
- Menggunakan deferral log jika ada (manual override)

#### `calculateDeferrableDays()`
- Menghitung hari yang bisa ditangguhkan dari tahun sebelumnya
- Formula: `(total + existing_deferred) - used`

#### `initializeYearBalances()`
- Inisialisasi saldo untuk semua pegawai untuk tahun baru
- Otomatis transfer penangguhan dari tahun sebelumnya
- Bisa dipanggil manual atau otomatis saat tahun berganti

### 2. Perbaikan LeaveHistoryPage (`src/pages/LeaveHistoryPage.jsx`)

**Perubahan:**
- Menggunakan `calculateLeaveBalance()` untuk perhitungan yang akurat
- Memanggil `ensureLeaveBalance()` untuk setiap pegawai sebelum fetch data
- Memastikan saldo tahun yang dipilih sudah ada sebelum dihitung
- Perhitungan dinamis berdasarkan tahun yang dipilih user

**Sebelum:**
```javascript
// Perhitungan manual, bisa salah
const usedFromDeferred = empTypeRequests
  .filter((lr) => {
    const quotaYear = lr.leave_quota_year || new Date(lr.start_date).getFullYear();
    return quotaYear < year; // ❌ Tidak tepat
  })
  .reduce((sum, lr) => sum + (lr.days_requested || 0), 0);
```

**Sesudah:**
```javascript
// Menggunakan utility function yang sudah diuji
const calculatedBalance = calculateLeaveBalance({
  dbBalance,
  leaveRequests: empLeaveRequests,
  leaveType,
  year,
  currentYear,
});
```

### 3. Perbaikan AddDeferredLeaveDialog (`src/components/leave_history/AddDeferredLeaveDialog.jsx`)

**Perubahan:**
- Validasi maksimal hari yang bisa ditangguhkan
- Menggunakan `calculateDeferrableDays()` untuk validasi
- Memastikan balance tahun target sudah ada sebelum update
- Update deferral log dengan benar

**Fitur Baru:**
- Validasi: tidak bisa input penangguhan melebihi sisa cuti tahun sebelumnya
- Auto-create balance jika belum ada
- Update atau create deferral log dengan benar

### 4. Hook Auto-Initialize (`src/hooks/useAutoInitializeBalances.js`)

**Fungsi:**
- Otomatis cek dan inisialisasi saldo saat aplikasi load
- Deteksi pergantian tahun dan auto-initialize
- Cek harian untuk memastikan tidak ada yang terlewat
- Digunakan di Layout component (top-level)

**Cara Kerja:**
1. Saat aplikasi load, cek apakah saldo tahun ini sudah ada
2. Jika belum ada, panggil `initializeYearBalances()`
3. Set up interval untuk cek harian
4. Jika tahun berganti, reset dan initialize lagi

## 🎯 Logika Perhitungan yang Benar

### Formula Saldo Cuti:

```
Total Saldo = total_days + deferred_days
Total Terpakai = used_from_current_year + used_from_deferred
Sisa = Total Saldo - Total Terpakai
```

### Transfer Penangguhan (Tahun N → Tahun N+1):

```
Sisa Tahun N = (total_days + deferred_days) - used_days
Penangguhan Tahun N+1 = Sisa Tahun N (jika can_defer = true)
```

### Penggunaan Cuti dengan leave_quota_year:

- **Tahun Berjalan**: `leave_quota_year === year_viewing`
- **Penangguhan**: `leave_quota_year < year_viewing` AND `start_date.year === year_viewing`

## 📋 Cara Kerja Sistem

### 1. Saat Aplikasi Dibuka (Auto-Initialize)
```
1. Layout component mount
2. useAutoInitializeBalances() hook run
3. Cek apakah saldo tahun ini sudah ada
4. Jika belum, initialize untuk semua pegawai
5. Transfer penangguhan otomatis dari tahun sebelumnya
```

### 2. Saat User Melihat Riwayat Cuti
```
1. User pilih tahun (misal: 2026)
2. LeaveHistoryPage fetch data
3. Untuk setiap pegawai:
   - ensureLeaveBalance() dipanggil
   - Jika saldo belum ada, dibuat otomatis
   - calculateLeaveBalance() untuk perhitungan
4. Tampilkan saldo yang akurat
```

### 3. Saat User Input Penangguhan
```
1. User buka dialog "Input Data Penangguhan"
2. System cek sisa cuti tahun sebelumnya
3. Validasi: input tidak boleh > sisa
4. Update balance tahun target
5. Update/create deferral log
```

## 🔧 File yang Dibuat/Diubah

### File Baru:
1. ✅ `src/utils/leaveBalanceCalculator.js` - Utility functions
2. ✅ `src/hooks/useAutoInitializeBalances.js` - Auto-initialize hook

### File Diubah:
1. ✅ `src/pages/LeaveHistoryPage.jsx` - Perbaikan logika perhitungan
2. ✅ `src/components/leave_history/AddDeferredLeaveDialog.jsx` - Validasi & logika
3. ✅ `src/components/Layout.jsx` - Tambah auto-initialize hook

## 🚀 Testing

### Test Case 1: Pergantian Tahun Otomatis
1. Set system date ke 1 Januari 2026
2. Buka aplikasi
3. ✅ Saldo tahun 2026 harus terbuat otomatis
4. ✅ Penangguhan dari 2025 harus ter-transfer

### Test Case 2: Lihat Tahun Sebelumnya
1. Pilih tahun 2025 di LeaveHistoryPage
2. ✅ Saldo harus tampil dengan benar
3. ✅ Perhitungan used_from_deferred harus akurat

### Test Case 3: Input Penangguhan
1. Buka dialog "Input Data Penangguhan" untuk tahun 2026
2. Coba input melebihi sisa tahun 2025
3. ✅ Harus ada validasi error
4. Input nilai yang valid
5. ✅ Saldo harus ter-update dengan benar

### Test Case 4: Perhitungan Saldo
1. Lihat saldo cuti tahun 2026
2. ✅ Total = total_days + deferred_days
3. ✅ Used = used_current + used_deferred
4. ✅ Remaining = Total - Used

## 📝 Catatan Penting

1. **Auto-Initialize**: Sistem akan otomatis initialize saldo saat tahun berganti
2. **Manual Override**: Deferral log bisa override perhitungan otomatis
3. **Validasi**: Input penangguhan divalidasi tidak boleh melebihi sisa
4. **Dinamis**: Semua perhitungan menggunakan tahun saat ini, bukan hardcoded

## 🔄 Migrasi Data (Jika Diperlukan)

Jika ada data lama yang perlu diperbaiki, jalankan:

```sql
-- Initialize balances for current year for all employees
SELECT initialize_leave_balance_for_new_year(employee_id, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER)
FROM employees;
```

---

**Tanggal Implementasi**: 2025-01-27
**Status**: ✅ Selesai - Sistem Dinamis dan Siap untuk Pergantian Tahun
