# Setup Storage untuk Vendor Profile

## Overview
Upload foto profil vendor sekarang terintegrasi penuh dengan Supabase Storage. Semua gambar profil disimpan di bucket `vendor-profiles`.

## Langkah Setup Supabase Storage

### 1. Jalankan Migration untuk Membuat Bucket

Jalankan file SQL berikut di Supabase SQL Editor:

```bash
supabase/migrations/create_vendor_profiles_bucket.sql
```

File ini akan:
- Membuat bucket `vendor-profiles`
- Set bucket sebagai public
- Set limit file size 2MB
- Hanya izinkan file gambar (JPEG, PNG, GIF, WebP)

### 2. Setup Storage Policies

Jalankan file SQL berikut di Supabase SQL Editor:

```bash
supabase/migrations/setup_storage_policies.sql
```

File ini akan membuat policies untuk:
- ✅ Public read access (semua orang bisa lihat gambar)
- ✅ Upload access (vendor bisa upload gambar)
- ✅ Update access (vendor bisa update gambar mereka)
- ✅ Delete access (vendor bisa hapus gambar lama)

### 3. Verifikasi Setup

Setelah menjalankan kedua file SQL, verifikasi dengan query:

```sql
-- Check bucket exists
SELECT * FROM storage.buckets WHERE id = 'vendor-profiles';

-- Check policies exist
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%vendor-profiles%';
```

Expected: 
- 1 bucket bernama `vendor-profiles`
- 4 policies (SELECT, INSERT, UPDATE, DELETE)

## Cara Kerja Upload

### Frontend Flow
1. User pilih foto dari form input
2. File divalidasi (harus gambar, max 2MB)
3. File diupload ke Supabase Storage bucket `vendor-profiles`
4. Public URL dari gambar diambil
5. URL disimpan ke database tabel `vendor_users` kolom `profile_image`
6. State dan localStorage diupdate dengan URL baru
7. Header otomatis refresh menampilkan foto baru

### File Location Pattern
```
vendor-profiles/
  ├── {vendorUserId}-{timestamp}.jpg
  ├── {vendorUserId}-{timestamp}.png
  └── ...
```

Contoh: `vendor-profiles/123-1706001234567.jpg`

### Database Schema
```sql
-- vendor_users table
CREATE TABLE vendor_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  profile_image TEXT,  -- Stores Supabase Storage public URL
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing

### 1. Upload Foto Baru
- Login sebagai vendor
- Pergi ke halaman Profile
- Klik area foto profil atau tombol upload
- Pilih file gambar (max 2MB)
- Foto akan diupload dan langsung tampil

### 2. Verifikasi di Supabase Dashboard
- Buka Supabase Dashboard
- Pergi ke Storage > vendor-profiles
- Lihat file yang ter-upload
- Klik file untuk preview dan lihat URL

### 3. Verifikasi di Database
```sql
SELECT id, email, profile_image 
FROM vendor_users 
WHERE profile_image IS NOT NULL;
```

## Error Handling

### Error: "Bucket vendor-profiles belum dibuat"
**Solusi**: Jalankan `create_vendor_profiles_bucket.sql`

### Error: "new row violates row-level security policy"
**Solusi**: Jalankan `setup_storage_policies.sql`

### Error: "File size too large"
**Solusi**: File harus < 2MB. Compress gambar terlebih dahulu.

### Error: "Invalid file type"
**Solusi**: Hanya file gambar yang diizinkan (JPG, PNG, GIF, WebP)

## Migration dari Google Drive

Jika sebelumnya menggunakan Google Drive:

### 1. Backup Data Google Drive
```bash
# Export semua URL foto dari database
SELECT id, email, profile_image 
FROM vendor_users 
WHERE profile_image LIKE '%drive.google.com%';
```

### 2. Optional: Migrate Files
Jika ingin migrate foto lama dari Google Drive ke Supabase:
1. Download semua foto dari Google Drive
2. Upload manual ke Supabase Storage
3. Update database dengan URL baru

### 3. Update Code
Code sudah diupdate untuk menggunakan Supabase Storage:
- `src/app/vendor-portal/profile/page.tsx`

## Keuntungan Supabase Storage vs Google Drive

✅ **Terintegrasi Penuh**
- Semua dalam 1 platform (database + storage)
- Tidak perlu setup OAuth/credentials terpisah

✅ **Lebih Cepat**
- Direct upload tanpa server middleware
- CDN built-in untuk loading cepat

✅ **Row-Level Security**
- Policy-based access control
- Lebih aman dan granular

✅ **Monitoring**
- Dashboard untuk lihat semua files
- Mudah untuk debugging

✅ **Cost-Effective**
- Free tier generous (1GB storage)
- No API quota limits

## Production Checklist

Sebelum deploy production:

- [ ] Jalankan semua migrations
- [ ] Test upload/delete files
- [ ] Verifikasi RLS policies
- [ ] Setup monitoring/alerts
- [ ] Backup strategy (Supabase otomatis backup)
- [ ] Consider CDN caching headers
- [ ] Implement image optimization (resize on upload)

## Troubleshooting

### Check Bucket Status
```sql
SELECT * FROM storage.buckets WHERE id = 'vendor-profiles';
```

### Check Active Policies
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname LIKE '%vendor-profiles%';
```

### Test Upload Manually
```javascript
const { data, error } = await supabase.storage
  .from('vendor-profiles')
  .upload('test.jpg', file);
  
console.log(data, error);
```

## Support

Jika ada masalah:
1. Periksa Supabase Dashboard > Logs
2. Periksa browser console untuk error
3. Verifikasi RLS policies aktif
4. Test dengan file size kecil terlebih dahulu
