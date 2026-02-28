# 📁 Dokumentasi Fitur Upload PDF Kontrak ke Google Drive

## 📋 Ringkasan

Fitur ini memungkinkan upload file PDF kontrak langsung ke Google Drive dengan struktur folder yang terorganisir berdasarkan Tipe Anggaran dan Nama Kontrak.

## 🏗️ Struktur Folder Google Drive

```
Berkas Kontrak/
├── AI/
│   ├── [Nama Kontrak 1]/
│   │   ├── file1.pdf
│   │   └── file2.pdf
│   └── [Nama Kontrak 2]/
│       └── file.pdf
└── AO/
    ├── [Nama Kontrak 3]/
    │   └── file.pdf
    └── [Nama Kontrak 4]/
        └── file.pdf
```

## 🔧 Komponen yang Dibuat

### 1. **Google Drive Service** (`src/services/googleDriveService.ts`)

Service untuk mengelola operasi Google Drive:

#### Fungsi Utama:
- `getDriveClient()` - Inisialisasi Google Drive client dengan Service Account
- `findFolderByName()` - Mencari folder berdasarkan nama dan parent folder
- `createFolder()` - Membuat folder baru di Google Drive
- `getOrCreateFolder()` - Mendapatkan atau membuat folder jika belum ada
- `setupContractFolderStructure()` - Setup struktur folder: Berkas Kontrak > AI/AO > Nama Kontrak
- `uploadFileToDrive()` - Upload file ke folder tertentu
- `uploadContractPDF()` - **Fungsi utama** untuk upload PDF kontrak
- `deleteFileFromDrive()` - Hapus file dari Google Drive
- `getFileInfo()` - Mendapatkan informasi file

### 2. **API Route** (`src/app/api/upload-contract/route.ts`)

Endpoint untuk upload PDF kontrak.

#### Request:
```
POST /api/upload-contract
Content-Type: multipart/form-data

FormData:
- file: File (PDF)
- tipeAnggaran: string (AI | AO)
- namaKontrak: string
- nomorKontrak: string (optional)
- contractId: string (optional)
```

#### Response Success:
```json
{
  "success": true,
  "message": "File berhasil diupload ke Google Drive",
  "data": {
    "fileId": "1abc...",
    "webViewLink": "https://drive.google.com/file/d/...",
    "folderPath": "Berkas Kontrak/AI/Nama Kontrak",
    "fileName": "kontrak_12345_1234567890.pdf",
    "contractId": "uuid-..."
  }
}
```

#### Response Error:
```json
{
  "success": false,
  "error": "Error message",
  "details": "Stack trace (development only)"
}
```

#### Validasi:
- ✅ File harus format PDF
- ✅ Ukuran maksimal 50MB
- ✅ Tipe anggaran harus AI atau AO
- ✅ Nama kontrak tidak boleh kosong

### 3. **Frontend Integration** (`src/app/(admin)/aset/page.tsx`)

Update pada halaman Manajemen Aset:

#### Perubahan:
- **openUploadModal()** - Membuka modal upload untuk kontrak tertentu
- **handleUpload()** - Menangani proses upload dengan:
  - Validasi input
  - Pengambilan data kontrak (nama, tipe anggaran, dll)
  - Upload ke API
  - Simpan metadata ke Supabase
  - Notifikasi success/error

#### Tombol Upload:
Tersedia di setiap baris tabel pada kolom "Aksi":
```tsx
<button 
  className="btn-icon btn-upload" 
  title="Upload PDF" 
  onClick={() => openUploadModal(asset.id)}
>
  <Upload size={16} />
</button>
```

## 💾 Database Schema

### Table: `contract_files`

```sql
CREATE TABLE contract_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,          -- Google Drive webViewLink
  file_name TEXT,                  -- Nama file di Drive
  folder_path TEXT,                -- Path folder (Berkas Kontrak/AI/Nama)
  file_id TEXT,                    -- Google Drive file ID
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contract_files_contract_id ON contract_files(contract_id);
CREATE INDEX idx_contract_files_file_id ON contract_files(file_id);
```

**Migration SQL**: `supabase/migrations/add_contract_files_columns.sql`

## 🔐 Konfigurasi Google Drive API

### Service Account
File: `src/services/server/disco-catcher-484807-p2-7cc0a252d059.json`

### Permissions Required:
- Google Drive API harus diaktifkan di Google Cloud Console
- Service Account harus memiliki akses ke folder "Berkas Kontrak"
- Scope: `https://www.googleapis.com/auth/drive`

### Cara Share Folder dengan Service Account:
1. Buat folder "Berkas Kontrak" di Google Drive
2. Klik kanan > Share
3. Masukkan email service account dari JSON (field: `client_email`)
4. Berikan permission "Editor" atau "Content Manager"

## 📝 Cara Penggunaan

### 1. Dari UI Dashboard

1. Buka halaman **Manajemen Aset** (`/aset`)
2. Klik tombol **Upload** (icon upload) pada baris kontrak yang ingin diupload
3. Modal "Upload PDF Kontrak" akan terbuka
4. Pilih file PDF dari komputer
5. Klik tombol **Upload**
6. Tunggu proses upload selesai
7. File akan tersimpan di: `Berkas Kontrak/[AI|AO]/[Nama Kontrak]/[file].pdf`

### 2. Programmatic (dari code)

```typescript
import { uploadContractPDF } from '@/services/googleDriveService';

// Upload file
const result = await uploadContractPDF(
  fileBuffer,           // Buffer dari file
  'kontrak_001.pdf',    // Nama file
  'AI',                 // Tipe anggaran (AI/AO)
  'Kontrak Pengadaan X' // Nama kontrak
);

console.log(result);
// {
//   fileId: '1abc...',
//   webViewLink: 'https://drive.google.com/...',
//   folderPath: 'Berkas Kontrak/AI/Kontrak Pengadaan X'
// }
```

## 🚀 Testing

### Test API Endpoint

```bash
# Menggunakan curl
curl -X POST http://localhost:3000/api/upload-contract \
  -F "file=@path/to/contract.pdf" \
  -F "tipeAnggaran=AI" \
  -F "namaKontrak=Kontrak Test" \
  -F "nomorKontrak=KTR-001"

# Atau menggunakan Postman/Thunder Client
POST http://localhost:3000/api/upload-contract
Body: form-data
  - file: [select PDF file]
  - tipeAnggaran: AI
  - namaKontrak: Kontrak Pengadaan Alat
  - nomorKontrak: KTR-2025-001
```

### Test dari Browser

1. Jalankan development server: `npm run dev`
2. Buka http://localhost:3000/aset
3. Klik tombol Upload pada salah satu kontrak
4. Upload file PDF
5. Cek console browser untuk log
6. Cek Google Drive untuk melihat file yang terupload

## 🔍 Troubleshooting

### Error: "Failed to initialize Google Drive client"
**Solusi**: 
- Pastikan file service account JSON ada di path yang benar
- Periksa format JSON valid

### Error: "Tipe anggaran harus AI atau AO"
**Solusi**: 
- Pastikan field `budgetType` di database terisi dengan value "AI" atau "AO"
- Update data kontrak yang belum memiliki tipe anggaran

### Error: "Permission denied"
**Solusi**:
- Share folder "Berkas Kontrak" dengan service account email
- Berikan permission "Editor" atau "Content Manager"

### File tidak muncul di Google Drive
**Solusi**:
- Cek console log untuk melihat `fileId` yang dihasilkan
- Periksa apakah service account memiliki akses ke folder parent
- Coba buat folder manual dan share dengan service account

### Upload lambat / timeout
**Solusi**:
- Periksa ukuran file (maksimal 50MB)
- Periksa koneksi internet
- Periksa quota Google Drive API

## 📊 Flow Diagram

```
User Click Upload Button
        ↓
openUploadModal(contractId)
        ↓
Select PDF File
        ↓
handleUpload()
        ↓
Get Contract Data (budgetType, name)
        ↓
Create FormData
        ↓
POST /api/upload-contract
        ↓
API: Validate Input
        ↓
API: Convert File to Buffer
        ↓
uploadContractPDF()
        ↓
setupContractFolderStructure()
  ├─ Find/Create "Berkas Kontrak"
  ├─ Find/Create "AI" or "AO"
  └─ Find/Create "[Nama Kontrak]"
        ↓
uploadFileToDrive(buffer, fileName, folderId)
        ↓
Return fileId & webViewLink
        ↓
Save to Supabase (contract_files)
        ↓
Show Success Message
        ↓
Close Modal
```

## 🎯 Best Practices

1. **Naming Convention**: File diberi nama dengan format `[nomorKontrak]_[timestamp].pdf` untuk menghindari duplikasi
2. **Error Handling**: Semua error di-catch dan ditampilkan ke user dengan message yang jelas
3. **Logging**: Log di console untuk debugging (development mode)
4. **Validation**: Multiple layer validation (frontend, API, service)
5. **Security**: File upload menggunakan multipart/form-data dengan validasi MIME type

## 📦 Dependencies

```json
{
  "googleapis": "^latest"
}
```

Install dengan:
```bash
npm install googleapis
```

## 🔄 Future Enhancements

- [ ] Batch upload multiple files
- [ ] Preview PDF sebelum upload
- [ ] Download file dari Drive
- [ ] Delete file dari UI
- [ ] Rename file
- [ ] Move file ke folder lain
- [ ] Upload history/audit log
- [ ] File versioning
- [ ] Compression untuk file besar
- [ ] OCR untuk PDF searchable

## 📞 Support

Jika ada pertanyaan atau issue, silakan hubungi tim development atau buka issue di repository.

---

**Created**: January 20, 2025  
**Last Updated**: January 20, 2025  
**Version**: 1.0.0
