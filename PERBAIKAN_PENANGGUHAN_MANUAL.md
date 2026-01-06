# Perbaikan: Saldo Penangguhan Hanya dari Input Manual

## 🔍 Masalah yang Diperbaiki

**Masalah**: Saldo penangguhan otomatis dihitung dari sisa cuti tahun sebelumnya, padahal seharusnya hanya muncul jika sudah di-input manual melalui menu "Input Data Penangguhan".

**Dampak**:
- Saldo penangguhan muncul otomatis meskipun belum di-input
- Tidak sesuai dengan workflow: penangguhan harus di-input manual terlebih dahulu
- User tidak punya kontrol penuh atas data penangguhan

## ✅ Solusi yang Diterapkan

### Prinsip Baru:
**Saldo penangguhan (deferred_days) HANYA muncul jika:**
1. Ada entry di tabel `leave_deferrals` (input manual)
2. Jika tidak ada entry, `deferred_days = 0`

**TIDAK lagi:**
- ❌ Otomatis menghitung dari sisa tahun sebelumnya
- ❌ Otomatis transfer penangguhan saat initialize balance

### 1. Perbaikan `ensureLeaveBalance()` (`src/utils/leaveBalanceCalculator.js`)

**Sebelum:**
```javascript
// Otomatis menghitung dari sisa tahun sebelumnya
if (previousBalance) {
  deferredDays = calculateDeferrableDays(previousBalance);
  
  // Check deferral log
  if (deferralLog) {
    deferredDays = deferralLog.days_deferred; // Override
  }
}
```

**Sesudah:**
```javascript
// HANYA cek deferral log (input manual)
// Jika tidak ada deferral log, deferred_days = 0
if (yearNum === currentYear && leaveType.can_defer && previousYear >= 2020) {
  const { data: deferralLog } = await supabase
    .from('leave_deferrals')
    .select('days_deferred')
    .eq('employee_id', employeeId)
    .eq('year', previousYear)
    .single();
  
  // Only use deferral log if it exists (manual input)
  if (deferralLog && deferralLog.days_deferred != null) {
    deferredDays = deferralLog.days_deferred;
  }
  // If no deferral log, deferredDays remains 0
}
```

### 2. Perbaikan `initializeYearBalances()` (`src/utils/leaveBalanceCalculator.js`)

**Sebelum:**
```javascript
// Otomatis menghitung dari previous balance
if (previousBalance) {
  deferredDays = calculateDeferrableDays(previousBalance);
  
  // Check deferral log
  if (deferralLog) {
    deferredDays = deferralLog.days_deferred; // Override
  }
}
```

**Sesudah:**
```javascript
// HANYA cek deferral log (input manual)
// Tidak lagi menghitung dari previous balance
if (leaveType.can_defer && previousYear >= 2020) {
  const { data: deferralLog } = await supabase
    .from('leave_deferrals')
    .select('days_deferred')
    .eq('employee_id', employee.id)
    .eq('year', previousYear)
    .single();
  
  // Only use deferral log if it exists (manual input)
  if (deferralLog && deferralLog.days_deferred != null) {
    deferredDays = deferralLog.days_deferred;
  }
  // If no deferral log, deferredDays remains 0
}
```

### 3. Fungsi `calculateDeferrableDays()` Tetap Ada

**Fungsi ini sekarang HANYA digunakan untuk:**
- ✅ Validasi saat user input penangguhan (cek maksimal hari)
- ❌ BUKAN untuk automatic transfer

## 🎯 Workflow Baru

### 1. Saat Tahun Berganti (2025 → 2026)

**Sebelum (SALAH):**
```
1. System otomatis hitung sisa cuti 2025
2. Otomatis transfer sebagai penangguhan 2026
3. Saldo penangguhan muncul otomatis
```

**Sesudah (BENAR):**
```
1. System buat saldo 2026 dengan deferred_days = 0
2. User harus input manual melalui "Input Data Penangguhan"
3. Setelah input, deferred_days ter-update
4. Saldo penangguhan hanya muncul setelah input manual
```

### 2. Saat User Input Penangguhan

```
1. User buka dialog "Input Data Penangguhan"
2. System validasi: input tidak boleh > sisa tahun sebelumnya
3. System update leave_balances.deferred_days
4. System create/update leave_deferrals entry
5. Saldo penangguhan muncul di tampilan
```

### 3. Saat Melihat Saldo Cuti

```
1. System cek leave_balances.deferred_days
2. Jika deferred_days > 0, tampilkan saldo penangguhan
3. Jika deferred_days = 0, tidak tampilkan (atau tampilkan 0)
4. Perhitungan: Total = total_days + deferred_days
```

## 📋 Perubahan Behavior

### Scenario 1: Pegawai Baru di Tahun 2026
- ✅ Saldo 2026 dibuat dengan `deferred_days = 0`
- ✅ Tidak ada penangguhan otomatis
- ✅ User harus input manual jika ada penangguhan

### Scenario 2: Pegawai dengan Sisa Cuti 2025
- ✅ Saldo 2026 dibuat dengan `deferred_days = 0` (default)
- ✅ Jika user input penangguhan, baru `deferred_days` ter-update
- ✅ Jika tidak input, tetap 0 meskipun ada sisa di 2025

### Scenario 3: Pegawai yang Sudah Input Penangguhan
- ✅ Saldo 2026 memiliki `deferred_days` sesuai input
- ✅ Tampilan menampilkan saldo penangguhan dengan benar
- ✅ Perhitungan saldo akurat

## 🔧 File yang Diubah

1. ✅ `src/utils/leaveBalanceCalculator.js`
   - `ensureLeaveBalance()` - Hanya cek deferral log
   - `initializeYearBalances()` - Hanya cek deferral log
   - Komentar diperbarui untuk dokumentasi

## ✅ Testing

### Test Case 1: Saldo Baru Tanpa Input Penangguhan
1. Buat saldo baru untuk tahun 2026
2. ✅ `deferred_days` harus = 0
3. ✅ Tidak ada penangguhan yang tampil

### Test Case 2: Input Penangguhan Manual
1. Input penangguhan melalui dialog
2. ✅ `deferred_days` ter-update sesuai input
3. ✅ Deferral log terbuat/ter-update
4. ✅ Saldo penangguhan tampil di UI

### Test Case 3: Lihat Saldo Setelah Input
1. Input penangguhan 5 hari
2. Lihat saldo cuti
3. ✅ Saldo penangguhan = 5 hari
4. ✅ Perhitungan total saldo = total_days + 5

### Test Case 4: Tidak Input Penangguhan
1. Ada sisa cuti di tahun 2025 (misal: 3 hari)
2. Tidak input penangguhan untuk 2026
3. ✅ Saldo 2026: `deferred_days = 0`
4. ✅ Tidak ada penangguhan yang tampil

## 📝 Catatan Penting

1. **Manual Input Required**: Penangguhan HARUS di-input manual, tidak otomatis
2. **Default = 0**: Jika tidak ada input, `deferred_days = 0`
3. **Validasi Tetap Ada**: Input masih divalidasi tidak boleh > sisa tahun sebelumnya
4. **Backward Compatible**: Data yang sudah ada tidak terpengaruh

## 🔄 Migrasi Data (Jika Diperlukan)

Jika ada saldo yang sudah terbuat dengan penangguhan otomatis dan ingin di-reset:

```sql
-- Reset deferred_days untuk saldo yang tidak punya deferral log
UPDATE leave_balances lb
SET deferred_days = 0
WHERE lb.year = 2026
  AND lb.deferred_days > 0
  AND NOT EXISTS (
    SELECT 1 FROM leave_deferrals ld
    WHERE ld.employee_id = lb.employee_id
      AND ld.year = 2025
  );
```

---

**Tanggal Perbaikan**: 2025-01-27
**Status**: ✅ Selesai - Penangguhan Hanya dari Input Manual
