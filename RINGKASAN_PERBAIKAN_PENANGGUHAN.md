# Ringkasan Perbaikan: Saldo Penangguhan Hanya dari Input Manual

## ✅ Perbaikan Selesai

### Masalah yang Diperbaiki
Saldo penangguhan sebelumnya otomatis dihitung dari sisa cuti tahun sebelumnya. Sekarang **HANYA muncul jika sudah di-input manual** melalui menu "Input Data Penangguhan".

### Perubahan Logika

#### Sebelum (SALAH):
```
1. System otomatis hitung sisa cuti tahun N
2. Otomatis transfer sebagai penangguhan tahun N+1
3. Saldo penangguhan muncul otomatis
```

#### Sesudah (BENAR):
```
1. System buat saldo tahun N+1 dengan deferred_days = 0
2. User harus input manual melalui "Input Data Penangguhan"
3. Setelah input, deferred_days ter-update
4. Saldo penangguhan hanya muncul setelah input manual
```

## 🔧 Perubahan yang Diterapkan

### 1. `ensureLeaveBalance()` - Hanya Cek Deferral Log
- ❌ Tidak lagi menghitung otomatis dari sisa tahun sebelumnya
- ✅ Hanya cek `leave_deferrals` table (input manual)
- ✅ Jika tidak ada deferral log, `deferred_days = 0`

### 2. `initializeYearBalances()` - Hanya Cek Deferral Log
- ❌ Tidak lagi transfer otomatis
- ✅ Hanya cek `leave_deferrals` table
- ✅ Jika tidak ada deferral log, `deferred_days = 0`

### 3. `calculateDeferrableDays()` - Hanya untuk Validasi
- ✅ Tetap ada untuk validasi maksimal hari saat input
- ❌ Tidak digunakan untuk automatic transfer

## 📋 Behavior Baru

### Scenario 1: Pegawai Baru di Tahun 2026
- Saldo 2026: `deferred_days = 0` ✅
- Tidak ada penangguhan otomatis ✅
- User harus input manual jika ada penangguhan ✅

### Scenario 2: Pegawai dengan Sisa Cuti 2025 (3 hari)
- Saldo 2026: `deferred_days = 0` (default) ✅
- Jika user input penangguhan → `deferred_days = input` ✅
- Jika tidak input → tetap 0 meskipun ada sisa ✅

### Scenario 3: Pegawai yang Sudah Input Penangguhan
- Saldo 2026: `deferred_days = nilai_input` ✅
- Tampilan menampilkan saldo penangguhan ✅
- Perhitungan saldo akurat ✅

## 🎯 Workflow Input Penangguhan

1. User buka dialog "Input Data Penangguhan"
2. System validasi: input ≤ sisa tahun sebelumnya
3. System update `leave_balances.deferred_days`
4. System create/update `leave_deferrals` entry
5. Saldo penangguhan muncul di tampilan

## ✅ Testing Checklist

- [x] Saldo baru tanpa input → `deferred_days = 0`
- [x] Input penangguhan → `deferred_days` ter-update
- [x] Tidak input penangguhan → tetap 0
- [x] Validasi maksimal hari bekerja
- [x] Tampilan saldo benar

---

**Tanggal**: 2025-01-27
**Status**: ✅ Selesai
