# 🚀 PANDUAN LENGKAP: Setup Vendor Profile dengan Supabase Storage

## 📋 Ringkasan Masalah & Solusi

### Masalah yang Diperbaiki:
1. ✅ **Error controlled/uncontrolled input** - Field `city` dan `established` berubah status
2. ✅ **Error "Session expired"** - Throw error yang menyebabkan crash aplikasi  
3. ✅ **Upload foto ke Google Drive** - Diganti dengan Supabase Storage untuk integrasi penuh

### Solusi Implementasi:
- **Semua data vendor tersimpan di tabel `vendor_users` (Supabase)** - tidak ada kaitan dengan tabel `vendors`
- Foto profil user tersimpan di Supabase Storage bucket `vendor-profiles`
- URL foto profil disimpan di tabel `vendor_users` kolom `profile_image`
- 100% terintegrasi dengan Supabase, tidak ada ketergantungan eksternal

---

## 🔧 LANGKAH 1: Setup Database Tables

### A. Jalankan Migration untuk Vendor Users

Buka **Supabase Dashboard** → **SQL Editor**, kemudian jalankan file:

```bash
supabase/migrations/add_vendor_users_table.sql
```

**File ini akan:**
- ✅ Menambahkan kolom profile lengkap ke tabel `vendor_users`:
  - Company info: `company_name`, `company_type`, `address`, `city`, `province`, `postal_code`
  - Contact: `phone`, `fax`
  - PIC info: `pic_name`, `pic_position`, `pic_phone`, `pic_email`
  - Legal docs: `npwp`, `siup`, `tdp`, `established`
- ✅ Setup indexes untuk performa optimal
- ✅ **TIDAK** mengubah tabel `vendors` (semua data di `vendor_users`)

### B. Verifikasi Tabel Berhasil Dibuat

Jalankan query verifikasi:

```sql
-- Check vendor_users table
SELECT * FROM v_users new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vendor_users' 
  AND column_name IN ('company_name', 'address', 'city
WHERE table_name = 'vendors' 
  AND column_name IN ('user_id', 'city', 'province', 'npwp', 'established');
```

**Expected result:** Tabel dan kolom muncul tanpa error.

---

## 📦 LANGKAH 2: Setup Supabase Storage Bucket

### A. Create Bucket untuk Profile Images

Buka **Supabase Dashboard** → **SQL Editor**, jalankan:

```bash
supabase/migrations/create_vendor_profiles_bucket.sql
```

**File ini akan:**
- ✅ Membuat bucket `vendor-profiles` 
- ✅ Set bucket sebagai public
- ✅ Set file size limit 2MB
- ✅ Restrict hanya file gambar (JPEG, PNG, GIF, WebP)

### B. Setup Storage Policies

Jalankan file berikutnya:

```bash
supabase/migrations/setup_storage_policies.sql
```

**File ini akan:**
- ✅ Allow public read (semua orang bisa lihat foto profil)
- ✅ Allow upload untuk vendor users
- ✅ Allow update foto profil
- ✅ Allow delete foto lama

### C. Verifikasi Bucket dan Policies

```sql
-- Check bucket exists
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'vendor-profiles';

-- Check policies exist
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%vendor-profiles%';
```

**Expected:**
- 1 bucket: `vendor-profiles`
- 4 policies: SELECT, INSERT, UPDATE, DELETE

---

## 🎨 LANGKAH 3: Perubahan Code yang Sudah Dilakukan

### File yang Diupdate:

#### 1. `src/app/vendor-portal/profile/page.tsx`

**Perubahan:**
```tsx
// ✅ BEFORE: Query dari 2 tabel (vendor_users + vendors)
const { data: userData } = await supabase
  .from('vendor_users')
  .select('id, email, profile_image')
  
const { data: vendorData } = await supabase
  .from('vendors')
  .select('*')
  .eq('user_id', vendorUserId)

// ✅ AFTER: Query dari 1 tabel saja (vendor_users)
const { data: userData } = await supabase
  .from('vendor_users')
  .select('*')  // Semua data ada disini
  .eq('id', vendorUserId)
  
// Set profileData langsung dari userData
setProfileData({
  companyName: userData.company_name || '',
  address: userData.address || '',
  city: userData.city || '',
  // ... semua dari vendor_users
})

---

## 🧪 LANGKAH 4: Testing

### A. Test Database Tables

```sql
-- Test insert vendor user
INSERT INTO vendor_users (email, password) 
VALUES ('test@vendor.com', 'hashed_password_here');

-- Test insert vendor profile
INSERT INTO vendors (
  id, nama, alamat, user_id, city, province, 
  npwp, established, status
) VALUES (
  'VND-TEST-001', 
  'PT Test Vendor', 
  'Jl. Test No. 123',
  1,  -- user_id from vendor_users
  'Jakarta',
  'DKI Jakarta',
  '01.234.567.8-901.000',
  2020,
  'Aktif'
);
```

### B. Test Upload Foto Profil

1. **Login sebagai vendor** di halaman `/vendor-login`
2. **Navigasi ke Profile** di `/vendor-portal/profile`
3. **Klik area foto profil** atau tombol upload
4. **Pilih file gambar** (max 2MB, format: JPG/PNG/GIF/WebP)
5. **Verify:**
   - Loading spinner muncul
   - Alert "Foto profil berhasil diupload!"
   - Foto langsung tampil di halaman
   - Header otomatis update dengan foto baru

### C. Verify di Supabase Dashboard

**Storage:**
1. Buka **Storage** → **vendor-profiles**
2. Lihat file yang ter-upload dengan format: `{userId}-{timestamp}.{ext}`
3. Klik file untuk preview
4. Copy public URL

**Database:**
```sql
-- Check foto profil tersimpan
SELECT id, email, profile_image 
FROM vendor_users 
WHERE profile_image IS NOT NULL;

-- Check vendor profile lengkap
SELECT v.*, vu.email, vu.profile_image
FROM vendors vdan data lengkap tersimpan
SELECT id, email, company_name, address, city, profile_image 
FROM vendor_users 
WHERE : "Bucket vendor-profiles belum dibuat"

**Solusi:**
```bash
# Jalankan migration create bucket
supabase/migrations/create_vendor_profiles_bucket.sql
```

### Error: "new row violates row-level security policy"

**Solusi:**
```bash
# Jalankan migration setup policies
supabase/migrations/setup_storage_policies.sql
```

### Error: "File size too large"

**Solusi:**
- File harus < 2MB
- Compress gambar menggunakan tool online (TinyPNG, Squoosh, dll)

### Error: "Invalid file type"

**Solusi:**
- Hanya file gambar yang diizinkan: JPG, JPEG, PNG, GIF, WebP
- Convert file ke format yang didukung

### Error: Input controlled/uncontrolled

**Fix sudah diterapkan:**
```tsx
// Semua field menggunakan fallback empty string
city: vendorData.city || '',
established: vendorData.established ? String(vendorData.established) : ''
```

### Error: Session expired muncul terus

**Fix sudah diterapkan:**
```tsx
// Tidak lagi throw error, tapi alert dan return
if (!vendorUserId) {
  alert('Session expired. Silakan login ulang.')
  setUploadingImage(false)
  return
}
```

---

## 📊 Database Schema Reference

### Tabel `vendor_users`
```sql
CREATE TABLE vendor_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  profile_image TEXT,  -- Supabase Storage URL
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabel `vendors` (Updated)
```sql (Complete Profile)
```sql
CREATE TABLE vendor_users (
  -- Authentication
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  profile_image TEXT,  -- Supabase Storage URL
  
  -- Company Info (NEW)
  company_name VARCHAR(255),
  company_type VARCHAR(50) DEFAULT 'PT',
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(10),
  
  -- Contact (NEW)
  phone VARCHAR(50),
  fax VARCHAR(50),
  
  -- PIC Info (NEW)
  pic_name VARCHAR(255),
  pic_position VARCHAR(100),
  pic_phone VARCHAR(50),
  pic_email VARCHAR(255),
  
  -- Legal Documents (NEW)
  npwp VARCHAR(50),
  siup VARCHAR(100),
  tdp VARCHAR(100),
  established INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- ✅ File type validation (hanya image)
- ✅ File size limit (max 2MB)
- ✅ Unique filename (userId + timestamp)
- ✅ Upsert enabled (old file overwritten)

### Data Validation
- ✅ Email unique constraint
- ✅ Required fields validation di frontend
- ✅ Type checking (TypeScript)

---

## 📈 Performance Optimizations

### Indexes Created
```sql
CREATE INDEX idx_vendor_users_email ON vendor_users(email);
CREATE INDEX idx_vendors_user_id ON vendors(user_id);
```

### CDN Caching
- Supabase Storage otomatis menggunakan CDN
- Cache-Control header: 3600 seconds (1 hour)

### Lazy Loading
- Profile image loaded on demand
- localStorage untuk caching data vendor

---

## 🎯 Migration Checklist

Setup lengkap untuk production:

- [ ] Jalankan `add_vendor_users_table.sql` di Supabase
- [ ] Jalankan `create_vendor_profiles_bucket.sql` di Supabase  
- [ ] Jalankan `setup_storage_policies.sql` di Supabase
- [ ] Verify semua tabel dan kolom sudah ada
- [ ] Verify bucket `vendor-profiles` exists
- [ ] Verify 4 storage policies aktif
- [ ] Test vendor registration
- [ ] Test vendor login
- [ ] Test upload foto profil
- [ ] Test update profile data
- [ ] Verify foto tampil di header
- [ ] Check browser console tidak ada error
- [ ] Test dengan multiple vendor accounts
- [ ] Backup database sebelum production

---

## 📝 Summary Files yang Diubah

### Migration Files (Run di Supabase):
1. ✅ `supabase/migrations/add_vendor_users_table.sql` - Tabel vendor_users dan kolom baru
2. ✅ `supabase/migrations/create_vendor_profiles_bucket.sql` - Storage bucket
3. ✅ `supabase/migrations/setup_storage_policies.sql` - Storage policies

### Code Files (Sudah diupdate):
1. ✅ `src/app/vendor-portal/profile/page.tsx` - Fix errors dan integrasi Supabase Storage

### Documentation Files (Referensi):
1. ✅ `VENDOR_PROFILE_STORAGE_SETUP.md` - Setup guide storage
2. ✅ `VENDOR_PROFILE_FIX_GUIDE.md` - Panduan lengkap ini

---

## 🆘 Support & Next Steps

### Jika Ada Masalah:
1. Periksa Supabase Dashboard → Logs
2. Periksa browser console untuk error details
3. Verify RLS policies dengan query di atas
4. Test dengan file size < 1MB terlebih dahulu

### Future Improvements (Optional):
- [ ] Image resizing/optimization on upload
- [ ] Multiple profile images (gallery)
- [ ] Crop/rotate image before upload
- [ ] Progress bar untuk upload
- [ ] Drag & drop upload interface
- [ ] Vendor verification badge based on profile completeness

---

## ✅ Completion Status

**Semua error sudah diperbaiki:**
- ✅ Error controlled/uncontrolled input → **FIXED**
- ✅ Error session expired crash → **FIXED**  
- ✅ Upload foto ke Supabase Storage → **IMPLEMENTED**
- ✅ Data perusahaan di Supabase → **COMPLETE**
- ✅ 100% Integrasi Supabase → **ACHIEVED**

**Ready untuk testing dan production deployment!** 🚀
