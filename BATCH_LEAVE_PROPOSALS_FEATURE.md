# Fitur Usulan Cuti per Unit (Batch Leave Proposals)

## Deskripsi
Fitur baru untuk Master Admin yang memungkinkan melihat dan mengelola usulan cuti yang dikelompokkan berdasarkan unit kerja. Master Admin dapat melihat semua pengajuan cuti dari setiap unit dan membuat surat batch untuk seluruh unit sekaligus.

## Akses
- **URL:** `/batch-leave-proposals`
- **Menu:** "Usulan per Unit" (hanya muncul untuk Master Admin)
- **Permission:** Otomatis tersedia untuk role `master_admin`

## Fitur Utama

### 1. Dashboard Overview
- **Total Unit:** Jumlah unit kerja yang memiliki usulan cuti
- **Total Usulan:** Jumlah keseluruhan pengajuan cuti dari semua unit
- **Total Pegawai:** Jumlah pegawai yang mengajukan cuti
- **Total Hari:** Akumulasi hari cuti dari semua pengajuan

### 2. Filter dan Pencarian
- **Filter by Unit:** Dropdown untuk memilih unit kerja specific
- **Search:** Pencarian berdasarkan nama unit kerja
- **Real-time filtering:** Filter langsung saat user mengetik/memilih

### 3. Tampilan per Unit
Setiap unit ditampilkan dengan informasi:
- **Nama Unit Kerja**
- **Jumlah pegawai** yang mengajukan cuti
- **Total hari cuti** dari unit tersebut
- **Jumlah pengajuan** dari unit tersebut
- **Rentang tanggal** cuti (dari tanggal paling awal ke paling akhir)

### 4. Aksi per Unit

#### Detail View
- Tombol **"Detail"** untuk melihat daftar lengkap semua pengajuan cuti dari unit tersebut
- Modal popup menampilkan:
  - Summary statistik unit
  - Daftar semua pegawai dengan detail pengajuan cuti
  - Informasi jenis cuti, tanggal, durasi, dan alasan

#### Buat Surat Batch
- Tombol **"Buat Surat Batch"** untuk generate surat resmi
- Otomatis membuat dokumen .docx berisi:
  - Header resmi organisasi
  - Tabel lengkap semua pegawai dan detail cuti mereka
  - Nomor surat otomatis
  - Format profesional siap cetak

## Workflow Penggunaan

### Untuk Master Admin:
1. **Login** sebagai Master Admin
2. **Navigasi** ke menu "Usulan per Unit"
3. **Review** statistik keseluruhan di dashboard
4. **Filter/Search** unit yang diinginkan (opsional)
5. **Klik "Detail"** untuk melihat daftar lengkap pengajuan per unit
6. **Klik "Buat Surat Batch"** untuk generate surat resmi
7. **Download** file .docx yang dihasilkan

## Technical Implementation

### Data Source
- Menggunakan tabel `leave_requests` yang sudah ada
- Data diambil dengan join ke `employees` dan `leave_types`
- Tidak memerlukan tabel tambahan

### Grouping Logic
```javascript
// Group by employee department
const unitGroups = {};
leaveRequests.forEach(request => {
  const department = request.employees?.department;
  if (!unitGroups[department]) {
    unitGroups[department] = {
      unitName: department,
      requests: [],
      totalEmployees: new Set(),
      totalDays: 0,
      dateRange: { earliest: null, latest: null }
    };
  }
  // ... add request to group
});
```

### Letter Generation
- Menggunakan utility `downloadLeaveProposalLetter` yang sudah ada
- Format data dari `leave_requests` ke format proposal
- Generate dokumen .docx dengan format profesional

## File Structure
```
src/pages/BatchLeaveProposals.jsx          # Main component
src/utils/leaveProposalLetterGenerator.js  # Letter generation (existing)
BATCH_LEAVE_PROPOSALS_FEATURE.md           # This documentation
```

## Integration
- **Sidebar Navigation:** Menu otomatis muncul untuk Master Admin
- **Routing:** Route `/batch-leave-proposals` sudah dikonfigurasi
- **Permissions:** Menggunakan role-based access control existing
- **Letter Generation:** Menggunakan sistem docx generation yang sudah ada

## Benefits
1. **Efficiency:** Master Admin dapat memproses seluruh unit sekaligus
2. **Professional Output:** Surat resmi dengan format standar
3. **Data Integrity:** Menggunakan data pengajuan cuti yang sudah ada
4. **User Experience:** Interface yang intuitif dan responsive
5. **Scalability:** Dapat menangani banyak unit dan pengajuan

## Example Use Cases
- **Scenario 1:** Admin LAVOGAN memiliki 12 pengajuan cuti → Master Admin bisa buat 1 surat batch untuk semua
- **Scenario 2:** Akhir bulan review → Master Admin lihat semua unit yang ada pengajuan → Generate surat per unit
- **Scenario 3:** Audit trail → Master Admin bisa lihat statistik pengajuan cuti per unit kerja

## Future Enhancements
- Email automation untuk mengirim surat ke masing-masing unit
- Template surat yang customizable per unit
- Export ke format lain (PDF, Excel)
- Integration dengan sistem approval workflow
- Batch approval/rejection functionality
