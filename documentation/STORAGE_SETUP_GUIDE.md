# Setup Supabase Storage untuk Upload Foto Profil

## 🎯 Langkah-langkah Setup

### 1. Buka Supabase Dashboard
- Login ke https://supabase.com
- Pilih project Anda

### 2. Create Storage Bucket
1. Klik **Storage** di sidebar kiri
2. Klik tombol **"New bucket"**
3. Isi form:
   - **Name**: `vendor-profiles`
   - **Public bucket**: ✅ **CENTANG INI** (Sangat penting!)
   - **File size limit**: `2097152` (2MB dalam bytes)
   - **Allowed MIME types**: Kosongkan atau isi: `image/jpeg,image/png,image/webp,image/jpg`
4. Klik **"Create bucket"**

### 3. Verify Bucket Created
- Setelah dibuat, Anda akan lihat bucket `vendor-profiles` di list
- Pastikan ada icon **globe/world** di sebelah nama bucket (artinya PUBLIC)
- Jika tidak ada icon globe, bucket belum public!

### 4. Make Bucket Public (Jika belum)
1. Klik ⚙️ (Settings) di sebelah bucket `vendor-profiles`
2. Scroll ke bagian **"Public access"**
3. Toggle **"Public bucket"** menjadi **ON**
4. Klik **"Save"**

### 5. Setup Storage Policies (RLS)
Jalankan SQL ini di **SQL Editor**:

```sql
-- Allow public read access to vendor-profiles bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'vendor-profiles' );

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'vendor-profiles' );

-- Allow users to update their own files
CREATE POLICY "Allow user update own files"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'vendor-profiles' );

-- Allow users to delete their own files
CREATE POLICY "Allow user delete own files"
ON storage.objects FOR DELETE
USING ( bucket_id = 'vendor-profiles' );
```

**ATAU** jika ingin disable RLS untuk development (lebih simple):

```sql
-- Disable RLS for vendor-profiles bucket (development only)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

### 6. Test Upload
1. Buka aplikasi: `http://localhost:3001`
2. Login sebagai vendor
3. Navigate ke **Profil Perusahaan**
4. Click **"Pilih Foto"**
5. Select gambar (max 2MB)
6. Jika berhasil: Alert "Foto profil berhasil diupload!"
7. Foto akan muncul di halaman profil dan di header

### 7. Verify Upload di Supabase
1. Buka **Storage** → `vendor-profiles` bucket
2. Seharusnya ada file baru: `{vendorUserId}-{timestamp}.jpg` (atau .png)
3. Click file → Copy URL
4. Paste URL di browser baru → Image harus muncul

## 🔍 Troubleshooting

### Error: "Bucket 'vendor-profiles' not found"
**Solusi:**
- Bucket belum dibuat
- Follow step 2 di atas untuk create bucket

### Error: "new row violates row-level security policy"
**Solusi:**
```sql
-- Disable RLS temporarily
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

### Error: "Access denied" atau 403
**Solusi:**
- Bucket belum public
- Follow step 4 untuk make bucket public

### Upload berhasil tapi gambar tidak muncul
**Solusi:**
- Check browser console (F12) untuk error
- Verify `profileImage` di localStorage:
  ```javascript
  console.log(localStorage.getItem('vendorProfile'))
  ```
- Check `vendor_users` table di Supabase:
  ```sql
  SELECT id, email, profile_image FROM vendor_users;
  ```

### Image URL 404
**Solusi:**
- Bucket belum public
- File path salah
- Check actual file di Storage bucket

## ✅ Checklist

- [ ] Bucket `vendor-profiles` created
- [ ] Bucket is **PUBLIC** (ada icon globe)
- [ ] RLS policies setup atau RLS disabled
- [ ] Test upload berhasil
- [ ] Image muncul di profile page
- [ ] Image muncul di header dropdown
- [ ] Image URL accessible di browser

## 📝 Notes

**Development vs Production:**
- Development: Disable RLS untuk testing cepat
- Production: Enable RLS dengan policies yang tepat

**File Naming Convention:**
- Format: `{vendorUserId}-{timestamp}.{ext}`
- Example: `123-1737590400000.jpg`
- Unique per upload (timestamp prevents conflicts)

**Storage Limits:**
- Free tier: 1GB storage
- File size limit: 2MB per file (configurable)
- Bandwidth: 2GB/month

## 🔗 Useful Links

- Supabase Storage Docs: https://supabase.com/docs/guides/storage
- Storage Policies: https://supabase.com/docs/guides/storage/security/access-control
