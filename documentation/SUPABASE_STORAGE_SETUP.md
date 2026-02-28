# Setup Supabase Storage untuk File Upload

Dokumentasi ini menjelaskan cara setup Supabase Storage untuk menyimpan file PDF yang diupload vendor.

## 1. Setup Storage Bucket di Supabase

### Login ke Supabase Dashboard
1. Buka https://supabase.com dan login
2. Pilih project Anda
3. Navigasi ke **Storage** di sidebar kiri

### Buat Storage Bucket
1. Klik tombol **"New Bucket"**
2. Isi konfigurasi:
   - **Name**: `documents`
   - **Public bucket**: ✅ **Centang** (agar file bisa diakses publik)
   - Klik **"Create bucket"**

### Setup Policies (Optional - untuk kontrol akses lebih detail)

Jika ingin kontrol akses lebih ketat, bisa tambahkan policies:

```sql
-- Policy untuk upload (INSERT)
CREATE POLICY "Allow authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Policy untuk download (SELECT)
CREATE POLICY "Allow public download"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Policy untuk delete (DELETE)
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
```

## 2. Setup Environment Variables

Pastikan file `.env.local` di root project sudah berisi:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Cara mendapatkan credentials:**
1. Buka Supabase Dashboard
2. Klik **Settings** > **API**
3. Copy **Project URL** dan **anon/public key**

## 3. Struktur File di Storage

File akan disimpan dengan struktur:
```
documents/
└── surat-pengajuan/
    ├── 1234567890_abc123.pdf
    ├── 1234567891_def456.pdf
    └── ...
```

### Naming Convention
- Format: `{timestamp}_{random}.pdf`
- Contoh: `1705890234567_a3b4c5.pdf`
- Timestamp memastikan urutan kronologis
- Random string mencegah collision

## 4. Testing Upload

### Test Manual di Supabase Dashboard
1. Buka **Storage** > **documents** bucket
2. Upload file PDF test
3. Klik file yang diupload
4. Copy URL public nya
5. Buka URL di browser untuk verify

### Test dari Aplikasi
1. Login sebagai vendor
2. Buka **Pengajuan Surat**
3. Isi form dan upload PDF
4. Submit form
5. Check Supabase Storage - file harus muncul di folder `surat-pengajuan`

### Test Download di Admin
1. Login sebagai admin
2. Buka **Approval Surat**
3. Klik **Detail** pada surat yang ada file PDF
4. Klik tombol **"Lihat"** - PDF harus buka di tab baru
5. Klik tombol **"Download"** - PDF harus terdownload

## 5. File Upload Flow

### Upload Process (Vendor Side)
```
1. Vendor pilih file PDF
2. Validasi file (type, size)
3. Upload ke Supabase Storage
4. Dapat URL public
5. Simpan metadata + URL ke localStorage/database
```

### Download Process (Admin Side)
```
1. Admin buka detail surat
2. Klik "Lihat" → Open URL di tab baru
3. Klik "Download" → Fetch file → Save as file
```

## 6. Code Structure

### File Upload Service
- **Location**: `src/services/fileUploadService.ts`
- **Functions**:
  - `uploadPDFToSupabase(file, folderPath)` - Upload file
  - `downloadFileFromSupabase(fileUrl, fileName)` - Download file
  - `deleteFileFromSupabase(fileUrl)` - Delete file

### Usage dalam Vendor Form
```typescript
import { uploadPDFToSupabase } from '@/services/fileUploadService';

const uploadResult = await uploadPDFToSupabase(selectedFile);
if (uploadResult.success) {
  // Simpan uploadResult.fileUrl ke database
}
```

### Usage dalam Admin Page
```typescript
import { downloadFileFromSupabase } from '@/services/fileUploadService';

await downloadFileFromSupabase(fileUrl, fileName);
```

## 7. Error Handling

### Common Errors

**Error: "Invalid bucket"**
- **Cause**: Bucket 'documents' belum dibuat
- **Fix**: Buat bucket di Supabase Dashboard

**Error: "File too large"**
- **Cause**: File > 5MB
- **Fix**: Compress PDF atau tingkatkan limit

**Error: "Missing credentials"**
- **Cause**: Environment variables tidak set
- **Fix**: Check `.env.local` file

**Error: "Public access denied"**
- **Cause**: Bucket tidak public
- **Fix**: Set bucket menjadi public di settings

## 8. Security Best Practices

### File Validation
- ✅ Validate file type (PDF only)
- ✅ Validate file size (max 5MB)
- ✅ Sanitize filename
- ✅ Use unique filenames

### Access Control
- Public bucket untuk read access
- Authenticated upload (optional)
- Row Level Security (RLS) untuk kontrol detail

### Storage Limits
- Free tier: 1GB storage
- Monitor usage di Supabase Dashboard
- Setup auto-cleanup untuk old files (optional)

## 9. Maintenance

### Cleanup Old Files (Optional)
Jika perlu hapus file lama secara otomatis:

```typescript
// Delete files older than 30 days
const deleteOldFiles = async () => {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  // List all files
  const { data: files } = await supabase.storage
    .from('documents')
    .list('surat-pengajuan');
  
  // Filter old files
  const oldFiles = files.filter(file => {
    const timestamp = parseInt(file.name.split('_')[0]);
    return timestamp < thirtyDaysAgo;
  });
  
  // Delete
  const filePaths = oldFiles.map(f => `surat-pengajuan/${f.name}`);
  await supabase.storage
    .from('documents')
    .remove(filePaths);
};
```

## 10. Monitoring

### Check Storage Usage
1. Buka Supabase Dashboard
2. Settings > Usage
3. Monitor Storage metric

### Check Upload Success Rate
- Monitor console logs untuk upload errors
- Setup error tracking (Sentry, LogRocket, dll)

## Troubleshooting

### File tidak muncul di storage
1. Check network tab browser untuk errors
2. Verify bucket name = 'documents'
3. Check Supabase credentials

### Download tidak berfungsi
1. Verify fileUrl ada dan valid
2. Check CORS settings di Supabase
3. Test URL langsung di browser

### Permission denied errors
1. Check bucket policies
2. Verify RLS settings
3. Check authentication status

---

## Quick Start Checklist

- [ ] Login ke Supabase Dashboard
- [ ] Buat bucket 'documents' (public)
- [ ] Verify environment variables di `.env.local`
- [ ] Test upload dari vendor form
- [ ] Test view/download dari admin page
- [ ] Monitor first uploads untuk errors

**Setelah setup selesai, sistem upload/download file akan berfungsi penuh!**
