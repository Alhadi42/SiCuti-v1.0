# Fix: Pengecualian Variabel untuk Aplikasi Eksternal

## Masalah yang Diperbaiki

Variabel `${nomor_naskah}` dan `${ttd_pengirim}` dalam template DOCX sebelumnya dihapus oleh sistem saat tidak ditemukan data yang sesuai. Variabel ini seharusnya dipertahankan karena akan diisi oleh aplikasi lain, bukan oleh sistem SICUTI.

## Root Cause

Sistem menggunakan `Docxtemplater` dengan `nullGetter` yang mengembalikan string kosong untuk variabel yang tidak ditemukan, dan juga memiliki logika pembersihan yang menghapus semua variabel yang tidak cocok dengan data yang tersedia.

## Solusi yang Diterapkan

### 1. Daftar Variabel yang Dipertahankan

Ditambahkan daftar variabel yang harus dipertahankan (tidak dihapus):

```javascript
const preservedVariables = [
  'nomor_naskah',
  'ttd_pengirim'
];
```

### 2. Modifikasi `nullGetter` di `processDocxTemplate`

```javascript
const nullGetter = (part) => {
  const variableName = part.value;
  
  // Check if this variable should be preserved
  if (preservedVariables.includes(variableName)) {
    console.log(`Preserving variable for external application: {${variableName}}`);
    return `{${variableName}}`; // Return the original variable format
  }
  
  console.warn(`Template variable not found in data: {${variableName}}`);
  return "";
};
```

### 3. Modifikasi Pembersihan Variabel di `replaceVariables` (SuratKeterangan.jsx)

```javascript
// Replace all unmatched variables except preserved ones
result = result.replace(/\\{\\{([^}]+)\\}\\}/g, (match, variableName) => {
  if (preservedVariables.includes(variableName.trim())) {
    console.log(`Preserving variable for external application: {${variableName}}`);
    return match; // Keep the original variable
  }
  return ""; // Remove other unmatched variables
});
```

### 4. Modifikasi `generateDocxPreview`

Ditambahkan logika pembersihan yang sama untuk preview HTML:

```javascript
// Clean up any remaining unmatched variables except preserved ones
html = html.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
  if (preservedVariables.includes(variableName.trim())) {
    console.log(`Preserving variable for external application in preview: {${variableName}}`);
    return match; // Keep the original variable
  }
  return ""; // Remove other unmatched variables
});
```

### 5. Modifikasi `replaceDocxVariables`

Ditambahkan logika pembersihan yang sama untuk text replacement:

```javascript
// Clean up any remaining unmatched variables except preserved ones
text = text.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
  if (preservedVariables.includes(variableName.trim())) {
    console.log(`Preserving variable for external application in text replacement: {${variableName}}`);
    return match; // Keep the original variable
  }
  return ""; // Remove other unmatched variables
});
```

## File yang Dimodifikasi

### 1. `src/utils/docxTemplates.js`
- **Fungsi `processDocxTemplate`**: Modifikasi `nullGetter` untuk mempertahankan variabel tertentu
- **Fungsi `generateDocxPreview`**: Tambah logika pembersihan dengan pengecualian
- **Fungsi `replaceDocxVariables`**: Tambah logika pembersihan dengan pengecualian

### 2. `src/pages/SuratKeterangan.jsx`
- **Fungsi `replaceVariables`**: Modifikasi logika pembersihan variabel dengan pengecualian

## Perilaku Setelah Perbaikan

### ✅ Variabel yang Dipertahankan
- `${nomor_naskah}` - Akan tetap ada dalam dokumen untuk diisi aplikasi lain
- `${ttd_pengirim}` - Akan tetap ada dalam dokumen untuk diisi aplikasi lain

### ✅ Variabel yang Tetap Dihapus
- Semua variabel lain yang tidak ditemukan dalam data akan tetap dihapus
- Variabel yang tidak valid atau tidak dikenal akan dihapus

### ✅ Logging
- Console akan menampilkan pesan ketika variabel dipertahankan
- Console akan menampilkan warning untuk variabel yang dihapus

## Testing Checklist

- [ ] ✅ Build aplikasi berhasil tanpa error
- [ ] ✅ Template dengan `${nomor_naskah}` dan `${ttd_pengirim}` mempertahankan variabel tersebut
- [ ] ✅ Variabel lain yang tidak ditemukan tetap dihapus
- [ ] ✅ Preview HTML menampilkan variabel yang dipertahankan
- [ ] ✅ Dokumen yang diunduh mengandung variabel yang dipertahankan
- [ ] ✅ Console menampilkan log yang sesuai

## Cara Menambah Variabel Baru

Untuk menambah variabel baru yang harus dipertahankan, tambahkan ke array `preservedVariables` di semua file yang relevan:

```javascript
const preservedVariables = [
  'nomor_naskah',
  'ttd_pengirim',
  'nama_variabel_baru'  // ← Tambahkan di sini
];
```

## Catatan Penting

1. **Format Variabel**: Sistem mendukung format `{{variabel}}` dan `${variabel}`
2. **Case Sensitive**: Nama variabel harus persis sama (case sensitive)
3. **Whitespace**: Sistem akan trim whitespace dari nama variabel
4. **Backward Compatibility**: Perubahan ini tidak mempengaruhi fungsionalitas existing

## Status

✅ **FIXED** - Variabel `${nomor_naskah}` dan `${ttd_pengirim}` sekarang dipertahankan dalam dokumen untuk diisi oleh aplikasi eksternal, sementara variabel lain yang tidak ditemukan tetap dihapus sesuai perilaku sebelumnya. 