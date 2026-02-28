# 🚀 Quick Start - Fix Vendor Profile Errors

## Langkah Cepat Setup (5 Menit)

### 1️⃣ Setup Database (Jalankan di Supabase SQL Editor)

Buka **Supabase Dashboard** → **SQL Editor**, copy-paste dan jalankan file-file ini **secara berurutan**:

#### A. Update vendor_users table (tambah kolom company profile)
```sql
-- File: supabase/migrations/add_vendor_users_table.sql
-- Copy seluruh isi file dan run
-- AMAN dijalankan berkali-kali (tidak akan duplikat)
```

> **Note:** Tabel `vendor_users` sudah ada, migration ini hanya menambahkan kolom company profile yang belum ada. **TIDAK** ada kaitan dengan tabel `vendors`.

#### B. Create storage bucket untuk foto profil
```sql
-- File: supabase/migrations/create_vendor_profiles_bucket.sql
-- Copy seluruh isi file dan run
```

#### C. Setup storage policies
```sql
-- File: supabase/migrations/setup_storage_policies.sql
-- Copy seluruh isi file dan run
```

### 2️⃣ Verify Setup Berhasil

Jalankan query ini di SQL Editor:

```sql
-- Check tables
SELECT COUNT(*) as vendor_users_count FROM vendor_users;

-- Check new columns in vendor_users
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'vendor_users'
  AND column_name IN ('company_name', 'address', 'city', 'npwp');

-- Check bucket
SELECT id, name, public FROM storage.buckets WHERE id = 'vendor-profiles';

-- Check policies
SELECT COUNT(*) as policy_count 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname LIKE '%vendor-profiles%';
```

**Expected Output:**
- vendor_users_count: 1 atau lebih
- 4 columns found (company_name, address, city, npwp)
- bucket: 1 row (vendor-profiles, public: true)
- policy_count: 4

### 3️⃣ Test Upload Foto

1. Jalankan aplikasi: `npm run dev`
2. Login sebagai vendor
3. Buka halaman Profile
4. Upload foto (max 2MB, format: JPG/PNG/GIF)
5. Verify foto muncul di profile dan header

### 4️⃣ Verify di Database

```sql
-- Check uploaded photos and company data
SELECT id, email, company_name, address, city, profile_image 
FROM vendor_users 
WHERE profile_image IS NOT NULL;
```

---

## ✅ Error yang Sudah Diperbaiki

### Error 1: Controlled/Uncontrolled Input
```
A component is changing an uncontrolled input to be controlled
```
**Status:** ✅ FIXED
- Semua field sekarang punya default value empty string
- `city`, `established`, dan semua field lain tidak akan undefined

### Error 2: Session Expired Crash
```
Session expired. Silakan login ulang.
```
**Status:** ✅ FIXED
- Error tidak lagi crash aplikasi
- Tampil sebagai alert, user bisa continue

### Error 3: Upload Foto & Data Tersebar
**Status:** ✅ FIXED & SIMPLIFIED
- Semua data vendor (company + foto) sekarang di 1 tabel: `vendor_users`
- Foto profil upload ke Supabase Storage
- URL disimpan di `vendor_users.profile_image`
- **TIDAK** ada kaitan dengan tabel `vendors`
- 100% terintegrasi dengan Supabase

---

## 📁 File Structure

```mbah kolom company profile ke vendor_users
supabase/migrations/
├── add_vendor_users_table.sql          # Tabel vendor_users + kolom baru
├── create_vendor_profiles_bucket.sql   # Storage bucket
└── setup_storage_policies.sql          # Storage policies

VENDOR_PROFILE_FIX_GUIDE.md            # Dokumentasi lengkap
VENDOR_PROFILE_STORAGE_SETUP.md        # Setup storage detail
```

---

## ⚠️ Troubleshooting Cepat

### Bucket tidak ada?
```sql
-- Run ini lagi
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vendor-profiles', 'vendor-profiles', true);
```

### Policies tidak ada?
```sql
-- Check current policies
SELECT * FROM pg_policies WHERE tablename = 'objects';

-- Jika kosong, run ulang: setup_storage_policies.sql
```

### Upload error "not found"?
- Pastikan bucket `vendor-profiles` sudah dibuat
- Check di Supabase Dashboard → Storage

---

## 📞 Bantuan

Jika masih ada error:
1. Screenshot error di browser console
2. Check Supabase Dashboard → Logs
3. Verify semua 3 migration files sudah dijalankan

Dokumentasi lengkap: `VENDOR_PROFILE_FIX_GUIDE.md`
