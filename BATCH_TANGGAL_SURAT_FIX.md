# Perbaikan Variabel {tanggal_surat} untuk Batch Template

## Masalah yang Ditemukan

Setelah perbaikan sebelumnya, variabel `{tanggal_surat}` untuk **batch template** masih menampilkan tanggal hari ini (10 Juli 2025) alih-alih menggunakan data tanggal surat yang diinput (07 Juli 2025).

## Root Cause

Masalah terjadi di fungsi `generateBatchTemplateData()` di file `src/pages/DocxSuratKeterangan.jsx`:

**Sebelum:**
```javascript
const batchData = {
  // Common template data (from first employee for consistency)
  nomor_surat: ".../.../...",
  tanggal_surat: formatDate(new Date().toISOString()), // ← MASALAH: Selalu menggunakan tanggal hari ini
  kota: "Jakarta",
  tahun: new Date().getFullYear(),
  // ...
};
```

**Sesudah:**
```javascript
const batchData = {
  // Common template data (from first employee for consistency)
  nomor_surat: ".../.../...",
  tanggal_surat: "", // ← Akan diisi dari data employee pertama
  kota: "Jakarta",
  tahun: new Date().getFullYear(),
  // ...
};

// Get signatory info from first employee
if (employees.length > 0) {
  const firstEmployeeData = await getLetterData(employees[0]);
  batchData.nama_atasan = firstEmployeeData.nama_atasan || "";
  batchData.nip_atasan = firstEmployeeData.nip_atasan || "";
  batchData.jabatan_atasan = firstEmployeeData.jabatan_atasan || "";
  batchData.nomor_surat = firstEmployeeData.nomor_surat || ".../.../...";
  batchData.tanggal_surat = firstEmployeeData.tanggal_surat || formatDate(new Date().toISOString()); // ← PERBAIKAN: Menggunakan data dari employee pertama
}
```

## Perbaikan yang Dilakukan

### 1. **Update Logika Batch Template Data**

**File:** `src/pages/DocxSuratKeterangan.jsx`
**Baris:** 920-940

- **Sebelum:** `tanggal_surat` selalu menggunakan `new Date().toISOString()`
- **Sesudah:** `tanggal_surat` menggunakan data dari employee pertama yang dipilih

### 2. **Tambahan Logging untuk Debug**

Ditambahkan logging detail untuk memastikan data diambil dengan benar:

```javascript
batchData.tanggal_surat = (() => {
  console.log("=== BATCH TANGGAL SURAT DEBUG ===");
  console.log("firstEmployeeData.tanggal_surat:", firstEmployeeData.tanggal_surat);
  console.log("firstEmployeeData raw:", firstEmployeeData);
  console.log("employees[0] raw:", employees[0]);
  
  const result = firstEmployeeData.tanggal_surat || formatDate(new Date().toISOString());
  console.log("Final batch tanggal_surat result:", result);
  console.log("=== END BATCH TANGGAL SURAT DEBUG ===");
  return result;
})();
```

### 3. **Logging di Fungsi getLetterData**

Ditambahkan logging di fungsi `getLetterData()` untuk memastikan data `leave_letter_date` diproses dengan benar:

```javascript
tanggal_surat: (() => {
  console.log("=== TANGGAL SURAT DEBUG ===");
  console.log("leaveRequest.leave_letter_date:", leaveRequest.leave_letter_date);
  console.log("leaveRequest.created_at:", leaveRequest.created_at);
  console.log("Raw leave request data:", leaveRequest);
  
  const result = formatDate(leaveRequest.leave_letter_date || leaveRequest.created_at || new Date());
  console.log("Final tanggal_surat result:", result);
  console.log("=== END TANGGAL SURAT DEBUG ===");
  return result;
})(),
```

## Alur Data yang Benar

1. **User memilih data cuti** dengan field "Tanggal Surat" = "07 Juli 2025"
2. **Data disimpan di database** dengan field `leave_letter_date = "2025-07-07"`
3. **Batch template diproses** dengan mengambil data employee pertama
4. **Fungsi `getLetterData()`** dipanggil untuk employee pertama
5. **Data `leave_letter_date`** diambil dari database
6. **Variabel `{tanggal_surat}`** diisi dengan "07 Juli 2025"

## Cara Verifikasi

1. **Input data cuti** dengan field "Tanggal Surat" = "07 Juli 2025"
2. **Pilih mode batch** dan pilih data cuti tersebut
3. **Buat surat batch** dengan template yang mengandung `{tanggal_surat}`
4. **Cek console log** untuk melihat debug output
5. **Verifikasi hasil** bahwa tanggal surat menampilkan "07 Juli 2025"

## Debug Output yang Diharapkan

```
=== BATCH TANGGAL SURAT DEBUG ===
firstEmployeeData.tanggal_surat: 07 Juli 2025
firstEmployeeData raw: { nama: "...", tanggal_surat: "07 Juli 2025", ... }
employees[0] raw: { leave_letter_date: "2025-07-07", ... }
Final batch tanggal_surat result: 07 Juli 2025
=== END BATCH TANGGAL SURAT DEBUG ===
```

## File yang Dimodifikasi

1. **`src/pages/DocxSuratKeterangan.jsx`**
   - Baris 920: Update inisialisasi `tanggal_surat` di batch data
   - Baris 937: Update pengisian `tanggal_surat` dari employee pertama
   - Baris 937-945: Tambah logging debug untuk batch template
   - Baris 710: Tambah logging debug untuk API response format
   - Baris 785: Tambah logging debug untuk form data format

## Catatan Penting

- **Batch template** menggunakan data dari **employee pertama** yang dipilih untuk variabel umum seperti `tanggal_surat`
- **Individual template** menggunakan data masing-masing employee
- **Logging debug** dapat dihapus setelah verifikasi berhasil
- **Fallback** tetap menggunakan `created_at` atau `new Date()` jika `leave_letter_date` kosong 