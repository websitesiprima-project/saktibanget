# 🚀 Quick Start: Google Drive Upload Feature

Panduan cepat untuk setup dan menggunakan fitur upload PDF kontrak ke Google Drive.

## ⚡ Setup Cepat (5 Menit)

### 1. Install Dependencies

```bash
npm install googleapis
```

### 2. Setup Google Drive Service Account

#### A. Pastikan File Service Account Ada
File sudah ada di: `src/services/server/disco-catcher-484807-p2-7cc0a252d059.json`

#### B. Share Folder dengan Service Account

1. **Buka Google Drive** Anda
2. **Buat folder** bernama: `Berkas Kontrak`
3. **Klik kanan** pada folder > **Share** / **Bagikan**
4. **Copy email service account** dari file JSON:
   - Buka `src/services/server/disco-catcher-484807-p2-7cc0a252d059.json`
   - Cari field `client_email`
   - Copy emailnya (format: `xxx@xxx.iam.gserviceaccount.com`)
5. **Paste email** di kolom "Add people and groups"
6. **Set permission** ke **Editor** atau **Content Manager**
7. **Klik Send** / **Kirim**

✅ Selesai! Service account sekarang bisa akses folder Anda.

### 3. Setup Database (Supabase)

Jalankan migration SQL:

```bash
# Copy isi file ini
cat supabase/migrations/add_contract_files_columns.sql

# Paste ke Supabase SQL Editor
# Atau jalankan via Supabase CLI
```

**Atau manual via Supabase Dashboard:**
1. Buka Supabase Dashboard
2. Pilih project Anda
3. Masuk ke **SQL Editor**
4. Copy-paste isi `supabase/migrations/add_contract_files_columns.sql`
5. Klik **Run**

### 4. Jalankan Development Server

```bash
npm run dev
```

## 🎯 Cara Menggunakan

### Upload dari UI

1. **Buka** http://localhost:3000/aset
2. **Pilih kontrak** yang ingin diupload file PDF-nya
3. **Klik tombol Upload** (icon ⬆️ di kolom Aksi)
4. **Pilih file PDF** dari komputer Anda
5. **Klik Upload**
6. ✅ File akan otomatis tersimpan di Google Drive dengan struktur:
   ```
   Berkas Kontrak/
   └── [AI atau AO]/
       └── [Nama Kontrak]/
           └── [file].pdf
   ```

### Upload via API (untuk developer)

```bash
# Menggunakan curl
curl -X POST http://localhost:3000/api/upload-contract \
  -F "file=@/path/to/contract.pdf" \
  -F "tipeAnggaran=AI" \
  -F "namaKontrak=Kontrak Pengadaan Komputer" \
  -F "nomorKontrak=KTR-2025-001"
```

## ✅ Verifikasi Setup

### Test 1: Cek API Endpoint

```bash
curl http://localhost:3000/api/upload-contract
```

Seharusnya return JSON dengan info API.

### Test 2: Upload Test File

```bash
# Install node-fetch dan form-data dulu (untuk testing)
npm install --save-dev node-fetch@2 form-data

# Jalankan test script
node scripts/test-upload-api.js
```

### Test 3: Manual Upload dari UI

1. Buka http://localhost:3000/aset
2. Klik Upload pada salah satu kontrak
3. Upload file PDF apapun
4. Cek Google Drive folder "Berkas Kontrak"
5. File seharusnya ada di: `Berkas Kontrak/[AI atau AO]/[Nama Kontrak]/`

## 🔍 Troubleshooting

### ❌ Error: "Failed to initialize Google Drive client"

**Penyebab**: File service account tidak ditemukan atau tidak valid.

**Solusi**:
```bash
# Cek apakah file ada
ls src/services/server/disco-catcher-484807-p2-7cc0a252d059.json

# Cek isi file valid JSON
cat src/services/server/disco-catcher-484807-p2-7cc0a252d059.json | jq .
```

### ❌ Error: "Permission denied" / "Insufficient Permission"

**Penyebab**: Service account belum diberi akses ke folder "Berkas Kontrak".

**Solusi**:
1. Buka Google Drive
2. Klik kanan folder "Berkas Kontrak" > Share
3. Masukkan email service account dari JSON (`client_email`)
4. Set ke **Editor** atau **Content Manager**
5. Klik Send

### ❌ Error: "Tipe anggaran harus AI atau AO"

**Penyebab**: Data kontrak tidak memiliki field `budget_type` yang valid.

**Solusi**:
1. Buka Supabase Dashboard
2. Table `contracts`
3. Edit baris yang ingin diupload
4. Set kolom `budget_type` ke `AI` atau `AO`
5. Save

### ❌ File tidak muncul di Google Drive

**Penyebab**: Folder belum di-share atau permission tidak cukup.

**Solusi**:
1. Cek console log di browser (F12)
2. Lihat `fileId` yang di-generate
3. Buka: `https://drive.google.com/file/d/[fileId]/view`
4. Jika error 404, berarti permission issue
5. Share ulang folder dengan service account

## 📚 Struktur File yang Dibuat

```
vlaas-pln/
├── src/
│   ├── services/
│   │   └── googleDriveService.ts          ← Google Drive operations
│   └── app/
│       └── api/
│           └── upload-contract/
│               └── route.ts                ← API endpoint
├── supabase/
│   └── migrations/
│       └── add_contract_files_columns.sql ← Database migration
├── scripts/
│   └── test-upload-api.js                 ← Test script
├── UPLOAD_FEATURE_DOCS.md                 ← Dokumentasi lengkap
└── UPLOAD_QUICK_START.md                  ← File ini
```

## 🎓 Penjelasan Alur Kerja

1. **User klik Upload** di tabel → `openUploadModal(contractId)`
2. **User pilih file PDF** → State `selectedFile` ter-update
3. **User klik Upload** → `handleUpload()` dipanggil
4. **Frontend ambil data kontrak** dari state `assets`
5. **Frontend kirim FormData** ke `/api/upload-contract`
6. **API validasi input** (file type, size, tipe anggaran)
7. **API konversi File ke Buffer**
8. **Call `uploadContractPDF()`** dari googleDriveService
9. **Service cek/buat folder** hierarki:
   - Berkas Kontrak (root)
   - AI atau AO (sub-folder)
   - Nama Kontrak (sub-sub-folder)
10. **Upload file** ke folder tujuan
11. **Dapat fileId & webViewLink**
12. **Simpan metadata** ke Supabase table `contract_files`
13. **Return success** ke frontend
14. **Show notifikasi** ke user
15. ✅ **Selesai!**

## 🔐 Keamanan

- ✅ Validasi file type (hanya PDF)
- ✅ Validasi ukuran file (max 50MB)
- ✅ Service Account credentials tidak exposed ke client
- ✅ API route di server-side (Next.js API Routes)
- ✅ Input sanitization untuk nama file

## 🚀 Tips & Best Practices

1. **Naming Convention**: File otomatis diberi nama `[nomorKontrak]_[timestamp].pdf`
2. **Folder Organization**: Gunakan nama kontrak yang descriptive
3. **Error Handling**: Semua error di-catch dan ditampilkan ke user
4. **Logging**: Check console untuk debugging
5. **Testing**: Test dengan file kecil dulu sebelum file besar

## 📞 Butuh Bantuan?

- 📖 Lihat dokumentasi lengkap: `UPLOAD_FEATURE_DOCS.md`
- 🐛 Cek console log browser (F12)
- 🔍 Cek console log server terminal
- 💬 Tanya tim development

---

**Ready to use! 🎉**

Jika semua langkah di atas sudah diikuti, fitur upload seharusnya sudah berfungsi dengan baik.
