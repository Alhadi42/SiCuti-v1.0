# SiCuti - Binalavotas

Sistem Manajemen Cuti Pegawai untuk Binalavotas

## Deskripsi

SiCuti adalah aplikasi web untuk mengelola cuti pegawai dengan fitur-fitur lengkap termasuk pengajuan cuti, approval, riwayat cuti, dan pembuatan surat keterangan otomatis.

## Fitur Utama

- **Manajemen Pegawai**: Data lengkap pegawai dengan NIP, jabatan, dan unit kerja
- **Pengajuan Cuti**: Sistem pengajuan cuti online dengan berbagai jenis cuti
- **Approval System**: Sistem approval cuti dengan hierarki jabatan
- **Riwayat Cuti**: Tracking lengkap riwayat cuti pegawai
- **Surat Keterangan**: Pembuatan surat keterangan otomatis (PDF/DOCX)
- **Template Management**: Kelola template surat dengan variabel dinamis
- **Batch Processing**: Pembuatan surat batch untuk multiple pegawai
- **User Management**: Manajemen user dan hak akses
- **Reports**: Laporan dan analisis data cuti

## Teknologi

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **UI Components**: Radix UI, Lucide React Icons
- **Document Processing**: PDF-lib, DOCX-templates
- **State Management**: React Hooks
- **Routing**: React Router DOM

## Instalasi

1. Clone repository
```bash
git clone [repository-url]
cd sicuti
```

2. Install dependencies
```bash
npm install
```

3. Setup environment variables
```bash
cp .env.example .env
# Edit .env dengan konfigurasi Supabase
```

4. Jalankan aplikasi
```bash
npm run dev
```

## Penggunaan

1. **Login**: Masuk dengan username dan password yang telah disediakan
2. **Data Pegawai**: Kelola data pegawai di menu "Data Pegawai"
3. **Pengajuan Cuti**: Buat pengajuan cuti di menu "Pengajuan Cuti"
4. **Approval**: Approve/reject pengajuan cuti sesuai hierarki
5. **Surat Keterangan**: Buat surat otomatis di menu "Buat Surat"
6. **Template**: Kelola template surat di menu "Kelola Template"

## Variabel Template

### Variabel Individual
- `{nama}` - Nama pegawai
- `{nip}` - NIP pegawai
- `{jabatan}` - Jabatan pegawai
- `{unit_kerja}` - Unit kerja
- `{jenis_cuti}` - Jenis cuti
- `{alasan}` - Alasan cuti
- `{tanggal_cuti}` - Tanggal cuti
- `{lama_cuti}` - Lama cuti

### Variabel Batch (1-30)
- `{nama_1}` sampai `{nama_30}` - Nama pegawai
- `{nip_1}` sampai `{nip_30}` - NIP pegawai
- `{jabatan_1}` sampai `{jabatan_30}` - Jabatan pegawai
- `{alasan_1}` sampai `{alasan_30}` - Alasan cuti pegawai
- Dan variabel lainnya dengan format `{variabel_index}`

## Lisensi

© 2024 Binalavotas. All rights reserved.

## Support

Untuk bantuan dan dukungan teknis, silakan hubungi tim IT Binalavotas. #   U p d a t e   a u t h o r  
 